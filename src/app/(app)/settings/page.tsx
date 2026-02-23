"use client";

import { useTheme } from "@/components/ThemeProvider";
import { SunIcon, MoonIcon } from "@/components/icons";

type ThemeOption = "light" | "dark" | "system";

const options: { value: ThemeOption; label: string; icon?: typeof SunIcon }[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
      <header className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          Settings
        </h1>
      </header>

      {/* Appearance */}
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Appearance</h2>
        <p className="text-[13px] text-text-3 mb-4">Choose your preferred theme.</p>
        <div className="flex gap-2">
          {options.map((opt) => {
            const isActive = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] border text-[13px] font-medium transition-all duration-[120ms] ${
                  isActive
                    ? "border-accent bg-accent-light text-accent"
                    : "border-border-strong bg-surface text-text-2 hover:bg-border hover:text-text-primary"
                }`}
              >
                {opt.icon && <opt.icon width={15} height={15} />}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
