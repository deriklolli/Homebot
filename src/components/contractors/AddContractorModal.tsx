import { useState, useEffect, useRef } from "react";
import {
  SPECIALTIES,
  type Specialty,
  type Contractor,
} from "@/lib/contractors-data";
import { XIcon, StarFilledIcon, ChevronDownIcon } from "@/components/icons";

interface AddContractorModalProps {
  contractor?: Contractor;
  onSave: (contractor: Omit<Contractor, "id" | "createdAt">) => void;
  onClose: () => void;
}

export default function AddContractorModal({
  contractor,
  onSave,
  onClose,
}: AddContractorModalProps) {
  const isEditing = !!contractor;

  const [form, setForm] = useState({
    name: contractor?.name ?? "",
    company: contractor?.company ?? "",
    phone: contractor?.phone ?? "",
    email: contractor?.email ?? "",
    specialty: (contractor?.specialty ?? "") as Specialty | "",
    rating: contractor?.rating ?? 0,
    notes: contractor?.notes ?? "",
    website: contractor?.website ?? "",
    logoUrl: contractor?.logoUrl ?? "",
  });
  const [scrapingLogo, setScrapingLogo] = useState(false);

  const companyRef = useRef<HTMLInputElement>(null);

  const isValid = form.company.trim() !== "" && form.specialty !== "";

  // Auto-focus name field on mount
  useEffect(() => {
    companyRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleWebsiteBlur() {
    const trimmed = form.website.trim();
    if (!trimmed) return;
    let urlToScrape = trimmed;
    if (!/^https?:\/\//i.test(urlToScrape)) {
      urlToScrape = `https://${urlToScrape}`;
    }
    setScrapingLogo(true);
    try {
      const res = await fetch("/api/scrape-thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToScrape }),
      });
      const data = await res.json();
      if (data.logoUrl) {
        setForm((prev) => ({ ...prev, logoUrl: data.logoUrl }));
      }
    } catch {
      // silently fail
    }
    setScrapingLogo(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    onSave({
      name: form.name.trim(),
      company: form.company.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      specialty: form.specialty as Specialty,
      rating: form.rating || 3,
      notes: form.notes.trim(),
      website: form.website.trim(),
      logoUrl: form.logoUrl,
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
            {isEditing ? "Edit Contractor" : "Add Contractor"}
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
          {/* Company */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-text-primary">
              Company Name <span className="text-red">*</span>
            </span>
            <input
              ref={companyRef}
              type="text"
              required
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              placeholder="e.g. Reynolds Plumbing Co."
            />
          </label>

          {/* Name */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-text-primary">
              Contact Name
            </span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              placeholder="e.g. Mike Reynolds"
            />
          </label>

          {/* Phone + Email row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-text-primary">
                Phone
              </span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                placeholder="(555) 555-0100"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-text-primary">
                Email
              </span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                placeholder="mike@example.com"
              />
            </label>
          </div>

          {/* Website */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-text-primary">
              Website
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                onBlur={handleWebsiteBlur}
                className="flex-1 px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                placeholder="e.g. reynoldsplumbing.com"
              />
              {scrapingLogo && (
                <span className="text-[11px] text-text-4 shrink-0">
                  Fetching logo...
                </span>
              )}
              {!scrapingLogo && form.logoUrl && (
                <img
                  src={form.logoUrl}
                  alt="Logo"
                  className="w-8 h-8 rounded-[var(--radius-sm)] object-contain border border-border shrink-0"
                />
              )}
            </div>
          </label>

          {/* Specialty */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-text-primary">
              Specialty <span className="text-red">*</span>
            </span>
            <div className="relative">
              <select
                required
                value={form.specialty}
                onChange={(e) =>
                  setForm({ ...form, specialty: e.target.value as Specialty })
                }
                className="w-full appearance-none px-3 py-[7px] pr-8 text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary cursor-pointer focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              >
                <option value="" disabled>
                  Select a specialty...
                </option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-3" />
            </div>
          </label>

          {/* Rating */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-text-primary">
              Rating
            </span>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {Array.from({ length: 5 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setForm({ ...form, rating: i + 1 })}
                  className="p-0.5 transition-transform duration-[120ms] hover:scale-110"
                  aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
                >
                  <StarFilledIcon
                    width={20}
                    height={20}
                    className={
                      i < form.rating ? "text-accent" : "text-border-strong"
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-text-primary">
              Notes
            </span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              placeholder="Work performed, pricing notes, availability..."
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
              {isEditing ? "Save Changes" : "Save Contractor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
