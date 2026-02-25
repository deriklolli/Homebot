"use client";

import { useState, useEffect, useRef } from "react";
import { type Contractor } from "@/lib/contractors-data";
import { XIcon } from "@/components/icons";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import AddContractorModal from "@/components/contractors/AddContractorModal";

interface AddEventModalProps {
  contractors: Contractor[];
  defaultContractorId: string | null;
  onSave: (data: {
    title: string;
    eventDate: string;
    eventTime: string | null;
    contractorId: string | null;
  }) => void;
  onContractorAdded: (data: Omit<Contractor, "id" | "createdAt">) => Promise<Contractor>;
  onClose: () => void;
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

export default function AddEventModal({
  contractors,
  defaultContractorId,
  onSave,
  onContractorAdded,
  onClose,
}: AddEventModalProps) {
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(todayString());
  const [eventTime, setEventTime] = useState("");
  const [contractorId, setContractorId] = useState<string | null>(
    defaultContractorId
  );
  const [showContractorModal, setShowContractorModal] = useState(false);
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
    onSave({
      title: title.trim(),
      eventDate,
      eventTime: eventTime || null,
      contractorId: contractorId || null,
    });
  }

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-hover)] w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-text-primary">
            Schedule Appointment
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
            <span className="text-[13px] font-medium text-text-primary">
              Appointment Title <span className="text-red">*</span>
            </span>
            <input
              ref={titleRef}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              placeholder="e.g. Initial consultation"
            />
          </label>

          {/* Contractor */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-text-primary">
              Contractor
            </span>
            <select
              value={contractorId ?? ""}
              onChange={(e) => {
                if (e.target.value === "__add__") {
                  setShowContractorModal(true);
                  e.target.value = contractorId ?? "";
                  return;
                }
                setContractorId(e.target.value || null);
              }}
              className="px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
            >
              <option value="">No contractor</option>
              {[...contractors]
                .sort((a, b) => (a.company || a.name).localeCompare(b.company || b.name))
                .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company || c.name}
                </option>
              ))}
              <option disabled>──────────</option>
              <option value="__add__">+ Add Contractor</option>
            </select>
          </label>

          {/* Date & Time */}
          <div className="flex gap-3">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-[13px] font-medium text-text-primary">
                Date <span className="text-red">*</span>
              </span>
              <DatePicker
                value={eventDate}
                onChange={setEventDate}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 w-[130px]">
              <span className="text-[13px] font-medium text-text-primary">
                Time
              </span>
              <TimePicker
                value={eventTime}
                onChange={setEventTime}
              />
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[13px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Schedule
            </button>
          </div>
        </form>
      </div>
    </div>

    {showContractorModal && (
      <AddContractorModal
        onSave={async (data) => {
          const newContractor = await onContractorAdded(data);
          setContractorId(newContractor.id);
          setShowContractorModal(false);
        }}
        onClose={() => setShowContractorModal(false)}
      />
    )}
    </>
  );
}
