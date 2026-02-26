"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/icons";

interface OrgOption {
  id: string;
  name: string;
}

export default function CreateManagerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedOrg = searchParams.get("org") ?? "";

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [organizationId, setOrganizationId] = useState(preselectedOrg);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/superadmin/organizations")
      .then((res) => res.json())
      .then((data) => {
        const list = (data.organizations ?? []).map((o: OrgOption) => ({
          id: o.id,
          name: o.name,
        }));
        setOrgs(list);
        if (!organizationId && list.length > 0) {
          setOrganizationId(list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !organizationId) return;

    setSaving(true);
    setError("");

    const res = await fetch("/api/superadmin/managers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        fullName: fullName.trim() || null,
        organizationId,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create manager");
      setSaving(false);
      return;
    }

    router.push("/superadmin/managers");
    router.refresh();
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
      <Link
        href="/superadmin/managers"
        className="inline-flex items-center gap-1 text-[13px] text-text-3 hover:text-accent mb-4 transition-colors"
      >
        <ChevronLeftIcon width={14} height={14} />
        Back to Managers
      </Link>

      <header className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          New Manager
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
              htmlFor="org"
              className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1.5"
            >
              Organization
            </label>
            <select
              id="org"
              required
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-border bg-surface text-[14px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            >
              <option value="" disabled>
                Select an organization
              </option>
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

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
              placeholder="manager@company.com"
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
              placeholder="Jane Smith"
              className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-border bg-surface text-[14px] text-text-primary placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Manager & Send Invite"}
          </button>
        </form>
      </div>
    </div>
  );
}
