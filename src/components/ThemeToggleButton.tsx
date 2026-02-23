"use client";

import { useTheme } from "./ThemeProvider";
import { SunIcon, MoonIcon } from "./icons";

export default function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div
      className="inline-flex items-center rounded-full border border-border-strong bg-border p-[3px] gap-0"
      role="radiogroup"
      aria-label="Theme toggle"
    >
      <button
        onClick={() => setTheme("light")}
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 ${
          !isDark
            ? "bg-surface text-accent shadow-[var(--shadow-card)]"
            : "text-text-3 hover:text-text-2"
        }`}
        role="radio"
        aria-checked={!isDark}
        aria-label="Light mode"
      >
        <SunIcon width={14} height={14} />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 ${
          isDark
            ? "bg-surface text-accent shadow-[var(--shadow-card)]"
            : "text-text-3 hover:text-text-2"
        }`}
        role="radio"
        aria-checked={isDark}
        aria-label="Dark mode"
      >
        <MoonIcon width={14} height={14} />
      </button>
    </div>
  );
}
