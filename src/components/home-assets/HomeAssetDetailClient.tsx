"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type HomeAsset } from "@/lib/home-assets-data";
import { supabase, type DbHomeAsset } from "@/lib/supabase";
import { dbToHomeAsset, homeAssetToDb } from "@/lib/mappers";
import {
  ChevronLeftIcon,
  PencilIcon,
  TrashIcon,
  HomeIcon,
} from "@/components/icons";
import AddHomeAssetModal from "./AddHomeAssetModal";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function warrantyInfo(dateStr: string | null): { label: string; color: string } {
  if (!dateStr) return { label: "—", color: "text-text-3" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr + "T00:00:00");
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `Expired (${formatDate(dateStr)})`, color: "text-red" };
  if (diffDays <= 90) return { label: `${formatDate(dateStr)} (${diffDays} days left)`, color: "text-accent" };
  return { label: `${formatDate(dateStr)}`, color: "text-green" };
}

export default function HomeAssetDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [asset, setAsset] = useState<HomeAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    async function fetchAsset() {
      const { data, error } = await supabase
        .from("home_assets")
        .select("*")
        .eq("id", id)
        .returns<DbHomeAsset[]>()
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setAsset(dbToHomeAsset(data));
      }
      setLoading(false);
    }
    fetchAsset();
  }, [id]);

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
    setAsset(dbToHomeAsset(rows[0]));
    setEditModalOpen(false);
  }

  async function handleDelete() {
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
          className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[13px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms] mb-6"
        >
          <ChevronLeftIcon width={14} height={14} />
          Back to Home Assets
        </Link>
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 text-center">
          <p className="text-sm font-semibold text-text-primary mb-1">
            Asset not found
          </p>
          <p className="text-[13px] text-text-3">
            This asset may have been removed.
          </p>
        </div>
      </div>
    );
  }

  const warranty = warrantyInfo(asset.warrantyExpiration);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
      {/* Back link */}
      <Link
        href="/home-assets"
        className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[13px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms] mb-6"
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

      {/* Image + Details */}
      <div className="flex gap-5 mb-5">
        {/* Image */}
        <div className="shrink-0">
          {asset.imageUrl ? (
            <img
              src={asset.imageUrl}
              alt={asset.name}
              className="w-28 h-28 rounded-full object-cover bg-border"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-accent flex items-center justify-center">
              <HomeIcon width={48} height={48} className="text-white" />
            </div>
          )}
        </div>

        {/* Details card */}
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-6 flex-1">
          <div className="grid grid-cols-2 gap-5">
            {/* Make */}
            <div>
              <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                Make
              </span>
              <span className="text-[14px] text-text-primary">
                {asset.make || "—"}
              </span>
            </div>

            {/* Model */}
            <div>
              <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                Model
              </span>
              <span className="text-[14px] text-text-primary">
                {asset.model || "—"}
              </span>
            </div>

            {/* Serial Number */}
            <div>
              <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                Serial Number
              </span>
              <span className="text-[14px] text-text-primary font-mono">
                {asset.serialNumber || "—"}
              </span>
            </div>

            {/* Location */}
            <div>
              <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                Location
              </span>
              <span className="text-[14px] text-text-primary">
                {asset.location || "—"}
              </span>
            </div>

            {/* Purchase Date */}
            <div>
              <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                Purchase / Install Date
              </span>
              <span className="text-[14px] text-text-primary">
                {asset.purchaseDate ? formatDate(asset.purchaseDate) : "—"}
              </span>
            </div>

            {/* Warranty */}
            <div>
              <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                Warranty Expiration
              </span>
              <span className={`text-[14px] font-semibold ${warranty.color}`}>
                {warranty.label}
              </span>
            </div>
          </div>
        </div>
      </div>

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

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="mt-4 flex items-center gap-3 bg-surface rounded-[var(--radius-lg)] border border-red/20 shadow-[var(--shadow-card)] px-5 py-3">
          <span className="text-[13px] text-text-3 flex-1">
            Are you sure you want to delete this asset? This cannot be undone.
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
        <AddHomeAssetModal
          asset={asset}
          onSave={handleEdit}
          onClose={() => setEditModalOpen(false)}
        />
      )}
    </div>
  );
}
