"use client";

import { useState, useEffect, useRef } from "react";
import { FREQUENCY_OPTIONS, type Service } from "@/lib/services-data";
import type { Contractor } from "@/lib/contractors-data";
import type { HomeAsset } from "@/lib/home-assets-data";
import { XIcon, ChevronDownIcon, TrashIcon, HomeIcon, BuildingIcon } from "@/components/icons";
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
  const [remindersEnabled, setRemindersEnabled] = useState(service?.remindersEnabled ?? false);
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [contractorDropdownOpen, setContractorDropdownOpen] = useState(false);
  const [contractorSearch, setContractorSearch] = useState("");
  const contractorDropdownRef = useRef<HTMLDivElement>(null);
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");
  const assetDropdownRef = useRef<HTMLDivElement>(null);
  const assetSearchRef = useRef<HTMLInputElement>(null);
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

  // Close asset dropdown on outside click
  useEffect(() => {
    if (!assetDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(e.target as Node)) {
        setAssetDropdownOpen(false);
        setAssetSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [assetDropdownOpen]);

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
      remindersEnabled,
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
              <span className="text-[14px] font-medium text-text-primary">
                Service Name <span className="text-red">*</span>
              </span>
              <input
                ref={nameRef}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                placeholder="e.g. Snow Plowing"
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
                            onClick={() => { handleContractorChange(""); setContractorDropdownOpen(false); setContractorSearch(""); }}
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
                            onClick={() => { handleContractorChange(c.id); setContractorDropdownOpen(false); setContractorSearch(""); }}
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

            {/* Home Asset */}
            {homeAssets.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[14px] font-medium text-text-primary">
                  Home Asset
                </span>
                <div className="relative" ref={assetDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setAssetDropdownOpen(!assetDropdownOpen)}
                    className="w-full flex items-center gap-2.5 px-3 py-[7px] pr-8 text-[14px] bg-white border border-border rounded-[var(--radius-sm)] text-text-primary cursor-pointer focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                  >
                    {homeAssetId ? (() => {
                      const selected = homeAssets.find((a) => a.id === homeAssetId);
                      if (!selected) return <span className="text-text-3">None</span>;
                      return (
                        <>
                          {selected.imageUrl ? (
                            <img src={selected.imageUrl} alt="" className="w-6 h-6 rounded-full object-cover bg-bg shrink-0" />
                          ) : (
                            <span className="w-6 h-6 rounded-full bg-accent shrink-0 flex items-center justify-center">
                              <HomeIcon width={12} height={12} className="text-white" />
                            </span>
                          )}
                          <span className="truncate">{selected.name}</span>
                        </>
                      );
                    })() : (
                      <span className="text-text-3">None</span>
                    )}
                    <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-3" />
                  </button>

                  {assetDropdownOpen && (() => {
                    const q = assetSearch.toLowerCase();
                    const filteredAssets = [...homeAssets]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .filter((a) => !q || a.name.toLowerCase().includes(q));
                    return (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-border rounded-[var(--radius-md)] shadow-[var(--shadow-hover)] overflow-hidden">
                        <div className="px-3 py-2 border-b border-border">
                          <input
                            ref={assetSearchRef}
                            type="text"
                            value={assetSearch}
                            onChange={(e) => setAssetSearch(e.target.value)}
                            placeholder="Search assets..."
                            className="w-full text-[13px] bg-transparent text-text-primary placeholder:text-text-4 focus:outline-none"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {!q && (
                            <button
                              type="button"
                              onClick={() => { setHomeAssetId(""); setAssetDropdownOpen(false); setAssetSearch(""); }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[14px] text-left hover:bg-surface-hover transition-[background] duration-[120ms] ${!homeAssetId ? "bg-surface-hover" : ""}`}
                            >
                              <span className="w-6 h-6 rounded-full bg-border shrink-0" />
                              <span className="text-text-3">None</span>
                            </button>
                          )}
                          {filteredAssets.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => { setHomeAssetId(a.id); setAssetDropdownOpen(false); setAssetSearch(""); }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[14px] text-left hover:bg-surface-hover transition-[background] duration-[120ms] ${homeAssetId === a.id ? "bg-surface-hover" : ""}`}
                            >
                              {a.imageUrl ? (
                                <img src={a.imageUrl} alt="" className="w-6 h-6 rounded-full object-cover bg-bg shrink-0" />
                              ) : (
                                <span className="w-6 h-6 rounded-full bg-accent shrink-0 flex items-center justify-center">
                                  <HomeIcon width={12} height={12} className="text-white" />
                                </span>
                              )}
                              <span className="truncate text-text-primary">{a.name}</span>
                            </button>
                          ))}
                          {filteredAssets.length === 0 && (
                            <p className="px-3 py-3 text-[13px] text-text-3 text-center">No assets found</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Frequency & Remind me */}
            <div className="flex gap-3 items-end">
              <label className="flex flex-col gap-1.5 flex-1">
                <span className="text-[14px] font-medium text-text-primary">
                  Frequency <span className="text-red">*</span>
                </span>
                <select
                  value={frequencyMonths}
                  onChange={(e) => setFrequencyMonths(Number(e.target.value))}
                  className="px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <div
                className="flex items-center gap-2 cursor-pointer px-3 py-[7px] rounded-[var(--radius-sm)] hover:bg-surface-hover transition-[background] duration-[120ms] shrink-0"
                onClick={() => setRemindersEnabled(!remindersEnabled)}
              >
                {remindersEnabled ? (
                  <span className="shrink-0 w-[18px] h-[18px] rounded-full bg-accent border-2 border-accent flex items-center justify-center text-white">
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                ) : (
                  <span className="shrink-0 w-[18px] h-[18px] rounded-full border-2 border-border-strong" />
                )}
                <span className="text-[14px] font-medium text-text-primary">
                  Remind me
                </span>
              </div>
            </div>

            {/* Cost */}
            <label className="flex flex-col gap-1.5">
              <span className="text-[14px] font-medium text-text-primary">
                Cost
              </span>
              <CurrencyInput
                value={cost}
                onChange={setCost}
              />
            </label>

            {/* Last Service Date */}
            <label className="flex flex-col gap-1.5">
              <span className="text-[14px] font-medium text-text-primary">
                Last Service Date
              </span>
              <DatePicker
                value={lastServiceDate}
                onChange={setLastServiceDate}
              />
            </label>

            {/* Notes */}
            <label className="flex flex-col gap-1.5">
              <span className="text-[14px] font-medium text-text-primary">
                Notes
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
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
                    className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-3 text-[14px] font-medium hover:bg-red-light hover:text-red hover:border-red/20 transition-all duration-[120ms]"
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isValid}
                  className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-40 disabled:cursor-not-allowed"
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
