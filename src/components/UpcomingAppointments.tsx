"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CalendarSolidIcon, ChevronRightIcon } from "@/components/icons";

interface UpcomingEvent {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  project_id: string;
  project_name: string;
  contractor_company: string | null;
  contractor_name: string | null;
  contractor_phone: string | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function UpcomingAppointments() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("project_events")
        .select("id, title, event_date, event_time, project_id, projects(name, contractors(company, name, phone))")
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .order("event_time", { ascending: true, nullsFirst: false })
        .limit(3)
        .returns<
          {
            id: string;
            title: string;
            event_date: string;
            event_time: string | null;
            project_id: string;
            projects: {
              name: string;
              contractors: { company: string; name: string; phone: string } | null;
            };
          }[]
        >();

      if (!error && data) {
        setEvents(
          data.map((row) => ({
            id: row.id,
            title: row.title,
            event_date: row.event_date,
            event_time: row.event_time,
            project_id: row.project_id,
            project_name: row.projects.name,
            contractor_company: row.projects.contractors?.company ?? null,
            contractor_name: row.projects.contractors?.name ?? null,
            contractor_phone: row.projects.contractors?.phone ?? null,
          }))
        );
      }
      setLoading(false);
    }
    fetchEvents();
  }, []);

  return (
    <div className="p-5">
      <header className="flex items-start justify-between gap-4 mb-4">
        <div className="flex flex-col gap-[3px] min-w-0">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <CalendarSolidIcon width={15} height={15} className="text-accent" />
            Upcoming Appointments
          </h2>
          <p className="text-xs text-text-3">Next 3 scheduled</p>
        </div>
      </header>

      {loading ? (
        <p className="text-[13px] text-text-3 py-4">Loading...</p>
      ) : events.length === 0 ? (
        <p className="text-[13px] text-text-3 py-4">
          No upcoming appointments scheduled.
        </p>
      ) : (
        <ul
          className="flex flex-col -mx-5"
          role="list"
          aria-label="Upcoming appointments"
        >
          {events.map((ev) => (
            <li key={ev.id}>
              <Link
                href={`/projects/${ev.project_id}`}
                className="grid grid-cols-[32px_1fr_auto_auto] items-center gap-2 px-5 py-[9px] border-t border-border hover:bg-surface-hover transition-[background] duration-[120ms]"
              >
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <CalendarSolidIcon
                    width={16}
                    height={16}
                    className="text-accent"
                  />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[13px] font-medium text-text-primary truncate">
                    {ev.project_name}
                  </span>
                  {ev.contractor_company && (
                    <span className="text-[11px] text-text-3 truncate">
                      {ev.contractor_company}
                      {ev.contractor_name ? ` — ${ev.contractor_name}` : ""}
                      {ev.contractor_phone ? ` — ${ev.contractor_phone}` : ""}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span className="text-[13px] font-medium text-text-primary whitespace-nowrap">
                    {formatDate(ev.event_date)}
                  </span>
                  {ev.event_time && (
                    <span className="text-[11px] text-text-3">
                      {formatTime(ev.event_time)}
                    </span>
                  )}
                </div>
                <ChevronRightIcon className="text-text-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
