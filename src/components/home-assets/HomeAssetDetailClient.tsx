"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type HomeAsset, type HomeAssetDocument, DOCUMENT_TYPES } from "@/lib/home-assets-data";
import { type InventoryItem, FREQUENCY_OPTIONS } from "@/lib/inventory-data";
import { type Project, type ProjectStatus } from "@/lib/projects-data";
import { supabase, type DbHomeAsset, type DbProject, type DbInventoryItem, type DbHomeAssetDocument } from "@/lib/supabase";
import { dbToHomeAsset, homeAssetToDb, dbToProject, dbToInventoryItem, dbToHomeAssetDocument } from "@/lib/mappers";
import {
  ChevronLeftIcon,
  PencilIcon,
  TrashIcon,
  PackageIcon,
  CameraIcon,
  PlusIcon,
} from "@/components/icons";
import AddHomeAssetModal from "./AddHomeAssetModal";
import HomeAssetDocuments, { type HomeAssetDocumentsHandle } from "./HomeAssetDocuments";
import { affiliateUrl } from "@/lib/utils";
import { formatDateLong as formatDate } from "@/lib/date-utils";

function warrantyPill(dateStr: string | null): { label: string; color: string } | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr + "T00:00:00");
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: "Warranty Expired", color: "bg-red-light text-red" };
  if (diffDays <= 90) return { label: `${diffDays}d left`, color: "bg-accent-light text-accent" };
  return { label: "Active", color: "bg-green-light text-green" };
}

function frequencyLabel(months: number): string {
  const opt = FREQUENCY_OPTIONS.find((o) => o.value === months);
  return opt?.label ?? `Every ${months} mo`;
}

