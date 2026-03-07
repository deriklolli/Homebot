"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CATEGORY_OPTIONS, DEFAULT_ROOMS, isValidCategory, type HomeAsset, type AssetCategory } from "@/lib/home-assets-data";
import { supabase, type DbRoom } from "@/lib/supabase";
import { type SkulyticsBrand, type SkulyticsProductSummary, type SkulyticsProductDetail } from "@/lib/skulytics";
import { XIcon, ChevronDownIcon, CameraIcon } from "@/components/icons";
import LabelScannerModal, { type ScanResult } from "./LabelScannerModal";
import DatePicker from "@/components/ui/DatePicker";
import ComboboxInput, { type ComboboxOption } from "@/components/ui/ComboboxInput";

interface AddHomeAssetModalProps {
  asset?: HomeAsset;
  prefill?: { name: string; category: AssetCategory };
  scanResult?: ScanResult;
  onSave: (data: Omit<HomeAsset, "id" | "createdAt">) => void;
  onClose: () => void;
}

export default function AddHomeAssetModal({
  asset,
  prefill,
  scanResult,
  onSave,
  onClose,
}: AddHomeAssetModalProps) {
  const isEditing = !!asset;
  const [name, setName] = useState(asset?.name ?? scanResult?.name ?? prefill?.name ?? "");
  const [category, setCategory] = useState<AssetCategory>(
    asset?.category
    ?? (scanResult?.category && isValidCategory(scanResult.category) ? scanResult.category : undefined)
    ?? prefill?.category
    ?? "Kitchen"
  );
  const [make, setMake] = useState(asset?.make ?? scanResult?.brand ?? "");
  const [model, setModel] = useState(asset?.model ?? scanResult?.model ?? "");
  const [serialNumber, setSerialNumber] = useState(asset?.serialNumber ?? scanResult?.serialNumber ?? "");
  const [purchaseDate, setPurchaseDate] = useState(asset?.purchaseDate ?? "");
  const [warrantyExpiration, setWarrantyExpiration] = useState(asset?.warrantyExpiration ?? "");
  const [location, setLocation] = useState(asset?.location ?? "");
  const [productUrl, setProductUrl] = useState(asset?.productUrl ?? "");
  const [imageUrl, setImageUrl] = useState(asset?.imageUrl ?? "");
  const [notes, setNotes] = useState(asset?.notes ?? "");
  const nameRef = useRef<HTMLInputElement>(null);
  const isValid = name.trim() !== "" && location.trim() !== "";

  // Rooms state
  const [rooms, setRooms] = useState<string[]>([]);
  const [addingRoom, setAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  useEffect(() => {
    async function fetchRooms() {
      const { data } = await supabase
        .from("rooms")
        .select("name")
        .order("name", { ascending: true })
        .returns<Pick<DbRoom, "name">[]>();
      if (data && data.length > 0) {
        setRooms(data.map((r) => r.name));
      } else {
        // Seed defaults for this user
        const toInsert = DEFAULT_ROOMS.map((name) => ({ name }));
        await supabase.from("rooms").insert(toInsert as Record<string, unknown>[]);
        setRooms([...DEFAULT_ROOMS]);
      }
    }
    fetchRooms();
  }, []);

  async function handleAddRoom() {
    const trimmed = newRoomName.trim();
    if (!trimmed || rooms.includes(trimmed)) return;
    await supabase.from("rooms").insert({ name: trimmed } as Record<string, unknown>);
    setRooms((prev) => [...prev, trimmed].sort((a, b) => a.localeCompare(b)));
    setLocation(trimmed);
    setNewRoomName("");
    setAddingRoom(false);
  }

  // Label scanner state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanError, setScanError] = useState("");

  // Product lookup state
  const [lookupEnabled, setLookupEnabled] = useState(false);
  const [brands, setBrands] = useState<SkulyticsBrand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [products, setProducts] = useState<SkulyticsProductSummary[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(asset?.make ?? scanResult?.brand ?? null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Auto-enrich from Skulytics when opened via external scan (scanResult prop)
  useEffect(() => {
    if (!scanResult?.model) return;
    const sku = scanResult.model;
    const brand = scanResult.brand;
    if (!sku || !brand) return;

    let cancelled = false;

    async function enrichFromScan() {
      try {
        const res = await fetch(
          `/api/skulytics/product-detail?sku=${encodeURIComponent(sku)}&brand=${encodeURIComponent(brand)}`
        );
        const data = await res.json();
        const product: SkulyticsProductDetail | null = data.product;

        if (cancelled) return;

        if (product) {
          if (product.name && !scanResult!.name) {
            setName(product.name);
          }
          if (product.image) {
            setImageUrl(product.image);
          }
          if (product.productUrl) {
            setProductUrl(product.productUrl);
          }
          return; // Skulytics had it — done
        }

        // Skulytics didn't have this product — try Google fallback
        const fallbackRes = await fetch("/api/enrich-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ make: brand, model: sku }),
        });
        const fallback = await fallbackRes.json();

        if (cancelled) return;

        if (fallback.name && !scanResult!.name) {
          setName(fallback.name);
        }
        if (fallback.imageUrl) {
          setImageUrl(fallback.imageUrl);
        }
        if (fallback.productUrl) {
          setProductUrl(fallback.productUrl);
        }
        if (fallback.warrantyYears && purchaseDate) {
          const date = new Date(purchaseDate);
          date.setFullYear(date.getFullYear() + fallback.warrantyYears);
          setWarrantyExpiration(date.toISOString().slice(0, 10));
        }
      } catch {
        // Best-effort
      }
    }

    enrichFromScan();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Fetch brands from all supported categories on mount
  useEffect(() => {
    setLookupEnabled(true);

    let cancelled = false;
    setBrandsLoading(true);

    fetch("/api/skulytics/brands?category=all")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setBrands(data.brands ?? []);
          // If editing and make matches a brand, load products
          if (isEditing && asset?.make) {
            const matchesBrand = (data.brands ?? []).some(
              (b: SkulyticsBrand) => b.name.toLowerCase() === asset.make.toLowerCase()
            );
            if (matchesBrand) {
              setSelectedBrand(asset.make);
            }
          }
          // If opened via scan, auto-select scanned brand
          if (scanResult?.brand) {
            const matchesBrand = (data.brands ?? []).some(
              (b: SkulyticsBrand) => b.name.toLowerCase() === scanResult.brand.toLowerCase()
            );
            if (matchesBrand) {
              setSelectedBrand(scanResult.brand);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch ALL products when a brand is selected (full pagination, all categories)
  useEffect(() => {
    if (!lookupEnabled || !selectedBrand) {
      setProducts([]);
      return;
    }

    let cancelled = false;
    setProductsLoading(true);

    fetch(
      `/api/skulytics/products?brand=${encodeURIComponent(selectedBrand)}&category=all`
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
  }, [lookupEnabled, selectedBrand]);

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
          `/api/skulytics/product-detail?sku=${encodeURIComponent(option.value)}&brand=${encodeURIComponent(make)}`
        );
        const data = await res.json();
        const product: SkulyticsProductDetail | null = data.product;

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

  // Handle scan result — auto-fill empty fields + fetch product details from Skulytics
  const handleScanResult = useCallback(
    async (result: { brand: string; model: string; serialNumber: string; name: string }) => {
      setScanError("");
      const useBrand = result.brand && !make.trim() ? result.brand : make;
      const useModel = result.model && !model.trim() ? result.model : model;

      if (result.brand && !make.trim()) setMake(result.brand);
      if (result.model && !model.trim()) setModel(result.model);
      if (result.serialNumber && !serialNumber.trim()) setSerialNumber(result.serialNumber);
      if (result.name && !name.trim()) setName(result.name);

      // Match scanned brand to a Skulytics brand to populate products dropdown
      if (useBrand && lookupEnabled) {
        const matchedBrand = brands.find(
          (b) => b.name.toLowerCase() === useBrand.toLowerCase()
        );
        if (matchedBrand) {
          setSelectedBrand(matchedBrand.name);
        }
      }

      // Fetch product details directly using the scanned model number
      if (useModel && useBrand) {
        try {
          const res = await fetch(
            `/api/skulytics/product-detail?sku=${encodeURIComponent(useModel)}&brand=${encodeURIComponent(useBrand)}`
          );
          const data = await res.json();
          const product: SkulyticsProductDetail | null = data.product;

          if (product) {
            if (product.name && !name.trim() && !result.name) {
              setName(product.name);
            }
            if (product.image) {
              setImageUrl(product.image);
            }
            if (product.productUrl) {
              setProductUrl(product.productUrl);
            }
            if (product.warrantyMonths && purchaseDate) {
              const date = new Date(purchaseDate);
              date.setMonth(date.getMonth() + product.warrantyMonths);
              setWarrantyExpiration(date.toISOString().slice(0, 10));
            }
          } else {
            // Skulytics didn't have this product — try Google fallback
            const fallbackRes = await fetch("/api/enrich-product", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ make: useBrand, model: useModel }),
            });
            const fallback = await fallbackRes.json();

            if (fallback.name && !name.trim() && !result.name) {
              setName(fallback.name);
            }
            if (fallback.imageUrl) {
              setImageUrl(fallback.imageUrl);
            }
            if (fallback.productUrl) {
              setProductUrl(fallback.productUrl);
            }
            if (fallback.warrantyYears && purchaseDate) {
              const date = new Date(purchaseDate);
              date.setFullYear(date.getFullYear() + fallback.warrantyYears);
              setWarrantyExpiration(date.toISOString().slice(0, 10));
            }
          }
        } catch {
          // Best-effort — scan already filled the basic fields
        }
      }
    },
    [make, model, serialNumber, name, brands, lookupEnabled, purchaseDate]
  );

  // Brand combobox options
  const brandOptions: ComboboxOption[] = brands.map((b) => ({
    label: b.name,
    value: b.name,
    icon: b.image,
  }));

  // Product combobox options — SKU as label (goes into Model field), name as subtitle
  const productOptions: ComboboxOption[] = products.map((p) => ({
    label: p.sku,
    value: p.sku,
    subtitle: p.name,
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


          {/* Make & Model */}
          <div className="flex flex-col md:flex-row gap-3">
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
              {lookupEnabled && selectedBrand ? (
                <ComboboxInput
                  value={model}
                  onChange={(val) => setModel(val)}
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
          <label className={`${scanResult?.serialNumber ? 'flex' : 'hidden md:flex'} flex-col gap-1.5`}>
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
          <div className="hidden md:flex gap-3">
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
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] font-medium text-text-primary">
              Location <span className="text-red">*</span>
            </span>
            {addingRoom ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddRoom(); } }}
                  className={`${inputClassName} flex-1`}
                  placeholder="Room name"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddRoom}
                  disabled={!newRoomName.trim()}
                  className="px-3 py-[7px] text-[13px] font-medium bg-accent text-white rounded-[var(--radius-sm)] hover:brightness-110 disabled:opacity-40 transition-all duration-[120ms]"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingRoom(false); setNewRoomName(""); }}
                  className="px-3 py-[7px] text-[13px] font-medium text-text-3 hover:text-text-primary transition-all duration-[120ms]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className={`${inputClassName} w-full appearance-none pr-8`}
                  >
                    <option value="">Select a room</option>
                    {rooms.map((room) => (
                      <option key={room} value={room}>{room}</option>
                    ))}
                  </select>
                  <ChevronDownIcon
                    width={14}
                    height={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setAddingRoom(true)}
                  className="shrink-0 px-2.5 py-[7px] text-[13px] font-medium text-accent hover:bg-accent-light rounded-[var(--radius-sm)] transition-all duration-[120ms]"
                >
                  + Add Room
                </button>
              </div>
            )}
          </div>

          {/* Product URL */}
          <label className="hidden md:flex flex-col gap-1.5">
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
          <label className="hidden md:flex flex-col gap-1.5">
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
          <div className="flex flex-col md:flex-row md:justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="inline-flex items-center justify-center gap-1.5 w-full md:w-auto px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isEditing ? "Save Changes" : "Add Asset"}
            </button>
          </div>
        </form>
      </div>
      {/* Label Scanner */}
      {scannerOpen && (
        <LabelScannerModal
          onScan={handleScanResult}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
}
