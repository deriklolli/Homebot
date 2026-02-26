import { verifyManager } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/admin/clients — list clients managed by current manager
export async function GET() {
  const auth = await verifyManager();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { user, admin } = auth;

  const { data: clientProfiles, error } = await admin
    .from("profiles")
    .select("id, managed_by, activated_at, created_at")
    .eq("managed_by", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const clients = await Promise.all(
    (clientProfiles ?? []).map(async (profile) => {
      const { data: { user: clientUser } } = await admin.auth.admin.getUserById(profile.id);

      // Count pre-loaded assets and inventory
      const { count: assetCount } = await admin
        .from("home_assets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id);

      const { count: inventoryCount } = await admin
        .from("inventory_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id);

      let status: "pending" | "invited" | "activated" = "pending";
      if (profile.activated_at) {
        status = "activated";
      } else if (clientUser?.invited_at) {
        status = "invited";
      }

      return {
        id: profile.id,
        email: clientUser?.email ?? "",
        fullName: (clientUser?.user_metadata?.full_name as string) ?? null,
        propertyName: (clientUser?.user_metadata?.property_name as string) ?? null,
        status,
        activatedAt: profile.activated_at,
        createdAt: profile.created_at,
        assetCount: assetCount ?? 0,
        inventoryCount: inventoryCount ?? 0,
      };
    })
  );

  return NextResponse.json({ clients });
}

// POST /api/admin/clients — create a client account with optional pre-loaded data
export async function POST(req: NextRequest) {
  const auth = await verifyManager();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { user, admin } = auth;

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const fullName = body.fullName?.trim() || null;
  const propertyName = body.propertyName?.trim() || null;

  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  // Create auth user — security-sensitive fields in app_metadata (not user-modifiable)
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    user_metadata: { full_name: fullName, property_name: propertyName },
    app_metadata: { role: "homeowner", managed_by: user.id },
    email_confirm: false,
  });

  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });

  const clientId = newUser.user.id;

  // Create profile with managed_by
  const { error: profileError } = await admin.from("profiles").upsert({
    id: clientId,
    role: "homeowner",
    managed_by: user.id,
  }, { onConflict: "id" });

  if (profileError) {
    await admin.auth.admin.deleteUser(clientId);
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }

  // Pre-load home assets
  let assetsCreated = 0;
  if (body.homeAssets?.length) {
    const { data: inserted } = await admin.from("home_assets").insert(
      body.homeAssets.map((a: Record<string, unknown>) => ({
        user_id: clientId,
        name: a.name || "",
        category: a.category || "",
        make: a.make || "",
        model: a.model || "",
        serial_number: a.serialNumber || "",
        purchase_date: a.purchaseDate || null,
        warranty_expiration: a.warrantyExpiration || null,
        location: a.location || "",
        notes: a.notes || "",
        product_url: a.productUrl || "",
      }))
    ).select("id");
    assetsCreated = inserted?.length ?? 0;
  }

  // Pre-load inventory items
  let inventoryCreated = 0;
  if (body.inventoryItems?.length) {
    const { data: inserted } = await admin.from("inventory_items").insert(
      body.inventoryItems.map((i: Record<string, unknown>) => ({
        user_id: clientId,
        name: i.name || "",
        description: i.description || "",
        frequency_months: i.frequencyMonths || 6,
        next_reminder_date: i.nextReminderDate || new Date().toISOString().split("T")[0],
        purchase_url: i.purchaseUrl || "",
        thumbnail_url: i.thumbnailUrl || "",
        notes: i.notes || "",
        cost: i.cost || null,
        home_asset_id: i.homeAssetId || null,
      }))
    ).select("id");
    inventoryCreated = inserted?.length ?? 0;
  }

  return NextResponse.json({
    client: {
      id: clientId,
      email,
      fullName,
      propertyName,
      assetsCreated,
      inventoryCreated,
    },
  }, { status: 201 });
}
