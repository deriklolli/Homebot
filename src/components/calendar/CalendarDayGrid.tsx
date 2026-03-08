import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { type CalendarEvent, type ProjectCalendarEvent, formatShortTime } from "./CalendarGrid";

const PROJECT_BG = "bg-accent";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface CalendarDayGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: ProjectCalendarEvent) => void;
  onEventDrop?: (eventId: string, newDate: string, newTime?: string | null) => void;
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

export default function CalendarDayGrid({
  currentDate,
  events,
  onEventClick,
  onEventDrop,
}: CalendarDayGridProps) {
  const ds = dateStr(currentDate);
  const todayStr = dateStr(new Date());
  const isToday = ds === todayStr;
  const [dragIndicator, setDragIndicator] = useState<number | null>(null);

  const dayEvents = events.filter((e) => e.eventDate === ds);

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

  const TOTAL_MINUTES = 24 * 60;
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
      {/* Day header */}
      <div className="grid grid-cols-[60px_1fr] border-b border-border shrink-0">
        <div />
        <div className={`py-3 pl-3 border-l border-border ${isToday ? "bg-accent/[0.04]" : ""}`}>
          <span
            className={`text-[22px] font-bold leading-none ${
              isToday ? "text-accent" : "text-text-primary"
            }`}
          >
            {currentDate.getDate()}
          </span>
          <span className="block text-[11px] font-medium text-text-3 mt-0.5">
            {SHORT_MONTHS[currentDate.getMonth()]}, {DAY_NAMES[currentDate.getDay()]}
          </span>
        </div>
      </div>

      {/* All-day events row */}
      {allDay.length > 0 && (
        <div className="grid grid-cols-[60px_1fr] border-b border-border shrink-0">
          <div className="py-1.5 px-2 text-[10px] text-text-4 text-right">
            All day
          </div>
          <div className="py-1.5 px-2 border-l border-border flex flex-wrap gap-1">
            {allDay.map((e) => {
              if (e.type === "inventory") {
                return (
                  <Link
                    key={`inv-${e.id}`}
                    href="/inventory"
                    className={`inline-flex px-2 py-[3px] text-[11px] font-medium rounded-full text-white hover:brightness-110 transition-all duration-[120ms] ${
                      e.isOverdue ? "bg-red" : "bg-teal"
                    }`}
                  >
                    {e.itemName}
                  </Link>
                );
              }
              if (e.type === "service") {
                return (
                  <Link
                    key={`svc-${e.id}`}
                    href="/services"
                    className={`inline-flex px-2 py-[3px] text-[11px] font-medium rounded-full text-white hover:brightness-110 transition-all duration-[120ms] ${
                      e.isOverdue ? "bg-red" : "bg-purple"
                    }`}
                  >
                    {e.serviceName}
                  </Link>
                );
              }
              return (
                <button
                  key={e.id}
                  type="button"
                  draggable
                  onClick={() => onEventClick?.(e)}
                  onDragStart={(ev) => {
                    ev.dataTransfer.setData("text/event-id", e.id);
                    ev.dataTransfer.effectAllowed = "move";
                  }}
                  className={`inline-flex px-2 py-[3px] text-[11px] font-medium rounded-full text-white hover:brightness-110 transition-all duration-[120ms] cursor-pointer ${PROJECT_BG}`}
                >
                  {e.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="overflow-y-auto flex-1">
        <div className="grid grid-cols-[60px_1fr] relative" style={{ height: `${TOTAL_MINUTES}px` }}>
          {/* Time labels + horizontal lines */}
          {HOURS.map((hour) => {
            const top = hour * 60;
            return (
              <div key={hour} className="contents">
                <div
                  className="absolute left-0 w-[60px] text-[11px] text-text-4 text-right pr-3 -translate-y-1/2 font-medium"
                  style={{ top: `${top}px` }}
                >
                  {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                </div>
                {hour !== 0 && (
                  <div
                    className="absolute left-[60px] right-0 border-t border-border"
                    style={{ top: `${top}px` }}
                  />
                )}
              </div>
            );
          })}

          {/* Single day column */}
          <div
            className={`relative border-l border-border ${isToday ? "bg-accent/[0.03]" : ""}`}
            style={{ gridColumn: 2 }}
            onDragOver={(e) => {
              e.preventDefault();
              const minutes = getMinutesFromDrop(e, e.currentTarget as HTMLElement);
              setDragIndicator(minutes);
            }}
            onDragLeave={() => setDragIndicator(null)}
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
            {dragIndicator !== null && (
              <div
                className="absolute left-0 right-0 h-[2px] bg-accent z-10 pointer-events-none"
                style={{ top: `${dragIndicator}px` }}
              >
                <div className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-accent" />
              </div>
            )}

            {timed.map((e) => {
              if (e.type !== "project" || !e.eventTime) return null;
              const startMinutes = timeToMinutes(e.eventTime);
              if (startMinutes < 0 || startMinutes >= TOTAL_MINUTES) return null;

              let height: number | undefined;
              if (e.eventEndTime) {
                const endMinutes = timeToMinutes(e.eventEndTime);
                height = Math.max(endMinutes - startMinutes, 30);
              }

              const duration = formatDuration(e.eventTime, e.eventEndTime);
              const timeLabel = `${formatLongTime(e.eventTime)}${e.eventEndTime ? ` – ${formatLongTime(e.eventEndTime)}` : ""}`;

              return (
                <div
                  key={e.id}
                  className="absolute left-2 right-2 overflow-hidden"
                  style={{ top: `${startMinutes}px`, ...(height ? { height: `${height}px` } : {}) }}
                >
                  <button
                    type="button"
                    draggable
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onEventClick?.(e);
                    }}
                    onDragStart={(ev) => {
                      ev.dataTransfer.setData("text/event-id", e.id);
                      ev.dataTransfer.effectAllowed = "move";
                    }}
                    className={`w-full h-full text-left px-3 py-1.5 text-[12px] font-medium rounded-[var(--radius-sm)] text-white hover:brightness-110 transition-all duration-[120ms] cursor-pointer ${PROJECT_BG}`}
                    title={`${e.projectName}: ${e.title} at ${timeLabel}`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="opacity-80 text-[11px]">
                        {formatShortTime(e.eventTime)}
                        {duration && ` (${duration})`}
                      </span>
                      <span className="font-semibold">{e.title}</span>
                      <span className="opacity-70 text-[11px]">{e.projectName}</span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Time column spacer */}
          <div className="relative" style={{ gridColumn: 1, gridRow: 1 }} />
        </div>
      </div>
    </div>
  );
}
