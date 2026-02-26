import { verifySuperadmin } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

// GET /api/superadmin/organizations/[id] — org detail with its managers
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifySuperadmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { admin } = auth;

  const { data: org, error } = await admin
    .from("organizations")
    .select("id, name, created_at")
    .eq("id", id)
    .single();

  if (error || !org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get managers in this org
  const { data: managerProfiles } = await admin
    .from("profiles")
    .select("id, activated_at, created_at")
    .eq("organization_id", id)
    .eq("role", "manager");

  const managers = await Promise.all(
    (managerProfiles ?? []).map(async (profile) => {
      const { data: { user: managerUser } } = await admin.auth.admin.getUserById(profile.id);

      // Count clients for this manager
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("managed_by", profile.id);

      return {
        id: profile.id,
        email: managerUser?.email ?? "",
        fullName: (managerUser?.user_metadata?.full_name as string) ?? null,
        status: profile.activated_at ? "active" : "pending",
        clientCount: count ?? 0,
        createdAt: profile.created_at,
      };
    })
  );

  return NextResponse.json({
    organization: { id: org.id, name: org.name, createdAt: org.created_at },
    managers,
  });
}

// DELETE /api/superadmin/organizations/[id] — delete org
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifySuperadmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Check for managers still in this org
  const { count: managerCount } = await auth.admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", id)
    .eq("role", "manager");

  if (managerCount && managerCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: organization has ${managerCount} manager(s). Remove them first.` },
      { status: 400 }
    );
  }

  const { error } = await auth.admin
    .from("organizations")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: "Failed to delete organization" }, { status: 500 });

  return NextResponse.json({ success: true });
}
