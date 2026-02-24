import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

interface DbCalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  projects: {
    name: string;
    description: string;
    status: string;
  };
}

interface DbInventoryItem {
  id: string;
  name: string;
  description: string;
  next_reminder_date: string;
  frequency_months: number;
}

interface DbServiceItem {
  id: string;
  name: string;
  provider: string;
  next_service_date: string;
  frequency_months: number;
}

function escapeIcal(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcalDate(dateStr: string): string {
  // "YYYY-MM-DD" -> "YYYYMMDD"
  return dateStr.replace(/-/g, "");
}

function nextDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(y, m - 1, d + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  const { data: events, error } = await supabase
    .from("project_events")
    .select("id, title, event_date, event_time, projects(name, description, status)")
    .eq("user_id", userId)
    .order("event_date", { ascending: true })
    .returns<DbCalendarEvent[]>();

  const { data: inventoryItems, error: invError } = await supabase
    .from("inventory_items")
    .select("id, name, description, next_reminder_date, frequency_months")
    .eq("user_id", userId)
    .order("next_reminder_date", { ascending: true })
    .returns<DbInventoryItem[]>();

  const { data: serviceItems, error: svcError } = await supabase
    .from("services")
    .select("id, name, provider, next_service_date, frequency_months")
    .eq("user_id", userId)
    .order("next_service_date", { ascending: true })
    .returns<DbServiceItem[]>();

  if (error || invError || svcError) {
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }

  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  const vevents = (events ?? []).map((e) => {
    const statusText = e.projects.status === "Completed" ? " [Completed]" : "";
    const summary = `${e.projects.name}: ${e.title}`;

    const lines = [
      "BEGIN:VEVENT",
      `UID:${e.id}@homebot`,
      `DTSTAMP:${now}`,
    ];

    if (e.event_time) {
      // Timed event: DTSTART/DTEND with time, 1-hour default duration
      const timeStr = e.event_time.replace(/:/g, "");
      const startDateTime = `${formatIcalDate(e.event_date)}T${timeStr}00`;
      const [h, m] = e.event_time.split(":").map(Number);
      const endH = h + 1;
      const endTime = `${String(endH).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
      const endDateTime = `${formatIcalDate(e.event_date)}T${endTime}`;
      lines.push(`DTSTART:${startDateTime}`);
      lines.push(`DTEND:${endDateTime}`);
    } else {
      // All-day event
      const startDate = formatIcalDate(e.event_date);
      const endDate = formatIcalDate(nextDay(e.event_date));
      lines.push(`DTSTART;VALUE=DATE:${startDate}`);
      lines.push(`DTEND;VALUE=DATE:${endDate}`);
    }

    lines.push(
      `SUMMARY:${escapeIcal(summary)}${statusText}`,
      `DESCRIPTION:${escapeIcal(e.projects.description || "")}`,
      `STATUS:${e.projects.status === "Completed" ? "COMPLETED" : "CONFIRMED"}`,
      "END:VEVENT"
    );

    return lines.join("\r\n");
  });

  const inventoryVevents = (inventoryItems ?? []).map((item) => {
    const freqLabel =
      item.frequency_months === 1
        ? "monthly"
        : item.frequency_months === 12
          ? "annually"
          : `every ${item.frequency_months} months`;

    const lines = [
      "BEGIN:VEVENT",
      `UID:inv-${item.id}@homebot`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${formatIcalDate(item.next_reminder_date)}`,
      `DTEND;VALUE=DATE:${formatIcalDate(nextDay(item.next_reminder_date))}`,
      `SUMMARY:${escapeIcal(`Reorder: ${item.name}`)}`,
      `DESCRIPTION:${escapeIcal(`${item.description || item.name} - replenish ${freqLabel}`)}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    ];
    return lines.join("\r\n");
  });

  const serviceVevents = (serviceItems ?? []).map((svc) => {
    const freqLabel =
      svc.frequency_months === 1
        ? "monthly"
        : svc.frequency_months === 12
          ? "annually"
          : `every ${svc.frequency_months} months`;

    const lines = [
      "BEGIN:VEVENT",
      `UID:svc-${svc.id}@homebot`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${formatIcalDate(svc.next_service_date)}`,
      `DTEND;VALUE=DATE:${formatIcalDate(nextDay(svc.next_service_date))}`,
      `SUMMARY:${escapeIcal(`Service: ${svc.name}`)}`,
      `DESCRIPTION:${escapeIcal(`${svc.provider ? svc.provider + " - " : ""}${freqLabel}`)}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    ];
    return lines.join("\r\n");
  });

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HOMEBOT//Home Projects//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:HOMEBOT Projects",
    "X-WR-CALDESC:Home project schedule from HOMEBOT",
    ...vevents,
    ...inventoryVevents,
    ...serviceVevents,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ical, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
