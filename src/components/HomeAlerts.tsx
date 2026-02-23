"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { BellIcon, ApplianceIcon, XIcon } from "@/components/icons";

interface AlertItem {
  id: string;
  name: string;
  thumbnailUrl: string;
  nextReminderDate: string;
  daysUntil: number;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
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
        .select("id, name, thumbnail_url, next_reminder_date")
        .lte("next_reminder_date", cutoff)
        .order("next_reminder_date", { ascending: true })
        .returns<{ id: string; name: string; thumbnail_url: string; next_reminder_date: string }[]>();

      if (!error && data) {
        setAlerts(
          data.map((row) => ({
            id: row.id,
            name: row.name,
            thumbnailUrl: row.thumbnail_url,
            nextReminderDate: row.next_reminder_date,
            daysUntil: daysUntil(row.next_reminder_date),
          }))
        );
      }
      setLoading(false);
    }
    fetchAlerts();
  }, []);

  return (
    <div className="px-5 pt-5 pb-0">
      <header className="flex items-start justify-between gap-4 mb-4">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
          <BellIcon width={15} height={15} className="text-accent" />
          Home Inventory Alert
        </h2>
      </header>

      {loading ? (
        <p className="text-[13px] text-text-3 py-4">Loading...</p>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 px-4 text-center">
          <div className="w-10 h-10 rounded-full bg-green-light flex items-center justify-center">
            <BellIcon width={18} height={18} className="text-green" />
          </div>
          <p className="text-[13px] text-text-3">
            Whoohoo! You have no alerts.
          </p>
        </div>
      ) : (
        (() => {
          const visible = alerts.filter((a) => !dismissed.has(a.id));
          if (visible.length === 0) {
            return (
              <div className="flex flex-col items-center gap-2 py-6 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-green-light flex items-center justify-center">
                  <BellIcon width={18} height={18} className="text-green" />
                </div>
                <p className="text-[13px] text-text-3">
                  Whoohoo! You have no alerts.
                </p>
              </div>
            );
          }
          return (
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
                  <li key={item.id} className="relative">
                    <Link
                      href={`/inventory/${item.id}`}
                      className="grid grid-cols-[32px_1fr_auto] items-center gap-2 pl-5 pr-10 py-3 border-t border-border hover:bg-surface-hover transition-[background] duration-[120ms]"
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
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[13px] font-medium text-text-primary truncate">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-text-3">
                          Reorder reminder
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-medium whitespace-nowrap rounded-[var(--radius-full)] px-2 py-0.5 ${
                          isOverdue ? "bg-red text-white" : "bg-accent-light text-accent"
                        }`}
                      >
                        {label}
                      </span>
                    </Link>
                    <button
                      type="button"
                      aria-label={`Dismiss alert for ${item.name}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setDismissed((prev) => new Set(prev).add(item.id));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-text-3 hover:text-text-primary hover:bg-border transition-colors duration-[120ms]"
                    >
                      <XIcon width={12} height={12} />
                    </button>
                  </li>
                );
              })}
            </ul>
          );
        })()
      )}
    </div>
  );
}
