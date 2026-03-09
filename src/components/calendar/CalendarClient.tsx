"use client";

import { useState, useEffect, useCallback } from "react";
import { type ProjectStatus } from "@/lib/projects-data";
import { supabase } from "@/lib/supabase";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/icons";
import CalendarGrid, {
  type CalendarEvent,
  type ProjectCalendarEvent,
} from "./CalendarGrid";
import CalendarWeekGrid from "./CalendarWeekGrid";
import CalendarDayGrid from "./CalendarDayGrid";
import SubscribeModal from "./SubscribeModal";
import EditEventModal from "./EditEventModal";

type CalendarView = "month" | "week" | "day";

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
];

interface DbCalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  event_end_time: string | null;
  notes: string;
  project_id: string;
  projects: {
    id: string;
    name: string;
    status: string;
    contractor_id: string | null;
  };
}

interface DbContractorLookup {
  id: string;
  company: string;
  name: string;
  phone: string;
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
  const [editingEvent, setEditingEvent] = useState<ProjectCalendarEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    const [projectRes, inventoryRes, serviceRes, contractorRes] = await Promise.all([
      supabase
        .from("project_events")
        .select("id, title, event_date, event_time, event_end_time, notes, project_id, projects(id, name, status, contractor_id)")
        .order("event_date", { ascending: true })
        .returns<DbCalendarEvent[]>(),
      supabase
        .from("inventory_items")
        .select("id, name, next_reminder_date")
        .eq("tracked", true)
        .order("next_reminder_date", { ascending: true })
        .returns<DbInventoryReminder[]>(),
      supabase
        .from("services")
        .select("id, name, next_service_date")
        .eq("reminders_enabled", true)
        .order("next_service_date", { ascending: true })
        .returns<DbServiceReminder[]>(),
      supabase
        .from("contractors")
        .select("id, company, name, phone")
        .returns<DbContractorLookup[]>(),
    ]);

    // Build contractor lookup map
    const contractorMap = new Map<string, DbContractorLookup>();
    if (!contractorRes.error && contractorRes.data) {
      for (const c of contractorRes.data) {
        contractorMap.set(c.id, c);
      }
    }

    const allEvents: CalendarEvent[] = [];

    if (!projectRes.error && projectRes.data) {
      for (const e of projectRes.data) {
        const c = e.projects.contractor_id ? contractorMap.get(e.projects.contractor_id) : null;
        allEvents.push({
          type: "project",
          id: e.id,
          title: e.title,
          eventDate: e.event_date,
          eventTime: e.event_time,
          eventEndTime: e.event_end_time,
          notes: e.notes,
          projectId: e.projects.id,
          projectName: e.projects.name,
          projectStatus: e.projects.status as ProjectStatus,
          contractorName: c ? (c.company || c.name) : null,
          contractorPhone: c?.phone || null,
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
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  async function handleUpdateEvent(
    eventId: string,
    data: {
      title: string;
      eventDate: string;
      eventTime: string | null;
      eventEndTime: string | null;
      notes: string;
    }
  ) {
    const { error } = await supabase
      .from("project_events")
      .update({
        title: data.title,
        event_date: data.eventDate,
        event_time: data.eventTime,
        event_end_time: data.eventEndTime,
        notes: data.notes,
      })
      .eq("id", eventId);

    if (error) {
      console.error("Failed to update event:", error);
      return;
    }

    setEditingEvent(null);
    fetchEvents();
  }

  async function handleDeleteEvent(eventId: string) {
    const { error } = await supabase
      .from("project_events")
      .delete()
      .eq("id", eventId);

    if (error) {
      console.error("Failed to delete event:", error);
      return;
    }

    setEditingEvent(null);
    fetchEvents();
  }

  async function handleEventDrop(
    eventId: string,
    newDate: string,
    newTime?: string | null
  ) {
    const update: Record<string, string | null> = { event_date: newDate };
    if (newTime !== undefined) {
      update.event_time = newTime;
      const event = events.find((e) => e.id === eventId);
      if (event && event.type === "project" && event.eventTime && event.eventEndTime && newTime) {
        const [oh, om] = event.eventTime.split(":").map(Number);
        const [eh, em] = event.eventEndTime.split(":").map(Number);
        const durationMin = (eh * 60 + em) - (oh * 60 + om);
        const [nh, nm] = newTime.split(":").map(Number);
        const endMin = nh * 60 + nm + durationMin;
        const endH = Math.min(Math.floor(endMin / 60), 23);
        const endM = endMin % 60;
        update.event_end_time = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
      }
    }

    const { error } = await supabase
      .from("project_events")
      .update(update)
      .eq("id", eventId);

    if (error) {
      console.error("Failed to move event:", error);
      return;
    }

    fetchEvents();
  }

  function goToPrevious() {
    setCurrentDate((prev) => {
      if (view === "day") {
        const d = new Date(prev);
        d.setDate(d.getDate() - 1);
        return d;
      }
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
      if (view === "day") {
        const d = new Date(prev);
        d.setDate(d.getDate() + 1);
        return d;
      }
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
  if (view === "day") {
    headerLabel = currentDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } else if (view === "week") {
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

  // Navigation aria label
  const prevLabel = view === "day" ? "Previous day" : view === "week" ? "Previous week" : "Previous month";
  const nextLabel = view === "day" ? "Next day" : view === "week" ? "Next week" : "Next month";

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
          className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-surface border border-border-strong text-text-primary text-[14px] font-medium hover:bg-border transition-all duration-[120ms]"
        >
          <CalendarIcon width={14} height={14} />
          Subscribe
        </button>
      </header>

      {/* Navigation + View toggle */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={goToPrevious}
          className="inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-3 hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          aria-label={prevLabel}
        >
          <ChevronLeftIcon width={14} height={14} />
        </button>
        <button
          onClick={goToNext}
          className="inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-3 hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          aria-label={nextLabel}
        >
          <ChevronRightIcon width={14} height={14} />
        </button>
        <h2 className="text-[15px] font-semibold text-text-primary flex-1">
          {headerLabel}
        </h2>

        {/* View toggle — segmented control */}
        <div className="inline-flex items-center rounded-[8px] border border-border-strong bg-[#e8e2db] p-[3px]" role="tablist">
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              role="tab"
              aria-selected={view === opt.value}
              onClick={() => setView(opt.value)}
              className={`px-4 py-[5px] text-[13px] font-medium rounded-[6px] transition-all duration-[150ms] ${
                view === opt.value
                  ? "bg-surface text-text-primary border border-border-strong shadow-sm"
                  : "text-text-3 hover:text-text-2"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      {view === "month" ? (
        <CalendarGrid
          currentDate={currentDate}
          events={events}
          onEventClick={setEditingEvent}
          onEventDrop={handleEventDrop}
        />
      ) : view === "week" ? (
        <CalendarWeekGrid
          currentDate={currentDate}
          events={events}
          onEventClick={setEditingEvent}
          onEventDrop={handleEventDrop}
        />
      ) : (
        <CalendarDayGrid
          currentDate={currentDate}
          events={events}
          onEventClick={setEditingEvent}
          onEventDrop={handleEventDrop}
        />
      )}

      {/* Edit event modal */}
      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onSave={handleUpdateEvent}
          onDelete={handleDeleteEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {/* Subscribe modal */}
      {subscribeModalOpen && (
        <SubscribeModal onClose={() => setSubscribeModalOpen(false)} />
      )}
    </div>
  );
}
