"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { BellIcon, ApplianceIcon, XIcon } from "@/components/icons";

interface AlertItem {
  id: string;
  name: string;
  thumbnailUrl: string;
  purchaseUrl: string;
  frequencyMonths: number;
  nextReminderDate: string;
  daysUntil: number;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

const DISMISSED_KEY = "homebot:dismissed-alerts";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>): void {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

export default function HomeAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get items due within 7 days or already overdue
      const sevenDaysOut = new Date(today);
      sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
      const cutoff = sevenDaysOut.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, thumbnail_url, purchase_url, frequency_months, next_reminder_date")
        .eq("tracked", true)
        .lte("next_reminder_date", cutoff)
        .order("next_reminder_date", { ascending: true })
        .returns<{ id: string; name: string; thumbnail_url: string; purchase_url: string; frequency_months: number; next_reminder_date: string }[]>();

      if (!error && data) {
        const fetched = data.map((row) => ({
          id: row.id,
          name: row.name,
          thumbnailUrl: row.thumbnail_url,
          purchaseUrl: row.purchase_url,
          frequencyMonths: row.frequency_months,
          nextReminderDate: row.next_reminder_date,
          daysUntil: daysUntil(row.next_reminder_date),
        }));
        setAlerts(fetched);

        // Load dismissed IDs and check if alerts have changed
        const prev = loadDismissed();
        const alertIds = new Set(fetched.map((a) => a.id));
        const hasNew = fetched.some((a) => !prev.has(a.id));
        if (hasNew) {
          // New alerts appeared — clear old dismissals
          setDismissed(new Set());
          saveDismissed(new Set());
        } else {
          setDismissed(prev);
        }
      }
      setLoading(false);
    }
    fetchAlerts();
  }, []);

  const visible = alerts.filter((a) => !dismissed.has(a.id));

  if (!loading && (alerts.length === 0 || visible.length === 0)) return null;

  return (
    <article className="bg-surface rounded-[var(--radius-lg)] border border-red/20 shadow-[0_1px_4px_rgba(224,49,49,0.15),0_2px_8px_rgba(224,49,49,0.1)] overflow-hidden hover:shadow-[0_4px_16px_rgba(224,49,49,0.18),0_2px_6px_rgba(224,49,49,0.12)] transition-shadow duration-200 mb-4">
      <div className="px-5 pt-5 pb-0">
        <header className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-[15px] font-semibold text-text-primary flex items-center gap-1.5">
            <BellIcon width={15} height={15} className="text-accent" />
            Home Inventory Alert
          </h2>
          <button
            type="button"
            aria-label="Dismiss all alerts"
            onClick={() => {
              const allIds = new Set(alerts.map((a) => a.id));
              setDismissed(allIds);
              saveDismissed(allIds);
            }}
            className="p-1 rounded-md text-text-3 hover:text-text-primary hover:bg-border transition-colors duration-[120ms]"
          >
            <XIcon width={14} height={14} />
          </button>
        </header>

        {loading ? (
          <p className="text-[14px] text-text-3 py-4">Loading...</p>
        ) : (
          <ul
            className="flex flex-col -mx-5"
            role="list"
            aria-label="Inventory alerts"
          >
            {visible.map((item) => {
              const isOverdue = item.daysUntil <= 0;
              const label = isOverdue
                ? item.daysUntil === 0
                  ? "Due today"
                  : `${Math.abs(item.daysUntil)} day${Math.abs(item.daysUntil) !== 1 ? "s" : ""} overdue`
                : `in ${item.daysUntil} day${item.daysUntil !== 1 ? "s" : ""}`;

              return (
                <li key={item.id} className="border-t border-border">
                  <Link
                    href={`/inventory/${item.id}`}
                    className="flex flex-wrap items-center gap-x-2 gap-y-2 px-5 py-3 hover:bg-surface-hover transition-[background] duration-[120ms]"
                  >
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                        <ApplianceIcon width={16} height={16} className="text-white" strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-[14px] font-medium text-text-primary truncate">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-text-3">
                        Reorder reminder
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-medium whitespace-nowrap rounded-[var(--radius-full)] px-2 py-0.5 shrink-0 ${
                        isOverdue ? "bg-red text-white" : "bg-accent-light text-accent"
                      }`}
                    >
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}
