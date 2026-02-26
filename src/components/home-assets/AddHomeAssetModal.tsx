"use client";

import { useState, useEffect, useRef } from "react";
import { CATEGORY_OPTIONS, type HomeAsset, type AssetCategory } from "@/lib/home-assets-data";
import { XIcon } from "@/components/icons";
import DatePicker from "@/components/ui/DatePicker";

interface AddHomeAssetModalProps {
  asset?: HomeAsset;
  prefill?: { name: string; category: AssetCategory };
  onSave: (data: Omit<HomeAsset, "id" | "createdAt">) => void;
  onClose: () => void;
}

export default function AddHomeAssetModal({
  asset,
  prefill,
  onSave,
  onClose,
}: AddHomeAssetModalProps) {
  const isEditing = !!asset;
  const [name, setName] = useState(asset?.name ?? prefill?.name ?? "");
  const [category, setCategory] = useState<AssetCategory>(asset?.category ?? prefill?.category ?? "Kitchen");
  const [make, setMake] = useState(asset?.make ?? "");
  const [model, setModel] = useState(asset?.model ?? "");
  const [serialNumber, setSerialNumber] = useState(asset?.serialNumber ?? "");
  const [purchaseDate, setPurchaseDate] = useState(asset?.purchaseDate ?? "");
  const [warrantyExpiration, setWarrantyExpiration] = useState(asset?.warrantyExpiration ?? "");
  const [location, setLocation] = useState(asset?.location ?? "");
  const [productUrl, setProductUrl] = useState(asset?.productUrl ?? "");
  const [notes, setNotes] = useState(asset?.notes ?? "");
  const nameRef = useRef<HTMLInputElement>(null);
  const isValid = name.trim() !== "";

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    onSave({
      name: name.trim(),
      category,
      make: make.trim(),
      model: model.trim(),
      serialNumber: serialNumber.trim(),
      purchaseDate: purchaseDate || null,
      warrantyExpiration: warrantyExpiration || null,
      location: location.trim(),
      productUrl: productUrl.trim(),
      imageUrl: asset?.imageUrl ?? "",
      notes: notes.trim(),
    });
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
          <h2 className="text-[15px] font-semibold text-text-primary">
            {isEditing ? "Edit Asset" : "Add Home Asset"}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-[var(--radius-sm)] p-1.5 text-text-3 hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
            aria-label="Close modal"
          >
            <XIcon width={16} height={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Name */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium text-text-primary">
              Asset Name <span className="text-red">*</span>
            </span>
            <input
              ref={nameRef}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              placeholder="e.g. Refrigerator, Water Heater"
            />
          </label>

          {/* Category */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium text-text-primary">
              Category <span className="text-red">*</span>
            </span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AssetCategory)}
              className="px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          {/* Make & Model */}
          <div className="flex gap-3">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-[14px] font-medium text-text-primary">
                Make
              </span>
              <input
                type="text"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                placeholder="e.g. Samsung, Rheem"
              />
            </label>
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-[14px] font-medium text-text-primary">
                Model
              </span>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                placeholder="e.g. RF28R7351SR"
              />
            </label>
          </div>

          {/* Serial Number */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium text-text-primary">
              Serial Number
            </span>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              placeholder="Found on the appliance label"
            />
          </label>

          {/* Purchase Date & Warranty */}
          <div className="flex gap-3">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-[14px] font-medium text-text-primary">
                Purchase / Install Date
              </span>
              <DatePicker
                value={purchaseDate}
                onChange={setPurchaseDate}
              />
            </label>
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-[14px] font-medium text-text-primary">
                Warranty Expiration
              </span>
              <DatePicker
                value={warrantyExpiration}
                onChange={setWarrantyExpiration}
              />
            </label>
          </div>

          {/* Location */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium text-text-primary">
              Location
            </span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              placeholder="e.g. Kitchen, Garage, Basement"
            />
          </label>

          {/* Product URL */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium text-text-primary">
              Product URL
            </span>
            <input
              type="url"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              className="px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              placeholder="https://www.amazon.com/..."
            />
          </label>

          {/* Notes */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium text-text-primary">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
              placeholder="Filter sizes, special instructions, maintenance tips..."
            />
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isEditing ? "Save Changes" : "Add Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
