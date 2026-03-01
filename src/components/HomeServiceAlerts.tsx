"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { BellIcon, ClipboardCheckIcon, XIcon, CheckCircleIcon } from "@/components/icons";

interface ServiceAlert {
  id: string;
  name: string;
  provider: string;
  nextServiceDate: string;
  frequencyMonths: number;
  daysUntil: number;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

const DISMISSED_KEY = "homebot:dismissed-service-alerts";

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

export default function HomeServiceAlerts() {
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sevenDaysOut = new Date(today);
      sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
      const cutoff = sevenDaysOut.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("services")
        .select("id, name, provider, next_service_date, frequency_months, reminders_enabled")
        .eq("reminders_enabled", true)
        .lte("next_service_date", cutoff)
        .order("next_service_date", { ascending: true })
        .returns<{ id: string; name: string; provider: string; next_service_date: string; frequency_months: number; reminders_enabled: boolean }[]>();

      if (!error && data) {
        const fetched = data.map((row) => ({
          id: row.id,
          name: row.name,
          provider: row.provider,
          nextServiceDate: row.next_service_date,
          frequencyMonths: row.frequency_months,
          daysUntil: daysUntil(row.next_service_date),
        }));
        setAlerts(fetched);

        const prev = loadDismissed();
        const hasNew = fetched.some((a) => !prev.has(a.id));
        if (hasNew) {
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

  async function handleMarkCompleted(e: React.MouseEvent, item: ServiceAlert) {
    e.preventDefault();
    e.stopPropagation();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const nextService = new Date(today);
    if (item.frequencyMonths < 1) {
      nextService.setDate(nextService.getDate() + Math.round(item.frequencyMonths * 30));
    } else {
      nextService.setMonth(nextService.getMonth() + item.frequencyMonths);
    }
    const nextServiceStr = nextService.toISOString().split("T")[0];

    const { error } = await supabase
      .from("services")
      .update({
        last_service_date: todayStr,
        next_service_date: nextServiceStr,
      })
      .eq("id", item.id);

    if (error) {
      console.error("Failed to mark service as completed:", error);
      return;
    }
    setCompletedIds((prev) => new Set(prev).add(item.id));
  }

  const visible = alerts.filter((a) => !dismissed.has(a.id));

  if (!loading && (alerts.length === 0 || visible.length === 0)) return null;

  return (
    <article className="bg-surface rounded-[var(--radius-lg)] border border-red/20 shadow-[0_1px_4px_rgba(224,49,49,0.15),0_2px_8px_rgba(224,49,49,0.1)] overflow-hidden hover:shadow-[0_4px_16px_rgba(224,49,49,0.18),0_2px_6px_rgba(224,49,49,0.12)] transition-shadow duration-200 mb-4">
      <div className="px-5 pt-5 pb-0">
        <header className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-[15px] font-semibold text-text-primary flex items-center gap-1.5">
            <BellIcon width={15} height={15} className="text-accent" />
            Home Service Alert
          </h2>
          <button
            type="button"
            aria-label="Dismiss all service alerts"
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
            aria-label="Service alerts"
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
                    href="/services"
                    className="flex flex-wrap items-center gap-x-2 gap-y-2 px-5 py-3 hover:bg-surface-hover transition-[background] duration-[120ms]"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                      <ClipboardCheckIcon width={16} height={16} className="text-white" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-[14px] font-medium text-text-primary truncate">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-text-3">
                        {item.provider ? `${item.provider} · ` : ""}Service due
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
                      <button
                        type="button"
                        onClick={(e) => handleMarkCompleted(e, item)}
                        disabled={completedIds.has(item.id)}
                        className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium transition-all duration-[120ms] inline-flex items-center gap-1 ${
                          completedIds.has(item.id)
                            ? "bg-green text-white cursor-default"
                            : "border border-border-strong bg-surface text-text-2 hover:bg-border hover:text-text-primary"
                        }`}
                      >
                        <CheckCircleIcon width={12} height={12} />
                        {completedIds.has(item.id) ? "Completed!" : "Mark as Done"}
                      </button>
                    </div>
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
