import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { DbGmailConnection } from "@/lib/supabase";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: conn } = await supabase
    .from("gmail_connections")
    .select("google_email, last_scan_at")
    .eq("user_id", user.id)
    .limit(1)
    .single()
    .returns<Pick<DbGmailConnection, "google_email" | "last_scan_at">>();

  if (!conn) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    email: conn.google_email,
    lastScanAt: conn.last_scan_at,
  });
}
