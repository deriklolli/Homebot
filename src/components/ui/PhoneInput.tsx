"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Formats a raw digit string into (XXX) XXX-XXXX.
 */
function formatPhone(digits: string): string {
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/**
 * Strips everything except digits from a string, dropping leading "1" country code.
 */
function toDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  // Strip leading country code "1" if user typed 11 digits
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

export default function PhoneInput({
  value,
  onChange,
  placeholder = "(555) 555-0100",
  className,
}: PhoneInputProps) {
  const digits = toDigits(value);
  const displayValue = formatPhone(digits);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDigits = toDigits(e.target.value);
      onChange(formatPhone(newDigits));
    },
    [onChange]
  );

  return (
    <input
      type="tel"
      inputMode="tel"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={cn(
        "px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]",
        className
      )}
    />
  );
}
