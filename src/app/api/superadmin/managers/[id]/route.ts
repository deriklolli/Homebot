import { verifySuperadmin } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

// DELETE /api/superadmin/managers/[id] — delete a manager account
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifySuperadmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { admin } = auth;

  // Verify target is actually a manager
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", id)
    .eq("role", "manager")
    .single();

  if (!profile) return NextResponse.json({ error: "Manager not found" }, { status: 404 });

  // Check for un-activated clients managed by this manager
  const { count: activeClientCount } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("managed_by", id)
    .is("activated_at", null);

  if (activeClientCount && activeClientCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: manager has ${activeClientCount} un-activated client(s). Delete or reassign them first.` },
      { status: 400 }
    );
  }

  // Null out managed_by for any activated clients (they own their own data now)
  await admin
    .from("profiles")
    .update({ managed_by: null })
    .eq("managed_by", id);

  // Delete the auth user (cascades to profile via ON DELETE CASCADE)
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
