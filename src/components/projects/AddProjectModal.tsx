import { useState, useEffect, useRef } from "react";
import {
  type ProjectStatus,
  type Project,
} from "@/lib/projects-data";
import type { HomeAsset } from "@/lib/home-assets-data";
import { XIcon, HomeIcon } from "@/components/icons";
import ComboboxInput, { type ComboboxOption } from "@/components/ui/ComboboxInput";

interface AddProjectModalProps {
  project?: Project;
  homeAssets?: HomeAsset[];
  onSave: (
    data: Omit<
      Project,
      "id" | "createdAt" | "totalCost" | "contractorRating" | "completedAt"
    >
  ) => void;
  onClose: () => void;
}

export default function AddProjectModal({
  project,
  homeAssets = [],
  onSave,
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
  );
}
