import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

async function verifyManagerAccess(clientId: string, requireUnactivated: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getServiceClient();
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  // Superadmins can access any client
  if (callerProfile?.role === "superadmin") {
    return { user, admin };
  }

  if (callerProfile?.role !== "manager") return null;

  // Verify this client belongs to this manager
  const { data: clientProfile } = await admin
    .from("profiles")
    .select("id, managed_by, activated_at")
    .eq("id", clientId)
    .eq("managed_by", user.id)
    .single();

  if (!clientProfile) return null;

  // For write operations, block access to activated clients (handoff complete)
  if (requireUnactivated && clientProfile.activated_at) return null;

  return { user, admin };
}

// GET /api/admin/clients/[id] — client detail (read-only access even after activation)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await verifyManagerAccess(id, false);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { admin } = auth;

  const { data: { user: clientUser } } = await admin.auth.admin.getUserById(id);
  if (!clientUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: profile } = await admin
    .from("profiles")
    .select("id, managed_by, activated_at, created_at")
    .eq("id", id)
    .single();

  // Get data counts
  const { count: assetCount } = await admin
    .from("home_assets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", id);

  const { count: inventoryCount } = await admin
    .from("inventory_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", id);

  // Get actual assets for display
  const { data: assets } = await admin
    .from("home_assets")
    .select("id, name, category, make, model")
    .eq("user_id", id)
    .order("name");

  let status: "pending" | "invited" | "activated" = "pending";
  if (profile?.activated_at) {
    status = "activated";
  } else if (clientUser.invited_at) {
    status = "invited";
  }

  return NextResponse.json({
    client: {
      id,
      email: clientUser.email,
      fullName: (clientUser.user_metadata?.full_name as string) ?? null,
      propertyName: (clientUser.user_metadata?.property_name as string) ?? null,
      status,
      activatedAt: profile?.activated_at ?? null,
      createdAt: profile?.created_at ?? clientUser.created_at,
      assetCount: assetCount ?? 0,
      inventoryCount: inventoryCount ?? 0,
      assets: assets ?? [],
    },
  });
}

// DELETE /api/admin/clients/[id] — delete un-activated client only
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await verifyManagerAccess(id, true);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Delete all client data
  const { admin } = auth;
  await admin.from("inventory_items").delete().eq("user_id", id);
  await admin.from("home_assets").delete().eq("user_id", id);
  await admin.from("services").delete().eq("user_id", id);
  await admin.from("profiles").delete().eq("id", id);

  // Delete the auth user
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
