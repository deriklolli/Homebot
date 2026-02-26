"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/icons";

export default function CreateOrgForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError("");

    const res = await fetch("/api/superadmin/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create organization");
      setSaving(false);
      return;
    }

    router.push("/superadmin/organizations");
    router.refresh();
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
      <Link
        href="/superadmin/organizations"
        className="inline-flex items-center gap-1 text-[13px] text-text-3 hover:text-accent mb-4 transition-colors"
      >
        <ChevronLeftIcon width={14} height={14} />
        Back to Organizations
      </Link>

      <header className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          New Organization
        </h1>
      </header>

      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-5 max-w-[480px]">
        {error && (
          <div className="mb-4 px-3 py-2 rounded-[var(--radius-sm)] bg-red/10 border border-red/20">
            <p className="text-[13px] text-red">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="orgName"
              className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1.5"
            >
              Organization Name
            </label>
            <input
              id="orgName"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Berkshire Hathaway"
              className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-border bg-surface text-[14px] text-text-primary placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Organization"}
          </button>
        </form>
      </div>
    </div>
  );
}