export default function HomeAssetDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [asset, setAsset] = useState<HomeAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [linkedInventory, setLinkedInventory] = useState<InventoryItem[]>([]);
  const [documents, setDocuments] = useState<HomeAssetDocument[]>([]);
  const [addFilesMenuOpen, setAddFilesMenuOpen] = useState(false);
  const addFilesMenuRef = useRef<HTMLDivElement>(null);
  const documentsRef = useRef<HomeAssetDocumentsHandle>(null);
  const [imagePromptOpen, setImagePromptOpen] = useState(false);
  const [imageInput, setImageInput] = useState("");

  useEffect(() => {
    async function fetchData() {
      const [assetRes, projectsRes, inventoryRes, documentsRes] = await Promise.all([
        supabase
          .from("home_assets")
          .select("id, user_id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url, image_url, created_at")
          .eq("id", id)
          .returns<DbHomeAsset[]>()
          .single(),
        supabase
          .from("projects")
          .select("id, user_id, name, description, contractor_id, home_asset_id, notes, status, total_cost, contractor_rating, completed_at, created_at")
          .eq("home_asset_id", id)
          .order("created_at", { ascending: false })
          .returns<DbProject[]>(),
        supabase
          .from("inventory_items")
          .select("id, user_id, name, description, frequency_months, last_ordered_date, next_reminder_date, purchase_url, thumbnail_url, notes, cost, home_asset_id, created_at")
          .eq("home_asset_id", id)
          .order("next_reminder_date", { ascending: true })
          .returns<DbInventoryItem[]>(),
        supabase
          .from("home_asset_documents")
          .select("id, user_id, home_asset_id, storage_path, file_name, file_type, document_type, created_at")
          .eq("home_asset_id", id)
          .order("created_at", { ascending: true })
          .returns<DbHomeAssetDocument[]>(),
      ]);

      if (assetRes.error || !assetRes.data) {
        setNotFound(true);
      } else {
        setAsset(dbToHomeAsset(assetRes.data));
      }

      if (projectsRes.data) {
        setProjects(projectsRes.data.map(dbToProject));
      }

      if (inventoryRes.data) {
        setLinkedInventory(inventoryRes.data.map(dbToInventoryItem));
      }

      if (documentsRes.data) {
        setDocuments(documentsRes.data.map(dbToHomeAssetDocument));
      }

      setLoading(false);
    }
    fetchData();
  }, [id]);

  // Close add files menu on outside click
  useEffect(() => {
    if (!addFilesMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (addFilesMenuRef.current && !addFilesMenuRef.current.contains(e.target as Node)) {
        setAddFilesMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [addFilesMenuOpen]);

  async function handleEdit(data: Omit<HomeAsset, "id" | "createdAt">) {
    if (!asset) return;

    const { data: rows, error } = await supabase
      .from("home_assets")
      .update(homeAssetToDb(data) as Record<string, unknown>)
      .eq("id", asset.id)
      .select()
      .returns<DbHomeAsset[]>();

    if (error) {
      console.error("Failed to update asset:", error);
      return;
    }
    const updated = dbToHomeAsset(rows[0]);
    setAsset(updated);
    setEditModalOpen(false);

    // Auto-fetch product image if make + model provided and no image yet
    const makeChanged = data.make !== asset.make || data.model !== asset.model;
    if (data.make && data.model && (!updated.imageUrl || makeChanged)) {
      fetch("/api/search-product-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ make: data.make, model: data.model }),
      })
        .then((res) => res.json())
        .then((result) => {
          if (result.imageUrl) {
            supabase
              .from("home_assets")
              .update({ image_url: result.imageUrl })
              .eq("id", asset.id)
              .then(() => {
                setAsset((prev) => prev ? { ...prev, imageUrl: result.imageUrl } : prev);
              });
          }
        })
        .catch(() => {});
    }
  }

  async function handleImageSave() {
    if (!asset || !imageInput.trim()) return;
    const url = imageInput.trim();
    const { error } = await supabase
      .from("home_assets")
      .update({ image_url: url })
      .eq("id", asset.id);

    if (!error) {
      setAsset((prev) => prev ? { ...prev, imageUrl: url } : prev);
    }
    setImagePromptOpen(false);
    setImageInput("");
  }

  async function handleDelete() {
    // Clean up document storage files (DB rows cascade-delete automatically)
    if (documents.length > 0) {
      const paths = documents.map((d) => d.storagePath);
      await supabase.storage.from("home-asset-documents").remove(paths);
    }

    const { error } = await supabase
      .from("home_assets")
      .delete()
      .eq("id", asset!.id);

    if (error) {
      console.error("Failed to delete asset:", error);
      return;
    }
    router.push("/home-assets");
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
        <p className="text-sm text-text-3">Loading asset...</p>
      </div>
    );
  }

  if (notFound || !asset) {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
        <Link
          href="/home-assets"
          className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms] mb-6"
        >
          <ChevronLeftIcon width={14} height={14} />
          Back to Home Assets
        </Link>
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 text-center">
          <p className="text-[15px] font-semibold text-text-primary mb-1">
            Asset not found
          </p>
          <p className="text-[14px] text-text-3">
            This asset may have been removed.
          </p>
        </div>
      </div>
    );
  }

  const warranty = warrantyPill(asset.warrantyExpiration);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
      {/* Back link */}
      <Link
        href="/home-assets"
        className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms] mb-6"
      >
        <ChevronLeftIcon width={14} height={14} />
        Back to Home Assets
      </Link>

      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold tracking-tight text-text-primary truncate">
              {asset.name}
            </h1>
            <span className="shrink-0 px-2.5 py-0.5 text-[11px] font-medium rounded-[var(--radius-full)] bg-accent-light text-accent">
              {asset.category}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* +Add Files dropdown */}
          <div className="relative" ref={addFilesMenuRef}>
            <button
              onClick={() => setAddFilesMenuOpen(!addFilesMenuOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms]"
            >
              <PlusIcon width={13} height={13} />
              Add Files
            </button>
            {addFilesMenuOpen && (
              <div className="absolute top-full right-0 mt-1.5 bg-surface rounded-[var(--radius-sm)] border border-border shadow-[var(--shadow-hover)] py-1 min-w-[170px] z-20">
                {DOCUMENT_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      documentsRef.current?.triggerUpload(type);
                      setAddFilesMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-[14px] text-text-2 hover:bg-border hover:text-text-primary transition-colors duration-[120ms]"
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          >
            <PencilIcon width={13} height={13} />
            Edit
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          >
            <TrashIcon width={13} height={13} />
            Delete
          </button>
        </div>
      </header>

      {/* Details card */}
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-6 mb-5">
        <div className="flex gap-6">
          {/* Product image — left side */}
          <div className="shrink-0 self-start">
            {asset.imageUrl ? (
              <div className="relative group rounded-[var(--radius-md)] border border-border-strong bg-white p-3 shadow-[0_4px_12px_0px_rgba(0,0,0,0.1)]">
                <img
                  src={asset.imageUrl}
                  alt={`${asset.make} ${asset.model}`}
                  className="h-[195px] w-[195px] object-contain"
                  onError={() => {
                    // Clear broken image URL so placeholder shows
                    setAsset((prev) => prev ? { ...prev, imageUrl: "" } : prev);
                    supabase.from("home_assets").update({ image_url: "" }).eq("id", asset.id).then(() => {});
                  }}
                />
                <button
                  type="button"
                  onClick={() => { setImageInput(asset.imageUrl); setImagePromptOpen(true); }}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-[var(--radius-md)] opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms] cursor-pointer"
                >
                  <CameraIcon width={22} height={22} className="text-white" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setImagePromptOpen(true)}
                className="h-[195px] w-[195px] rounded-[var(--radius-md)] bg-bg border-2 border-dashed border-border-strong flex flex-col items-center justify-center gap-2 text-text-4 hover:border-accent hover:text-accent transition-all duration-[120ms] cursor-pointer"
              >
                <CameraIcon width={28} height={28} />
                <span className="text-[12px] font-medium">Add Image</span>
              </button>
            )}

            {/* Image URL prompt */}
            {imagePromptOpen && (
              <div className="mt-3 flex flex-col gap-2 w-[195px]">
                <input
                  type="url"
                  autoFocus
                  value={imageInput}
                  onChange={(e) => setImageInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleImageSave(); if (e.key === "Escape") { setImagePromptOpen(false); setImageInput(""); } }}
                  placeholder="Paste image URL..."
                  className="px-2.5 py-[6px] text-[12px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleImageSave}
                    disabled={!imageInput.trim()}
                    className="flex-1 px-2 py-[5px] rounded-[var(--radius-sm)] bg-accent text-white text-[11px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-40"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImagePromptOpen(false); setImageInput(""); }}
                    className="flex-1 px-2 py-[5px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-3 text-[11px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Details — right side */}
          <div className="flex-1 min-w-0">
            {/* Row 1: Make & Model */}
            <div className="flex gap-5 pb-4 border-b border-dotted border-border-strong">
              <div className="flex-1">
                <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                  Make
                </span>
                <span className="text-[14px] text-text-primary">
                  {asset.make || "\u2014"}
                </span>
              </div>
              <div className="flex-1">
                <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                  Model
                </span>
                <span className="text-[14px] text-text-primary">
                  {asset.model || "\u2014"}
                </span>
              </div>
            </div>

            {/* Row 2: Serial Number & Location */}
            <div className="flex gap-5 py-4 border-b border-dotted border-border-strong">
              <div className="flex-1">
                <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                  Serial Number
                </span>
                <span className="text-[14px] text-text-primary font-mono">
                  {asset.serialNumber || "\u2014"}
                </span>
              </div>
              <div className="flex-1">
                <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                  Location
                </span>
                <span className="text-[14px] text-text-primary">
                  {asset.location || "\u2014"}
                </span>
              </div>
            </div>

            {/* Row 3: Purchase Date & Warranty */}
            <div className={`flex gap-5 pt-4${asset.productUrl ? " pb-4 border-b border-dotted border-border-strong" : ""}`}>
              <div className="flex-1">
                <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                  Purchase / Install Date
                </span>
                <span className="text-[14px] text-text-primary">
                  {asset.purchaseDate ? formatDate(asset.purchaseDate) : "\u2014"}
                </span>
              </div>
              <div className="flex-1">
                <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                  Warranty Expiration
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] text-text-primary">
                    {asset.warrantyExpiration ? formatDate(asset.warrantyExpiration) : "\u2014"}
                  </span>
                  {warranty && (
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-[var(--radius-full)] ${warranty.color}`}>
                      {warranty.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Row 4: Product Link (if set) */}
            {asset.productUrl && (
              <div className="pt-4">
                <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                  Product Link
                </span>
                <a
                  href={affiliateUrl(asset.productUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] text-accent hover:underline"
                >
                  View Product
                </a>
              </div>
            )}
          </div>{/* end flex-1 details */}
        </div>{/* end flex row */}
      </div>

      {/* Important Docs */}
      <HomeAssetDocuments
        ref={documentsRef}
        assetId={asset.id}
        documents={documents}
        onDocumentsChange={setDocuments}
      />

      {/* Linked Inventory Items */}
      {linkedInventory.length > 0 && (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden mb-5">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-[#e8f4f8]">
            <PackageIcon width={14} height={14} className="text-teal" />
            <span className="text-[14px] font-semibold text-text-primary">
              Tracked Inventory
            </span>
          </div>
          <ul role="list">
            {linkedInventory.map((inv) => (
              <li key={inv.id} className="border-b border-border last:border-b-0">
                <Link
                  href={`/inventory/${inv.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-hover transition-[background] duration-[120ms]"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[14px] font-semibold text-text-primary truncate block">
                      {inv.name}
                    </span>
                    {inv.description && (
                      <p className="text-[12px] text-text-3 truncate">
                        {inv.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-[var(--radius-full)] bg-accent-light text-accent">
                    {frequencyLabel(inv.frequencyMonths)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {asset.notes && (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-6 mb-5">
          <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-2">
            Notes
          </span>
          <p className="text-[14px] text-text-primary leading-relaxed whitespace-pre-wrap">
            {asset.notes}
          </p>
        </div>
      )}

      {/* Related Projects */}
      {projects.length > 0 && (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-border bg-bg/50">
            <span className="text-[14px] font-semibold text-text-primary">
              {asset.name} Projects
            </span>
          </div>
          <ul role="list">
            {projects.map((p) => {
              const statusBadge: Record<ProjectStatus, string> = {
                "In Progress": "bg-accent-light text-accent",
                Completed: "bg-green-light text-green",
              };
              return (
                <li key={p.id} className="border-b border-border last:border-b-0">
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-hover transition-[background] duration-[120ms]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[14px] font-semibold text-text-primary truncate">
                          {p.name}
                        </span>
                        <span className={`shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-[var(--radius-full)] ${statusBadge[p.status]}`}>
                          {p.status}
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-[12px] text-text-3 truncate">
                          {p.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[12px] text-text-3">
                      {formatDate(p.createdAt.split("T")[0])}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="mt-4 flex items-center gap-3 bg-surface rounded-[var(--radius-lg)] border border-red/20 shadow-[var(--shadow-card)] px-5 py-3">
          <span className="text-[14px] text-text-3 flex-1">
            Are you sure you want to delete this asset? This cannot be undone.
          </span>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] bg-red text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms]"
          >
            Yes, Delete
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Edit modal */}
      {editModalOpen && (
        <AddHomeAssetModal
          asset={asset}
          onSave={handleEdit}
          onClose={() => setEditModalOpen(false)}
        />
      )}
    </div>
  );
}
