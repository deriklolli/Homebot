"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { SunIcon, MoonIcon, MailIcon, PhoneIcon } from "@/components/icons";
import { supabase, type DbNotificationPreference } from "@/lib/supabase";

type ThemeOption = "light" | "dark" | "system";

const themeOptions: { value: ThemeOption; label: string; icon?: typeof SunIcon }[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email ?? null);

      const { data } = await supabase
        .from("notification_preferences")
        .select("id, user_id, email_enabled, sms_enabled, sms_phone, created_at")
        .eq("user_id", user.id)
        .returns<DbNotificationPreference[]>();

      if (data && data.length > 0) {
        setEmailEnabled(data[0].email_enabled);
        setSmsEnabled(data[0].sms_enabled);
        setSmsPhone(data[0].sms_phone ?? "");
      }
      setLoadingPrefs(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    await supabase.from("notification_preferences").upsert(
      {
        user_id: user.id,
        email_enabled: emailEnabled,
        sms_enabled: smsEnabled,
        sms_phone: smsPhone || null,
      },
      { onConflict: "user_id" }
    );

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

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
          {themeOptions.map((opt) => {
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

      {/* Notifications */}
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-5 mt-4">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Notifications</h2>
        <p className="text-[13px] text-text-3 mb-4">
          Get alerts when inventory items are due for reorder.
        </p>

        {loadingPrefs ? (
          <p className="text-[13px] text-text-3">Loading preferences...</p>
        ) : (
          <div className="space-y-4">
            {/* Email toggle */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-accent rounded"
              />
              <MailIcon width={15} height={15} className="text-text-3 mt-0.5 shrink-0" />
              <div>
                <span className="text-[13px] font-medium text-text-primary block">
                  Email notifications
                </span>
                {userEmail && (
                  <span className="text-[12px] text-text-3 block">
                    Sent to {userEmail}
                  </span>
                )}
              </div>
            </label>

            {/* SMS toggle */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={smsEnabled}
                onChange={(e) => setSmsEnabled(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-accent rounded"
              />
              <PhoneIcon width={15} height={15} className="text-text-3 mt-0.5 shrink-0" />
              <div>
                <span className="text-[13px] font-medium text-text-primary block">
                  SMS notifications
                </span>
                <span className="text-[12px] text-text-3 block">
                  Optional text message alerts
                </span>
              </div>
            </label>

            {/* Phone input (visible when SMS enabled) */}
            {smsEnabled && (
              <div className="ml-[52px]">
                <input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={smsPhone}
                  onChange={(e) => setSmsPhone(e.target.value)}
                  className="w-full max-w-[260px] px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent transition-all duration-[120ms]"
                />
              </div>
            )}

            {/* Save */}
            <div className="pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-50"
              >
                {saving ? "Saving..." : saved ? "Saved!" : "Save preferences"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
