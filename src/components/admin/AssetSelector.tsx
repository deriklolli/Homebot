"use client";

import { useState } from "react";
import { DEFAULT_ASSETS, CATEGORY_OPTIONS } from "@/lib/home-assets-data";
import type { AssetCategory } from "@/lib/home-assets-data";

export interface SelectedAsset {
  name: string;
  category: AssetCategory;
  make: string;
  model: string;
}

interface AssetSelectorProps {
  selected: SelectedAsset[];
  onChange: (assets: SelectedAsset[]) => void;
}

export default function AssetSelector({ selected, onChange }: AssetSelectorProps) {
  const [expandedCategory, setExpandedCategory] = useState<AssetCategory | null>(null);

  const isSelected = (category: AssetCategory, name: string) =>
    selected.some((a) => a.category === category && a.name === name);

  function toggleAsset(category: AssetCategory, name: string) {
    if (isSelected(category, name)) {
      onChange(selected.filter((a) => !(a.category === category && a.name === name)));
    } else {
      onChange([...selected, { name, category, make: "", model: "" }]);
    }
  }

  function toggleCategory(category: AssetCategory) {
    const assets = DEFAULT_ASSETS[category];
    const allSelected = assets.every((name) => isSelected(category, name));

    if (allSelected) {
      onChange(selected.filter((a) => a.category !== category));
    } else {
      const newAssets = assets
        .filter((name) => !isSelected(category, name))
        .map((name) => ({ name, category, make: "", model: "" }));
      onChange([...selected, ...newAssets]);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
        Pre-load Home Assets
      </p>
      <p className="text-[12px] text-text-3 mb-2">
        Select common home assets for this client. They can add details (make, model, etc.) after activation.
      </p>

      <div className="flex flex-col gap-1">
        {CATEGORY_OPTIONS.map((category) => {
          const assets = DEFAULT_ASSETS[category];
          const selectedCount = assets.filter((name) => isSelected(category, name)).length;
          const isExpanded = expandedCategory === category;

          return (
            <div
              key={category}
              className="rounded-[var(--radius-md)] border border-border overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-border/30 transition-colors text-left"
              >
                <span className="text-[13px] font-medium text-text-primary">
                  {category}
                </span>
                <span className="text-[12px] text-text-3">
                  {selectedCount > 0 && (
                    <span className="text-accent font-medium mr-2">
                      {selectedCount} selected
                    </span>
                  )}
                  {isExpanded ? "−" : "+"}
                </span>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-border pt-2 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="text-[12px] text-accent font-medium hover:underline self-start mb-1"
                  >
                    {assets.every((name) => isSelected(category, name))
                      ? "Deselect all"
                      : "Select all"}
                  </button>

                  {assets.map((name) => (
                    <label
                      key={name}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected(category, name)}
                        onChange={() => toggleAsset(category, name)}
                        className="rounded border-border text-accent focus:ring-accent/30"
                      />
                      <span className="text-[13px] text-text-primary">{name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected.length > 0 && (
        <p className="text-[12px] text-text-3 mt-1">
          {selected.length} asset{selected.length !== 1 ? "s" : ""} will be pre-loaded
        </p>
      )}
    </div>
  );
}
