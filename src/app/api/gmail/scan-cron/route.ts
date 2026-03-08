import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getGmailAccessToken, gmailFetch, updateLastScan } from "@/lib/gmail-client";
import { encryptToken } from "@/lib/gmail-crypto";
import type { DbGmailConnection, DbUtilityBill, DbUtilityProvider } from "@/lib/supabase";

interface GmailMessage {
  id: string;
}

interface GmailMessageFull {
  id: string;
  payload: {
    headers: { name: string; value: string }[];
    mimeType: string;
    body?: { data?: string };
    parts?: GmailPart[];
  };
}

interface GmailPart {
  mimeType: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

interface ParsedBill {
  isUtilityBill: boolean;
  providerName?: string;
  category?: string;
  amount?: number;
  dueDate?: string | null;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
  accountNumber?: string | null;
}

const VALID_CATEGORIES = [
  "electric", "gas", "water", "internet", "trash", "sewer", "phone", "other",
];

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf8");
}

function extractTextFromParts(parts: GmailPart[]): string {
  let text = "";
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      text += decodeBase64Url(part.body.data) + "\n";
    } else if (part.parts) {
      text += extractTextFromParts(part.parts);
    }
  }
  return text;
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

export async function GET(req: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI parsing not configured" }, { status: 500 });
  }

  // Get all Gmail connections
  const { data: connections } = await supabase
    .from("gmail_connections")
    .select("id, user_id, last_scan_at")
    .returns<Pick<DbGmailConnection, "id" | "user_id" | "last_scan_at">[]>();

  if (!connections || connections.length === 0) {
    return NextResponse.json({ usersScanned: 0, totalImported: 0 });
  }

  let totalImported = 0;

  for (const conn of connections) {
    try {
      const tokenResult = await getGmailAccessToken(conn.user_id);
      if (!tokenResult) continue;

      const { accessToken, connectionId } = tokenResult;

      // Look back 30 days from last scan (or 30 days from now if never scanned)
      const lookbackFrom = conn.last_scan_at
        ? new Date(conn.last_scan_at)
        : new Date(Date.now() - 30 * 86_400_000);
      const afterStr = `${lookbackFrom.getFullYear()}/${String(lookbackFrom.getMonth() + 1).padStart(2, "0")}/${String(lookbackFrom.getDate()).padStart(2, "0")}`;

      const query = `subject:(bill OR statement OR invoice OR "payment due" OR "amount due" OR utility OR electric OR gas OR water OR internet) after:${afterStr}`;
      const searchRes = await gmailFetch(
        accessToken,
        `messages?q=${encodeURIComponent(query)}&maxResults=30`
      );

      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      const messages: GmailMessage[] = searchData.messages ?? [];
      if (messages.length === 0) {
        await updateLastScan(connectionId, null);
        continue;
      }

      // Check existing
      const messageIds = messages.map((m) => m.id);
      const { data: existing } = await supabase
        .from("utility_bills")
        .select("gmail_message_id")
        .eq("user_id", conn.user_id)
        .in("gmail_message_id", messageIds)
        .returns<Pick<DbUtilityBill, "gmail_message_id">[]>();

      const existingIds = new Set((existing ?? []).map((e) => e.gmail_message_id));

      // Fetch providers
      const { data: providerRows } = await supabase
        .from("utility_providers")
        .select("id, name, category")
        .eq("user_id", conn.user_id)
        .returns<Pick<DbUtilityProvider, "id" | "name" | "category">[]>();

      const providers = new Map(
        (providerRows ?? []).map((p) => [p.name.toLowerCase(), p])
      );

      let lastMessageId: string | null = null;

      for (const msg of messages) {
        if (existingIds.has(msg.id)) continue;

        try {
          const msgRes = await gmailFetch(accessToken, `messages/${msg.id}?format=full`);
          if (!msgRes.ok) continue;

          const msgData: GmailMessageFull = await msgRes.json();
          const headers = msgData.payload.headers;
          const subject = getHeader(headers, "Subject");
          const from = getHeader(headers, "From");
          const date = getHeader(headers, "Date");

          let bodyText = "";
          if (msgData.payload.body?.data) {
            bodyText = decodeBase64Url(msgData.payload.body.data);
          } else if (msgData.payload.parts) {
            bodyText = extractTextFromParts(msgData.payload.parts);
          }
          if (!bodyText.trim()) continue;

          const parsed = await parseBillWithClaude(apiKey, subject, from, date, bodyText);
          if (!parsed?.isUtilityBill || !parsed.providerName || !parsed.amount) continue;

          const category = VALID_CATEGORIES.includes(parsed.category ?? "")
            ? parsed.category!
            : "other";

          let providerId: string | null = null;
          const providerKey = parsed.providerName.toLowerCase();
          const existingProvider = providers.get(providerKey);

          if (existingProvider) {
            providerId = existingProvider.id;
          } else {
            const senderMatch = from.match(/<(.+?)>/);
            const senderEmail = senderMatch ? senderMatch[1] : from;

            const { data: newProvider } = await supabase
              .from("utility_providers")
              .insert({
                user_id: conn.user_id,
                name: parsed.providerName,
                category,
                sender_email: senderEmail,
              })
              .select("id, name, category")
              .single()
              .returns<Pick<DbUtilityProvider, "id" | "name" | "category">>();

            if (newProvider) {
              providerId = newProvider.id;
              providers.set(providerKey, newProvider);
            }
          }

          await supabase.from("utility_bills").insert({
            user_id: conn.user_id,
            provider_id: providerId,
            provider_name: parsed.providerName,
            category,
            amount: parsed.amount,
            due_date: parsed.dueDate ?? null,
            billing_period_start: parsed.billingPeriodStart ?? null,
            billing_period_end: parsed.billingPeriodEnd ?? null,
            account_number: parsed.accountNumber ?? null,
            gmail_message_id: msg.id,
            source: "gmail_scan",
            notes: "",
          });

          totalImported++;
          lastMessageId = msg.id;
        } catch (err) {
          console.error(`Cron: error processing message ${msg.id}:`, err);
        }
      }

      await updateLastScan(connectionId, lastMessageId);
    } catch (err) {
      console.error(`Cron: error scanning user ${conn.user_id}:`, err);
    }
  }

  return NextResponse.json({
    usersScanned: connections.length,
    totalImported,
  });
}

