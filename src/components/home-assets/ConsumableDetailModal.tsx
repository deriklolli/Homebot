"use client";

import { useState, useEffect } from "react";
import { FREQUENCY_OPTIONS } from "@/lib/inventory-data";
import { supabase, type DbInventoryItem } from "@/lib/supabase";
import { dbToInventoryItem } from "@/lib/mappers";
import { computeNextReminderDate } from "@/lib/date-utils";
import { buyNowUrl } from "@/lib/utils";
import { XIcon } from "@/components/icons";

interface ConsumableProduct {
  name: string;
  estimatedCost: number | null;
  searchTerm: string;
}

interface ConsumableDetailModalProps {
  consumable: string;
  description: string;
  frequencyMonths: number;
  products: ConsumableProduct[];
  assetName: string;
  assetId: string;
  onClose: () => void;
  onAdded: () => void;
}

export default function ConsumableDetailModal({
  consumable,
  description,
  frequencyMonths: defaultFrequency,
  products,
  assetName,
  assetId,
  onClose,
  onAdded,
}: ConsumableDetailModalProps) {
  const [frequencyMonths, setFrequencyMonths] = useState(defaultFrequency);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleAddToInventory(product: ConsumableProduct) {
    setAdding(product.name);

    const today = new Date().toISOString().split("T")[0];
    const nextReminderDate = computeNextReminderDate(today, frequencyMonths);
    const amazonUrl = buyNowUrl(product.searchTerm);

    // Try to get a thumbnail from the Amazon URL
    let thumbnailUrl = "";
    try {
      const res = await fetch("/api/scrape-thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: amazonUrl }),
      });
      const json = (await res.json()) as { thumbnailUrl: string };
      thumbnailUrl = json.thumbnailUrl ?? "";
    } catch {
      // keep empty
    }

    const { error } = await supabase
      .from("inventory_items")
      .insert({
        name: `${consumable} — ${product.name}`,
        description: `${description} (for ${assetName})`,
        frequency_months: frequencyMonths,
        last_ordered_date: null,
        next_reminder_date: nextReminderDate,
        purchase_url: amazonUrl,
        thumbnail_url: thumbnailUrl,
        notes: `Auto-suggested for ${assetName}`,
        cost: product.estimatedCost,
        home_asset_id: assetId,
      } as Record<string, unknown>)
      .select()
      .returns<DbInventoryItem[]>();

    if (error) {
      console.error("Failed to add inventory item:", error);
      setAdding(null);
      return;
    }

    setAdded(product.name);
    setAdding(null);
    onAdded();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-hover)] w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-text-primary">
              {consumable}
            </h2>
            <p className="text-[12px] text-text-3 mt-0.5">
              for {assetName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-[var(--radius-sm)] p-1.5 text-text-3 hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
            aria-label="Close modal"
          >
            <XIcon width={16} height={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Description */}
          {description && (
            <p className="text-[13px] text-text-2 leading-relaxed">
              {description}
            </p>
          )}

          {/* Frequency picker */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-text-primary">
              Replace Frequency
            </span>
            <select
              value={frequencyMonths}
              onChange={(e) => setFrequencyMonths(Number(e.target.value))}
              className="px-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {/* Product options */}
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-text-primary">
              Product Options
            </span>
            {products.map((product) => (
              <div
                key={product.name}
                className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-border bg-bg/50"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-semibold text-text-primary block truncate">
                    {product.name}
                  </span>
                  {product.estimatedCost != null && (
                    <span className="text-[12px] text-text-3">
                      ~${product.estimatedCost}
                    </span>
                  )}
                </div>
                <a
                  href={buyNowUrl(product.searchTerm)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-3 py-1.5 rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[12px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
                >
                  View on Amazon
                </a>
                <button
                  onClick={() => handleAddToInventory(product)}
                  disabled={adding !== null || added === product.name}
                  className={`shrink-0 px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium transition-all duration-[120ms] ${
                    added === product.name
                      ? "bg-green text-white cursor-default"
                      : "bg-accent text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  {adding === product.name
                    ? "Adding..."
                    : added === product.name
                      ? "Added!"
                      : "Add to Inventory"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
