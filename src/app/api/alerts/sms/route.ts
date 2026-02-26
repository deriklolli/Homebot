import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

interface DbInventoryAlert {
  id: string;
  name: string;
  next_reminder_date: string;
  user_id: string;
}

interface DbSmsPref {
  user_id: string;
  sms_enabled: boolean;
  sms_phone: string | null;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function buildMessage(items: DbInventoryAlert[]): string {
  const lines = items.map((item) => {
    const days = daysUntil(item.next_reminder_date);
    let label: string;
    if (days < 0) {
      label = `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`;
    } else if (days === 0) {
      label = "due today";
    } else {
      label = `due in ${days} day${days !== 1 ? "s" : ""}`;
    }
    return `- ${item.name} (${label})`;
  });
  return `HOMEBOT Inventory Alert:\n${lines.join("\n")}`;
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
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !twilioPhone) {
    return NextResponse.json(
      { error: "Missing Twilio configuration" },
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

  // Query inventory items due within 7 days or overdue
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysOut = new Date(today);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  const cutoff = sevenDaysOut.toISOString().split("T")[0];

  const { data: items, error } = await supabase
    .from("inventory_items")
    .select("id, name, next_reminder_date, user_id")
    .lte("next_reminder_date", cutoff)
    .order("next_reminder_date", { ascending: true })
    .returns<DbInventoryAlert[]>();

  if (error) {
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

  // Fetch SMS preferences for affected users
  const userIds = [...itemsByUser.keys()];
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id, sms_enabled, sms_phone")
    .in("user_id", userIds)
    .returns<DbSmsPref[]>();

  const prefMap = new Map<string, DbSmsPref>();
  for (const p of prefs || []) {
    prefMap.set(p.user_id, p);
  }

  // Backward compat: if no preferences exist and ALERT_PHONE_NUMBER is set,
  // send all alerts to that number (legacy single-user behavior)
  const legacyPhone = process.env.ALERT_PHONE_NUMBER;
  if (prefMap.size === 0 && legacyPhone) {
    const allItems = [...itemsByUser.values()].flat();
    const message = buildMessage(allItems);
    try {
      const client = twilio(accountSid, authToken);
      await client.messages.create({
        body: message,
        from: twilioPhone,
        to: legacyPhone,
      });
      return NextResponse.json({ sent: true, count: allItems.length, mode: "legacy" });
    } catch (err) {
      console.error("Twilio SMS error:", err);
      return NextResponse.json(
        { error: "Failed to send SMS" },
        { status: 500 }
      );
    }
  }

  // Send per-user SMS to users who opted in
  const client = twilio(accountSid, authToken);
  const results: { userId: string; success: boolean; error?: string }[] = [];

  for (const [userId, userItems] of itemsByUser) {
    const pref = prefMap.get(userId);
    // Default: SMS disabled unless user explicitly enabled it
    if (!pref?.sms_enabled || !pref.sms_phone) {
      continue;
    }

    const message = buildMessage(userItems);
    try {
      await client.messages.create({
        body: message,
        from: twilioPhone,
        to: pref.sms_phone,
      });
      results.push({ userId, success: true });
    } catch (err) {
      console.error(`Twilio SMS error for ${userId}:`, err);
      results.push({ userId, success: false, error: "send failed" });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  return NextResponse.json({
    sent: successCount > 0,
    smsSent: successCount,
    details: results,
  });
}
