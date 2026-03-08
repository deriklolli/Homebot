import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { encryptToken } from "@/lib/gmail-crypto";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${origin}/settings?gmail=error&reason=${error ?? "no_code"}`
    );
  }

  // Verify authenticated user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Verify CSRF state
  const expectedState = createHmac(
    "sha256",
    process.env.GMAIL_TOKEN_ENCRYPTION_KEY!
  )
    .update(user.id)
    .digest("hex");

  if (state !== expectedState) {
    return NextResponse.redirect(
      `${origin}/settings?gmail=error&reason=invalid_state`
    );
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const msg = await tokenRes.text();
      console.error("Google token exchange failed:", msg);
      return NextResponse.redirect(
        `${origin}/settings?gmail=error&reason=token_exchange`
      );
    }

    const tokens = await tokenRes.json();
    const accessToken: string = tokens.access_token;
    const refreshToken: string = tokens.refresh_token;
    const expiresIn: number = tokens.expires_in ?? 3600;

    // Get the user's Gmail address
    const profileRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const profile = await profileRes.json();
    const googleEmail: string = profile.emailAddress;

    // Store encrypted tokens
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await serviceClient.from("gmail_connections").upsert(
      {
        user_id: user.id,
        google_email: googleEmail,
        access_token_encrypted: encryptToken(accessToken),
        refresh_token_encrypted: encryptToken(refreshToken),
        token_expires_at: new Date(
          Date.now() + expiresIn * 1000
        ).toISOString(),
      },
      { onConflict: "user_id" }
    );

    return NextResponse.redirect(`${origin}/utility-bills?gmail=just_connected`);
  } catch (err) {
    console.error("Gmail OAuth callback error:", err);
    return NextResponse.redirect(
      `${origin}/settings?gmail=error&reason=unknown`
    );
  }
}
