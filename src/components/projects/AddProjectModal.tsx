import { useState, useEffect, useRef } from "react";
import {
  PROJECT_STATUSES,
  type ProjectStatus,
  type Project,
} from "@/lib/projects-data";
import type { Contractor } from "@/lib/contractors-data";
import type { HomeAsset } from "@/lib/home-assets-data";
import { XIcon, ChevronDownIcon } from "@/components/icons";

interface AddProjectModalProps {
  project?: Project;
  contractors: Contractor[];
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
  contractors,
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
    status: (project?.status ?? "In Progress") as ProjectStatus,
    notes: project?.notes ?? "",
  });

  const nameRef = useRef<HTMLInputElement>(null);
  const isValid = form.name.trim() !== "";

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

          {/* Contractor */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium text-text-primary">
              Contractor
            </span>
            <div className="relative">
              <select
                value={form.contractorId}
                onChange={(e) =>
                  setForm({ ...form, contractorId: e.target.value })
                }
                className="w-full appearance-none px-3 py-[7px] pr-8 text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary cursor-pointer focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              >
                <option value="">None (DIY)</option>
                {[...contractors]
                  .sort((a, b) => (a.company || a.name).localeCompare(b.company || b.name))
                  .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company || c.name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-3" />
            </div>
          </label>

          {/* Home Asset */}
          {homeAssets.length > 0 && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[14px] font-medium text-text-primary">
                Home Asset
              </span>
              <div className="relative">
                <select
                  value={form.homeAssetId}
                  onChange={(e) =>
                    setForm({ ...form, homeAssetId: e.target.value })
                  }
                  className="w-full appearance-none px-3 py-[7px] pr-8 text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary cursor-pointer focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
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

          {/* Status */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium text-text-primary">
              Status
            </span>
            <div className="relative">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as ProjectStatus,
                  })
                }
                className="w-full appearance-none px-3 py-[7px] pr-8 text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary cursor-pointer focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-3" />
            </div>
          </label>

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
