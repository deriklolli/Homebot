"use client";

import { useEffect, useRef, useState } from "react";
import { XIcon } from "@/components/icons";

interface SubscribeModalProps {
  onClose: () => void;
}

export default function SubscribeModal({ onClose }: SubscribeModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const feedUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/calendar/feed`
      : "/api/calendar/feed";

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
      onClick={(e) => {
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
          <p className="text-[13px] text-text-2 leading-relaxed">
            Copy this URL and add it as a calendar subscription in Google
            Calendar or any other calendar app that supports iCal feeds.
          </p>

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
              className="inline-flex items-center px-3 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms] shrink-0"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-bg rounded-[var(--radius-sm)] p-3">
            <p className="text-[12px] font-medium text-text-primary mb-2">
              How to subscribe in Google Calendar:
            </p>
            <ol className="text-[12px] text-text-3 space-y-1 list-decimal list-inside">
              <li>Open Google Calendar on desktop</li>
              <li>
                Click the <strong>+</strong> next to &ldquo;Other
                calendars&rdquo;
              </li>
              <li>
                Select <strong>From URL</strong>
              </li>
              <li>Paste the URL above and click &ldquo;Add calendar&rdquo;</li>
            </ol>
            <p className="text-[11px] text-text-4 mt-2">
              Note: Google Calendar refreshes subscribed feeds every 12–24
              hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
