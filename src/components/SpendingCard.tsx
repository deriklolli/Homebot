"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import SpendingChart, { type SpendingDataPoint } from "./SpendingChart";
import { ChevronDownIcon } from "@/components/icons";

interface SpendingEntry {
  date: string;
  amount: number;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function buildMonthData(
  entries: SpendingEntry[],
  year: number,
  month: number
): SpendingDataPoint[] {
  const days = getDaysInMonth(year, month);
  const dailyTotals = new Array(days).fill(0);

  for (const entry of entries) {
    const d = new Date(entry.date + "T00:00:00");
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate() - 1;
      dailyTotals[day] += entry.amount;
    }
  }

  let cumulative = 0;
  return dailyTotals.map((val, i) => {
    cumulative += val;
    return { label: `${i + 1}`, value: cumulative };
  });
}

function buildYearData(
  entries: SpendingEntry[],
  year: number
): SpendingDataPoint[] {
  const monthlyTotals = new Array(12).fill(0);

  for (const entry of entries) {
    const d = new Date(entry.date + "T00:00:00");
    if (d.getFullYear() === year) {
      monthlyTotals[d.getMonth()] += entry.amount;
    }
  }

  let cumulative = 0;
  return monthlyTotals.map((val, i) => {
    cumulative += val;
    return { label: MONTH_LABELS[i], value: cumulative };
  });
}

export default function SpendingCard() {
  const [view, setView] = useState<"month" | "year">("month");
  const [entries, setEntries] = useState<SpendingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSpending() {
      const [projectsRes, servicesRes] = await Promise.all([
        supabase
          .from("projects")
          .select("total_cost, completed_at")
          .not("completed_at", "is", null)
          .not("total_cost", "is", null),
        supabase
          .from("services")
          .select("cost, last_service_date")
          .not("last_service_date", "is", null)
          .not("cost", "is", null),
      ]);

      const result: SpendingEntry[] = [];

      if (!projectsRes.error && projectsRes.data) {
        for (const row of projectsRes.data) {
          result.push({
            date: row.completed_at.split("T")[0],
            amount: row.total_cost,
          });
        }
      }

      if (!servicesRes.error && servicesRes.data) {
        for (const row of servicesRes.data) {
          result.push({
            date: row.last_service_date.split("T")[0],
            amount: row.cost,
          });
        }
      }

      setEntries(result);
      setLoading(false);
    }
    fetchSpending();
  }, []);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastYear = year - 1;

  const chartData =
    view === "month"
      ? buildMonthData(entries, year, month)
      : buildYearData(entries, year);

  const lastYearChartData =
    view === "month"
      ? buildMonthData(entries, lastYear, month)
      : buildYearData(entries, lastYear);

  const total = entries.reduce((sum, e) => {
    const d = new Date(e.date + "T00:00:00");
    if (view === "month") {
      if (d.getFullYear() === year && d.getMonth() === month) return sum + e.amount;
    } else {
      if (d.getFullYear() === year) return sum + e.amount;
    }
    return sum;
  }, 0);

  const periodLabel = view === "month" ? "this month" : "this year";

  return (
    <div className="p-5">
      <header className="flex items-start justify-between gap-4 mb-4">
        <div className="flex flex-col gap-[3px] min-w-0">
          <h2 className="text-sm font-semibold text-text-primary">
            Home Spending
          </h2>
          <p className="text-[22px] font-bold text-text-primary tracking-tight leading-tight">
            {loading ? (
              <span className="text-text-3 text-sm font-normal">Loading...</span>
            ) : (
              <>
                ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                <span className="text-sm font-normal text-text-3">
                  {periodLabel}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="relative inline-flex items-center">
          <select
            className="appearance-none bg-border border-none rounded-[var(--radius-sm)] py-[5px] pl-2.5 pr-[26px] text-xs font-medium text-text-primary cursor-pointer hover:bg-border-strong transition-[background] duration-[120ms]"
            aria-label="Spending view"
            value={view}
            onChange={(e) => setView(e.target.value as "month" | "year")}
          >
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <ChevronDownIcon className="absolute right-[7px] pointer-events-none text-text-3" width={13} height={13} />
        </div>
      </header>
      <div className="h-[200px] -mx-1 my-3 relative">
        {!loading && (
          <SpendingChart
            data={chartData}
            lastYearData={lastYearChartData}
            view={view}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-4 pt-2" aria-hidden="true">
        <span className="flex items-center gap-1.5 text-[11px] text-text-3">
          <span className="inline-block w-5 h-0.5 rounded-sm bg-border-strong shrink-0" />
          Last year
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-text-3">
          <span className="inline-block w-5 h-0.5 rounded-sm bg-accent shrink-0" />
          {view === "month" ? "This month" : "This year"}
        </span>
      </div>
    </div>
  );
}
