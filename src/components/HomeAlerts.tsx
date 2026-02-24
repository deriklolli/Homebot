"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { BellIcon, ApplianceIcon, XIcon, CheckCircleIcon } from "@/components/icons";
import { buyNowUrl } from "@/lib/utils";

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

export default function HomeAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
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
        .lte("next_reminder_date", cutoff)
        .order("next_reminder_date", { ascending: true })
        .returns<{ id: string; name: string; thumbnail_url: string; purchase_url: string; frequency_months: number; next_reminder_date: string }[]>();

      if (!error && data) {
        setAlerts(
          data.map((row) => ({
            id: row.id,
            name: row.name,
            thumbnailUrl: row.thumbnail_url,
            purchaseUrl: row.purchase_url,
            frequencyMonths: row.frequency_months,
            nextReminderDate: row.next_reminder_date,
            daysUntil: daysUntil(row.next_reminder_date),
          }))
        );
      }
      setLoading(false);
    }
    fetchAlerts();
  }, []);

  async function handleMarkPurchased(e: React.MouseEvent, item: AlertItem) {
    e.preventDefault();
    e.stopPropagation();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const nextReminder = new Date(today);
    nextReminder.setMonth(nextReminder.getMonth() + item.frequencyMonths);
    const nextReminderStr = nextReminder.toISOString().split("T")[0];

    const { error } = await supabase
      .from("inventory_items")
      .update({
        last_ordered_date: todayStr,
        next_reminder_date: nextReminderStr,
      })
      .eq("id", item.id);

    if (error) {
      console.error("Failed to mark as purchased:", error);
      return;
    }
    setPurchasedIds((prev) => new Set(prev).add(item.id));
  }

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
                  <li key={item.id} className="relative border-t border-border">
                    <Link
                      href={`/inventory/${item.id}`}
                      className="flex flex-wrap items-center gap-x-2 gap-y-2 pl-5 pr-10 py-3 hover:bg-surface-hover transition-[background] duration-[120ms]"
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
                        <span className="text-[13px] font-medium text-text-primary truncate">
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
                      <div className="flex items-center gap-1.5 shrink-0 w-full pl-10 sm:w-auto sm:pl-0">
                        <a
                          href={buyNowUrl(item.name, item.purchaseUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-accent text-white text-[12px] font-medium hover:brightness-110 transition-all duration-[120ms]"
                        >
                          Buy Now
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleMarkPurchased(e, item)}
                          disabled={purchasedIds.has(item.id)}
                          className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium transition-all duration-[120ms] inline-flex items-center gap-1 ${
                            purchasedIds.has(item.id)
                              ? "bg-green text-white cursor-default"
                              : "border border-border-strong bg-surface text-text-2 hover:bg-border hover:text-text-primary"
                          }`}
                        >
                          <CheckCircleIcon width={12} height={12} />
                          {purchasedIds.has(item.id) ? "Purchased!" : "Mark as Purchased"}
                        </button>
                      </div>
                    </Link>
                    <button
                      type="button"
                      aria-label={`Dismiss alert for ${item.name}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setDismissed((prev) => new Set(prev).add(item.id));
                      }}
                      className="absolute right-3 top-3 p-1 rounded-md text-text-3 hover:text-text-primary hover:bg-border transition-colors duration-[120ms]"
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
