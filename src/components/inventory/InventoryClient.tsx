"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { type InventoryItem, FREQUENCY_OPTIONS } from "@/lib/inventory-data";
import { supabase, type DbInventoryItem } from "@/lib/supabase";
import { dbToInventoryItem, inventoryItemToDb } from "@/lib/mappers";
import { PlusIcon, SearchIcon, ApplianceIcon, BellIcon } from "@/components/icons";
import AddInventoryItemModal from "./AddInventoryItemModal";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function frequencyLabel(months: number): string {
  const opt = FREQUENCY_OPTIONS.find((o) => o.value === months);
  return opt?.label ?? `Every ${months} months`;
}

export default function InventoryClient() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function fetchItems() {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("next_reminder_date", { ascending: true })
        .returns<DbInventoryItem[]>();

      if (error) {
        console.error("Failed to fetch inventory items:", error);
      } else {
        setItems(data.map(dbToInventoryItem));
      }
      setLoading(false);
    }
    fetchItems();
  }, []);

  const filtered = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });

  async function handleAdd(data: Omit<InventoryItem, "id" | "createdAt">) {
    let thumbnailUrl = data.thumbnailUrl;
    if (!thumbnailUrl && data.purchaseUrl) {
      try {
        const res = await fetch("/api/scrape-thumbnail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: data.purchaseUrl }),
        });
        const json = (await res.json()) as { thumbnailUrl: string };
        thumbnailUrl = json.thumbnailUrl ?? "";
      } catch {
        // keep empty
      }
    }

    const { data: rows, error } = await supabase
      .from("inventory_items")
      .insert(inventoryItemToDb({ ...data, thumbnailUrl }) as Record<string, unknown>)
      .select()
      .returns<DbInventoryItem[]>();

    if (error) {
      console.error("Failed to add item:", error);
      return;
    }
    setItems(
      [...items, dbToInventoryItem(rows[0])].sort((a, b) =>
        a.nextReminderDate.localeCompare(b.nextReminderDate)
      )
    );
    setModalOpen(false);
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          Home Inventory
        </h1>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms]"
        >
          <PlusIcon width={14} height={14} />
          Add Item
        </button>
      </header>

      {/* Search */}
      {items.length > 0 && (
        <div className="mb-4">
          <div className="relative max-w-full sm:max-w-[250px]">
            <SearchIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-4"
              width={14}
              height={14}
            />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
            />
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <p className="text-sm text-text-3">Loading inventory...</p>
      ) : items.length === 0 ? (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 text-center">
          <p className="text-sm font-semibold text-text-primary mb-1">
            No items yet
          </p>
          <p className="text-[13px] text-text-3">
            Start tracking household items that need periodic replacement.
          </p>
        </div>
      ) : (
        <>
          {/* Urgent items card */}
          {(() => {
            const urgent = filtered.filter((item) => daysUntil(item.nextReminderDate) <= 7);
            if (urgent.length === 0) return null;
            return (
              <div className="bg-surface rounded-[var(--radius-lg)] border border-red/30 shadow-[var(--shadow-card)] overflow-hidden mb-4">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-red/20 bg-red-light">
                  <BellIcon width={14} height={14} className="text-red" />
                  <span className="text-[13px] font-semibold text-red">
                    Inventory Alert
                  </span>
                </div>
                <ul role="list" aria-label="Urgent inventory items">
                  {urgent.map((item) => {
                    const days = daysUntil(item.nextReminderDate);
                    const isOverdue = days <= 0;
                    const dueLabel = isOverdue
                      ? days === 0
                        ? "Due today"
                        : `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`
                      : `in ${days} day${days !== 1 ? "s" : ""}`;

                    return (
                      <li key={item.id} className="border-b border-border last:border-b-0">
                        <Link
                          href={`/inventory/${item.id}`}
                          className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-hover transition-[background] duration-[120ms]"
                        >
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.name}
                              className="w-10 h-10 rounded-full object-cover shrink-0 bg-border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-accent shrink-0 flex items-center justify-center">
                              <ApplianceIcon width={18} height={18} className="text-white" strokeWidth={1.5} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-[13px] font-semibold text-text-primary truncate block">
                              {item.name}
                            </span>
                            {item.description && (
                              <p className="text-[12px] text-text-3 truncate">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            <span className="text-[13px] font-medium text-red whitespace-nowrap">
                              {formatDate(item.nextReminderDate)}
                            </span>
                            <span className="text-[11px] text-red font-medium">
                              {dueLabel}
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()}

          {/* Main inventory list (non-urgent items) */}
          {(() => {
            const nonUrgent = filtered.filter((item) => daysUntil(item.nextReminderDate) > 7);
            if (nonUrgent.length === 0) return null;
            return (
              <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden">
                <ul role="list" aria-label="Inventory items">
                  {nonUrgent.map((item) => {
                    const days = daysUntil(item.nextReminderDate);
                    const isSoon = days > 0 && days <= 30;
                    const dueLabel = `in ${days} day${days !== 1 ? "s" : ""}`;

                    return (
                      <li key={item.id} className="border-b border-border last:border-b-0">
                        <Link
                          href={`/inventory/${item.id}`}
                          className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-hover transition-[background] duration-[120ms]"
                        >
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.name}
                              className="w-10 h-10 rounded-full object-cover shrink-0 bg-border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-accent shrink-0 flex items-center justify-center">
                              <ApplianceIcon width={18} height={18} className="text-white" strokeWidth={1.5} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[13px] font-semibold text-text-primary truncate">
                                {item.name}
                              </span>
                              <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-[var(--radius-full)] bg-accent-light text-accent">
                                {frequencyLabel(item.frequencyMonths)}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-[12px] text-text-3 truncate">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            <span
                              className={`text-[13px] font-medium whitespace-nowrap ${
                                isSoon ? "text-accent" : "text-text-primary"
                              }`}
                            >
                              {formatDate(item.nextReminderDate)}
                            </span>
                            <span className="text-[11px] text-text-3">
                              {dueLabel}
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()}
        </>
      )}

      {/* Add modal */}
      {modalOpen && (
        <AddInventoryItemModal
          onSave={handleAdd}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
