import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// POST /api/admin/clients/[id]/invite — send or resend invite email
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getServiceClient();

  // Verify caller is manager or superadmin
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "manager" && callerProfile?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify client exists and belongs to this manager (or caller is superadmin)
  const { data: clientProfile } = await admin
    .from("profiles")
    .select("id, managed_by, activated_at")
    .eq("id", id)
    .single();

  if (!clientProfile) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (clientProfile.activated_at) return NextResponse.json({ error: "Client already activated" }, { status: 400 });

  if (callerProfile.role === "manager" && clientProfile.managed_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get client email
  const { data: { user: clientUser } } = await admin.auth.admin.getUserById(id);
  if (!clientUser?.email) return NextResponse.json({ error: "Client has no email" }, { status: 400 });

  // Generate invite link
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email: clientUser.email,
    options: {
      redirectTo: `${req.nextUrl.origin}/auth/callback?next=/activate`,
    },
  });

  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });

  // Send via Resend
  if (process.env.RESEND_API_KEY && linkData?.properties?.action_link) {
    const { escapeHtml } = await import("@/lib/admin-auth");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const managerName = (user.user_metadata?.full_name as string) || "Your property manager";
    const propertyName = (clientUser.user_metadata?.property_name as string) || "your new home";
    const safeManager = escapeHtml(managerName);
    const safeProperty = escapeHtml(propertyName);

    try {
      await resend.emails.send({
        from: "HOMEBOT <alerts@homebot.house>",
        to: clientUser.email,
        subject: `${managerName.replace(/[\r\n]/g, " ")} has set up your HOMEBOT account`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #22201d;">Welcome to HOMEBOT</h2>
            <p><strong>${safeManager}</strong> has prepared a home management account for <strong>${safeProperty}</strong>.</p>
            <p>Your account has been pre-loaded with your home's assets and maintenance schedule. Click below to set your password and take over:</p>
            <p><a href="${linkData.properties.action_link}" style="display: inline-block; padding: 10px 20px; background: #FF692D; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Set Up Your Account</a></p>
            <p style="color: #84827f; font-size: 13px;">If you didn't expect this invitation, you can ignore this email.</p>
          </div>
        `,
      });
    } catch (e) {
      console.error("Failed to send client invite email:", e);
    }
  }

  return NextResponse.json({ success: true, invited: true });
}
