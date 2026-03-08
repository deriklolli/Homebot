import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { decryptToken } from "@/lib/gmail-crypto";
import { NextResponse } from "next/server";
import type { DbGmailConnection } from "@/lib/supabase";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: conn } = await serviceClient
    .from("gmail_connections")
    .select("id, access_token_encrypted")
    .eq("user_id", user.id)
    .limit(1)
    .single()
    .returns<Pick<DbGmailConnection, "id" | "access_token_encrypted">>();

  if (!conn) {
    return NextResponse.json({ error: "No Gmail connection" }, { status: 404 });
  }

  // Revoke token with Google (best effort)
  try {
    const token = decryptToken(conn.access_token_encrypted);
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
      { method: "POST" }
    );
  } catch {
    // Revocation failure is non-fatal
  }

  await serviceClient
    .from("gmail_connections")
    .delete()
    .eq("id", conn.id);

  return NextResponse.json({ success: true });
}
