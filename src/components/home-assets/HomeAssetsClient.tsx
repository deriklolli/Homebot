"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { type HomeAsset, type AssetCategory, CATEGORY_OPTIONS, DEFAULT_ASSETS, DEFAULT_ROOMS } from "@/lib/home-assets-data";
import { supabase, type DbHomeAsset, type DbInventoryItem, type DbRoom } from "@/lib/supabase";
import { dbToHomeAsset, homeAssetToDb } from "@/lib/mappers";
import { PlusIcon, SearchIcon, HomeIcon, ChevronDownIcon, ChevronRightIcon, UploadIcon } from "@/components/icons";
import AddHomeAssetModal from "./AddHomeAssetModal";
import ImportAssetsModal from "./ImportAssetsModal";
import LabelScannerModal, { type ScanResult } from "./LabelScannerModal";

import { buyNowUrl } from "@/lib/utils";
import { computeNextReminderDate } from "@/lib/date-utils";

interface ConsumableProduct {
  name: string;
  estimatedCost: number | null;
  searchTerm: string;
}

interface ConsumableSuggestion {
  consumable: string;
  description: string;
  frequencyMonths: number;
  products: ConsumableProduct[];
}

function warrantyStatus(dateStr: string | null): { label: string; color: string } | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr + "T00:00:00");
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: "Warranty Expired", color: "bg-red-light text-red" };
  if (diffDays <= 90) return { label: `${diffDays}d left`, color: "bg-accent-light text-accent" };
  return { label: "Warranty Active", color: "bg-green-light text-green" };
}

type RowItem =
  | { kind: "saved"; asset: HomeAsset }
  | { kind: "placeholder"; name: string; category: AssetCategory };

