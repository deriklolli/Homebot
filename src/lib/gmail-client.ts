// Server-only — Gmail API helpers with automatic token refresh
import { createClient } from "@supabase/supabase-js";
import { encryptToken, decryptToken } from "./gmail-crypto";
import type { DbGmailConnection } from "./supabase";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface GmailTokenResult {
  accessToken: string;
  email: string;
  connectionId: string;
}

export async function getGmailAccessToken(
  userId: string
): Promise<GmailTokenResult | null> {
  const supabase = getServiceClient();

  const { data: conn } = await supabase
    .from("gmail_connections")
    .select(
      "id, google_email, access_token_encrypted, refresh_token_encrypted, token_expires_at"
    )
    .eq("user_id", userId)
    .limit(1)
    .single()
    .returns<
      Pick<
        DbGmailConnection,
        | "id"
        | "google_email"
        | "access_token_encrypted"
        | "refresh_token_encrypted"
        | "token_expires_at"
      >
    >();

  if (!conn) return null;

  const expiresAt = new Date(conn.token_expires_at).getTime();
  const bufferMs = 5 * 60 * 1000; // refresh 5 min early

  if (Date.now() < expiresAt - bufferMs) {
    return {
      accessToken: decryptToken(conn.access_token_encrypted),
      email: conn.google_email,
      connectionId: conn.id,
    };
  }

  // Token expired or about to — refresh it
  const refreshToken = decryptToken(conn.refresh_token_encrypted);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    console.error("Gmail token refresh failed:", res.status);
    return null;
  }

  const tokens = await res.json();
  const newAccessToken: string = tokens.access_token;
  const expiresIn: number = tokens.expires_in ?? 3600;
  const newExpiresAt = new Date(
    Date.now() + expiresIn * 1000
  ).toISOString();

  await supabase
    .from("gmail_connections")
    .update({
      access_token_encrypted: encryptToken(newAccessToken),
      token_expires_at: newExpiresAt,
    })
    .eq("id", conn.id);

  return {
    accessToken: newAccessToken,
    email: conn.google_email,
    connectionId: conn.id,
  };
}

export async function gmailFetch(
  accessToken: string,
  endpoint: string
): Promise<Response> {
  return fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15000),
  });
}

export async function updateLastScan(
  connectionId: string,
  lastMessageId: string | null
) {
  const supabase = getServiceClient();
  await supabase
    .from("gmail_connections")
    .update({
      last_scan_at: new Date().toISOString(),
      last_scan_message_id: lastMessageId,
    })
    .eq("id", connectionId);
}
