import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

// POST /api/activate — mark the current user's account as activated (handoff)
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getServiceClient();

  // Verify user has a managed_by (was created by a manager)
  const { data: profile } = await admin
    .from("profiles")
    .select("id, managed_by, activated_at")
    .eq("id", user.id)
    .single();

  if (!profile?.managed_by) {
    return NextResponse.json({ error: "Account is not managed" }, { status: 400 });
  }

  if (profile.activated_at) {
    return NextResponse.json({ error: "Already activated" }, { status: 400 });
  }

  // Atomic update — only set if still null (prevents TOCTOU race)
  const { data: updated } = await admin
    .from("profiles")
    .update({ activated_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("activated_at", null)
    .select("id");

  if (!updated?.length) {
    return NextResponse.json({ error: "Already activated" }, { status: 400 });
  }

  // Update app_metadata (not user-writable) to mark as activated for middleware
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...user.app_metadata,
      activated: true,
    },
  });

  return NextResponse.json({ success: true });
}
