"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { SunIcon, MoonIcon, MailIcon, PhoneIcon } from "@/components/icons";
import { supabase, type DbNotificationPreference } from "@/lib/supabase";
import PhoneInput from "@/components/ui/PhoneInput";

type ThemeOption = "light" | "dark" | "system";

const themeOptions: { value: ThemeOption; label: string; icon?: typeof SunIcon }[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [propertyName, setPropertyName] = useState("");
  const [savingProperty, setSavingProperty] = useState(false);
  const [savedProperty, setSavedProperty] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  // Gmail integration state
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailLastScan, setGmailLastScan] = useState<string | null>(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email ?? null);
      setPropertyName((user.user_metadata?.property_name as string) ?? "");

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

    // Check Gmail connection status
    async function loadGmail() {
      try {
        const res = await fetch("/api/gmail/status");
        const data = await res.json();
        setGmailConnected(data.connected ?? false);
        setGmailEmail(data.email ?? null);
        setGmailLastScan(data.lastScanAt ?? null);
      } catch {
        // Gmail status check failure is non-fatal
      } finally {
        setGmailLoading(false);
      }
    }
    loadGmail();

    // Handle ?gmail= query param feedback
    const params = new URLSearchParams(window.location.search);
    const gmailParam = params.get("gmail");
    if (gmailParam) {
      window.history.replaceState({}, "", "/settings");
      if (gmailParam === "connected") {
        setGmailConnected(true);
        setGmailLoading(false);
      }
    }
  }, []);

  async function handleSaveProperty() {
    setSavingProperty(true);
    setSavedProperty(false);
    await supabase.auth.updateUser({
      data: { property_name: propertyName || null },
    });
    setSavingProperty(false);
    setSavedProperty(true);
    setTimeout(() => setSavedProperty(false), 2000);
  }

  async function handleConnectGmail() {
    const res = await fetch("/api/gmail/auth-url");
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  }

  async function handleDisconnectGmail() {
    if (!confirm("Disconnect your Gmail account? This will stop automatic bill scanning.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/gmail/disconnect", { method: "POST" });
      setGmailConnected(false);
      setGmailEmail(null);
      setGmailLastScan(null);
    } finally {
      setDisconnecting(false);
    }
  }

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

      {/* Property */}
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-5 mb-4">
        <h2 className="text-[15px] font-semibold text-text-primary mb-1">Property</h2>
        <p className="text-[14px] text-text-3 mb-4">
          Name your property. This appears on the dashboard header.
        </p>
        <input
          type="text"
          value={propertyName}
          onChange={(e) => setPropertyName(e.target.value)}
          placeholder="e.g. 1715 Red Hawk Trail"
          className="w-full max-w-[320px] px-3 py-2.5 rounded-[var(--radius-md)] border border-border bg-surface text-[14px] text-text-primary placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
        />
        <div className="pt-3">
          <button
            onClick={handleSaveProperty}
            disabled={savingProperty}
            className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-50"
          >
            {savingProperty ? "Saving..." : savedProperty ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-5">
        <h2 className="text-[15px] font-semibold text-text-primary mb-1">Appearance</h2>
        <p className="text-[14px] text-text-3 mb-4">Choose your preferred theme.</p>
        <div className="flex gap-2">
          {themeOptions.map((opt) => {
            const isActive = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] border text-[14px] font-medium transition-all duration-[120ms] ${
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
        <h2 className="text-[15px] font-semibold text-text-primary mb-1">Notifications</h2>
        <p className="text-[14px] text-text-3 mb-4">
          Get alerts when inventory items are due for reorder.
        </p>

        {loadingPrefs ? (
          <p className="text-[14px] text-text-3">Loading preferences...</p>
        ) : (
          <div className="space-y-4">
            {/* Email toggle */}
            <div
              className="flex items-center gap-3 cursor-pointer p-2 rounded-[var(--radius-md)] hover:bg-surface-hover transition-[background] duration-[120ms]"
              onClick={() => setEmailEnabled(!emailEnabled)}
            >
              {emailEnabled ? (
                <span className="shrink-0 w-[18px] h-[18px] rounded-full bg-accent border-2 border-accent flex items-center justify-center text-white">
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              ) : (
                <span className="shrink-0 w-[18px] h-[18px] rounded-full border-2 border-border-strong" />
              )}
              <MailIcon width={15} height={15} className="text-text-3 shrink-0" />
              <div>
                <span className="text-[14px] font-medium text-text-primary block">
                  Email notifications
                </span>
                {userEmail && (
                  <span className="text-[12px] text-text-3 block">
                    Sent to {userEmail}
                  </span>
                )}
              </div>
            </div>

            {/* SMS toggle */}
            <div
              className="flex items-center gap-3 cursor-pointer p-2 rounded-[var(--radius-md)] hover:bg-surface-hover transition-[background] duration-[120ms]"
              onClick={() => setSmsEnabled(!smsEnabled)}
            >
              {smsEnabled ? (
                <span className="shrink-0 w-[18px] h-[18px] rounded-full bg-accent border-2 border-accent flex items-center justify-center text-white">
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              ) : (
                <span className="shrink-0 w-[18px] h-[18px] rounded-full border-2 border-border-strong" />
              )}
              <PhoneIcon width={15} height={15} className="text-text-3 shrink-0" />
              <div>
                <span className="text-[14px] font-medium text-text-primary block">
                  SMS notifications
                </span>
                <span className="text-[12px] text-text-3 block">
                  Optional text message alerts
                </span>
              </div>
            </div>

            {/* Phone input (visible when SMS enabled) */}
            {smsEnabled && (
              <div className="ml-[52px]">
                <PhoneInput
                  value={smsPhone}
                  onChange={setSmsPhone}
                  className="w-full max-w-[260px]"
                />
              </div>
            )}

            {/* Save */}
            <div className="pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-50"
              >
                {saving ? "Saving..." : saved ? "Saved!" : "Save preferences"}
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Gmail Integration */}
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-5 mt-4">
        <h2 className="text-[15px] font-semibold text-text-primary mb-1">Gmail Integration</h2>
        <p className="text-[14px] text-text-3 mb-4">
          Connect your Gmail account to automatically scan for utility bills.
        </p>

        {gmailLoading ? (
          <p className="text-[14px] text-text-3">Checking connection...</p>
        ) : gmailConnected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green shrink-0" />
              <span className="text-[14px] text-text-primary">
                Connected as <strong>{gmailEmail}</strong>
              </span>
            </div>
            {gmailLastScan && (
              <p className="text-[12px] text-text-3">
                Last scanned: {new Date(gmailLastScan).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
              </p>
            )}
            <button
              onClick={handleDisconnectGmail}
              disabled={disconnecting}
              className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[var(--radius-sm)] border border-red text-red text-[14px] font-medium hover:bg-red/5 transition-all duration-[120ms] disabled:opacity-50"
            >
              {disconnecting ? "Disconnecting..." : "Disconnect Gmail"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnectGmail}
            className="inline-flex items-center gap-2 px-4 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms]"
          >
            <MailIcon width={15} height={15} />
            Connect Gmail
          </button>
        )}
      </div>
    </div>
  );
}
