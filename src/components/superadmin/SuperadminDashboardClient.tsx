"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Organization } from "@/lib/admin-data";

export default function SuperadminDashboardClient() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/organizations")
      .then((res) => res.json())
      .then((data) => {
        setOrgs(data.organizations ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalManagers = orgs.reduce((sum, o) => sum + o.managerCount, 0);
  const totalClients = orgs.reduce((sum, o) => sum + o.clientCount, 0);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
      <header className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          Superadmin Dashboard
        </h1>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Organizations" value={orgs.length} />
        <StatCard label="Managers" value={totalManagers} />
        <StatCard label="Homeowners" value={totalClients} />
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-6">
        <Link
          href="/superadmin/organizations/new"
          className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms]"
        >
          + New Organization
        </Link>
        <Link
          href="/superadmin/managers/new"
          className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[var(--radius-sm)] border border-border bg-surface text-text-primary text-[14px] font-medium hover:bg-border transition-all duration-[120ms]"
        >
          + New Manager
        </Link>
      </div>

      {/* Org list */}
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)]">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-text-primary">Organizations</h2>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-[14px] text-text-3 text-center">Loading...</p>
        ) : orgs.length === 0 ? (
          <p className="px-5 py-8 text-[14px] text-text-3 text-center">
            No organizations yet. Create one to get started.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {orgs.map((org) => (
              <li key={org.id}>
                <Link
                  href={`/superadmin/organizations/${org.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-border/30 transition-colors"
                >
                  <div>
                    <p className="text-[14px] font-medium text-text-primary">{org.name}</p>
                    <p className="text-[12px] text-text-3">
                      {org.managerCount} manager{org.managerCount !== 1 ? "s" : ""} · {org.clientCount} client{org.clientCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-[12px] text-text-4">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-4">
      <p className="text-[12px] text-text-3 mb-1">{label}</p>
      <p className="text-[22px] font-bold text-text-primary">{value}</p>
    </div>
  );
}
