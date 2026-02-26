"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${SHORT_MONTHS[m - 1]} ${d}, ${y}`;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  required,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"days" | "months">("days");
  const [viewYear, setViewYear] = useState(() => {
    if (value) {
      const [y] = value.split("-").map(Number);
      return y;
    }
    return new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) {
      const [, m] = value.split("-").map(Number);
      return m - 1;
    }
    return new Date().getMonth();
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  // When value changes externally, sync view month
  useEffect(() => {
    if (value) {
      const [y, m] = value.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  // Position the popover below the trigger
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 280),
    });
  }, []);

  // Open popover
  const handleOpen = useCallback(() => {
    updatePosition();
    setView("days");
    setOpen(true);
  }, [updatePosition]);

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

  // Calendar math (same pattern as CalendarGrid.tsx)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells: Array<{
    day: number;
    year: number;
    month: number;
    isCurrentMonth: boolean;
  }> = [];

  // Previous month padding
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const pm = viewMonth === 0 ? 11 : viewMonth - 1;
    const py = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ day: d, year: py, month: pm, isCurrentMonth: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, year: viewYear, month: viewMonth, isCurrentMonth: true });
  }

  // Next month padding (fill to 35 or 42)
  const totalRows = cells.length > 35 ? 42 : 35;
  let nextDay = 1;
  while (cells.length < totalRows) {
    const nm = viewMonth === 11 ? 0 : viewMonth + 1;
    const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({ day: nextDay, year: ny, month: nm, isCurrentMonth: false });
    nextDay++;
  }

  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  function handleSelect(cell: (typeof cells)[0]) {
    const dateStr = toDateStr(cell.year, cell.month, cell.day);
    onChange(dateStr);
    setOpen(false);
  }

  function prevMonth(e: MouseEvent) {
    e.preventDefault();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth(e: MouseEvent) {
    e.preventDefault();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function clearDate(e: MouseEvent) {
    e.preventDefault();
    onChange("");
    setOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className={cn(
          "flex items-center justify-between gap-2 w-full px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] transition-all duration-[120ms] text-left",
          open
            ? "border-accent ring-1 ring-accent/30 outline-none"
            : "hover:border-border-strong",
          className
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={value ? "text-text-primary" : "text-text-4"}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <CalendarIcon
          width={14}
          height={14}
          className="text-text-3 shrink-0"
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Choose date"
            className="fixed z-[60] bg-surface border border-border rounded-[var(--radius-md)] shadow-[var(--shadow-hover)] p-3 animate-in fade-in-0 zoom-in-95 duration-100"
            style={{
              top: pos.top,
              left: pos.left,
              minWidth: 280,
            }}
          >
            {view === "days" ? (
              <>
                {/* Month/Year navigation */}
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1.5 rounded-[var(--radius-sm)] hover:bg-border/60 text-text-3 hover:text-text-primary transition-colors duration-[120ms]"
                    aria-label="Previous month"
                  >
                    <ChevronLeftIcon width={14} height={14} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setView("months"); }}
                    className="text-[14px] font-semibold text-text-primary hover:text-accent transition-colors duration-[120ms]"
                  >
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1.5 rounded-[var(--radius-sm)] hover:bg-border/60 text-text-3 hover:text-text-primary transition-colors duration-[120ms]"
                    aria-label="Next month"
                  >
                    <ChevronRightIcon width={14} height={14} />
                  </button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                  {DAY_HEADERS.map((d) => (
                    <div
                      key={d}
                      className="flex items-center justify-center h-8 text-[11px] font-medium text-text-3"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day grid */}
                <div className="grid grid-cols-7">
                  {cells.map((cell, i) => {
                    const cellStr = toDateStr(cell.year, cell.month, cell.day);
                    const isSelected = cellStr === value;
                    const isToday = cellStr === todayStr;

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelect(cell)}
                        className={cn(
                          "flex items-center justify-center w-8 h-8 mx-auto text-[12px] rounded-full transition-colors duration-[120ms]",
                          cell.isCurrentMonth
                            ? "text-text-primary"
                            : "text-text-4",
                          isSelected
                            ? "bg-accent text-white font-medium"
                            : isToday
                              ? "ring-1 ring-accent text-accent font-medium"
                              : "hover:bg-accent/10"
                        )}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {/* Year navigation */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setViewYear((y) => y - 1); }}
                    className="p-1.5 rounded-[var(--radius-sm)] hover:bg-border/60 text-text-3 hover:text-text-primary transition-colors duration-[120ms]"
                    aria-label="Previous year"
                  >
                    <ChevronLeftIcon width={14} height={14} />
                  </button>
                  <span className="text-[14px] font-semibold text-text-primary">
                    {viewYear}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setViewYear((y) => y + 1); }}
                    className="p-1.5 rounded-[var(--radius-sm)] hover:bg-border/60 text-text-3 hover:text-text-primary transition-colors duration-[120ms]"
                    aria-label="Next year"
                  >
                    <ChevronRightIcon width={14} height={14} />
                  </button>
                </div>

                {/* Month grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  {SHORT_MONTHS.map((label, idx) => {
                    const isCurrent = idx === viewMonth && viewYear === new Date().getFullYear() && idx === new Date().getMonth();
                    const isActive = idx === viewMonth;

                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setViewMonth(idx);
                          setView("days");
                        }}
                        className={cn(
                          "py-2 text-[12px] font-medium rounded-[var(--radius-sm)] transition-colors duration-[120ms]",
                          isActive
                            ? "bg-accent text-white"
                            : isCurrent
                              ? "ring-1 ring-accent text-accent hover:bg-accent/10"
                              : "text-text-primary hover:bg-accent/10"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Footer */}
            {!required && (
              <div className="flex items-center justify-end mt-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={clearDate}
                  className="text-[12px] font-medium text-text-3 hover:text-text-primary transition-colors duration-[120ms]"
                >
                  Clear
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
