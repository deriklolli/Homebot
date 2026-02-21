"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { BellIcon, PackageIcon, ChevronRightIcon } from "@/components/icons";

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
    <div className="p-5">
      <header className="flex items-start justify-between gap-4 mb-4">
        <div className="flex flex-col gap-[3px] min-w-0">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <BellIcon width={15} height={15} className="text-accent" />
            Home Inventory Alert
          </h2>
          <p className="text-xs text-text-3">Items due within 7 days</p>
        </div>
      </header>

      {loading ? (
        <p className="text-[13px] text-text-3 py-4">Loading...</p>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 px-4 text-center">
          <div className="w-10 h-10 rounded-full bg-green-light flex items-center justify-center">
            <BellIcon width={18} height={18} className="text-green" />
          </div>
          <p className="text-[13px] text-text-3">
            No items need attention right now.
          </p>
        </div>
      ) : (
        <ul
          className="flex flex-col -mx-5"
          role="list"
          aria-label="Inventory alerts"
        >
          {alerts.map((item) => {
            const isOverdue = item.daysUntil <= 0;
            const label = isOverdue
              ? item.daysUntil === 0
                ? "Due today"
                : `${Math.abs(item.daysUntil)} day${Math.abs(item.daysUntil) !== 1 ? "s" : ""} overdue`
              : `in ${item.daysUntil} day${item.daysUntil !== 1 ? "s" : ""}`;

            return (
              <li key={item.id}>
                <Link
                  href={`/inventory/${item.id}`}
                  className="grid grid-cols-[32px_1fr_auto_auto] items-center gap-2 px-5 py-[9px] border-t border-border hover:bg-surface-hover transition-[background] duration-[120ms]"
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isOverdue ? "bg-red/10" : "bg-accent/10"
                      }`}
                    >
                      <PackageIcon
                        width={16}
                        height={16}
                        className={isOverdue ? "text-red" : "text-accent"}
                      />
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
                    className={`text-[13px] font-medium whitespace-nowrap ${
                      isOverdue ? "text-red" : "text-accent"
                    }`}
                  >
                    {label}
                  </span>
                  <ChevronRightIcon className="text-text-4 shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