export default function HomeAssetsClient() {
  const [assets, setAssets] = useState<HomeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const [prefillAsset, setPrefillAsset] = useState<{ name: string; category: AssetCategory } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pendingScanResult, setPendingScanResult] = useState<ScanResult | null>(null);

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"category" | "location">("location");
  const [rooms, setRooms] = useState<string[]>([]);
  const [collapsedLocations, setCollapsedLocations] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchRooms() {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name")
        .order("name", { ascending: true })
        .returns<Pick<DbRoom, "id" | "name">[]>();

      if (error) {
        console.error("Failed to fetch rooms:", error);
        return;
      }

      if (data.length === 0) {
        // Seed default rooms for this user
        const inserts = DEFAULT_ROOMS.map((name) => ({ name }));
        const { data: seeded, error: seedErr } = await supabase
          .from("rooms")
          .insert(inserts as Record<string, unknown>[])
          .select("id, name")
          .returns<Pick<DbRoom, "id" | "name">[]>();

        if (seedErr) {
          console.error("Failed to seed rooms:", seedErr);
        } else {
          setRooms(seeded.map((r) => r.name).sort((a, b) => a.localeCompare(b)));
        }
      } else {
        setRooms(data.map((r) => r.name).sort((a, b) => a.localeCompare(b)));
      }
    }
    fetchRooms();
  }, []);

  useEffect(() => {
    async function fetchAssets() {
      const { data, error } = await supabase
        .from("home_assets")
        .select("id, user_id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url, image_url, created_at")
        .order("name", { ascending: true })
        .returns<DbHomeAsset[]>();

      if (error) {
        console.error("Failed to fetch home assets:", error);
      } else {
        setAssets(data.map(dbToHomeAsset));
      }
      setLoading(false);
    }
    fetchAssets();
  }, []);

  // Fire-and-forget: prime consumable cache + auto-create inventory items
  function primeSuggestionCache(asset: { name: string; category: string; make: string; model: string }, assetId: string) {
    if (!asset.make || !asset.model) return;
    fetch("/api/suggest-consumables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: asset.name,
        category: asset.category,
        make: asset.make,
        model: asset.model,
      }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then(async (data) => {
        const suggestions = data?.suggestions as ConsumableSuggestion[] | undefined;
        if (!suggestions || suggestions.length === 0) return;

        // Check if inventory items already exist for this asset
        const { data: existing } = await supabase
          .from("inventory_items")
          .select("name")
          .eq("home_asset_id", assetId)
          .returns<Pick<DbInventoryItem, "name">[]>();

        const existingNames = new Set((existing ?? []).map((e) => e.name.toLowerCase()));

        const today = new Date().toISOString().split("T")[0];
        const itemsToInsert = suggestions
          .filter((s) => !existingNames.has(s.consumable.toLowerCase()))
          .map((s) => ({
            name: s.consumable,
            description: `${s.description} (for ${asset.name})`,
            frequency_months: s.frequencyMonths,
            last_ordered_date: null,
            next_reminder_date: computeNextReminderDate(today, s.frequencyMonths),
            purchase_url: s.products[0] ? buyNowUrl(s.products[0].searchTerm) : "",
            thumbnail_url: "",
            notes: `Auto-suggested for ${asset.name}`,
            cost: s.products[0]?.estimatedCost ?? null,
            home_asset_id: assetId,
            tracked: true,
          }));

        if (itemsToInsert.length > 0) {
          const { data: inserted, error } = await supabase
            .from("inventory_items")
            .insert(itemsToInsert as Record<string, unknown>[])
            .select("id, name")
            .returns<Pick<DbInventoryItem, "id" | "name">[]>();
          if (error) {
            console.error("Failed to auto-create inventory items:", error);
          }

          // Fire-and-forget: scrape thumbnails for newly created items
          if (inserted) {
            for (const row of inserted) {
              const match = suggestions.find(
                (s) => s.consumable.toLowerCase() === row.name.toLowerCase()
              );
              const searchTerm = match?.products[0]?.searchTerm;
              if (!searchTerm) continue;
              const amazonUrl = buyNowUrl(searchTerm);
              fetch("/api/scrape-thumbnail", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: amazonUrl }),
              })
                .then((res) => res.json())
                .then((json: { thumbnailUrl?: string }) => {
                  if (json.thumbnailUrl) {
                    supabase
                      .from("inventory_items")
                      .update({ thumbnail_url: json.thumbnailUrl })
                      .eq("id", row.id)
                      .then(() => {});
                  }
                })
                .catch(() => {});
            }
          }
        }
      })
      .catch(() => { /* ignore */ });
  }

  function updateAssetImage(assetId: string, imageUrl: string) {
    supabase
      .from("home_assets")
      .update({ image_url: imageUrl })
      .eq("id", assetId)
      .then(() => {
        setAssets((prev) =>
          prev.map((a) => (a.id === assetId ? { ...a, imageUrl } : a))
        );
      });
  }

  // Try multiple sources for product image: Skulytics product → Google CSE → Skulytics brand logo
  async function fetchProductImage(assetId: string, make: string, model: string, category?: string) {
    try {
      // 1. Try Skulytics product detail (high-quality manufacturer images)
      const skulyticsRes = await fetch(`/api/skulytics/product-detail?sku=${encodeURIComponent(model)}&brand=${encodeURIComponent(make)}`);
      const skulyticsData = await skulyticsRes.json();
      if (skulyticsData.product?.image) {
        updateAssetImage(assetId, skulyticsData.product.image);
        return;
      }
    } catch { /* continue to next source */ }

    try {
      // 2. Fall back to brand logo from Skulytics
      const cat = category || "Kitchen";
      const brandsRes = await fetch(`/api/skulytics/brands?category=${encodeURIComponent(cat)}`);
      const brandsData = await brandsRes.json();
      const matchedBrand = (brandsData.brands ?? []).find(
        (b: { name: string; image: string }) => b.name.toLowerCase() === make.toLowerCase()
      );
      if (matchedBrand?.image) {
        updateAssetImage(assetId, matchedBrand.image);
      }
    } catch { /* all sources exhausted */ }
  }

  async function handleAdd(data: Omit<HomeAsset, "id" | "createdAt">) {
    const { data: rows, error } = await supabase
      .from("home_assets")
      .insert(homeAssetToDb(data) as Record<string, unknown>)
      .select()
      .returns<DbHomeAsset[]>();

    if (error) {
      console.error("Failed to add asset:", error);
      return;
    }
    const newAsset = dbToHomeAsset(rows[0]);
    setAssets(
      [...assets, newAsset].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    );
    setModalOpen(false);
    setPrefillAsset(null);

    // Prime the consumable cache + auto-create inventory items
    primeSuggestionCache(data, newAsset.id);

    // Auto-fetch product image if none was provided
    if (data.make && data.model && !data.imageUrl) {
      fetchProductImage(newAsset.id, data.make, data.model, data.category);
    }
  }

  function handleImportComplete(newAssets: HomeAsset[]) {
    setAssets(
      [...assets, ...newAssets].sort((a, b) => a.name.localeCompare(b.name))
    );
    // Prime cache + auto-create inventory items for imported assets
    for (const a of newAssets) {
      primeSuggestionCache(a, a.id);
    }
  }

  function toggleCategory(cat: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function toggleLocation(loc: string) {
    setCollapsedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(loc)) next.delete(loc);
      else next.add(loc);
      return next;
    });
  }

  function buildLocationRows(location: string): HomeAsset[] {
    const q = searchQuery.toLowerCase();
    return assets
      .filter((a) => a.location === location)
      .filter((a) =>
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.make.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Build rows per category: saved assets + placeholder defaults
  const savedNamesByCategory = new Map<string, Set<string>>();
  for (const asset of assets) {
    const names = savedNamesByCategory.get(asset.category) ?? new Set();
    names.add(asset.name.toLowerCase());
    savedNamesByCategory.set(asset.category, names);
  }

  function buildCategoryRows(category: AssetCategory): RowItem[] {
    const q = searchQuery.toLowerCase();
    const savedInCategory = assets
      .filter((a) => a.category === category)
      .filter((a) =>
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.make.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    const savedNames = savedNamesByCategory.get(category) ?? new Set();
    const defaults = (DEFAULT_ASSETS[category] ?? [])
      .filter((name) => !savedNames.has(name.toLowerCase()))
      .filter((name) => !q || name.toLowerCase().includes(q));

    const rows: RowItem[] = [];
    for (const asset of savedInCategory) {
      rows.push({ kind: "saved", asset });
    }
    for (const name of defaults) {
      rows.push({ kind: "placeholder", name, category });
    }
    return rows;
  }

  const categoriesToShow = [...CATEGORY_OPTIONS];

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
      {/* Header */}
      <header className="mb-4">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary whitespace-nowrap">
          Home Assets
        </h1>
      </header>

      {/* Search + Add Asset + Import CSV */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative max-w-full sm:max-w-[350px] w-full">
          <SearchIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-4"
            width={15}
            height={15}
          />
          <input
            type="text"
            placeholder="Search Assets"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent transition-all duration-[120ms]"
          />
        </div>
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => { setPrefillAsset(null); setModalOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms]"
          >
            <PlusIcon width={14} height={14} />
            Add Asset
          </button>
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          >
            <UploadIcon width={14} height={14} />
            Import CSV
          </button>
        </div>
      </div>
      {/* Content */}
      {loading ? (
        <p className="text-[14px] text-text-3">Loading assets...</p>
      ) : viewMode === "category" ? (
        <div className="flex flex-col gap-4">
          {categoriesToShow.map((category) => {
            const rows = buildCategoryRows(category);
            const savedCount = rows.filter((r) => r.kind === "saved").length;
            const isCollapsed = collapsedCategories.has(category);
            return (
              <div
                key={category}
                className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden"
              >
                {/* Category header */}
                <div
                  className={`flex items-center gap-2 px-5 py-3 bg-bg/50 ${
                    !isCollapsed && rows.length > 0 ? "border-b border-border" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-70 transition-opacity duration-[120ms]"
                    aria-expanded={!isCollapsed}
                    aria-controls={`category-${category}`}
                  >
                    {isCollapsed ? (
                      <ChevronRightIcon width={14} height={14} className="text-text-3 shrink-0" />
                    ) : (
                      <ChevronDownIcon width={14} height={14} className="text-text-3 shrink-0" />
                    )}
                    <span className="text-[14px] font-semibold text-text-primary">
                      {category}
                    </span>
                    <span className="text-[12px] text-text-3">
                      ({savedCount})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrefillAsset({ name: "", category });
                      setModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)] text-[12px] font-medium text-accent hover:bg-accent-light transition-all duration-[120ms] shrink-0"
                  >
                    <PlusIcon width={12} height={12} />
                    Add {category} Asset
                  </button>
                </div>

                {/* Asset list — collapsible */}
                {!isCollapsed && (
                  <ul role="list" id={`category-${category}`} aria-label={`${category} assets`}>
                    {rows.map((row) => {
                      if (row.kind === "saved") {
                        const asset = row.asset;
                        const warranty = warrantyStatus(asset.warrantyExpiration);
                        return (
                          <li key={asset.id} className="border-b border-border last:border-b-0">
                            <Link
                              href={`/home-assets/${asset.id}`}
                              className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5 hover:bg-surface-hover transition-[background] duration-[120ms]"
                            >
                              {asset.imageUrl ? (
                                <img
                                  src={asset.imageUrl}
                                  alt={asset.name}
                                  className="w-10 h-10 rounded-full shrink-0 object-cover bg-bg"
                                  onError={(e) => {
                                    const el = e.target as HTMLImageElement;
                                    el.style.display = "none";
                                    el.nextElementSibling?.classList.remove("hidden");
                                  }}
                                />
                              ) : null}
                              <div className={`w-10 h-10 rounded-full bg-accent shrink-0 flex items-center justify-center ${asset.imageUrl ? "hidden" : ""}`}>
                                <HomeIcon width={18} height={18} className="text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-[14px] font-semibold text-text-primary truncate">
                                    {asset.name}
                                  </span>
                                  {warranty && (
                                    <span className={`shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-[var(--radius-full)] ${warranty.color}`}>
                                      {warranty.label}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[12px] text-text-3 truncate">
                                  {[asset.make, asset.model].filter(Boolean).join(" ") || "No make/model"}
                                  {asset.location && ` · ${asset.location}`}
                                </p>
                              </div>
                            </Link>
                          </li>
                        );
                      }

                      // Placeholder row — click to add
                      return (
                        <li key={`placeholder-${row.name}`} className="border-b border-border last:border-b-0">
                          <button
                            type="button"
                            onClick={() => {
                              setPrefillAsset({ name: row.name, category: row.category });
                              setModalOpen(true);
                            }}
                            className="flex items-center gap-x-3 px-5 py-3.5 w-full text-left cursor-pointer hover:bg-surface-hover transition-[background] duration-[120ms]"
                          >
                            <div className="w-10 h-10 rounded-full bg-border shrink-0 flex items-center justify-center">
                              <HomeIcon width={18} height={18} className="text-text-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[14px] font-medium text-text-3">
                                {row.name}
                              </span>
                              <p className="text-[12px] text-text-4">
                                Click to add details
                              </p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Location View — only show rooms that have assets */
        <div className="flex flex-col gap-4">
          {rooms.filter((room) => assets.some((a) => a.location === room)).map((room) => {
            const roomAssets = buildLocationRows(room);
            if (roomAssets.length === 0) return null; // filtered by search
            const isCollapsed = collapsedLocations.has(room);
            return (
              <div
                key={room}
                className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden"
              >
                {/* Room header */}
                <div
                  className={`flex items-center gap-2 px-5 py-3 bg-bg/50 ${
                    !isCollapsed ? "border-b border-border" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleLocation(room)}
                    className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-70 transition-opacity duration-[120ms]"
                    aria-expanded={!isCollapsed}
                    aria-controls={`location-${room}`}
                  >
                    {isCollapsed ? (
                      <ChevronRightIcon width={14} height={14} className="text-text-3 shrink-0" />
                    ) : (
                      <ChevronDownIcon width={14} height={14} className="text-text-3 shrink-0" />
                    )}
                    <span className="text-[14px] font-semibold text-text-primary">
                      {room}
                    </span>
                    <span className="text-[12px] text-text-3">
                      ({roomAssets.length})
                    </span>
                  </button>
                </div>

                {/* Asset list — collapsible */}
                {!isCollapsed && (
                  <ul role="list" id={`location-${room}`} aria-label={`${room} assets`}>
                    {roomAssets.map((asset) => {
                      const warranty = warrantyStatus(asset.warrantyExpiration);
                      return (
                        <li key={asset.id} className="border-b border-border last:border-b-0">
                          <Link
                            href={`/home-assets/${asset.id}`}
                            className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5 hover:bg-surface-hover transition-[background] duration-[120ms]"
                          >
                            {asset.imageUrl ? (
                              <img
                                src={asset.imageUrl}
                                alt={asset.name}
                                className="w-10 h-10 rounded-full shrink-0 object-cover bg-bg"
                                onError={(e) => {
                                  const el = e.target as HTMLImageElement;
                                  el.style.display = "none";
                                  el.nextElementSibling?.classList.remove("hidden");
                                }}
                              />
                            ) : null}
                            <div className={`w-10 h-10 rounded-full bg-accent shrink-0 flex items-center justify-center ${asset.imageUrl ? "hidden" : ""}`}>
                              <HomeIcon width={18} height={18} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[14px] font-semibold text-text-primary truncate">
                                  {asset.name}
                                </span>
                                {warranty && (
                                  <span className={`shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-[var(--radius-full)] ${warranty.color}`}>
                                    {warranty.label}
                                  </span>
                                )}
                              </div>
                              <p className="text-[12px] text-text-3 truncate">
                                {[asset.make, asset.model].filter(Boolean).join(" ") || "No make/model"}
                              </p>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}

          {/* Unassigned room — assets with no location */}
          {(() => {
            const unassigned = buildLocationRows("");
            if (unassigned.length === 0) return null;
            const isCollapsed = collapsedLocations.has("__unassigned__");
            return (
              <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden">
                <div
                  className={`flex items-center gap-2 px-5 py-3 bg-bg/50 ${
                    !isCollapsed && unassigned.length > 0 ? "border-b border-border" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleLocation("__unassigned__")}
                    className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-70 transition-opacity duration-[120ms]"
                    aria-expanded={!isCollapsed}
                  >
                    {isCollapsed ? (
                      <ChevronRightIcon width={14} height={14} className="text-text-3 shrink-0" />
                    ) : (
                      <ChevronDownIcon width={14} height={14} className="text-text-3 shrink-0" />
                    )}
                    <span className="text-[14px] font-semibold text-text-3 italic">
                      No Room Assigned
                    </span>
                    <span className="text-[12px] text-text-3">
                      ({unassigned.length})
                    </span>
                  </button>
                </div>
                {!isCollapsed && unassigned.length > 0 && (
                  <ul role="list" aria-label="Unassigned assets">
                    {unassigned.map((asset) => {
                      const warranty = warrantyStatus(asset.warrantyExpiration);
                      return (
                        <li key={asset.id} className="border-b border-border last:border-b-0">
                          <Link
                            href={`/home-assets/${asset.id}`}
                            className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5 hover:bg-surface-hover transition-[background] duration-[120ms]"
                          >
                            {asset.imageUrl ? (
                              <img
                                src={asset.imageUrl}
                                alt={asset.name}
                                className="w-10 h-10 rounded-full shrink-0 object-cover bg-bg"
                                onError={(e) => {
                                  const el = e.target as HTMLImageElement;
                                  el.style.display = "none";
                                  el.nextElementSibling?.classList.remove("hidden");
                                }}
                              />
                            ) : null}
                            <div className={`w-10 h-10 rounded-full bg-accent shrink-0 flex items-center justify-center ${asset.imageUrl ? "hidden" : ""}`}>
                              <HomeIcon width={18} height={18} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[14px] font-semibold text-text-primary truncate">
                                  {asset.name}
                                </span>
                                {warranty && (
                                  <span className={`shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-[var(--radius-full)] ${warranty.color}`}>
                                    {warranty.label}
                                  </span>
                                )}
                              </div>
                              <p className="text-[12px] text-text-3 truncate">
                                {[asset.make, asset.model].filter(Boolean).join(" ") || "No make/model"}
                              </p>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })()}

        </div>
      )}

      {/* Mobile floating add button */}
      <button
        type="button"
        onClick={() => setScannerOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex md:hidden items-center justify-center w-[68px] h-[68px] rounded-full bg-accent text-white shadow-lg hover:brightness-110 active:scale-95 transition-all duration-[120ms]"
        aria-label="Scan to add a new asset"
      >
        <PlusIcon width={28} height={28} />
      </button>

      {/* Label scanner (from FAB) */}
      {scannerOpen && (
        <LabelScannerModal
          onScan={(result) => {
            setScannerOpen(false);
            setPendingScanResult(result);
            setModalOpen(true);
          }}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* Add modal */}
      {modalOpen && (
        <AddHomeAssetModal
          prefill={prefillAsset ?? undefined}
          scanResult={pendingScanResult ?? undefined}
          onSave={handleAdd}
          onClose={() => { setModalOpen(false); setPrefillAsset(null); setPendingScanResult(null); }}
        />
      )}

      {/* Import modal */}
      {importModalOpen && (
        <ImportAssetsModal
          onImportComplete={handleImportComplete}
          onClose={() => setImportModalOpen(false)}
        />
      )}


    </div>
  );
}
