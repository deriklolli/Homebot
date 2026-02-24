import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

interface DbInventoryAlert {
  id: string;
  name: string;
  next_reminder_date: string;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export async function GET(req: NextRequest) {
  // Verify authorization
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Check required env vars
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  const alertPhone = process.env.ALERT_PHONE_NUMBER;

  if (!accountSid || !authToken || !twilioPhone || !alertPhone) {
    return NextResponse.json(
      { error: "Missing Twilio configuration" },
      { status: 500 }
    );
  }

  // Query inventory items due within 7 days or overdue
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysOut = new Date(today);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  const cutoff = sevenDaysOut.toISOString().split("T")[0];

  const { data: items, error } = await supabase
    .from("inventory_items")
    .select("id, name, next_reminder_date")
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

  // Build message
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

  const message = `HOMEBOT Inventory Alert:\n${lines.join("\n")}`;

  // Send SMS via Twilio
  try {
    const client = twilio(accountSid, authToken);
    await client.messages.create({
      body: message,
      from: twilioPhone,
      to: alertPhone,
    });

    return NextResponse.json({ sent: true, count: items.length });
  } catch (err) {
    console.error("Twilio SMS error:", err);
    return NextResponse.json(
      { error: "Failed to send SMS" },
      { status: 500 }
    );
  }
}
