import { verifySuperadmin } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// GET /api/superadmin/managers — list all managers, optionally filtered by org
export async function GET(req: NextRequest) {
  const auth = await verifySuperadmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { admin } = auth;
  const orgId = req.nextUrl.searchParams.get("org");

  let query = admin
    .from("profiles")
    .select("id, organization_id, activated_at, created_at")
    .eq("role", "manager")
    .order("created_at", { ascending: false });

  if (orgId) {
    query = query.eq("organization_id", orgId);
  }

  const { data: profiles, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const managers = await Promise.all(
    (profiles ?? []).map(async (profile) => {
      const { data: { user: managerUser } } = await admin.auth.admin.getUserById(profile.id);

      // Get org name
      let orgName = "";
      if (profile.organization_id) {
        const { data: org } = await admin
          .from("organizations")
          .select("name")
          .eq("id", profile.organization_id)
          .single();
        orgName = org?.name ?? "";
      }

      // Count clients
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("managed_by", profile.id);

      return {
        id: profile.id,
        email: managerUser?.email ?? "",
        fullName: (managerUser?.user_metadata?.full_name as string) ?? null,
        organizationId: profile.organization_id,
        organizationName: orgName,
        clientCount: count ?? 0,
        status: profile.activated_at ? "active" : "pending",
        createdAt: profile.created_at,
      };
    })
  );

  return NextResponse.json({ managers });
}

// POST /api/superadmin/managers — create a manager account and send invite
export async function POST(req: NextRequest) {
  const auth = await verifySuperadmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { admin } = auth;

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const fullName = body.fullName?.trim() || null;
  const organizationId = body.organizationId;

  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!organizationId) return NextResponse.json({ error: "Organization is required" }, { status: 400 });

  // Verify org exists
  const { data: org } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .single();

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  // Create auth user — role stored in app_metadata (not user-modifiable)
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    user_metadata: { full_name: fullName },
    app_metadata: { role: "manager" },
    email_confirm: false,
  });

  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });

  // Create profile
  const { error: profileError } = await admin.from("profiles").upsert({
    id: newUser.user.id,
    role: "manager",
    organization_id: organizationId,
  }, { onConflict: "id" });

  if (profileError) {
    // Roll back: delete the auth user to avoid inconsistent state
    await admin.auth.admin.deleteUser(newUser.user.id);
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }

  // Generate invite link
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo: `${req.nextUrl.origin}/auth/callback?next=/activate`,
    },
  });

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  // Send invite email via Resend
  let emailSent = false;
  let emailError: string | null = null;

  if (!process.env.RESEND_API_KEY) {
    emailError = "RESEND_API_KEY not configured";
  } else if (!linkData?.properties?.action_link) {
    emailError = "No action_link generated";
  } else {
    const { escapeHtml } = await import("@/lib/admin-auth");
    const safeOrgName = escapeHtml(org.name);
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      const result = await resend.emails.send({
        from: "HOMEBOT <onboarding@resend.dev>",
        to: email,
        subject: `You've been invited to HOMEBOT as a ${org.name.replace(/[\r\n]/g, " ")} manager`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #22201d;">Welcome to HOMEBOT</h2>
            <p>You've been added as a property manager for <strong>${safeOrgName}</strong>.</p>
            <p>Click the link below to set your password and get started:</p>
            <p><a href="${linkData.properties.action_link}" style="display: inline-block; padding: 10px 20px; background: #FF692D; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Set Up Your Account</a></p>
            <p style="color: #84827f; font-size: 13px;">If you didn't expect this invitation, you can ignore this email.</p>
          </div>
        `,
      });
      if (result.error) {
        emailError = result.error.message;
      } else {
        emailSent = true;
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({
    manager: {
      id: newUser.user.id,
      email,
      fullName,
      organizationId,
      organizationName: org.name,
    },
    emailSent,
    emailError,
  }, { status: 201 });
}
