import { createClient } from "@/lib/supabase/server";
import { createHmac } from "crypto";
import { NextResponse } from "next/server";

// GET /api/calendar/token — returns an HMAC token for the current user's calendar feed
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const token = createHmac("sha256", secret).update(user.id).digest("hex").slice(0, 32);

  return NextResponse.json({ token });
}
