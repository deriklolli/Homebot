"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Organization } from "@/lib/admin-data";

export default function OrgListClient() {
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

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          Organizations
        </h1>
        <Link
          href="/superadmin/organizations/new"
          className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms]"
        >
          + New Organization
        </Link>
      </header>

      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)]">
        {loading ? (
          <p className="px-5 py-8 text-[13px] text-text-3 text-center">Loading...</p>
        ) : orgs.length === 0 ? (
          <p className="px-5 py-8 text-[13px] text-text-3 text-center">
            No organizations yet.
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
