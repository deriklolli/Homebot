"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrashIcon } from "@/components/icons";
import type { ManagedManager } from "@/lib/admin-data";

export default function ManagerListClient() {
  const [managers, setManagers] = useState<ManagedManager[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/managers")
      .then((res) => res.json())
      .then((data) => {
        setManagers(data.managers ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleDelete(managerId: string) {
    if (!confirm("Delete this manager account? This cannot be undone.")) return;

    const res = await fetch(`/api/superadmin/managers/${managerId}`, { method: "DELETE" });
    if (res.ok) {
      setManagers((prev) => prev.filter((m) => m.id !== managerId));
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          Managers
        </h1>
        <Link
          href="/superadmin/managers/new"
          className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms]"
        >
          + New Manager
        </Link>
      </header>

      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)]">
        {loading ? (
          <p className="px-5 py-8 text-[14px] text-text-3 text-center">Loading...</p>
        ) : managers.length === 0 ? (
          <p className="px-5 py-8 text-[14px] text-text-3 text-center">
            No managers yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {managers.map((mgr) => (
              <li key={mgr.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-[14px] font-medium text-text-primary">
                    {mgr.fullName || mgr.email}
                  </p>
                  <p className="text-[12px] text-text-3">
                    {mgr.email} · {mgr.organizationName} · {mgr.clientCount} client{mgr.clientCount !== 1 ? "s" : ""} ·{" "}
                    <span className={mgr.status === "active" ? "text-green" : "text-text-4"}>
                      {mgr.status}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(mgr.id)}
                  className="p-1.5 rounded-[var(--radius-sm)] text-text-4 hover:text-red hover:bg-red/10 transition-all"
                  aria-label={`Delete ${mgr.fullName || mgr.email}`}
                >
                  <TrashIcon width={14} height={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
