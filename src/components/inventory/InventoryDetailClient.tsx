"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type InventoryItem, FREQUENCY_OPTIONS } from "@/lib/inventory-data";
import { supabase, type DbInventoryItem, type DbHomeAsset } from "@/lib/supabase";
import { dbToInventoryItem, inventoryItemToDb } from "@/lib/mappers";
import {
  ChevronLeftIcon,
  PencilIcon,
  TrashIcon,
  ApplianceIcon,
  CheckCircleIcon,
} from "@/components/icons";
import AddInventoryItemModal from "./AddInventoryItemModal";
import { buyNowUrl } from "@/lib/utils";
import { formatDateLong as formatDate } from "@/lib/date-utils";

interface ConsumableProduct {
  name: string;
  estimatedCost: number | null;
  searchTerm: string;
  thumbnailUrl?: string;
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

export default function InventoryDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [productOptions, setProductOptions] = useState<ConsumableProduct[]>([]);

  useEffect(() => {
    async function fetchItem() {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, user_id, name, description, frequency_months, last_ordered_date, next_reminder_date, purchase_url, thumbnail_url, notes, cost, home_asset_id, created_at")
        .eq("id", id)
        .returns<DbInventoryItem[]>()
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const mapped = dbToInventoryItem(data);
      setItem(mapped);
      setLoading(false);

      // If linked to a home asset, fetch product options from consumable cache
      if (mapped.homeAssetId) {
        fetchProductOptions(mapped.homeAssetId, mapped.name);
      }
    }
    fetchItem();
  }, [id]);

