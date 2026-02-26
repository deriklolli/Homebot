import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If an explicit next param was provided (e.g., /activate), use it
      // Validate to prevent open redirect attacks
      if (next && next.startsWith("/") && !next.startsWith("//")) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Otherwise redirect based on role
      const { data: { user } } = await supabase.auth.getUser();
      const role = (user?.app_metadata?.role as string) ?? "homeowner";
      const dest = role === "superadmin" ? "/superadmin" : role === "manager" ? "/admin" : "/";
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
