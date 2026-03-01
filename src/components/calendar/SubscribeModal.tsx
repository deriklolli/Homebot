"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { XIcon } from "@/components/icons";

interface SubscribeModalProps {
  onClose: () => void;
}

export default function SubscribeModal({ onClose }: SubscribeModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [feedUrl, setFeedUrl] = useState<string>("");

  useEffect(() => {
    async function loadFeedUrl() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Denver";

      // Fetch the signed token from the server
      const res = await fetch(`/api/calendar/token`);
      if (!res.ok) return;
      const { token } = await res.json();

      setFeedUrl(
        `${window.location.origin}/api/calendar/feed?userId=${user.id}&token=${token}&tz=${encodeURIComponent(tz)}`
      );
    }
    loadFeedUrl();
  }, []);

  const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleCopy() {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-hover)] w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-text-primary">
            Subscribe to Calendar
          </h2>
          <button
            onClick={onClose}
            className="text-text-3 hover:text-text-primary transition-colors duration-[120ms]"
            aria-label="Close modal"
          >
            <XIcon width={16} height={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[14px] text-text-2 leading-relaxed">
            Add your HOMEBOT schedule to your calendar so project
            appointments, inventory reminders, and service dates stay in sync.
          </p>

          {/* Quick add button */}
          <a
            href={webcalUrl}
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-semibold hover:brightness-110 transition-all duration-[120ms]"
          >
            <CalendarIcon />
            Add to Calendar
          </a>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-text-4">or copy the feed URL</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* URL + Copy */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              readOnly
              value={feedUrl}
              className="flex-1 px-3 py-[7px] text-[12px] bg-bg border border-border rounded-[var(--radius-sm)] text-text-primary font-mono select-all truncate"
              onClick={() => inputRef.current?.select()}
            />
            <button
              onClick={handleCopy}
              className="inline-flex items-center px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms] shrink-0"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Manual instructions */}
          <div className="bg-bg rounded-[var(--radius-sm)] p-3">
            <p className="text-[12px] font-medium text-text-primary mb-2">
              Manual setup:
            </p>
            <ol className="text-[12px] text-text-3 space-y-1 list-decimal list-inside">
              <li>Open your calendar app&apos;s subscription settings</li>
              <li>
                Look for <strong>Add by URL</strong>, <strong>From URL</strong>,
                or <strong>Subscribe</strong>
              </li>
              <li>Paste the feed URL above and confirm</li>
            </ol>
            <p className="text-[11px] text-text-4 mt-2">
              Most calendar apps refresh subscribed feeds every 12–24 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

