"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DbHomeSnapshot } from "@/lib/supabase";
import { dbToHomeSnapshot, type HomeSnapshot as HomeSnapshotType } from "@/lib/mappers";
import {
  HomeIcon,
  TrendUpIcon,
  TrendDownIcon,
  SearchIcon,
  PencilIcon,
} from "./icons";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAddress(address: string): { street: string; cityStateZip: string } | null {
  // Typical format: "123 Main St, City, ST 12345"
  const firstComma = address.indexOf(",");
  if (firstComma === -1) return null;
  const street = address.slice(0, firstComma).trim();
  const cityStateZip = address.slice(firstComma + 1).trim();
  if (!street || !cityStateZip) return null;
  return { street, cityStateZip };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function HomeSnapshot() {
  const [snapshot, setSnapshot] = useState<HomeSnapshotType | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState("");
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState("");
  const [editingHome, setEditingHome] = useState(false);

  // Load existing snapshot on mount
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: rows } = await supabase
        .from("home_snapshot")
        .select()
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .returns<DbHomeSnapshot[]>();

      if (rows && rows.length > 0) {
        setSnapshot(dbToHomeSnapshot(rows[0]));
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleConnect() {
    if (!urlInput.trim()) return;
    setError("");
    setScraping(true);

    try {
      // Scrape the Redfin page
      const res = await fetch("/api/scrape-home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to scrape page");
        setScraping(false);
        return;
      }

      // Save to Supabase
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        setScraping(false);
        return;
      }

      // Upsert: delete old snapshots for this user, insert new
      await supabase
        .from("home_snapshot")
        .delete()
        .eq("user_id", user.id);

      const { data: rows, error: dbError } = await supabase
        .from("home_snapshot")
        .insert({
          user_id: user.id,
          redfin_url: urlInput.trim(),
          address: data.address,
          photo_url: data.photoUrl,
          estimated_value: data.estimatedValue,
          value_trend: data.valueTrend,
          last_scraped_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .select()
        .returns<DbHomeSnapshot[]>();

      if (dbError) {
        setError("Failed to save data");
        setScraping(false);
        return;
      }

      if (rows && rows.length > 0) {
        setSnapshot(dbToHomeSnapshot(rows[0]));
      }
      setUrlInput("");
      setEditingHome(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setScraping(false);
    }
  }

  async function handleValueSave() {
    if (!snapshot) return;
    const num = parseInt(valueInput.replace(/[$,]/g, ""), 10);
    if (isNaN(num)) return;

    const supabase = createClient();
    const { data: rows } = await supabase
      .from("home_snapshot")
      .update({ estimated_value: num } as Record<string, unknown>)
      .eq("id", snapshot.id)
      .select()
      .returns<DbHomeSnapshot[]>();

    if (rows && rows.length > 0) {
      setSnapshot(dbToHomeSnapshot(rows[0]));
    }
    setEditingValue(false);
  }

  if (loading) {
    return (
      <div className="p-5">
        <div className="animate-pulse flex flex-col gap-3">
          <div className="h-4 bg-border rounded w-32" />
          <div className="h-16 bg-border rounded" />
        </div>
      </div>
    );
  }

  // Setup state
  if (!snapshot) {
    return (
      <div className="p-5">
        <header className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-[15px] font-semibold text-text-primary flex items-center gap-1.5">
            <HomeIcon width={16} height={16} className="text-accent" />
            Your Home's Estimated Value
          </h2>
        </header>
        <div className="flex flex-col items-center gap-4 py-4 px-4 text-center">
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-semibold text-text-primary">
              Connect your home
            </p>
            <p className="text-[14px] text-text-3 leading-normal">
              Paste your Redfin property URL to see your home&apos;s value and photo.
            </p>
          </div>
          <div className="flex w-full max-w-sm gap-2">
            <div className="relative flex-1">
              <SearchIcon
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-4"
                width={14}
                height={14}
              />
              <input
                type="url"
                placeholder="https://redfin.com/..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                className="w-full pl-8 pr-3 py-2 text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                aria-label="Redfin property URL"
              />
            </div>
            <button
              onClick={handleConnect}
              disabled={scraping || !urlInput.trim()}
              className="px-4 py-2 rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {scraping ? "Connecting..." : "Connect"}
            </button>
          </div>
          {error && (
            <p className="text-[12px] text-red">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // Data state
  return (
    <div className="p-5">
      <header className="flex items-start justify-between gap-4 mb-4">
        <h2 className="text-[15px] font-semibold text-text-primary flex items-center gap-1.5">
          <HomeIcon width={16} height={16} className="text-accent" />
          Your Home's Estimated Value
        </h2>
        <button
          onClick={() => {
            setEditingHome(true);
            setUrlInput(snapshot.redfinUrl || "");
          }}
          className="p-1 rounded-[var(--radius-sm)] text-text-3 hover:text-accent hover:bg-accent/10 transition-all duration-[120ms]"
          aria-label="Edit home"
        >
          <PencilIcon width={14} height={14} />
        </button>
      </header>

      {editingHome ? (
        <div className="flex flex-col gap-3">
          <div className="flex w-full gap-2">
            <div className="relative flex-1">
              <SearchIcon
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-4"
                width={14}
                height={14}
              />
              <input
                type="url"
                placeholder="https://redfin.com/..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                className="w-full pl-8 pr-3 py-2 text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-[120ms]"
                aria-label="Redfin property URL"
                autoFocus
              />
            </div>
            <button
              onClick={handleConnect}
              disabled={scraping || !urlInput.trim()}
              className="px-4 py-2 rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {scraping ? "Updating..." : "Update"}
            </button>
          </div>
          <button
            onClick={() => setEditingHome(false)}
            className="text-[11px] font-medium text-text-3 hover:underline self-start"
          >
            Cancel
          </button>
          {error && (
            <p className="text-[12px] text-red">{error}</p>
          )}
        </div>
      ) : (
      <div className="flex gap-4">
        {/* Property photo */}
        {snapshot.photoUrl ? (
          <a
            href={snapshot.redfinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <img
              src={snapshot.photoUrl}
              alt={snapshot.address || "Property photo"}
              className="w-20 h-20 rounded-full object-cover border border-border hover:border-accent transition-colors duration-[120ms]"
            />
          </a>
        ) : (
          <div className="w-20 h-20 rounded-full bg-accent-light flex items-center justify-center shrink-0">
            <HomeIcon width={28} height={28} className="text-accent" />
          </div>
        )}

        {/* Property info */}
        <div className="flex flex-col justify-center gap-1 min-w-0">
          {snapshot.address && (() => {
            const parsed = formatAddress(snapshot.address);
            return (
              <a
                href={snapshot.redfinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] font-medium text-text-primary hover:text-accent transition-colors duration-[120ms]"
              >
                {parsed ? (
                  <>
                    <span className="block truncate">{parsed.street}</span>
                    <span className="block truncate">{parsed.cityStateZip}</span>
                  </>
                ) : (
                  <span className="truncate">{snapshot.address}</span>
                )}
              </a>
            );
          })()}

          {/* Value */}
          {editingValue ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleValueSave()}
                placeholder="$425,000"
                className="w-32 px-2 py-1 text-lg font-bold bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                autoFocus
              />
              <button
                onClick={handleValueSave}
                className="text-[11px] font-medium text-accent hover:underline"
              >
                Save
              </button>
              <button
                onClick={() => setEditingValue(false)}
                className="text-[11px] font-medium text-text-3 hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {snapshot.estimatedValue ? (
                <span className="text-xl font-bold text-text-primary">
                  {formatCurrency(snapshot.estimatedValue)}
                </span>
              ) : (
                <span className="text-[14px] text-text-3">
                  No value set
                </span>
              )}

              {snapshot.valueTrend === "up" && (
                <span className="inline-flex items-center gap-0.5 text-green text-[12px] font-medium">
                  <TrendUpIcon width={14} height={14} />
                </span>
              )}
              {snapshot.valueTrend === "down" && (
                <span className="inline-flex items-center gap-0.5 text-red text-[12px] font-medium">
                  <TrendDownIcon width={14} height={14} />
                </span>
              )}

            </div>
          )}

          <span className="text-[11px] text-text-4">
            Updated {timeAgo(snapshot.lastScrapedAt)}
          </span>
        </div>
      </div>
      )}

      {error && !editingHome && (
        <p className="text-[12px] text-red mt-2">{error}</p>
      )}
    </div>
  );
}
