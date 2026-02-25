"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { ClockIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string; // "HH:MM" (24h) or ""
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Generate time slots every 15 minutes
const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_SLOTS.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
  }
}

function formatTime12(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr;
  const period = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${period}`;
}

export default function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  className,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const handleOpen = useCallback(() => {
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  // Scroll to selected time when opening
  useEffect(() => {
    if (open && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "center" });
    }
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: Event) {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    const reposition = () => updatePosition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, updatePosition]);

  function handleSelect(time: string) {
    onChange(time);
    setOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className={cn(
          "flex items-center justify-between gap-2 w-full px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] transition-all duration-[120ms] text-left",
          open
            ? "border-accent ring-1 ring-accent/30 outline-none"
            : "hover:border-border-strong",
          className
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value ? "text-text-primary" : "text-text-4"}>
          {value ? formatTime12(value) : placeholder}
        </span>
        <ClockIcon
          width={14}
          height={14}
          className="text-text-3 shrink-0"
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            role="listbox"
            aria-label="Choose time"
            className="fixed z-[60] bg-surface border border-border rounded-[var(--radius-md)] shadow-[var(--shadow-hover)] py-1 overflow-y-auto max-h-[240px] animate-in fade-in-0 zoom-in-95 duration-100"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
            }}
          >
            {/* Clear option */}
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full px-3 py-1.5 text-[12px] text-text-3 hover:bg-accent/10 hover:text-text-primary text-left transition-colors duration-[120ms]"
            >
              Clear
            </button>
            <div className="h-px bg-border mx-2 my-1" />
            {TIME_SLOTS.map((time) => {
              const isSelected = time === value;
              return (
                <button
                  key={time}
                  ref={isSelected ? selectedRef : undefined}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(time)}
                  className={cn(
                    "w-full px-3 py-1.5 text-[13px] text-left transition-colors duration-[120ms]",
                    isSelected
                      ? "bg-accent text-white font-medium"
                      : "text-text-primary hover:bg-accent/10"
                  )}
                >
                  {formatTime12(time)}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
