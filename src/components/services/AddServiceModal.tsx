"use client";

import { useState, useEffect, useRef } from "react";
import { FREQUENCY_OPTIONS, type Service } from "@/lib/services-data";
import type { Contractor } from "@/lib/contractors-data";
import type { HomeAsset } from "@/lib/home-assets-data";
import { XIcon, ChevronDownIcon, TrashIcon } from "@/components/icons";
import DatePicker from "@/components/ui/DatePicker";
import CurrencyInput from "@/components/ui/CurrencyInput";
import AddContractorModal from "@/components/contractors/AddContractorModal";

interface AddServiceModalProps {
  service?: Service;
  contractors: Contractor[];
  homeAssets?: HomeAsset[];
  onSave: (data: Omit<Service, "id" | "createdAt">) => void;
  onDelete?: () => void;
  onContractorAdded: (data: Omit<Contractor, "id" | "createdAt">) => Promise<Contractor>;
  onClose: () => void;
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

function computeNextServiceDate(
  fromDate: string,
  frequencyMonths: number
): string {
  const d = new Date(fromDate + "T00:00:00");
  if (frequencyMonths < 1) {
    // Sub-month: use day-based math (0.25 = 7 days, 0.5 = 14 days)
    d.setDate(d.getDate() + Math.round(frequencyMonths * 30));
  } else {
    d.setMonth(d.getMonth() + frequencyMonths);
    const targetMonth = (d.getMonth() + frequencyMonths) % 12;
    if (d.getMonth() !== targetMonth) {
      d.setDate(0);
    }
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AddServiceModal({
  service,
  contractors,
  homeAssets = [],
  onSave,
  onDelete,
  onContractorAdded,
  onClose,
}: AddServiceModalProps) {
  const isEditing = !!service;
  const [name, setName] = useState(service?.name ?? "");
  const [contractorId, setContractorId] = useState(service?.contractorId ?? "");
  const [provider, setProvider] = useState(service?.provider ?? "");
  const [cost, setCost] = useState(service?.cost?.toString() ?? "");
  const [frequencyMonths, setFrequencyMonths] = useState(
    service?.frequencyMonths ?? 12
  );
  const [lastServiceDate, setLastServiceDate] = useState(
    service?.lastServiceDate ?? ""
  );
  const [phone, setPhone] = useState(service?.phone ?? "");
  const [homeAssetId, setHomeAssetId] = useState(service?.homeAssetId ?? "");
  const [notes, setNotes] = useState(service?.notes ?? "");
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const isValid = name.trim() !== "";

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !showContractorModal) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showContractorModal]);

  function handleContractorChange(value: string) {
    if (value === "__new__") {
      setShowContractorModal(true);
      return;
    }
    setContractorId(value);
    // Auto-fill provider and phone from selected contractor
    const selected = contractors.find((c) => c.id === value);
    if (selected) {
      setProvider(selected.company);
      setPhone(selected.phone);
    } else {
      setProvider("");
      setPhone("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    const baseDate = lastServiceDate || todayString();
    const nextServiceDate = computeNextServiceDate(baseDate, frequencyMonths);
    const parsedCost = cost.trim() ? parseFloat(cost) : null;

    onSave({
      name: name.trim(),
      provider: provider.trim(),
      contractorId: contractorId || null,
      cost: parsedCost !== null && !isNaN(parsedCost) ? parsedCost : null,
      frequencyMonths,
      lastServiceDate: lastServiceDate || null,
      nextServiceDate,
      homeAssetId: homeAssetId || null,
      phone: phone.trim(),
      notes: notes.trim(),
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
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-hover)] w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-[15px] font-semibold text-text-primary">
              {isEditing ? "Edit Service" : "Add Service"}
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
            {/* Name */}
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-text-primary">
                Service Name <span className="text-red">*</span>
              </span>
              <input
                ref={nameRef}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                placeholder="e.g. Snow Plowing"
              />
            </label>

            {/* Contractor */}
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-text-primary">
                Contractor
              </span>
              <div className="relative">
                <select
                  value={contractorId}
                  onChange={(e) => handleContractorChange(e.target.value)}
                  className="w-full appearance-none px-3 py-[7px] pr-8 text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary cursor-pointer focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                >
                  <option value="">None</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name ? `${c.name} — ${c.company}` : c.company}
                    </option>
                  ))}
                  <option value="__new__">+ Add New Contractor</option>
                </select>
                <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-3" />
              </div>
            </label>

            {/* Home Asset */}
            {homeAssets.length > 0 && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-text-primary">
                  Home Asset
                </span>
                <div className="relative">
                  <select
                    value={homeAssetId}
                    onChange={(e) => setHomeAssetId(e.target.value)}
                    className="w-full appearance-none px-3 py-[7px] pr-8 text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary cursor-pointer focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                  >
                    <option value="">None</option>
                    {[...homeAssets]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-3" />
                </div>
              </label>
            )}

            {/* Cost & Frequency */}
            <div className="flex gap-3">
              <label className="flex flex-col gap-1.5 flex-1">
                <span className="text-[13px] font-medium text-text-primary">
                  Cost
                </span>
                <CurrencyInput
                  value={cost}
                  onChange={setCost}
                />
              </label>
              <label className="flex flex-col gap-1.5 flex-1">
                <span className="text-[13px] font-medium text-text-primary">
                  Frequency <span className="text-red">*</span>
                </span>
                <select
                  value={frequencyMonths}
                  onChange={(e) => setFrequencyMonths(Number(e.target.value))}
                  className="px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Last Service Date */}
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-text-primary">
                Last Service Date
              </span>
              <DatePicker
                value={lastServiceDate}
                onChange={setLastServiceDate}
              />
            </label>

            {/* Notes */}
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-text-primary">
                Notes
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                placeholder="Contract details, schedule preferences..."
              />
            </label>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-border">
              {isEditing && onDelete && (
                confirmDelete ? (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[12px] text-text-3">Delete this service?</span>
                    <button
                      type="button"
                      onClick={onDelete}
                      className="inline-flex items-center gap-1 px-2.5 py-[5px] rounded-[var(--radius-sm)] bg-red text-white text-[12px] font-medium hover:brightness-110 transition-all duration-[120ms]"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="text-[12px] font-medium text-text-3 hover:text-text-primary transition-colors duration-[120ms]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-3 text-[13px] font-medium hover:bg-red-light hover:text-red hover:border-red/20 transition-all duration-[120ms]"
                  >
                    <TrashIcon width={13} height={13} />
                    Delete
                  </button>
                )
              )}
              <div className="flex gap-3 ml-auto">
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
                  {isEditing ? "Save Changes" : "Add Service"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {showContractorModal && (
        <AddContractorModal
          onSave={async (data) => {
            const newContractor = await onContractorAdded(data);
            setContractorId(newContractor.id);
            setProvider(newContractor.company);
            setPhone(newContractor.phone);
            setShowContractorModal(false);
          }}
          onClose={() => setShowContractorModal(false)}
        />
      )}
    </>
  );
}
