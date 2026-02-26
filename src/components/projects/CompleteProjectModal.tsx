import { useState, useEffect } from "react";
import type { Project } from "@/lib/projects-data";
import { XIcon, StarFilledIcon, DollarIcon } from "@/components/icons";
import CurrencyInput from "@/components/ui/CurrencyInput";

interface CompleteProjectModalProps {
  project: Project;
  contractorName: string | null;
  onComplete: (data: { totalCost: number; contractorRating: number }) => void;
  onClose: () => void;
}

export default function CompleteProjectModal({
  project,
  contractorName,
  onComplete,
  onClose,
}: CompleteProjectModalProps) {
  const [totalCost, setTotalCost] = useState("");
  const [rating, setRating] = useState(0);

  const hasContractor = project.contractorId !== null;
  const isValid =
    totalCost.trim() !== "" &&
    Number(totalCost) > 0 &&
    (!hasContractor || rating >= 1);

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
    onComplete({
      totalCost: Number(totalCost),
      contractorRating: hasContractor ? rating : 0,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-hover)] w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">
              Complete Project
            </h2>
            <p className="text-xs text-text-3 truncate">{project.name}</p>
          </div>
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
          {/* Total Cost */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium text-text-primary flex items-center gap-1.5">
              <DollarIcon width={13} height={13} className="text-text-3" />
              Total Cost <span className="text-red">*</span>
            </span>
            <CurrencyInput
              value={totalCost}
              onChange={setTotalCost}
              required
              autoFocus
            />
          </label>

          {/* Contractor Rating */}
          {hasContractor && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[14px] font-medium text-text-primary">
                Rate {contractorName || "Contractor"}{" "}
                <span className="text-red">*</span>
              </span>
              <div
                className="flex gap-1"
                role="radiogroup"
                aria-label="Contractor rating"
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(i + 1)}
                    className="p-0.5 transition-transform duration-[120ms] hover:scale-110"
                    aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
                  >
                    <StarFilledIcon
                      width={22}
                      height={22}
                      className={
                        i < rating ? "text-accent" : "text-border-strong"
                      }
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

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
              className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-green text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Mark Completed
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
