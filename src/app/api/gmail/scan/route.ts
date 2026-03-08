import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getGmailAccessToken, gmailFetch, updateLastScan } from "@/lib/gmail-client";
import type { DbUtilityBill, DbUtilityProvider } from "@/lib/supabase";

interface GmailMessage {
  id: string;
  threadId: string;
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
  "electric",
  "gas",
  "water",
  "internet",
  "trash",
  "sewer",
  "phone",
  "other",
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

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokenResult = await getGmailAccessToken(user.id);
  if (!tokenResult) {
    return NextResponse.json({ error: "Gmail not connected" }, { status: 404 });
  }

  const { accessToken, connectionId } = tokenResult;

  // Parse optional body
  let lookbackDays = 90;
  try {
    const body = await req.json();
    if (body.lookbackDays && typeof body.lookbackDays === "number") {
      lookbackDays = Math.min(body.lookbackDays, 365);
    }
  } catch {
    // No body or invalid JSON — use defaults
  }

  const afterDate = new Date(Date.now() - lookbackDays * 86_400_000);
  const afterStr = `${afterDate.getFullYear()}/${String(afterDate.getMonth() + 1).padStart(2, "0")}/${String(afterDate.getDate()).padStart(2, "0")}`;

  // Search Gmail for utility bill emails
  const query = `subject:(bill OR statement OR invoice OR "payment due" OR "amount due" OR utility OR electric OR gas OR water OR internet) after:${afterStr}`;
  const searchRes = await gmailFetch(
    accessToken,
    `messages?q=${encodeURIComponent(query)}&maxResults=50`
  );

  if (!searchRes.ok) {
    console.error("Gmail search failed:", searchRes.status);
    return NextResponse.json(
      { error: "Gmail search failed" },
      { status: 502 }
    );
  }

  const searchData = await searchRes.json();
  const messages: GmailMessage[] = searchData.messages ?? [];

  if (messages.length === 0) {
    await updateLastScan(connectionId, null);
    return NextResponse.json({ scanned: 0, imported: 0, skipped: 0 });
  }

  // Check which message IDs already exist
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const messageIds = messages.map((m) => m.id);
  const { data: existing } = await serviceClient
    .from("utility_bills")
    .select("gmail_message_id")
    .eq("user_id", user.id)
    .in("gmail_message_id", messageIds)
    .returns<Pick<DbUtilityBill, "gmail_message_id">[]>();

  const existingIds = new Set((existing ?? []).map((e) => e.gmail_message_id));

  // Fetch existing providers for this user
  const { data: providerRows } = await serviceClient
    .from("utility_providers")
    .select("id, name, category")
    .eq("user_id", user.id)
    .returns<Pick<DbUtilityProvider, "id" | "name" | "category">[]>();

  const providers = new Map(
    (providerRows ?? []).map((p) => [p.name.toLowerCase(), p])
  );

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI parsing not configured" },
      { status: 500 }
    );
  }

  let imported = 0;
  let skipped = 0;
  let lastMessageId: string | null = null;

  for (const msg of messages) {
    if (existingIds.has(msg.id)) {
      skipped++;
      continue;
    }

    try {
      // Fetch full message
      const msgRes = await gmailFetch(
        accessToken,
        `messages/${msg.id}?format=full`
      );
      if (!msgRes.ok) continue;

      const msgData: GmailMessageFull = await msgRes.json();
      const headers = msgData.payload.headers;
      const subject = getHeader(headers, "Subject");
      const from = getHeader(headers, "From");
      const date = getHeader(headers, "Date");

      // Extract body text
      let bodyText = "";
      if (msgData.payload.body?.data) {
        bodyText = decodeBase64Url(msgData.payload.body.data);
      } else if (msgData.payload.parts) {
        bodyText = extractTextFromParts(msgData.payload.parts);
      }

      if (!bodyText.trim()) continue;

      // Parse with Claude
      const parsed = await parseBillWithClaude(
        apiKey,
        subject,
        from,
        date,
        bodyText
      );

      if (!parsed || !parsed.isUtilityBill || !parsed.providerName || !parsed.amount) {
        continue;
      }

      // Validate category
      const category = VALID_CATEGORIES.includes(parsed.category ?? "")
        ? parsed.category!
        : "other";

      // Find or create provider
      let providerId: string | null = null;
      const providerKey = parsed.providerName.toLowerCase();
      const existingProvider = providers.get(providerKey);

      if (existingProvider) {
        providerId = existingProvider.id;
      } else {
        // Extract sender email
        const senderMatch = from.match(/<(.+?)>/);
        const senderEmail = senderMatch ? senderMatch[1] : from;

        const { data: newProvider } = await serviceClient
          .from("utility_providers")
          .insert({
            user_id: user.id,
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

      // Insert the bill
      await serviceClient.from("utility_bills").insert({
        user_id: user.id,
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

      imported++;
      lastMessageId = msg.id;
    } catch (err) {
      console.error(`Error processing message ${msg.id}:`, err);
    }
  }

  await updateLastScan(connectionId, lastMessageId);

  return NextResponse.json({
    scanned: messages.length,
    imported,
    skipped,
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
- If you see multiple amounts, use the "total due" or "amount due" or "balance due"
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

    if (!res.ok) {
      console.error("Anthropic API error:", res.status);
      return null;
    }

    const data = await res.json();
    const textContent: string = data.content?.[0]?.text ?? "{}";
    const jsonStr = textContent
      .replace(/```json?\n?/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(jsonStr) as ParsedBill;
  } catch (err) {
    console.error("Claude parsing error:", err);
    return null;
  }
}
