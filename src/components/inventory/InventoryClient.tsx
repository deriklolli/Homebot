"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { type InventoryItem, FREQUENCY_OPTIONS } from "@/lib/inventory-data";
import { supabase, type DbInventoryItem, type DbHomeAsset } from "@/lib/supabase";
import { dbToInventoryItem, inventoryItemToDb, dbToHomeAsset } from "@/lib/mappers";
import { type HomeAsset } from "@/lib/home-assets-data";
import { PlusIcon, SearchIcon, ApplianceIcon } from "@/components/icons";
import AddInventoryItemModal from "./AddInventoryItemModal";
import { buyNowUrl } from "@/lib/utils";
import HomeAlerts from "@/components/HomeAlerts";
/* ------------------------------------------------------------------ */
/*  Shared row component for urgent & non-urgent inventory items       */
/* ------------------------------------------------------------------ */

function InventoryItemRow({
  item,
  dueLabel,
  badgeClass,
  extraInfo,
  assetLabel,
}: {
  item: InventoryItem;
  dueLabel: string;
  badgeClass: string;
  extraInfo?: React.ReactNode;
  assetLabel?: string;
}) {
  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        href={`/inventory/${item.id}`}
        className="flex items-center gap-x-3 px-5 py-3.5 hover:bg-surface-hover transition-[background] duration-[120ms]"
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
          {extraInfo ?? (
            <span className="text-[14px] font-semibold text-text-primary truncate block">
              {item.name}
            </span>
          )}
          {assetLabel ? (
            <p className="text-[12px] text-text-3 truncate">
              {assetLabel}
            </p>
          ) : item.description ? (
            <p className="text-[12px] text-text-3 truncate">
              {item.description}
            </p>
          ) : null}
        </div>
        <span
          className={`text-[11px] font-medium whitespace-nowrap rounded-[var(--radius-full)] px-2 py-0.5 shrink-0 ${badgeClass}`}
        >
          {dueLabel}
        </span>
      </Link>
    </li>
  );
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
  const [homeAssets, setHomeAssets] = useState<HomeAsset[]>([]);
  const [assetLabels, setAssetLabels] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    async function fetchData() {
      const [itemsResult, assetsResult] = await Promise.all([
        supabase
          .from("inventory_items")
          .select("id, user_id, name, description, frequency_months, last_ordered_date, next_reminder_date, purchase_url, thumbnail_url, notes, cost, home_asset_id, created_at")
          .order("next_reminder_date", { ascending: true })
          .returns<DbInventoryItem[]>(),
        supabase
          .from("home_assets")
          .select("id, user_id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url, created_at")
          .order("name", { ascending: true })
          .returns<DbHomeAsset[]>(),
      ]);

      if (itemsResult.error) {
        console.error("Failed to fetch inventory items:", itemsResult.error);
      } else {
        const mapped = itemsResult.data.map(dbToInventoryItem);
        setItems(mapped);
        fetchAssetLabels(mapped);
        backfillThumbnails(mapped);
      }

      if (!assetsResult.error && assetsResult.data) {
        setHomeAssets(assetsResult.data.map(dbToHomeAsset));
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  async function fetchAssetLabels(inventoryItems: InventoryItem[]) {
    const assetIds = [...new Set(inventoryItems.map((i) => i.homeAssetId).filter(Boolean))] as string[];
    if (assetIds.length === 0) return;

    const { data } = await supabase
      .from("home_assets")
      .select("id, name, make, model, location")
      .in("id", assetIds)
      .returns<Pick<DbHomeAsset, "id" | "name" | "make" | "model" | "location">[]>();

    if (!data) return;

    const labels = new Map<string, string>();
    for (const asset of data) {
      const assetName = [asset.make, asset.name].filter(Boolean).join(" ");
      let label = `For ${assetName}`;
      if (asset.model) label += ` - ${asset.model}`;
      if (asset.location) label += `, ${asset.location}`;
      labels.set(asset.id, label);
    }
    setAssetLabels(labels);
  }

  async function backfillThumbnails(inventoryItems: InventoryItem[]) {
    // Find items linked to an asset that have no thumbnail
    const needsThumbnail = inventoryItems.filter(
      (i) => i.homeAssetId && !i.thumbnailUrl
    );
    if (needsThumbnail.length === 0) return;

    // Get unique asset IDs and fetch their make+model+category+name
    const assetIds = [...new Set(needsThumbnail.map((i) => i.homeAssetId))] as string[];
    const { data: assets } = await supabase
      .from("home_assets")
      .select("id, name, category, make, model")
      .in("id", assetIds)
      .returns<Pick<DbHomeAsset, "id" | "name" | "category" | "make" | "model">[]>();

    if (!assets) return;

    // Build a map of assetId → asset data
    const assetMap = new Map(assets.map((a) => [a.id, a]));

    // Batch fetch cached suggestions
    const pairs = assets
      .filter((a) => a.make && a.model)
      .map((a) => ({ make: a.make, model: a.model }));
    if (pairs.length === 0) return;

    let results: Record<string, Array<{ consumable: string; products: Array<{ searchTerm: string }> }>> = {};
    try {
      const res = await fetch("/api/suggest-consumables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: pairs }),
      });
      if (res.ok) {
        const json = await res.json();
        results = json.results ?? {};
      }
    } catch {
      return;
    }

    // For each item, find the matching product and scrape its thumbnail
    for (const item of needsThumbnail) {
      const asset = assetMap.get(item.homeAssetId!);
      if (!asset?.make || !asset?.model) continue;

      const key = `${asset.make.toLowerCase()}|${asset.model.toLowerCase()}`;
      const suggestions = results[key];
      if (!suggestions) continue;

      const match = suggestions.find(
        (s) => s.consumable.toLowerCase() === item.name.toLowerCase()
      );
      const searchTerm = match?.products[0]?.searchTerm;
      if (!searchTerm) continue;

      // Fire-and-forget: scrape thumbnail, persist, and update state
      const amazonUrl = buyNowUrl(searchTerm);
      fetch("/api/scrape-thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: amazonUrl }),
      })
        .then((res) => res.json())
        .then((json: { thumbnailUrl?: string }) => {
          if (!json.thumbnailUrl) return;
          // Persist to DB
          supabase
            .from("inventory_items")
            .update({ thumbnail_url: json.thumbnailUrl })
            .eq("id", item.id)
            .then(() => {});
          // Update local state
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, thumbnailUrl: json.thumbnailUrl! } : i
            )
          );
        })
        .catch(() => {});
    }
  }

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
          className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms]"
        >
          <PlusIcon width={14} height={14} />
          Add Item
        </button>
      </header>

      {/* Search */}
      {items.length > 0 && (
        <div className="mb-4">
          <div className="relative max-w-full sm:max-w-[350px]">
            <SearchIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-4"
              width={14}
              height={14}
            />
            <input
              type="text"
              placeholder="Search Home Inventory"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent transition-all duration-[120ms]"
            />
          </div>
        </div>
      )}

      <HomeAlerts />

      {/* Content */}
      {loading ? (
        <p className="text-sm text-text-3">Loading inventory...</p>
      ) : items.length === 0 ? (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 text-center">
          <p className="text-[15px] font-semibold text-text-primary mb-1">
            No items yet
          </p>
          <p className="text-[14px] text-text-3">
            Start tracking household items that need periodic replacement.
          </p>
        </div>
      ) : (
        <>
          {/* Main inventory list */}
          {(() => {
            if (filtered.length === 0) return null;
            return (
              <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden">
                <ul role="list" aria-label="Inventory items">
                  {filtered.map((item) => {
                    const days = daysUntil(item.nextReminderDate);
                    const isSoon = days > 0 && days <= 30;
                    const dueLabel = `in ${days} day${days !== 1 ? "s" : ""}`;

                    return (
                      <InventoryItemRow
                        key={item.id}
                        item={item}
                        dueLabel={dueLabel}
                        badgeClass={isSoon ? "bg-accent-light text-accent" : "bg-border text-text-3"}
                        assetLabel={item.homeAssetId ? assetLabels.get(item.homeAssetId) : undefined}
                        extraInfo={
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[14px] font-semibold text-text-primary truncate">
                              {item.name}
                            </span>
                            <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-[var(--radius-full)] bg-accent-light text-accent">
                              {frequencyLabel(item.frequencyMonths)}
                            </span>
                          </div>
                        }
                      />
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
          homeAssets={homeAssets}
          onSave={handleAdd}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
