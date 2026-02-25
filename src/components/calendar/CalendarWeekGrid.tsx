import { useRef, useEffect } from "react";
import Link from "next/link";
import { type ProjectStatus } from "@/lib/projects-data";
import { type CalendarEvent, formatShortTime } from "./CalendarGrid";

const STATUS_PILL: Record<ProjectStatus, string> = {
  "In Progress": "bg-accent-light text-accent",
  Completed: "bg-green-light text-green",
};

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7am–9pm

interface CalendarWeekGridProps {
  currentDate: Date;
  events: CalendarEvent[];
}

function getWeekDays(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const sun = new Date(d);
  sun.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(sun);
    dt.setDate(sun.getDate() + i);
    return dt;
  });
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatLongTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const suffix = h >= 12 ? " PM" : " AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return m > 0 ? `${h}:${mStr}${suffix}` : `${h}${suffix}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function EventPill({ event }: { event: CalendarEvent }) {
  if (event.type === "inventory") {
    return (
      <Link
        href="/inventory"
        className={`block px-1.5 py-0.5 text-[11px] font-medium rounded-[var(--radius-sm)] truncate hover:brightness-90 transition-all duration-[120ms] ${
          event.isOverdue ? "bg-red/10 text-red" : "bg-teal/10 text-teal"
        }`}
        title={`Reorder: ${event.itemName}`}
      >
        {event.itemName}
      </Link>
    );
  }
  if (event.type === "service") {
    return (
      <Link
        href="/services"
        className={`block px-1.5 py-0.5 text-[11px] font-medium rounded-[var(--radius-sm)] truncate hover:brightness-90 transition-all duration-[120ms] ${
          event.isOverdue ? "bg-red/10 text-red" : "bg-purple-light text-purple"
        }`}
        title={`Service: ${event.serviceName}`}
      >
        {event.serviceName}
      </Link>
    );
  }
  return (
    <Link
      href={`/projects/${event.projectId}`}
      className={`block px-1.5 py-1 text-[11px] font-medium rounded-[var(--radius-sm)] truncate hover:brightness-90 transition-all duration-[120ms] ${STATUS_PILL[event.projectStatus]}`}
      title={`${event.projectName}: ${event.title}${event.eventTime ? ` at ${formatLongTime(event.eventTime)}` : ""}`}
    >
      {event.eventTime && (
        <span className="opacity-70">{formatShortTime(event.eventTime)} </span>
      )}
      {event.title}
    </Link>
  );
}

export default function CalendarWeekGrid({
  currentDate,
  events,
}: CalendarWeekGridProps) {
  const weekDays = getWeekDays(currentDate);

  // Build event map
  const eventMap = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const existing = eventMap.get(e.eventDate) ?? [];
    existing.push(e);
    eventMap.set(e.eventDate, existing);
  }

  const today = new Date();
  const todayString = dateStr(today);

  // Separate timed vs all-day events per day
  function splitEvents(dayEvents: CalendarEvent[]) {
    const timed: CalendarEvent[] = [];
    const allDay: CalendarEvent[] = [];
    for (const e of dayEvents) {
      if (e.type === "project" && e.eventTime) {
        timed.push(e);
      } else {
        allDay.push(e);
      }
    }
    // Sort timed events by time
    timed.sort((a, b) => {
      const aTime = a.type === "project" ? a.eventTime ?? "" : "";
      const bTime = b.type === "project" ? b.eventTime ?? "" : "";
      return aTime.localeCompare(bTime);
    });
    return { timed, allDay };
  }

  const START_HOUR = 7;
  const END_HOUR = 21;
  const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to ~8 AM on mount so the grid starts in a useful position
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 60; // 1 hour past 7 AM
    }
  }, []);

  return (
    <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden flex flex-col" style={{ height: "calc(100vh - 200px)", minHeight: 400 }}>
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border shrink-0">
        <div /> {/* Spacer for time column */}
        {weekDays.map((d, i) => {
          const ds = dateStr(d);
          const isToday = ds === todayString;
          return (
            <div key={i} className="py-2 text-center border-l border-border">
              <span className="text-[11px] font-medium text-text-3 uppercase tracking-wide">
                {DAY_HEADERS[i]}
              </span>
              <span
                className={`block text-[14px] font-semibold mt-0.5 ${
                  isToday ? "text-accent" : "text-text-primary"
                }`}
              >
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* All-day events row */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border shrink-0">
        <div className="py-1.5 px-2 text-[10px] text-text-4 text-right">
          All day
        </div>
        {weekDays.map((d, i) => {
          const ds = dateStr(d);
          const dayEvents = eventMap.get(ds) ?? [];
          const { allDay } = splitEvents(dayEvents);
          return (
            <div
              key={i}
              className="py-1 px-1 border-l border-border flex flex-col gap-0.5 min-h-[32px]"
            >
              {allDay.map((e) => (
                <EventPill key={`${e.type}-${e.id}`} event={e} />
              ))}
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="overflow-y-auto flex-1">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ height: `${TOTAL_MINUTES}px` }}>
          {/* Time labels + horizontal lines (skip first hour to avoid double border) */}
          {HOURS.map((hour) => {
            const top = (hour - START_HOUR) * 60;
            return (
              <div key={hour} className="contents">
                <div
                  className="absolute left-0 w-[60px] text-[10px] text-text-4 text-right pr-2 -translate-y-1/2"
                  style={{ top: `${top}px` }}
                >
                  {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                </div>
                {hour !== START_HOUR && (
                  <div
                    className="absolute left-[60px] right-0 border-t border-border"
                    style={{ top: `${top}px` }}
                  />
                )}
              </div>
            );
          })}

          {/* Day columns */}
          {weekDays.map((d, i) => {
            const ds = dateStr(d);
            const dayEvents = eventMap.get(ds) ?? [];
            const { timed } = splitEvents(dayEvents);
            const isToday = ds === todayString;

            return (
              <div
                key={i}
                className={`relative border-l border-border ${isToday ? "bg-accent/[0.03]" : ""}`}
                style={{ gridColumn: i + 2 }}
              >
                {timed.map((e) => {
                  if (e.type !== "project" || !e.eventTime) return null;
                  const minutes = timeToMinutes(e.eventTime);
                  const top = minutes - START_HOUR * 60;
                  if (top < 0 || top >= TOTAL_MINUTES) return null;

                  return (
                    <div
                      key={e.id}
                      className="absolute left-0.5 right-0.5"
                      style={{ top: `${top}px` }}
                    >
                      <EventPill event={e} />
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Time column spacer */}
          <div className="relative" style={{ gridColumn: 1, gridRow: 1 }} />
        </div>
      </div>
    </div>
  );
}
