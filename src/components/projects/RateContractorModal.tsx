"use client";

import { useState, useEffect } from "react";
import { XIcon, StarFilledIcon } from "@/components/icons";

interface RateContractorModalProps {
  contractorName: string;
  onSubmit: (data: { rating: number | null; note: string }) => void;
  onClose: () => void;
}

export default function RateContractorModal({
  contractorName,
  onSubmit,
  onClose,
}: RateContractorModalProps) {
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      rating: rating > 0 ? rating : null,
      note: note.trim(),
    });
  }

  function handleSkip() {
    onSubmit({ rating: null, note: "" });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-hover)] w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">
              Rate Contractor
            </h2>
            <p className="text-[12px] text-text-3 mt-0.5 truncate">
              {contractorName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-[var(--radius-sm)] p-1.5 text-text-3 hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
            aria-label="Close modal"
          >
            <XIcon width={16} height={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium text-text-primary">
              How was your experience?
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

          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium text-text-primary">
              Note <span className="text-text-3 font-normal">(optional)</span>
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              placeholder="Any notes about this contractor..."
            />
          </label>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={handleSkip}
              className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
            >
              Skip
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms]"
            >
              Submit Rating
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
