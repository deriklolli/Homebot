"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CATEGORY_OPTIONS, type HomeAsset, type AssetCategory } from "@/lib/home-assets-data";
import { isProductLookupSupported, type ProductBrand, type ProductSummary, type ProductDetail } from "@/lib/product-data";
import { XIcon, ChevronDownIcon } from "@/components/icons";
import DatePicker from "@/components/ui/DatePicker";
import ComboboxInput, { type ComboboxOption } from "@/components/ui/ComboboxInput";

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
  const [imageUrl, setImageUrl] = useState(asset?.imageUrl ?? "");
  const [notes, setNotes] = useState(asset?.notes ?? "");
  const nameRef = useRef<HTMLInputElement>(null);
  const isValid = name.trim() !== "";

  // Product lookup state
  const [lookupEnabled, setLookupEnabled] = useState(false);
  const [brands, setBrands] = useState<ProductBrand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(asset?.make ?? null);

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

  // Fetch brands when category changes
  useEffect(() => {
    const supported = isProductLookupSupported(category);
    setLookupEnabled(supported);

    if (!supported) {
      setBrands([]);
      setProducts([]);
      return;
    }

    let cancelled = false;
    setBrandsLoading(true);

    fetch(`/api/product-lookup/brands?category=${encodeURIComponent(category)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setBrands(data.brands ?? []);
          // If editing and make matches a brand, load products
          if (isEditing && asset?.make) {
            const matchesBrand = (data.brands ?? []).some(
              (b: ProductBrand) => b.name.toLowerCase() === asset.make.toLowerCase()
            );
            if (matchesBrand) {
              setSelectedBrand(asset.make);
            }
          }
        }
      })
      .catch(() => {
        if (!cancelled) setBrands([]);
      })
      .finally(() => {
        if (!cancelled) setBrandsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Only re-fetch when category changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Fetch products when a brand is selected
  useEffect(() => {
    if (!lookupEnabled || !selectedBrand) {
      setProducts([]);
      return;
    }

    let cancelled = false;
    setProductsLoading(true);

    fetch(
      `/api/product-lookup/products?brand=${encodeURIComponent(selectedBrand)}&category=${encodeURIComponent(category)}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setProducts(data.products ?? []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lookupEnabled, selectedBrand, category]);

  // Handle brand selection from dropdown
  const handleBrandSelect = useCallback(
    (option: ComboboxOption) => {
      setMake(option.label);
      setSelectedBrand(option.label);
      setModel("");
    },
    []
  );

  // Handle model selection — fetch full details and auto-fill
  const handleModelSelect = useCallback(
    async (option: ComboboxOption) => {
      // option.label is the model number; option.value is the SKU (datasetId::model)
      setModel(option.label);

      try {
        const res = await fetch(
          `/api/product-lookup/product-detail?sku=${encodeURIComponent(option.value)}&brand=${encodeURIComponent(make)}`
        );
        const data = await res.json();
        const product: ProductDetail | null = data.product;

        if (product) {
          // Auto-fill name if empty or still the prefill value
          if (!name.trim() || name === prefill?.name) {
            setName(product.name);
          }
          if (product.image) {
            setImageUrl(product.image);
          }
          if (product.productUrl) {
            setProductUrl(product.productUrl);
          }
          // Compute warranty expiration from warrantyMonths + purchaseDate
          if (product.warrantyMonths && purchaseDate) {
            const date = new Date(purchaseDate);
            date.setMonth(date.getMonth() + product.warrantyMonths);
            setWarrantyExpiration(date.toISOString().slice(0, 10));
          }
        }
      } catch {
        // Silently fail — auto-fill is best-effort
      }
    },
    [name, prefill?.name, purchaseDate, make]
  );

  // Brand combobox options
  const brandOptions: ComboboxOption[] = brands.map((b) => ({
    label: b.name,
    value: b.name,
    icon: b.image,
  }));

  // Product combobox options
  const productOptions: ComboboxOption[] = products.map((p) => ({
    label: p.name,
    value: p.sku,
  }));

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
      imageUrl,
      notes: notes.trim(),
    });
  }

  const inputClassName =
    "px-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
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
              className={inputClassName}
              placeholder="e.g. Refrigerator, Water Heater"
            />
          </label>

          {/* Category */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium text-text-primary">
              Category <span className="text-red">*</span>
            </span>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => {
                  const newCat = e.target.value as AssetCategory;
                  setCategory(newCat);
                  // Clear make/model when category changes (unless editing)
                  if (!isEditing) {
                    setMake("");
                    setModel("");
                    setSelectedBrand(null);
                    setProducts([]);
                  }
                }}
                className={`${inputClassName} w-full appearance-none pr-8 cursor-pointer`}
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-3" />
            </div>
          </label>

          {/* Make & Model */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <span className="text-[14px] font-medium text-text-primary">
                Make
              </span>
              {lookupEnabled && brandOptions.length > 0 ? (
                <ComboboxInput
                  value={make}
                  onChange={(val) => {
                    setMake(val);
                    // If typed value no longer matches a brand, clear products
                    const matchesBrand = brands.some(
                      (b) => b.name.toLowerCase() === val.toLowerCase()
                    );
                    if (!matchesBrand) {
                      setSelectedBrand(null);
                      setProducts([]);
                    }
                  }}
                  options={brandOptions}
                  loading={brandsLoading}
                  placeholder="Search or type a brand..."
                  onSelect={handleBrandSelect}
                  emptyMessage="No brands found"
                />
              ) : (
                <input
                  type="text"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className={inputClassName}
                  placeholder="e.g. Samsung, Rheem"
                />
              )}
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <span className="text-[14px] font-medium text-text-primary">
                Model
              </span>
              {lookupEnabled && selectedBrand && productOptions.length > 0 ? (
                <ComboboxInput
                  value={model}
                  onChange={(val) => {
                    setModel(val);
                  }}
                  options={productOptions}
                  loading={productsLoading}
                  placeholder="Search or type a model..."
                  onSelect={handleModelSelect}
                  emptyMessage="No models found"
                />
              ) : (
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className={inputClassName}
                  placeholder="e.g. RF28R7351SR"
                />
              )}
            </div>
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
              className={inputClassName}
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
              className={inputClassName}
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
              className={inputClassName}
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
              className={`${inputClassName} resize-none`}
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
