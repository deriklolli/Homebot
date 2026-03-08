"use client";

import { useState, useEffect } from "react";
import { XIcon } from "@/components/icons";
import {
  UTILITY_CATEGORIES,
  type UtilityBill,
  type UtilityCategory,
  type UtilityProvider,
} from "@/lib/utility-bills-data";

interface AddBillModalProps {
  bill?: UtilityBill;
  providers: UtilityProvider[];
  onSave: (data: Omit<UtilityBill, "id" | "createdAt">) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

export default function AddBillModal({
  bill,
  providers,
  onSave,
  onDelete,
  onClose,
}: AddBillModalProps) {
  const [providerName, setProviderName] = useState(bill?.providerName ?? "");
  const [category, setCategory] = useState<UtilityCategory>(bill?.category ?? "electric");
  const [amount, setAmount] = useState(bill?.amount?.toString() ?? "");
  const [dueDate, setDueDate] = useState(bill?.dueDate ?? "");
  const [billingPeriodStart, setBillingPeriodStart] = useState(bill?.billingPeriodStart ?? "");
  const [billingPeriodEnd, setBillingPeriodEnd] = useState(bill?.billingPeriodEnd ?? "");
  const [accountNumber, setAccountNumber] = useState(bill?.accountNumber ?? "");
  const [notes, setNotes] = useState(bill?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Auto-fill category when selecting a known provider
  function handleProviderSelect(provider: UtilityProvider) {
    setProviderName(provider.name);
    setCategory(provider.category);
    if (provider.accountNumber) setAccountNumber(provider.accountNumber);
    setShowSuggestions(false);
  }

  const filteredProviders = providerName.trim()
    ? providers.filter(
        (p) =>
          p.name.toLowerCase().includes(providerName.toLowerCase()) &&
          p.name.toLowerCase() !== providerName.toLowerCase()
      )
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!providerName.trim() || !amount) return;
    setSaving(true);
    try {
      await onSave({
        providerId: bill?.providerId ?? null,
        providerName: providerName.trim(),
        category,
        amount: parseFloat(amount),
        dueDate: dueDate || null,
        billingPeriodStart: billingPeriodStart || null,
        billingPeriodEnd: billingPeriodEnd || null,
        accountNumber: accountNumber || null,
        gmailMessageId: bill?.gmailMessageId ?? null,
        source: bill?.source ?? "manual",
        notes,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-border bg-surface text-[14px] text-text-primary placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="text-[17px] font-semibold text-text-primary">
            {bill ? "Edit Bill" : "Add Bill"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-[var(--radius-sm)] hover:bg-border transition-colors"
            aria-label="Close"
          >
            <XIcon width={16} height={16} className="text-text-3" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Provider Name */}
          <div className="relative">
            <label className="block text-[13px] font-medium text-text-2 mb-1">
              Provider Name
            </label>
            <input
              type="text"
              value={providerName}
              onChange={(e) => {
                setProviderName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="e.g. Duke Energy"
              className={inputCls}
              required
            />
            {showSuggestions && filteredProviders.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-[var(--radius-md)] shadow-lg max-h-[150px] overflow-y-auto">
                {filteredProviders.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderSelect(p)}
                    className="w-full text-left px-3 py-2 text-[14px] text-text-primary hover:bg-surface-hover transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-[13px] font-medium text-text-2 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as UtilityCategory)}
              className={inputCls}
            >
              {UTILITY_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-[13px] font-medium text-text-2 mb-1">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 text-[14px]">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`${inputCls} pl-7`}
                required
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-[13px] font-medium text-text-2 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Billing Period */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-text-2 mb-1">
                Period Start
              </label>
              <input
                type="date"
                value={billingPeriodStart}
                onChange={(e) => setBillingPeriodStart(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-text-2 mb-1">
                Period End
              </label>
              <input
                type="date"
                value={billingPeriodEnd}
                onChange={(e) => setBillingPeriodEnd(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-[13px] font-medium text-text-2 mb-1">
              Account Number
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Optional"
              className={inputCls}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[13px] font-medium text-text-2 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !providerName.trim() || !amount}
              className="flex-1 py-[9px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-50"
            >
              {saving ? "Saving..." : bill ? "Update Bill" : "Add Bill"}
            </button>
            {bill && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-[9px] rounded-[var(--radius-sm)] border border-red text-red text-[14px] font-medium hover:bg-red/5 transition-all duration-[120ms]"
              >
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
