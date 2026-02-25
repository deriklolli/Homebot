"use client";

import { useState, useEffect, useRef } from "react";
import { FREQUENCY_OPTIONS, type InventoryItem } from "@/lib/inventory-data";
import { XIcon } from "@/components/icons";
import DatePicker from "@/components/ui/DatePicker";
import CurrencyInput from "@/components/ui/CurrencyInput";

interface AddInventoryItemModalProps {
  item?: InventoryItem;
  onSave: (data: Omit<InventoryItem, "id" | "createdAt">) => void;
  onClose: () => void;
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

function computeNextReminderDate(
  fromDate: string,
  frequencyMonths: number
): string {
  const d = new Date(fromDate + "T00:00:00");
  if (frequencyMonths < 1) {
    // Sub-month: use day-based math (0.25 = 7 days, 0.5 = 14 days)
    d.setDate(d.getDate() + Math.round(frequencyMonths * 30));
  } else {
    d.setMonth(d.getMonth() + frequencyMonths);
    // Clamp to last day of target month if overflow
    const targetMonth = (d.getMonth() + frequencyMonths) % 12;
    if (d.getMonth() !== targetMonth) {
      d.setDate(0); // last day of previous month
    }
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AddInventoryItemModal({
  item,
  onSave,
  onClose,
}: AddInventoryItemModalProps) {
  const isEditing = !!item;
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [frequencyMonths, setFrequencyMonths] = useState(
    item?.frequencyMonths ?? 6
  );
  const [lastOrderedDate, setLastOrderedDate] = useState(
    item?.lastOrderedDate ?? ""
  );
  const [purchaseUrl, setPurchaseUrl] = useState(item?.purchaseUrl ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(item?.thumbnailUrl ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [cost, setCost] = useState(item?.cost != null ? String(item.cost) : "");
  const nameRef = useRef<HTMLInputElement>(null);
  const isValid = name.trim() !== "";

  useEffect(() => {
    nameRef.current?.focus();
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

    const baseDate = lastOrderedDate || todayString();
    const nextReminderDate = computeNextReminderDate(baseDate, frequencyMonths);

    onSave({
      name: name.trim(),
      description: description.trim(),
      frequencyMonths,
      lastOrderedDate: lastOrderedDate || null,
      nextReminderDate,
      purchaseUrl: purchaseUrl.trim(),
      thumbnailUrl: thumbnailUrl.trim(),
      notes: notes.trim(),
      cost: cost.trim() ? parseFloat(cost) : null,
    });
  }

  return (
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
            {isEditing ? "Edit Item" : "Add Inventory Item"}
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
              Item Name <span className="text-red">*</span>
            </span>
            <input
              ref={nameRef}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              placeholder="e.g. AC Filter (20x25x1)"
            />
          </label>

          {/* Description */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-text-primary">
              Description
            </span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              placeholder="What this item is for"
            />
          </label>

          {/* Frequency & Last Ordered */}
          <div className="flex gap-3">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-[13px] font-medium text-text-primary">
                Replace Frequency <span className="text-red">*</span>
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
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-[13px] font-medium text-text-primary">
                Last Ordered
              </span>
              <DatePicker
                value={lastOrderedDate}
                onChange={setLastOrderedDate}
              />
            </label>
          </div>

          {/* Cost */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-text-primary">
              Cost
            </span>
            <CurrencyInput
              value={cost}
              onChange={setCost}
            />
          </label>

          {/* Purchase URL */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-text-primary">
              Purchase URL
            </span>
            <input
              type="url"
              value={purchaseUrl}
              onChange={(e) => setPurchaseUrl(e.target.value)}
              className="px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              placeholder="https://www.amazon.com/..."
            />
          </label>

          {/* Thumbnail URL */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-text-primary">
              Image URL
            </span>
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              className="px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              placeholder="Right-click product image → Copy image address"
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
              placeholder="Where to buy, brand preferences, size details..."
            />
          </label>

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
              {isEditing ? "Save Changes" : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