  async function fetchProductOptions(homeAssetId: string, itemName: string) {
    // First fetch the linked home asset to get make+model
    const { data: assetData } = await supabase
      .from("home_assets")
      .select("name, category, make, model")
      .eq("id", homeAssetId)
      .returns<Pick<DbHomeAsset, "name" | "category" | "make" | "model">[]>()
      .single();

    if (!assetData?.make || !assetData?.model) return;

    // Fetch suggestions from the consumable cache
    try {
      const res = await fetch("/api/suggest-consumables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: assetData.name,
          category: assetData.category,
          make: assetData.make,
          model: assetData.model,
        }),
      });
      if (!res.ok) return;

      const data = await res.json();
      const suggestions = data.suggestions as Array<{
        consumable: string;
        products: ConsumableProduct[];
      }> | undefined;

      if (!suggestions) return;

      // Find the matching consumable by name
      const match = suggestions.find(
        (s) => s.consumable.toLowerCase() === itemName.toLowerCase()
      );
      if (match?.products) {
        setProductOptions(match.products);

        // Fetch thumbnails for each product in parallel
        const productsWithThumbs = await Promise.all(
          match.products.map(async (product) => {
            const amazonUrl = buyNowUrl(product.searchTerm);
            try {
              const thumbRes = await fetch("/api/scrape-thumbnail", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: amazonUrl }),
              });
              const thumbJson = (await thumbRes.json()) as { thumbnailUrl: string };
              return { ...product, thumbnailUrl: thumbJson.thumbnailUrl || undefined };
            } catch {
              return product;
            }
          })
        );
        setProductOptions(productsWithThumbs);
      }
    } catch {
      // silently fail — product options are optional
    }
  }

  async function handleEdit(data: Omit<InventoryItem, "id" | "createdAt">) {
    if (!item) return;

    let thumbnailUrl = data.thumbnailUrl;
    if (!thumbnailUrl && data.purchaseUrl && data.purchaseUrl !== item.purchaseUrl) {
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
      .update(inventoryItemToDb({ ...data, thumbnailUrl }) as Record<string, unknown>)
      .eq("id", item.id)
      .select()
      .returns<DbInventoryItem[]>();

    if (error) {
      console.error("Failed to update item:", error);
      return;
    }
    setItem(dbToInventoryItem(rows[0]));
    setEditModalOpen(false);
  }

  async function handleMarkPurchased() {
    if (!item) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const nextReminder = new Date(today);
    nextReminder.setMonth(nextReminder.getMonth() + item.frequencyMonths);
    const nextReminderStr = nextReminder.toISOString().split("T")[0];

    const { data: rows, error } = await supabase
      .from("inventory_items")
      .update({
        last_ordered_date: todayStr,
        next_reminder_date: nextReminderStr,
      })
      .eq("id", item.id)
      .select()
      .returns<DbInventoryItem[]>();

    if (error) {
      console.error("Failed to mark as purchased:", error);
      return;
    }
    setItem(dbToInventoryItem(rows[0]));
    setPurchased(true);
  }

  async function handleDelete() {
    const { error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", item!.id);

    if (error) {
      console.error("Failed to delete item:", error);
      return;
    }
    router.push("/inventory");
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
        <p className="text-sm text-text-3">Loading item...</p>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[13px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms] mb-6"
        >
          <ChevronLeftIcon width={14} height={14} />
          Back to Inventory
        </Link>
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 text-center">
          <p className="text-sm font-semibold text-text-primary mb-1">
            Item not found
          </p>
          <p className="text-[13px] text-text-3">
            This item may have been removed.
          </p>
        </div>
      </div>
    );
  }

  const days = daysUntil(item.nextReminderDate);
  const isOverdue = days <= 0;
  const isSoon = days > 0 && days <= 30;

  let dueLabel: string;
  if (isOverdue) {
    dueLabel =
      days === 0
        ? "Due today"
        : `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`;
  } else {
    dueLabel = `in ${days} day${days !== 1 ? "s" : ""}`;
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
      {/* Back link */}
      <Link
        href="/inventory"
        className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[13px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms] mb-6"
      >
        <ChevronLeftIcon width={14} height={14} />
        Back to Inventory
      </Link>

      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold tracking-tight text-text-primary truncate">
              {item.name}
            </h1>
            <span className="shrink-0 px-2.5 py-0.5 text-[11px] font-medium rounded-[var(--radius-full)] bg-accent-light text-accent">
              {frequencyLabel(item.frequencyMonths)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={purchased ? undefined : handleMarkPurchased}
            disabled={purchased}
            className={`inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] text-[13px] font-medium transition-all duration-[120ms] ${
              purchased
                ? "bg-green text-white cursor-default"
                : "border border-border-strong bg-surface text-text-2 hover:bg-border hover:text-text-primary"
            }`}
          >
            <CheckCircleIcon width={14} height={14} />
            {purchased ? "Purchased!" : "Mark as Purchased"}
          </button>
          <button
            onClick={() => setEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[13px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          >
            <PencilIcon width={13} height={13} />
            Edit
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[13px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          >
            <TrashIcon width={13} height={13} />
            Delete
          </button>
        </div>
      </header>

      {/* Thumbnail + Details */}
      <div className="flex gap-5 mb-5">
        {/* Thumbnail */}
        <div className="shrink-0">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.name}
              className="w-28 h-28 rounded-full object-cover bg-border"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-accent flex items-center justify-center">
              <ApplianceIcon width={48} height={48} className="text-white" strokeWidth={1.5} />
            </div>
          )}
        </div>

        {/* Details card */}
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-6 flex-1">
          <div className="grid grid-cols-2 gap-5">
            {/* Next Reminder */}
            <div>
              <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                Next Reminder
              </span>
              <span
                className={`text-[14px] font-semibold ${
                  isOverdue
                    ? "text-red"
                    : isSoon
                      ? "text-accent"
                      : "text-text-primary"
                }`}
              >
                {formatDate(item.nextReminderDate)}
              </span>
              <span
                className={`block text-[12px] mt-0.5 ${
                  isOverdue ? "text-red font-medium" : "text-text-3"
                }`}
              >
                {dueLabel}
              </span>
            </div>

            {/* Last Ordered */}
            <div>
              <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                Last Ordered
              </span>
              <span className="text-[14px] text-text-primary">
                {item.lastOrderedDate ? formatDate(item.lastOrderedDate) : "\u2014"}
              </span>
            </div>

            {/* Purchase URL — hidden when recommended products are shown */}
            {item.purchaseUrl && productOptions.length === 0 && (
              <div className="col-span-2">
                <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                  Purchase Link
                </span>
                <a
                  href={buyNowUrl(item.name, item.purchaseUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-accent hover:underline"
                >
                  Purchase Here
                </a>
              </div>
            )}

            {/* Description */}
            {item.description && (
              <div className="col-span-2">
                <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                  Description
                </span>
                <p className="text-[14px] text-text-primary leading-relaxed">
                  {item.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommended Products — shown for items linked to a home asset */}
      {productOptions.length > 0 && (
        <div className="mb-5">
          <h2 className="text-[15px] font-semibold text-text-primary mb-1">
            Recommended Products
          </h2>
          <p className="text-[11px] text-text-4 mb-3">
            Verify compatibility with your model before purchasing.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {productOptions.map((product) => (
              <a
                key={product.name}
                href={buyNowUrl(product.searchTerm)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden hover:shadow-[var(--shadow-hover)] transition-shadow duration-200"
              >
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    {product.thumbnailUrl ? (
                      <img
                        src={product.thumbnailUrl}
                        alt={product.name}
                        className="w-18 h-18 rounded-full object-cover bg-border border border-border shrink-0"
                      />
                    ) : (
                      <div className="w-18 h-18 rounded-full bg-border shrink-0 flex items-center justify-center">
                        <ApplianceIcon width={32} height={32} className="text-text-4" strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-text-primary">
                        {product.name}
                      </p>
                      {product.estimatedCost != null && (
                        <p className="text-[12px] text-text-3 truncate">
                          ${product.estimatedCost}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="mt-4 flex items-center gap-3 bg-surface rounded-[var(--radius-lg)] border border-red/20 shadow-[var(--shadow-card)] px-5 py-3">
          <span className="text-[13px] text-text-3 flex-1">
            Are you sure you want to delete this item? This cannot be undone.
          </span>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] bg-red text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms]"
          >
            Yes, Delete
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[13px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Edit modal */}
      {editModalOpen && (
        <AddInventoryItemModal
          item={item}
          onSave={handleEdit}
          onClose={() => setEditModalOpen(false)}
        />
      )}
    </div>
  );
}