async function parseBillWithClaude(
  apiKey: string,
  subject: string,
  from: string,
  date: string,
  bodyText: string
): Promise<ParsedBill | null> {
  const prompt = `You are analyzing an email to determine if it is a utility bill or payment confirmation.

Email Subject: ${subject}
From: ${from}
Date: ${date}
Body:
${bodyText.slice(0, 4000)}

If this email is NOT a utility bill, payment confirmation, or account statement for a household utility service, respond with: {"isUtilityBill": false}

If it IS a utility bill, extract the following and respond with a JSON object:
{
  "isUtilityBill": true,
  "providerName": "the utility company name",
  "category": "one of: electric, gas, water, internet, trash, sewer, phone, other",
  "amount": 127.43,
  "dueDate": "YYYY-MM-DD" or null,
  "billingPeriodStart": "YYYY-MM-DD" or null,
  "billingPeriodEnd": "YYYY-MM-DD" or null,
  "accountNumber": "account number string" or null
}

IMPORTANT:
- Only extract bills for residential utility services (electric, gas, water, internet, trash, sewer, phone)
- Do NOT classify marketing emails, promotional offers, or general newsletters as utility bills
- The amount should be the total due, not a partial or estimated amount
- Return ONLY the JSON object, no other text.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const textContent: string = data.content?.[0]?.text ?? "{}";
    const jsonStr = textContent
      .replace(/```json?\n?/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(jsonStr) as ParsedBill;
  } catch {
    return null;
  }
}
