"use client";

import { useState, useEffect, useRef } from "react";
import { type Contractor } from "@/lib/contractors-data";
import { XIcon, ChevronDownIcon, BuildingIcon } from "@/components/icons";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import AddContractorModal from "@/components/contractors/AddContractorModal";

interface EventData {
  title: string;
  eventDate: string;
  eventTime: string | null;
  eventEndTime: string | null;
  notes: string;
  contractorId: string | null;
}

interface AddEventModalProps {
  contractors: Contractor[];
  defaultContractorId: string | null;
  event?: { id: string; title: string; eventDate: string; eventTime: string | null; eventEndTime: string | null; notes?: string };
  onSave: (data: EventData) => void;
  onContractorAdded: (data: Omit<Contractor, "id" | "createdAt">) => Promise<Contractor>;
  onClose: () => void;
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

export default function AddEventModal({
  contractors,
  defaultContractorId,
  event,
  onSave,
  onContractorAdded,
  onClose,
}: AddEventModalProps) {
  const isEditing = !!event;
  const [title, setTitle] = useState(event?.title ?? "");
  const [eventDate, setEventDate] = useState(event?.eventDate ?? todayString());
  const [eventTime, setEventTime] = useState(event?.eventTime ?? "");
  const [eventEndTime, setEventEndTime] = useState(event?.eventEndTime ?? "");
  const [contractorId, setContractorId] = useState<string | null>(
    defaultContractorId
  );
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [contractorDropdownOpen, setContractorDropdownOpen] = useState(false);
  const [contractorSearch, setContractorSearch] = useState("");
  const contractorDropdownRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const isValid = title.trim() !== "";

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !showContractorModal) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showContractorModal]);

  // Close contractor dropdown on outside click
  useEffect(() => {
    if (!contractorDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (contractorDropdownRef.current && !contractorDropdownRef.current.contains(e.target as Node)) {
        setContractorDropdownOpen(false);
        setContractorSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contractorDropdownOpen]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    onSave({
      title: title.trim(),
      eventDate,
      eventTime: eventTime || null,
      eventEndTime: eventEndTime || null,
      notes: notes.trim(),
      contractorId: contractorId || null,
    });
  }

  return (
    <>
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
            {isEditing ? "Edit Appointment" : "Schedule Appointment"}
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
              Appointment Title <span className="text-red">*</span>
            </span>
            <input
              ref={titleRef}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              placeholder="e.g. Initial consultation"
            />
          </label>

          {/* Contractor */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium text-text-primary">
              Contractor
            </span>
            <div className="relative" ref={contractorDropdownRef}>
              <button
                type="button"
                onClick={() => setContractorDropdownOpen(!contractorDropdownOpen)}
                className="w-full flex items-center gap-2.5 px-3 py-[7px] pr-8 text-[14px] bg-white border border-border rounded-[var(--radius-sm)] text-text-primary cursor-pointer focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              >
                {contractorId ? (() => {
                  const selected = contractors.find((c) => c.id === contractorId);
                  if (!selected) return <span className="text-text-3">None</span>;
                  return (
                    <>
                      {selected.logoUrl ? (
                        <img src={selected.logoUrl} alt="" className="w-6 h-6 rounded-full object-contain bg-white border border-border shrink-0" />
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-accent shrink-0 flex items-center justify-center">
                          <BuildingIcon width={12} height={12} className="text-white" />
                        </span>
                      )}
                      <span className="truncate">{selected.name ? `${selected.name} — ${selected.company}` : selected.company}</span>
                    </>
                  );
                })() : (
                  <span className="text-text-3">None</span>
                )}
                <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-3" />
              </button>

              {contractorDropdownOpen && (() => {
                const q = contractorSearch.toLowerCase();
                const filteredContractors = [...contractors]
                  .sort((a, b) => a.company.localeCompare(b.company))
                  .filter((c) => !q || c.company.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
                return (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-border rounded-[var(--radius-md)] shadow-[var(--shadow-hover)] overflow-hidden">
                    <div className="px-3 py-2 border-b border-border">
                      <input
                        type="text"
                        value={contractorSearch}
                        onChange={(e) => setContractorSearch(e.target.value)}
                        placeholder="Search contractors..."
                        className="w-full text-[13px] bg-transparent text-text-primary placeholder:text-text-4 focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {!q && (
                        <button
                          type="button"
                          onClick={() => { setContractorId(null); setContractorDropdownOpen(false); setContractorSearch(""); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[14px] text-left hover:bg-surface-hover transition-[background] duration-[120ms] ${!contractorId ? "bg-surface-hover" : ""}`}
                        >
                          <span className="w-6 h-6 rounded-full bg-border shrink-0" />
                          <span className="text-text-3">None</span>
                        </button>
                      )}
                      {filteredContractors.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setContractorId(c.id); setContractorDropdownOpen(false); setContractorSearch(""); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[14px] text-left hover:bg-surface-hover transition-[background] duration-[120ms] ${contractorId === c.id ? "bg-surface-hover" : ""}`}
                        >
                          {c.logoUrl ? (
                            <img src={c.logoUrl} alt="" className="w-6 h-6 rounded-full object-contain bg-white border border-border shrink-0" />
                          ) : (
                            <span className="w-6 h-6 rounded-full bg-accent shrink-0 flex items-center justify-center">
                              <BuildingIcon width={12} height={12} className="text-white" />
                            </span>
                          )}
                          <span className="truncate text-text-primary">{c.name ? `${c.name} — ${c.company}` : c.company}</span>
                        </button>
                      ))}
                      {filteredContractors.length === 0 && (
                        <p className="px-3 py-3 text-[13px] text-text-3 text-center">No contractors found</p>
                      )}
                      {!q && (
                        <button
                          type="button"
                          onClick={() => { setContractorDropdownOpen(false); setContractorSearch(""); setShowContractorModal(true); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[14px] text-left text-accent font-medium hover:bg-surface-hover transition-[background] duration-[120ms] border-t border-border"
                        >
                          + Add New Contractor
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

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
                  // Auto-set end time to 1 hour after start if end time is empty or before start
                  if (val && (!eventEndTime || eventEndTime <= val)) {
                    const [h, m] = val.split(":").map(Number);
                    const endH = Math.min(h + 1, 23);
                    setEventEndTime(`${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
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
              rows={2}
              className="px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms] resize-none"
              placeholder="Add notes..."
            />
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
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
              {isEditing ? "Save Changes" : "Schedule"}
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
