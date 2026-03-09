import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { type CalendarEvent, type ProjectCalendarEvent, formatShortTime } from "./CalendarGrid";

const PROJECT_BG = "bg-accent";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface CalendarWeekGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: ProjectCalendarEvent) => void;
  onEventDrop?: (eventId: string, newDate: string, newTime?: string | null) => void;
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

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDuration(startTime: string, endTime: string | null | undefined): string {
  if (!endTime) return "";
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const totalMin = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMin <= 0) return "";
  if (totalMin >= 120) return `${totalMin / 60}h`;
  return `${totalMin}m`;
}

function EventPill({
  event,
  fill,
  onEventClick,
}: {
  event: CalendarEvent;
  fill?: boolean;
  onEventClick?: (event: ProjectCalendarEvent) => void;
}) {
  if (event.type === "inventory") {
    return (
      <Link
        href="/inventory"
        className={`block px-2 py-[3px] text-[11px] font-medium rounded-full truncate text-white hover:brightness-110 transition-all duration-[120ms] ${
          event.isOverdue ? "bg-red" : "bg-teal"
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
        className={`block px-2 py-[3px] text-[11px] font-medium rounded-full truncate text-white hover:brightness-110 transition-all duration-[120ms] ${
          event.isOverdue ? "bg-red" : "bg-purple"
        }`}
        title={`Service: ${event.serviceName}`}
      >
        {event.serviceName}
      </Link>
    );
  }
  const timeLabel = event.eventTime
    ? `${formatLongTime(event.eventTime)}${event.eventEndTime ? ` – ${formatLongTime(event.eventEndTime)}` : ""}`
    : "";
  const duration = event.eventTime ? formatDuration(event.eventTime, event.eventEndTime) : "";
  return (
    <button
      type="button"
      draggable
      onClick={(e) => {
        e.stopPropagation();
        onEventClick?.(event);
      }}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/event-id", event.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`block w-full text-left px-2 py-1 text-[11px] font-medium rounded-[var(--radius-sm)] hover:brightness-110 transition-all duration-[120ms] cursor-pointer text-white ${fill ? "h-full overflow-hidden" : "truncate rounded-full"} ${PROJECT_BG}`}
      title={`${event.projectName}: ${event.title}${timeLabel ? ` at ${timeLabel}` : ""}${event.contractorName ? `\n${event.contractorName}${event.contractorPhone ? ` — ${event.contractorPhone}` : ""}` : ""}`}
    >
      {fill ? (
        <div className="flex flex-col gap-0.5">
          <span className="opacity-80 text-[10px]">
            {event.eventTime && formatShortTime(event.eventTime)}
            {duration && ` (${duration})`}
          </span>
          <span className="truncate">{event.title}</span>
        </div>
      ) : (
        <>
          {event.eventTime && (
            <span className="opacity-80">{formatShortTime(event.eventTime)} </span>
          )}
          <span className="truncate">{event.title}</span>
        </>
      )}
    </button>
  );
}

export default function CalendarWeekGrid({
  currentDate,
  events,
  onEventClick,
  onEventDrop,
}: CalendarWeekGridProps) {
  const weekDays = getWeekDays(currentDate);
  const [dragIndicator, setDragIndicator] = useState<{ col: number; minutes: number } | null>(null);
  const [allDayDragOver, setAllDayDragOver] = useState<number | null>(null);

  // Build event map
  const eventMap = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const existing = eventMap.get(e.eventDate) ?? [];
    existing.push(e);
    eventMap.set(e.eventDate, existing);
  }

  const today = new Date();
  const todayString = dateStr(today);

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
    timed.sort((a, b) => {
      const aTime = a.type === "project" ? a.eventTime ?? "" : "";
      const bTime = b.type === "project" ? b.eventTime ?? "" : "";
      return aTime.localeCompare(bTime);
    });
    return { timed, allDay };
  }

  const START_HOUR = 0;
  const END_HOUR = 24;
  const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * 60;
    }
  }, []);

  const getMinutesFromDrop = useCallback((e: React.DragEvent, colEl: HTMLElement): number => {
    const rect = colEl.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawMinutes = Math.round((y / rect.height) * TOTAL_MINUTES);
    return Math.max(0, Math.min(TOTAL_MINUTES - 15, Math.round(rawMinutes / 15) * 15));
  }, [TOTAL_MINUTES]);

  return (
    <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden flex flex-col" style={{ height: "calc(100vh - 200px)", minHeight: 400 }}>
      {/* Day headers — large date + "Mon, Mar 8" format */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border shrink-0">
        <div />
        {weekDays.map((d, i) => {
          const ds = dateStr(d);
          const isToday = ds === todayString;
          return (
            <div key={i} className={`py-3 pl-3 border-l border-border ${isToday ? "bg-accent/[0.04]" : ""}`}>
              <span
                className={`text-[22px] font-bold leading-none ${
                  isToday ? "text-accent" : "text-text-primary"
                }`}
              >
                {d.getDate()}
              </span>
              <span className="block text-[11px] font-medium text-text-3 mt-0.5">
                {SHORT_MONTHS[d.getMonth()]}, {DAY_NAMES[i]}
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
          const isDragOver = allDayDragOver === i;
          return (
            <div
              key={i}
              className={`py-1 px-1 border-l border-border flex flex-col gap-0.5 min-h-[32px] transition-colors duration-100 ${isDragOver ? "bg-accent/8" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setAllDayDragOver(i);
                setDragIndicator(null);
              }}
              onDragLeave={() => {
                setAllDayDragOver((prev) => (prev === i ? null : prev));
              }}
              onDrop={(e) => {
                e.preventDefault();
                setAllDayDragOver(null);
                const eventId = e.dataTransfer.getData("text/event-id");
                if (eventId && onEventDrop) {
                  onEventDrop(eventId, ds, null);
                }
              }}
            >
              {allDay.map((e) => (
                <EventPill key={`${e.type}-${e.id}`} event={e} onEventClick={onEventClick} />
              ))}
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="overflow-y-auto flex-1">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ height: `${TOTAL_MINUTES}px` }}>
          {/* Time labels + horizontal lines */}
          {HOURS.map((hour) => {
            const top = (hour - START_HOUR) * 60;
            return (
              <div key={hour} className="contents">
                <div
                  className="absolute left-0 w-[60px] text-[11px] text-text-4 text-right pr-3 -translate-y-1/2 font-medium"
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
                onDragOver={(e) => {
                  e.preventDefault();
                  const minutes = getMinutesFromDrop(e, e.currentTarget as HTMLElement);
                  setDragIndicator({ col: i, minutes });
                  setAllDayDragOver(null);
                }}
                onDragLeave={() => {
                  setDragIndicator((prev) => (prev?.col === i ? null : prev));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragIndicator(null);
                  const eventId = e.dataTransfer.getData("text/event-id");
                  if (eventId && onEventDrop) {
                    const minutes = getMinutesFromDrop(e, e.currentTarget as HTMLElement);
                    onEventDrop(eventId, ds, minutesToTime(minutes));
                  }
                }}
              >
                {/* Drag indicator line */}
                {dragIndicator?.col === i && (
                  <div
                    className="absolute left-0 right-0 h-[2px] bg-accent z-10 pointer-events-none"
                    style={{ top: `${dragIndicator.minutes}px` }}
                  >
                    <div className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-accent" />
                  </div>
                )}

                {timed.map((e) => {
                  if (e.type !== "project" || !e.eventTime) return null;
                  const startMinutes = timeToMinutes(e.eventTime);
                  const top = startMinutes - START_HOUR * 60;
                  if (top < 0 || top >= TOTAL_MINUTES) return null;

                  let height: number | undefined;
                  if (e.eventEndTime) {
                    const endMinutes = timeToMinutes(e.eventEndTime);
                    height = Math.max(endMinutes - startMinutes, 24);
                  }

                  return (
                    <div
                      key={e.id}
                      className="absolute left-1 right-1 overflow-hidden"
                      style={{ top: `${top}px`, ...(height ? { height: `${height}px` } : {}) }}
                    >
                      <EventPill event={e} fill={!!height} onEventClick={onEventClick} />
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
