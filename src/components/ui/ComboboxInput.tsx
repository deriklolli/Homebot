"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";

export interface ComboboxOption {
  label: string;
  value: string;
  icon?: string;
  subtitle?: string;
}

interface ComboboxInputProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  onSelect?: (option: ComboboxOption) => void;
  emptyMessage?: string;
  placeholderIcon?: ReactNode;
}

export default function ComboboxInput({
  value,
  onChange,
  options,
  placeholder,
  loading = false,
  disabled = false,
  onSelect,
  emptyMessage = "No results found",
  placeholderIcon,
}: ComboboxInputProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter options client-side as user types
  const filtered = value.trim()
    ? options.filter((o) => {
        const q = value.toLowerCase();
        return o.label.toLowerCase().includes(q) || (o.subtitle?.toLowerCase().includes(q) ?? false);
      })
    : options;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset active index when filtered results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [filtered.length]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      items[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const handleSelect = useCallback(
    (option: ComboboxOption) => {
      onChange(option.label);
      onSelect?.(option);
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [onChange, onSelect]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filtered.length) {
          handleSelect(filtered[activeIndex]);
        }
        break;
      case "Escape":
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  const showDropdown = open && !disabled && (loading || filtered.length > 0 || value.trim() !== "");

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
        aria-activedescendant={
          activeIndex >= 0 ? `combobox-option-${activeIndex}` : undefined
        }
        autoComplete="off"
        className="w-full px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms] disabled:opacity-50"
      />

      {showDropdown && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-20 top-full left-0 right-0 mt-1 max-h-[260px] overflow-y-auto bg-surface border border-border rounded-[var(--radius-sm)] shadow-[var(--shadow-hover)] py-1 divide-y divide-border"
        >
          {loading ? (
            <li className="px-3 py-2 text-[13px] text-text-4 flex items-center gap-2">
              <span className="inline-block w-3.5 h-3.5 border-2 border-text-4 border-t-transparent rounded-full animate-spin" />
              Loading...
            </li>
          ) : filtered.length > 0 ? (
            filtered.map((option, i) => (
              <li
                key={option.value}
                id={`combobox-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(option);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex items-center gap-2.5 px-3 py-2 text-[14px] cursor-pointer transition-colors duration-[80ms] ${
                  i === activeIndex
                    ? "bg-border text-text-primary"
                    : "text-text-2 hover:bg-border hover:text-text-primary"
                }`}
              >
                {option.icon ? (
                  <img
                    src={option.icon}
                    alt=""
                    className="w-8 h-8 rounded-full object-contain bg-white border border-border shrink-0"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.style.display = "none";
                      el.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                {(!option.icon || true) && placeholderIcon && (
                  <div className={`w-8 h-8 rounded-full bg-accent shrink-0 flex items-center justify-center ${option.icon ? "hidden" : ""}`}>
                    {placeholderIcon}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="block truncate">{option.label}</span>
                  {option.subtitle && (
                    <span className="block text-[11px] text-text-4 truncate">{option.subtitle}</span>
                  )}
                </div>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-[13px] text-text-4">
              {emptyMessage}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
