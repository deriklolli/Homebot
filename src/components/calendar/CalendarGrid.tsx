import Link from "next/link";
import { type ProjectStatus } from "@/lib/projects-data";

export interface ProjectCalendarEvent {
  type: "project";
  id: string;
  title: string;
  eventDate: string;
  projectId: string;
  projectName: string;
  projectStatus: ProjectStatus;
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

const STATUS_PILL: Record<ProjectStatus, string> = {
  "In Progress": "bg-accent-light text-accent",
  Completed: "bg-green-light text-green",
};

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarGridProps {
  currentDate: Date;
  events: CalendarEvent[];
}

export default function CalendarGrid({
  currentDate,
  events,
}: CalendarGridProps) {
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
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Build array of day cells
  const cells: Array<{
    day: number;
    dateObj: Date;
    isCurrentMonth: boolean;
  }> = [];

  // Previous month padding
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    cells.push({
      day: daysInPrevMonth - i,
      dateObj: new Date(year, month - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      dateObj: new Date(year, month, d),
      isCurrentMonth: true,
    });
  }

  // Next month padding (fill to 35 or 42 cells)
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
    <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[11px] font-medium text-text-3 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const dateStr = `${cell.dateObj.getFullYear()}-${String(cell.dateObj.getMonth() + 1).padStart(2, "0")}-${String(cell.dateObj.getDate()).padStart(2, "0")}`;
          const dayEvents = eventMap.get(dateStr) ?? [];
          const isToday = dateStr === todayStr;

          return (
            <div
              key={idx}
              className={`min-h-[100px] border-b border-r border-border p-1.5 ${
                !cell.isCurrentMonth ? "bg-bg/50" : ""
              }`}
            >
              {/* Day number */}
              <span
                className={`inline-flex items-center justify-center w-6 h-6 text-[12px] font-medium rounded-full ${
                  isToday
                    ? "bg-accent text-white"
                    : cell.isCurrentMonth
                      ? "text-text-primary"
                      : "text-text-4"
                }`}
              >
                {cell.day}
              </span>

              {/* Event pills */}
              <div className="flex flex-col gap-0.5 mt-1">
                {dayEvents.slice(0, 3).map((e) => {
                  if (e.type === "inventory") {
                    return (
                      <Link
                        key={`inv-${e.id}`}
                        href="/inventory"
                        className={`block px-1.5 py-0.5 text-[10px] font-medium rounded-[var(--radius-sm)] truncate hover:brightness-90 transition-all duration-[120ms] ${
                          e.isOverdue
                            ? "bg-red/10 text-red"
                            : "bg-teal/10 text-teal"
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
                        className={`block px-1.5 py-0.5 text-[10px] font-medium rounded-[var(--radius-sm)] truncate hover:brightness-90 transition-all duration-[120ms] ${
                          e.isOverdue
                            ? "bg-red/10 text-red"
                            : "bg-purple-light text-purple"
                        }`}
                        title={`Service: ${e.serviceName}`}
                      >
                        {e.serviceName}
                      </Link>
                    );
                  }
                  return (
                    <Link
                      key={e.id}
                      href={`/projects/${e.projectId}`}
                      className={`block px-1.5 py-0.5 text-[10px] font-medium rounded-[var(--radius-sm)] truncate hover:brightness-90 transition-all duration-[120ms] ${STATUS_PILL[e.projectStatus]}`}
                      title={`${e.projectName}: ${e.title}`}
                    >
                      {e.projectName}
                    </Link>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-text-3 px-1.5">
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
