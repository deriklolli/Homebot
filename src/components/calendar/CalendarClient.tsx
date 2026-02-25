"use client";

import { useState, useEffect } from "react";
import { type ProjectStatus } from "@/lib/projects-data";
import { supabase } from "@/lib/supabase";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/icons";
import CalendarGrid, { type CalendarEvent } from "./CalendarGrid";
import CalendarWeekGrid from "./CalendarWeekGrid";
import SubscribeModal from "./SubscribeModal";

type CalendarView = "month" | "week";

interface DbCalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  event_end_time: string | null;
  project_id: string;
  projects: {
    id: string;
    name: string;
    status: string;
  };
}

interface DbInventoryReminder {
  id: string;
  name: string;
  next_reminder_date: string;
}

interface DbServiceReminder {
  id: string;
  name: string;
  next_service_date: string;
}

export default function CalendarClient() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("week");
  const [subscribeModalOpen, setSubscribeModalOpen] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      const [projectRes, inventoryRes, serviceRes] = await Promise.all([
        supabase
          .from("project_events")
          .select("id, title, event_date, event_time, event_end_time, project_id, projects(id, name, status)")
          .order("event_date", { ascending: true })
          .returns<DbCalendarEvent[]>(),
        supabase
          .from("inventory_items")
          .select("id, name, next_reminder_date")
          .order("next_reminder_date", { ascending: true })
          .returns<DbInventoryReminder[]>(),
        supabase
          .from("services")
          .select("id, name, next_service_date")
          .order("next_service_date", { ascending: true })
          .returns<DbServiceReminder[]>(),
      ]);

      const allEvents: CalendarEvent[] = [];

      if (!projectRes.error && projectRes.data) {
        for (const e of projectRes.data) {
          allEvents.push({
            type: "project",
            id: e.id,
            title: e.title,
            eventDate: e.event_date,
            eventTime: e.event_time,
            eventEndTime: e.event_end_time,
            projectId: e.projects.id,
            projectName: e.projects.name,
            projectStatus: e.projects.status as ProjectStatus,
          });
        }
      }

      const today = new Date().toISOString().split("T")[0];
      if (!inventoryRes.error && inventoryRes.data) {
        for (const item of inventoryRes.data) {
          allEvents.push({
            type: "inventory",
            id: item.id,
            title: `Reorder: ${item.name}`,
            eventDate: item.next_reminder_date,
            itemName: item.name,
            isOverdue: item.next_reminder_date <= today,
          });
        }
      }

      if (!serviceRes.error && serviceRes.data) {
        for (const svc of serviceRes.data) {
          allEvents.push({
            type: "service",
            id: svc.id,
            title: `Service: ${svc.name}`,
            eventDate: svc.next_service_date,
            serviceName: svc.name,
            isOverdue: svc.next_service_date <= today,
          });
        }
      }

      setEvents(allEvents);
      setLoading(false);
    }
    fetchEvents();
  }, []);

  function goToPrevious() {
    setCurrentDate((prev) => {
      if (view === "week") {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
      }
      return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
    });
  }

  function goToNext() {
    setCurrentDate((prev) => {
      if (view === "week") {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      }
      return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
    });
  }

  // Header label
  let headerLabel: string;
  if (view === "week") {
    const d = new Date(currentDate);
    const day = d.getDay();
    const sun = new Date(d);
    sun.setDate(d.getDate() - day);
    const sat = new Date(sun);
    sat.setDate(sun.getDate() + 6);
    const fmt = (dt: Date) =>
      dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    headerLabel = `${fmt(sun)} – ${fmt(sat)}, ${sat.getFullYear()}`;
  } else {
    headerLabel = currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
        <p className="text-sm text-text-3">Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          Calendar
        </h1>
        <button
          onClick={() => setSubscribeModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms]"
        >
          <CalendarIcon width={14} height={14} />
          Subscribe
        </button>
      </header>

      {/* Navigation */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={goToPrevious}
          className="inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-3 hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          aria-label={view === "week" ? "Previous week" : "Previous month"}
        >
          <ChevronLeftIcon width={14} height={14} />
        </button>
        <button
          onClick={goToNext}
          className="inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-3 hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          aria-label={view === "week" ? "Next week" : "Next month"}
        >
          <ChevronRightIcon width={14} height={14} />
        </button>
        <h2 className="text-[15px] font-semibold text-text-primary flex-1">
          {headerLabel}
        </h2>

        {/* View toggle */}
        <div className="flex rounded-[var(--radius-sm)] border border-border-strong overflow-hidden">
          <button
            onClick={() => setView("week")}
            className={`px-3 py-[5px] text-[13px] font-medium transition-all duration-[120ms] ${
              view === "week"
                ? "bg-accent text-white"
                : "bg-surface text-text-2 hover:bg-border hover:text-text-primary"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView("month")}
            className={`px-3 py-[5px] text-[13px] font-medium transition-all duration-[120ms] ${
              view === "month"
                ? "bg-accent text-white"
                : "bg-surface text-text-2 hover:bg-border hover:text-text-primary"
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      {view === "month" ? (
        <CalendarGrid currentDate={currentDate} events={events} />
      ) : (
        <CalendarWeekGrid currentDate={currentDate} events={events} />
      )}

      {/* Subscribe modal */}
      {subscribeModalOpen && (
        <SubscribeModal onClose={() => setSubscribeModalOpen(false)} />
      )}
    </div>
  );
}
