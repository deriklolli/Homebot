"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { XIcon } from "@/components/icons";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import { type ProjectCalendarEvent } from "./CalendarGrid";

interface EditEventData {
  title: string;
  eventDate: string;
  eventTime: string | null;
  eventEndTime: string | null;
  notes: string;
}

interface EditEventModalProps {
  event: ProjectCalendarEvent;
  onSave: (eventId: string, data: EditEventData) => void;
  onDelete: (eventId: string) => void;
  onClose: () => void;
}

export default function EditEventModal({
  event,
  onSave,
  onDelete,
  onClose,
}: EditEventModalProps) {
  const [title, setTitle] = useState(event.title);
  const [eventDate, setEventDate] = useState(event.eventDate);
  const [eventTime, setEventTime] = useState(event.eventTime ?? "");
  const [eventEndTime, setEventEndTime] = useState(event.eventEndTime ?? "");
  const [notes, setNotes] = useState(event.notes ?? "");
  const titleRef = useRef<HTMLInputElement>(null);
  const isValid = title.trim() !== "";

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    onSave(event.id, {
      title: title.trim(),
      eventDate,
      eventTime: eventTime || null,
      eventEndTime: eventEndTime || null,
      notes: notes.trim(),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-hover)] w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-text-primary">
            Edit Event
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-[var(--radius-sm)] p-1.5 text-text-3 hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
            aria-label="Close modal"
          >
            <XIcon width={16} height={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Title */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium text-text-primary">
              Title <span className="text-red">*</span>
            </span>
            <input
              ref={titleRef}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              placeholder="Event title"
            />
          </label>

          {/* Date */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium text-text-primary">
              Date <span className="text-red">*</span>
            </span>
            <DatePicker
              value={eventDate}
              onChange={setEventDate}
              required
            />
          </label>

          {/* Start & End Time */}
          <div className="flex gap-3">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-[14px] font-medium text-text-primary">
                Start Time
              </span>
              <TimePicker
                value={eventTime}
                onChange={(val) => {
                  setEventTime(val);
                  if (val && (!eventEndTime || eventEndTime <= val)) {
                    const [h, m] = val.split(":").map(Number);
                    const endH = Math.min(h + 1, 23);
                    setEventEndTime(
                      `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`
                    );
                  }
                }}
              />
            </label>
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-[14px] font-medium text-text-primary">
                End Time
              </span>
              <TimePicker
                value={eventEndTime}
                onChange={setEventEndTime}
              />
            </label>
          </div>

          {/* Notes */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium text-text-primary">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms] resize-none"
              placeholder="Add notes..."
            />
          </label>

          {/* Project link */}
          <div className="flex items-center gap-2 text-[13px] text-text-3">
            <span>Project:</span>
            <Link
              href={`/projects/${event.projectId}`}
              className="text-accent hover:underline font-medium"
            >
              {event.projectName}
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => onDelete(event.id)}
              className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[var(--radius-sm)] text-red text-[13px] font-medium hover:bg-red/10 transition-all duration-[120ms]"
            >
              Delete
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValid}
                className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
