import { verifySuperadmin } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/superadmin/organizations — list all orgs with manager/client counts
export async function GET() {
  const auth = await verifySuperadmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { admin } = auth;

  const { data: orgs, error } = await admin
    .from("organizations")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to load organizations" }, { status: 500 });

  // Get manager and client counts per org
  const orgList = await Promise.all(
    (orgs ?? []).map(async (org) => {
      const { count: managerCount } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", org.id)
        .eq("role", "manager");

      const { count: clientCount } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .not("managed_by", "is", null)
        .in(
          "managed_by",
          (await admin
            .from("profiles")
            .select("id")
            .eq("organization_id", org.id)
            .eq("role", "manager")
          ).data?.map((p) => p.id) ?? []
        );

      return {
        id: org.id,
        name: org.name,
        managerCount: managerCount ?? 0,
        clientCount: clientCount ?? 0,
        createdAt: org.created_at,
      };
    })
  );

  return NextResponse.json({ organizations: orgList });
}

// POST /api/superadmin/organizations — create a new org
export async function POST(req: NextRequest) {
  const auth = await verifySuperadmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const { data, error } = await auth.admin
    .from("organizations")
    .insert({ name })
    .select("id, name, created_at")
    .single();

  if (error) return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });

  return NextResponse.json({ organization: data }, { status: 201 });
}
