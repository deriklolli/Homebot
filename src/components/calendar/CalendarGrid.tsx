import { useState } from "react";
import Link from "next/link";
import { type ProjectStatus } from "@/lib/projects-data";

export interface ProjectCalendarEvent {
  type: "project";
  id: string;
  title: string;
  eventDate: string;
  eventTime?: string | null;
  eventEndTime?: string | null;
  notes?: string;
  projectId: string;
  projectName: string;
  projectStatus: ProjectStatus;
  contractorName?: string | null;
  contractorPhone?: string | null;
}

export interface InventoryCalendarEvent {
  type: "inventory";
  id: string;
  title: string;
  eventDate: string;
  itemName: string;
  isOverdue: boolean;
}

export interface ServiceCalendarEvent {
  type: "service";
  id: string;
  title: string;
  eventDate: string;
  serviceName: string;
  isOverdue: boolean;
}

export type CalendarEvent = ProjectCalendarEvent | InventoryCalendarEvent | ServiceCalendarEvent;

const PROJECT_BG = "bg-accent";

export function formatShortTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const suffix = h >= 12 ? "p" : "a";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return m > 0 ? `${h}:${mStr}${suffix}` : `${h}${suffix}`;
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

const DAY_HEADERS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

interface CalendarGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: ProjectCalendarEvent) => void;
  onEventDrop?: (eventId: string, newDate: string) => void;
}

export default function CalendarGrid({
  currentDate,
  events,
  onEventClick,
  onEventDrop,
}: CalendarGridProps) {
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Build event map: "YYYY-MM-DD" -> CalendarEvent[]
  const eventMap = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const existing = eventMap.get(e.eventDate) ?? [];
    existing.push(e);
    eventMap.set(e.eventDate, existing);
  }

  // Calendar math
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: Array<{
    day: number;
    dateObj: Date;
    isCurrentMonth: boolean;
  }> = [];

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    cells.push({
      day: daysInPrevMonth - i,
      dateObj: new Date(year, month - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      dateObj: new Date(year, month, d),
      isCurrentMonth: true,
    });
  }

  const totalRows = cells.length > 35 ? 42 : 35;
  let nextDay = 1;
  while (cells.length < totalRows) {
    cells.push({
      day: nextDay,
      dateObj: new Date(year, month + 1, nextDay),
      isCurrentMonth: false,
    });
    nextDay++;
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden flex flex-col" style={{ height: "calc(100vh - 200px)", minHeight: 400 }}>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border shrink-0">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="py-2.5 pl-3 text-[11px] font-semibold text-text-3 uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 flex-1 overflow-y-auto">
        {cells.map((cell, idx) => {
          const dateStr = `${cell.dateObj.getFullYear()}-${String(cell.dateObj.getMonth() + 1).padStart(2, "0")}-${String(cell.dateObj.getDate()).padStart(2, "0")}`;
          const dayEvents = eventMap.get(dateStr) ?? [];
          const isToday = dateStr === todayStr;
          const isDragOver = dateStr === dragOverDate;

          return (
            <div
              key={idx}
              className={`min-h-[120px] border-b border-r border-border p-2 transition-colors duration-100 ${
                !cell.isCurrentMonth ? "bg-bg/40" : ""
              } ${isDragOver ? "bg-accent/8" : ""} ${isToday ? "bg-accent/[0.04] ring-2 ring-inset ring-accent/30" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverDate(dateStr);
              }}
              onDragLeave={() => {
                setDragOverDate((prev) => (prev === dateStr ? null : prev));
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverDate(null);
                const eventId = e.dataTransfer.getData("text/event-id");
                if (eventId && onEventDrop) {
                  onEventDrop(eventId, dateStr);
                }
              }}
            >
              {/* Day number */}
              <span
                className={`text-[18px] font-semibold leading-none ${
                  isToday
                    ? "text-accent"
                    : cell.isCurrentMonth
                      ? "text-text-primary"
                      : "text-text-4"
                }`}
              >
                {cell.day}
              </span>

              {/* Event pills */}
              <div className="flex flex-col gap-1 mt-2">
                {dayEvents.slice(0, 3).map((e) => {
                  if (e.type === "inventory") {
                    return (
                      <Link
                        key={`inv-${e.id}`}
                        href="/inventory"
                        className={`flex items-center gap-1 px-2 py-[3px] text-[11px] font-medium rounded-full truncate text-white hover:brightness-110 transition-all duration-[120ms] ${
                          e.isOverdue ? "bg-red" : "bg-teal"
                        }`}
                        title={`Reorder: ${e.itemName}`}
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
                        className={`flex items-center gap-1 px-2 py-[3px] text-[11px] font-medium rounded-full truncate text-white hover:brightness-110 transition-all duration-[120ms] ${
                          e.isOverdue ? "bg-red" : "bg-purple"
                        }`}
                        title={`Service: ${e.serviceName}`}
                      >
                        {e.serviceName}
                      </Link>
                    );
                  }
                  const duration = e.eventTime ? formatDuration(e.eventTime, e.eventEndTime) : "";
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
                      className={`flex items-center gap-1 w-full text-left px-2 py-[3px] text-[11px] font-medium rounded-full truncate text-white hover:brightness-110 transition-all duration-[120ms] cursor-pointer ${PROJECT_BG}`}
                      title={`${e.projectName}: ${e.title}${e.eventTime ? ` at ${formatShortTime(e.eventTime)}${e.eventEndTime ? `–${formatShortTime(e.eventEndTime)}` : ""}` : ""}${e.contractorName ? `\n${e.contractorName}${e.contractorPhone ? ` — ${e.contractorPhone}` : ""}` : ""}`}
                    >
                      {e.eventTime && (
                        <span className="opacity-80">{formatShortTime(e.eventTime)}</span>
                      )}
                      <span className="truncate">
                        {e.title}
                        {duration && <span className="opacity-70"> ({duration})</span>}
                      </span>
                    </button>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[11px] text-text-3 pl-2 font-medium">
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
