"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { type HomeAsset, type AssetCategory, CATEGORY_OPTIONS, DEFAULT_ASSETS } from "@/lib/home-assets-data";
import { supabase, type DbHomeAsset, type DbInventoryItem } from "@/lib/supabase";
import { dbToHomeAsset, homeAssetToDb } from "@/lib/mappers";
import { PlusIcon, SearchIcon, HomeIcon, ChevronDownIcon, ChevronRightIcon, UploadIcon, SparklesIcon } from "@/components/icons";
import { FREQUENCY_OPTIONS } from "@/lib/inventory-data";
import AddHomeAssetModal from "./AddHomeAssetModal";
import ImportAssetsModal from "./ImportAssetsModal";
import ConsumableDetailModal from "./ConsumableDetailModal";

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
  if (diffDays < 0) return { label: "Expired", color: "bg-red-light text-red" };
  if (diffDays <= 90) return { label: `${diffDays}d left`, color: "bg-accent-light text-accent" };
  return { label: "Warranty Active", color: "bg-green-light text-green" };
}

function frequencyLabel(months: number): string {
  const opt = FREQUENCY_OPTIONS.find((o) => o.value === months);
  return opt?.label ?? `Every ${months} mo`;
}

function cacheKey(make: string, model: string): string {
  return `${make.toLowerCase()}|${model.toLowerCase()}`;
}

type RowItem =
  | { kind: "saved"; asset: HomeAsset }
  | { kind: "placeholder"; name: string; category: AssetCategory }
  | { kind: "consumable"; suggestion: ConsumableSuggestion; asset: HomeAsset; tracked: boolean };

