import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { buildInventoryAlertEmail, type AlertEmailItem } from "@/lib/email-templates";

interface DbInventoryAlert {
  id: string;
  name: string;
  next_reminder_date: string;
  purchase_url: string;
  user_id: string;
}

interface DbNotificationPref {
  user_id: string;
  email_enabled: boolean;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export async function GET(req: NextRequest) {
  // Verify authorization — CRON_SECRET is required
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check required env vars
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "HOMEBOT <onboarding@resend.dev>";
  if (!resendApiKey) {
    return NextResponse.json(
      { error: "Missing RESEND_API_KEY" },
      { status: 500 }
    );
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  // Query all inventory items due within 7 days or overdue
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysOut = new Date(today);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  const cutoff = sevenDaysOut.toISOString().split("T")[0];

  const { data: items, error } = await supabase
    .from("inventory_items")
    .select("id, name, next_reminder_date, purchase_url, user_id")
    .lte("next_reminder_date", cutoff)
    .order("next_reminder_date", { ascending: true })
    .returns<DbInventoryAlert[]>();

  if (error) {
    console.error("Failed to fetch inventory items:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory items" },
      { status: 500 }
    );
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ sent: false, reason: "no alerts" });
  }

  // Group items by user_id
  const itemsByUser = new Map<string, DbInventoryAlert[]>();
  for (const item of items) {
    const existing = itemsByUser.get(item.user_id) || [];
    existing.push(item);
    itemsByUser.set(item.user_id, existing);
  }

  // Fetch notification preferences for affected users
  const userIds = [...itemsByUser.keys()];
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id, email_enabled")
    .in("user_id", userIds)
    .returns<DbNotificationPref[]>();

  const prefMap = new Map<string, boolean>();
  for (const p of prefs || []) {
    prefMap.set(p.user_id, p.email_enabled);
  }

  // Send per-user emails
  const resend = new Resend(resendApiKey);
  const results: { userId: string; success: boolean; error?: string }[] = [];

  for (const [userId, userItems] of itemsByUser) {
    // Default to email enabled if no preference row exists
    const emailEnabled = prefMap.get(userId) ?? true;
    if (!emailEnabled) {
      results.push({ userId, success: false, error: "email disabled" });
      continue;
    }

    // Get user email from Supabase Auth
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user?.email) {
      results.push({ userId, success: false, error: "no email found" });
      continue;
    }

    const userName =
      (user.user_metadata?.full_name as string) ||
      user.email.split("@")[0];

    const enrichedItems: AlertEmailItem[] = userItems.map((item) => ({
      name: item.name,
      next_reminder_date: item.next_reminder_date,
      daysUntil: daysUntil(item.next_reminder_date),
      purchase_url: item.purchase_url,
    }));

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined;
    const html = buildInventoryAlertEmail(userName, enrichedItems, siteUrl);

    try {
      await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: `HOMEBOT: ${enrichedItems.length} inventory item${enrichedItems.length !== 1 ? "s" : ""} need${enrichedItems.length === 1 ? "s" : ""} attention`,
        html,
      });
      results.push({ userId, success: true });
    } catch (err) {
      console.error(`Resend email error for ${userId}:`, err);
      results.push({ userId, success: false, error: "send failed" });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  return NextResponse.json({
    sent: successCount > 0,
    emailsSent: successCount,
    details: results,
  });
}
