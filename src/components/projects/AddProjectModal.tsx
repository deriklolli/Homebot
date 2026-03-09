import { useState, useEffect, useRef } from "react";
import {
  type ProjectStatus,
  type Project,
} from "@/lib/projects-data";
import type { HomeAsset } from "@/lib/home-assets-data";
import type { Contractor } from "@/lib/contractors-data";
import { XIcon, HomeIcon, ChevronDownIcon, BuildingIcon } from "@/components/icons";
import ComboboxInput, { type ComboboxOption } from "@/components/ui/ComboboxInput";
import AddContractorModal from "@/components/contractors/AddContractorModal";

interface AddProjectModalProps {
  project?: Project;
  homeAssets?: HomeAsset[];
  contractors?: Contractor[];
  onSave: (
    data: Omit<
      Project,
      "id" | "createdAt" | "totalCost" | "contractorRating" | "completedAt"
    >
  ) => void;
  onContractorAdded?: (data: Omit<Contractor, "id" | "createdAt">) => Promise<Contractor>;
  onClose: () => void;
}

export default function AddProjectModal({
  project,
  homeAssets = [],
  contractors = [],
  onSave,
  onContractorAdded,
  onClose,
}: AddProjectModalProps) {
  const isEditing = !!project;

  const [form, setForm] = useState({
    name: project?.name ?? "",
    description: project?.description ?? "",
    contractorId: project?.contractorId ?? "",
    homeAssetId: project?.homeAssetId ?? "",
    status: (project?.status ?? "Not Started") as ProjectStatus,
    notes: project?.notes ?? "",
  });

  const nameRef = useRef<HTMLInputElement>(null);
  const isValid = form.name.trim() !== "";

  // Asset combobox
  const selectedAsset = homeAssets.find((a) => a.id === form.homeAssetId);
  const [assetSearch, setAssetSearch] = useState(selectedAsset?.name ?? "");
  const assetOptions: ComboboxOption[] = [...homeAssets]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((a) => ({
      label: a.name,
      value: a.id,
      subtitle: [a.make, a.model].filter(Boolean).join(" ") || undefined,
      icon: a.imageUrl || undefined,
    }));

  // Contractor dropdown state
  const [contractorDropdownOpen, setContractorDropdownOpen] = useState(false);
  const [contractorSearch, setContractorSearch] = useState("");
  const contractorDropdownRef = useRef<HTMLDivElement>(null);
  const [showContractorModal, setShowContractorModal] = useState(false);

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    onSave({
      name: form.name.trim(),
      description: form.description.trim(),
      contractorId: form.contractorId || null,
      homeAssetId: form.homeAssetId || null,
      status: form.status,
      notes: form.notes.trim(),
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
              {isEditing ? "Edit Project" : "Add Project"}
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
                Project Name <span className="text-red">*</span>
              </span>
              <input
                ref={nameRef}
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                placeholder="e.g. Kitchen Faucet Replacement"
              />
            </label>

            {/* Description */}
            <label className="flex flex-col gap-1.5">
              <span className="text-[14px] font-medium text-text-primary">
                Description
              </span>
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                placeholder="Brief description of the work"
              />
            </label>

            {/* Contractor */}
            {contractors.length > 0 && (
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
                    {form.contractorId ? (() => {
                      const selected = contractors.find((c) => c.id === form.contractorId);
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
                              onClick={() => { setForm({ ...form, contractorId: "" }); setContractorDropdownOpen(false); setContractorSearch(""); }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[14px] text-left hover:bg-surface-hover transition-[background] duration-[120ms] ${!form.contractorId ? "bg-surface-hover" : ""}`}
                            >
                              <span className="w-6 h-6 rounded-full bg-border shrink-0" />
                              <span className="text-text-3">None</span>
                            </button>
                          )}
                          {filteredContractors.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => { setForm({ ...form, contractorId: c.id }); setContractorDropdownOpen(false); setContractorSearch(""); }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[14px] text-left hover:bg-surface-hover transition-[background] duration-[120ms] ${form.contractorId === c.id ? "bg-surface-hover" : ""}`}
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
                          {!q && onContractorAdded && (
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
            )}

            {/* Home Asset */}
            {homeAssets.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[14px] font-medium text-text-primary">
                  Home Asset
                </span>
                <ComboboxInput
                  value={assetSearch}
                  onChange={(val) => {
                    setAssetSearch(val);
                    // Clear selection if user edits the text
                    if (form.homeAssetId) {
                      const match = homeAssets.find((a) => a.id === form.homeAssetId);
                      if (match && val !== match.name) {
                        setForm({ ...form, homeAssetId: "" });
                      }
                    }
                  }}
                  options={assetOptions}
                  placeholder="Search assets..."
                  onSelect={(option) => {
                    setAssetSearch(option.label);
                    setForm({ ...form, homeAssetId: option.value });
                  }}
                  emptyMessage="No assets found"
                  placeholderIcon={<HomeIcon width={16} height={16} className="text-white" />}
                />
              </div>
            )}

            {/* Notes */}
            <label className="flex flex-col gap-1.5">
              <span className="text-[14px] font-medium text-text-primary">
                Notes
              </span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                placeholder="Materials, special instructions, access notes..."
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
                {isEditing ? "Save Changes" : "Create Project"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Add Contractor Modal */}
      {showContractorModal && onContractorAdded && (
        <AddContractorModal
          onSave={async (data) => {
            const newContractor = await onContractorAdded(data);
            setForm({ ...form, contractorId: newContractor.id });
            setShowContractorModal(false);
          }}
          onClose={() => setShowContractorModal(false)}
        />
      )}
    </>
  );
}