export default function HomeAssetsClient() {
  const [assets, setAssets] = useState<HomeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const [prefillAsset, setPrefillAsset] = useState<{ name: string; category: AssetCategory } | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Consumable suggestions cache (make+model → suggestions)
  const [suggestionsMap, setSuggestionsMap] = useState<Record<string, ConsumableSuggestion[]>>({});
  // Set of asset IDs that already have linked inventory items
  const [trackedAssetIds, setTrackedAssetIds] = useState<Set<string>>(new Set());

  // Consumable detail modal state
  const [selectedConsumable, setSelectedConsumable] = useState<{
    suggestion: ConsumableSuggestion;
    asset: HomeAsset;
  } | null>(null);

  // Fetch cached suggestions for all assets with make+model
  const fetchSuggestions = useCallback(async (assetList: HomeAsset[]) => {
    const pairs = assetList
      .filter((a) => a.make && a.model)
      .map((a) => ({ make: a.make, model: a.model }));

    if (pairs.length === 0) return;

    // Deduplicate
    const unique = new Map<string, { make: string; model: string }>();
    for (const p of pairs) {
      unique.set(cacheKey(p.make, p.model), p);
    }

    try {
      const res = await fetch("/api/suggest-consumables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: [...unique.values()] }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestionsMap((prev) => ({ ...prev, ...data.results }));
      }
    } catch {
      // silently fail — suggestions are optional
    }
  }, []);

  // Fetch inventory items linked to home assets
  const fetchTrackedItems = useCallback(async () => {
    const { data } = await supabase
      .from("inventory_items")
      .select("home_asset_id")
      .not("home_asset_id", "is", null)
      .returns<Pick<DbInventoryItem, "home_asset_id">[]>();

    if (data) {
      setTrackedAssetIds(new Set(data.map((d) => d.home_asset_id!)));
    }
  }, []);

  useEffect(() => {
    async function fetchAssets() {
      const { data, error } = await supabase
        .from("home_assets")
        .select("id, user_id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url, created_at")
        .order("name", { ascending: true })
        .returns<DbHomeAsset[]>();

      if (error) {
        console.error("Failed to fetch home assets:", error);
      } else {
        const mapped = data.map(dbToHomeAsset);
        setAssets(mapped);
        fetchSuggestions(mapped);
        fetchTrackedItems();
      }
      setLoading(false);
    }
    fetchAssets();
  }, [fetchSuggestions, fetchTrackedItems]);

  // Fire-and-forget: prime consumable cache for an asset
  function primeSuggestionCache(asset: { name: string; category: string; make: string; model: string }) {
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
      .then((data) => {
        if (data?.suggestions) {
          const key = cacheKey(asset.make, asset.model);
          setSuggestionsMap((prev) => ({ ...prev, [key]: data.suggestions }));
        }
      })
      .catch(() => { /* ignore */ });
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

    // Prime the consumable cache for the new asset
    primeSuggestionCache(data);
  }

  function handleImportComplete(newAssets: HomeAsset[]) {
    setAssets(
      [...assets, ...newAssets].sort((a, b) => a.name.localeCompare(b.name))
    );
    // Prime cache for imported assets with make+model
    for (const a of newAssets) {
      primeSuggestionCache(a);
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

  // Build rows per category: saved assets + consumable rows + placeholder defaults
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
      );

    const savedNames = savedNamesByCategory.get(category) ?? new Set();
    const defaults = (DEFAULT_ASSETS[category] ?? [])
      .filter((name) => !savedNames.has(name.toLowerCase()))
      .filter((name) => !q || name.toLowerCase().includes(q));

    const rows: RowItem[] = [];
    for (const asset of savedInCategory) {
      rows.push({ kind: "saved", asset });

      // Add consumable rows after the parent asset
      if (asset.make && asset.model) {
        const key = cacheKey(asset.make, asset.model);
        const suggestions = suggestionsMap[key];
        if (suggestions && suggestions.length > 0) {
          const isTracked = trackedAssetIds.has(asset.id);
          for (const suggestion of suggestions) {
            rows.push({ kind: "consumable", suggestion, asset, tracked: isTracked });
          }
        }
      }
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
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          Home Assets
        </h1>
        <button
          type="button"
          onClick={() => setImportModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[13px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
        >
          <UploadIcon width={14} height={14} />
          Import CSV
        </button>
      </header>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-full sm:max-w-[350px]">
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
            className="w-full pl-9 pr-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent transition-all duration-[120ms]"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-[13px] text-text-3">Loading assets...</p>
      ) : (
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
                    <span className="text-[13px] font-semibold text-text-primary">
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
                              <div className="w-10 h-10 rounded-full bg-accent shrink-0 flex items-center justify-center">
                                <HomeIcon width={18} height={18} className="text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-[13px] font-semibold text-text-primary truncate">
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

                      if (row.kind === "consumable") {
                        const { suggestion, asset, tracked } = row;
                        return (
                          <li
                            key={`consumable-${asset.id}-${suggestion.consumable}`}
                            className="border-b border-border last:border-b-0"
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedConsumable({ suggestion, asset })}
                              className="flex items-center gap-x-3 px-5 py-3 w-full text-left cursor-pointer hover:bg-surface-hover transition-[background] duration-[120ms]"
                            >
                              <div className="w-10 h-10 rounded-full bg-teal/10 shrink-0 flex items-center justify-center ml-5">
                                <SparklesIcon width={16} height={16} className="text-teal" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[13px] font-semibold text-text-primary truncate block">
                                  {suggestion.consumable}
                                </span>
                                <p className="text-[12px] text-text-3">
                                  for {asset.name}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {tracked && (
                                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-[var(--radius-full)] bg-green-light text-green">
                                    Tracked
                                  </span>
                                )}
                                <span className="text-[12px] text-text-3">
                                  {frequencyLabel(suggestion.frequencyMonths)}
                                </span>
                              </div>
                            </button>
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
                              <span className="text-[13px] font-medium text-text-3">
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
      )}

      {/* Add modal */}
      {modalOpen && (
        <AddHomeAssetModal
          prefill={prefillAsset ?? undefined}
          onSave={handleAdd}
          onClose={() => { setModalOpen(false); setPrefillAsset(null); }}
        />
      )}

      {/* Import modal */}
      {importModalOpen && (
        <ImportAssetsModal
          onImportComplete={handleImportComplete}
          onClose={() => setImportModalOpen(false)}
        />
      )}

      {/* Consumable detail modal */}
      {selectedConsumable && (
        <ConsumableDetailModal
          consumable={selectedConsumable.suggestion.consumable}
          description={selectedConsumable.suggestion.description}
          frequencyMonths={selectedConsumable.suggestion.frequencyMonths}
          products={selectedConsumable.suggestion.products}
          assetName={selectedConsumable.asset.name}
          assetId={selectedConsumable.asset.id}
          onClose={() => setSelectedConsumable(null)}
          onAdded={() => {
            setTrackedAssetIds((prev) => new Set(prev).add(selectedConsumable.asset.id));
          }}
        />
      )}
    </div>
  );
}
