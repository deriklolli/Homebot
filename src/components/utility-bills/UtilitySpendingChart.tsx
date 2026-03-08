"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { UTILITY_CATEGORIES, type UtilityBill } from "@/lib/utility-bills-data";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

interface UtilitySpendingChartProps {
  bills: UtilityBill[];
  months?: number;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const CATEGORY_COLORS: Record<string, string> = {
  electric: "#eab308",
  gas: "#f97316",
  water: "#3b82f6",
  internet: "#a855f7",
  trash: "#16a34a",
  sewer: "#00a2c7",
  phone: "#ec4899",
  other: "#6b7280",
};

export default function UtilitySpendingChart({
  bills,
  months = 12,
}: UtilitySpendingChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const now = new Date();
    const monthKeys: string[] = [];
    const labels: string[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      labels.push(MONTH_LABELS[d.getMonth()]);
    }

    // Group bill amounts by month and category
    const categoryData: Record<string, number[]> = {};
    for (const cat of UTILITY_CATEGORIES) {
      categoryData[cat.value] = new Array(months).fill(0);
    }

    for (const bill of bills) {
      const dateStr = bill.billingPeriodStart ?? bill.dueDate ?? bill.createdAt;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const idx = monthKeys.indexOf(key);
      if (idx === -1) continue;
      const cat = bill.category in categoryData ? bill.category : "other";
      categoryData[cat][idx] += bill.amount;
    }

    // Only include categories that have data
    const datasets = UTILITY_CATEGORIES
      .filter((cat) => categoryData[cat.value].some((v) => v > 0))
      .map((cat) => {
        const color = CATEGORY_COLORS[cat.value] ?? "#6b7280";
        return {
          label: cat.label,
          data: categoryData[cat.value],
          borderColor: color,
          backgroundColor: color + "18",
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: color,
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          tension: 0.4,
          fill: true,
        };
      });

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const styles = getComputedStyle(document.documentElement);
    const borderColor = styles.getPropertyValue("--color-border").trim() || "#efece9";
    const textColor = styles.getPropertyValue("--color-text-3").trim() || "#84827f";

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.label}: $${(ctx.parsed.y ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            },
          },
          legend: {
            display: datasets.length > 1,
            position: "bottom",
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              borderRadius: 3,
              useBorderRadius: true,
              padding: 12,
              color: textColor,
              font: { size: 12, family: "Inter, system-ui, sans-serif" },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: textColor,
              font: { size: 11, family: "Inter, system-ui, sans-serif" },
            },
          },
          y: {
            grid: { color: borderColor },
            border: { display: false },
            ticks: {
              color: textColor,
              font: { size: 11, family: "Inter, system-ui, sans-serif" },
              callback: (v) => `$${Number(v).toLocaleString()}`,
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [bills, months]);

  return (
    <div className="h-[240px]">
      <canvas ref={canvasRef} />
    </div>
  );
}
