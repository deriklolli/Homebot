"use client";

import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

export interface SpendingDataPoint {
  label: string;
  value: number;
}

interface SpendingChartProps {
  data: SpendingDataPoint[];
  lastYearData: SpendingDataPoint[];
  view: "month" | "year";
}

export default function SpendingChart({
  data,
  lastYearData,
  view,
}: SpendingChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const labels = data.map((d) => d.label);
    const values = data.map((d) => d.value);
    const lastYearValues = lastYearData.map((d) => d.value);

    const allValues = [...values, ...lastYearValues];
    const maxVal = Math.max(...allValues, 100);
    const niceMax = Math.ceil(maxVal / 1000) * 1000 || 1000;

    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, "rgba(255, 105, 45, 0.32)");
    grad.addColorStop(0.55, "rgba(255, 105, 45, 0.14)");
    grad.addColorStop(1, "rgba(255, 105, 45, 0.01)");

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Last Year",
            data: lastYearValues,
            borderColor: "#d4cdc5",
            borderWidth: 1.5,
            borderDash: [3, 3],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.35,
          },
          {
            label: view === "month" ? "This Month" : "This Year",
            data: values,
            borderColor: "#FF692D",
            borderWidth: 2.5,
            fill: true,
            backgroundColor: grad,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "#FF692D",
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#ffffff",
            titleColor: "#22201d",
            bodyColor: "#84827f",
            borderColor: "#efece9",
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            boxPadding: 4,
            callbacks: {
              label(item) {
                const val = item.parsed.y ?? 0;
                return `${item.dataset.label}: $${val.toLocaleString("en-US")}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: "#84827f",
              font: { size: 11, family: "Inter, sans-serif", weight: 500 },
              maxRotation: 0,
              maxTicksLimit: view === "month" ? 8 : 12,
            },
          },
          y: {
            grid: { color: "#efece9", lineWidth: 1 },
            border: { display: false },
            beginAtZero: true,
            max: niceMax,
            ticks: {
              color: "#84827f",
              font: { size: 11, family: "Inter, sans-serif", weight: 500 },
              callback(val) {
                const n = Number(val);
                if (n === 0) return "$0";
                if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
                return `$${n}`;
              },
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [data, lastYearData, view]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`Area chart showing ${view === "month" ? "this month's" : "this year's"} home spending vs last year`}
    />
  );
}
