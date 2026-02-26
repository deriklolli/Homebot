"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/icons";
import AssetSelector from "./AssetSelector";
import type { SelectedAsset } from "./AssetSelector";

type Step = "info" | "assets" | "review";

export default function CreateClientForm() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("info");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<SelectedAsset[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!email.trim()) return;

    setSaving(true);
    setError("");

    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        fullName: fullName.trim() || null,
        propertyName: propertyName.trim() || null,
        homeAssets: selectedAssets.map((a) => ({
          name: a.name,
          category: a.category,
          make: a.make,
          model: a.model,
        })),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create client");
      setSaving(false);
      return;
    }

    const data = await res.json();
    router.push(`/admin/clients/${data.client.id}`);
    router.refresh();
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-[13px] text-text-3 hover:text-accent mb-4 transition-colors"
      >
        <ChevronLeftIcon width={14} height={14} />
        Back to Clients
      </Link>

      <header className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          New Client
        </h1>
        <div className="flex items-center gap-2 mt-2">
          {(["info", "assets", "review"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-6 h-px bg-border" />}
              <span
                className={`text-[12px] font-medium ${
                  s === step
                    ? "text-accent"
                    : (["info", "assets", "review"] as Step[]).indexOf(s) <
                      (["info", "assets", "review"] as Step[]).indexOf(step)
                    ? "text-green"
                    : "text-text-4"
                }`}
              >
                {i + 1}. {s === "info" ? "Client Info" : s === "assets" ? "Home Assets" : "Review"}
              </span>
            </div>
          ))}
        </div>
      </header>

      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-5 max-w-[520px]">
        {error && (
          <div className="mb-4 px-3 py-2 rounded-[var(--radius-sm)] bg-red/10 border border-red/20">
            <p className="text-[13px] text-red">{error}</p>
          </div>
        )}

        {/* Step 1: Client Info */}
        {step === "info" && (
          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="homeowner@example.com"
                className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-border bg-surface text-[14px] text-text-primary placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="fullName"
                className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1.5"
              >
                Full Name <span className="text-text-4 normal-case">(optional)</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-border bg-surface text-[14px] text-text-primary placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="propertyName"
                className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1.5"
              >
                Property Name <span className="text-text-4 normal-case">(optional)</span>
              </label>
              <input
                id="propertyName"
                type="text"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="123 Main Street"
                className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-border bg-surface text-[14px] text-text-primary placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (!email.trim()) return;
                setStep("assets");
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms]"
            >
              Next: Select Assets
            </button>
          </div>
        )}

        {/* Step 2: Asset Selection */}
        {step === "assets" && (
          <div className="flex flex-col gap-4">
            <AssetSelector selected={selectedAssets} onChange={setSelectedAssets} />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("info")}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-[7px] rounded-[var(--radius-sm)] border border-border bg-surface text-text-primary text-[13px] font-medium hover:bg-border transition-all duration-[120ms]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep("review")}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms]"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === "review" && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                Client
              </p>
              <p className="text-[14px] text-text-primary">{email}</p>
              {fullName && (
                <p className="text-[12px] text-text-3">{fullName}</p>
              )}
              {propertyName && (
                <p className="text-[12px] text-text-3">{propertyName}</p>
              )}
            </div>

            <div>
              <p className="text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                Pre-loaded Assets
              </p>
              {selectedAssets.length === 0 ? (
                <p className="text-[13px] text-text-3">No assets selected</p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {selectedAssets.map((a) => (
                    <li key={`${a.category}-${a.name}`} className="text-[13px] text-text-primary">
                      {a.name} <span className="text-text-3">({a.category})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("assets")}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-[7px] rounded-[var(--radius-sm)] border border-border bg-surface text-text-primary text-[13px] font-medium hover:bg-border transition-all duration-[120ms]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Client"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
