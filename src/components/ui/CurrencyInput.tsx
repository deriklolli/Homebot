"use client";

import { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  /** Dollar amount as a string (e.g. "12.34") or "" for empty */
  value: string;
  /** Called with the dollar amount as a string (e.g. "12.34") or "" when cleared */
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Converts a dollar string like "12.34" to raw cents integer (1234).
 * Returns 0 for empty/invalid values.
 */
function toCents(dollarStr: string): number {
  if (!dollarStr) return 0;
  // Remove everything except digits and dot, then parse
  const num = parseFloat(dollarStr.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Formats cents integer to display string "X.XX" (no $ sign — that's rendered separately).
 */
function formatCents(cents: number): string {
  if (cents === 0) return "";
  const dollars = (cents / 100).toFixed(2);
  // Add thousand separators
  const [whole, decimal] = dollars.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${withCommas}.${decimal}`;
}

export default function CurrencyInput({
  value,
  onChange,
  placeholder = "0.00",
  required,
  autoFocus,
  className,
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Strip everything except digits
      const digits = raw.replace(/\D/g, "");

      if (digits === "" || digits === "0" || digits === "00") {
        onChange("");
        return;
      }

      // Treat digits as cents (e.g. "1234" = $12.34)
      const cents = parseInt(digits, 10);
      const dollarStr = (cents / 100).toFixed(2);
      onChange(dollarStr);
    },
    [onChange]
  );

  // Convert the dollar value to a display string
  const cents = toCents(value);
  const displayValue = formatCents(cents);

  return (
    <div
      className={cn(
        "flex items-center gap-0 bg-surface border border-border rounded-[var(--radius-sm)] transition-all duration-[120ms] focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/30",
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      <span className="pl-3 text-[13px] text-text-3 select-none">$</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        required={required}
        autoFocus={autoFocus}
        value={displayValue}
        onChange={handleChange}
        className="flex-1 px-1.5 py-[7px] text-[13px] bg-transparent text-text-primary placeholder:text-text-4 focus:outline-none"
        placeholder={placeholder}
      />
    </div>
  );
}
