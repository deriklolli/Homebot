"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrashIcon } from "@/components/icons";
import type { ManagedClient } from "@/lib/admin-data";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-text-4",
  invited: "text-accent",
  activated: "text-green",
};

export default function AdminDashboardClient() {
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/clients")
      .then((res) => res.json())
      .then((data) => {
        setClients(data.clients ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleDelete(clientId: string) {
    if (!confirm("Delete this client account and all pre-loaded data? This cannot be undone.")) return;

    const res = await fetch(`/api/admin/clients/${clientId}`, { method: "DELETE" });
    if (res.ok) {
      setClients((prev) => prev.filter((c) => c.id !== clientId));
    }
  }

  const pending = clients.filter((c) => c.status === "pending").length;
  const invited = clients.filter((c) => c.status === "invited").length;
  const activated = clients.filter((c) => c.status === "activated").length;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          Clients
        </h1>
        <Link
          href="/admin/clients/new"
          className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms]"
        >
          + New Client
        </Link>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Pending" value={pending} />
        <StatCard label="Invited" value={invited} />
        <StatCard label="Activated" value={activated} />
      </div>

      {/* Client list */}
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)]">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-text-primary">All Clients</h2>
        </div>

        {loading ? (
          <p className="px-5 py-8 text-[14px] text-text-3 text-center">Loading...</p>
        ) : clients.length === 0 ? (
          <p className="px-5 py-8 text-[14px] text-text-3 text-center">
            No clients yet. Create one to get started.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {clients.map((client) => (
              <li key={client.id} className="flex items-center justify-between px-5 py-3">
                <Link
                  href={`/admin/clients/${client.id}`}
                  className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
                >
                  <p className="text-[14px] font-medium text-text-primary truncate">
                    {client.fullName || client.email}
                  </p>
                  <p className="text-[12px] text-text-3">
                    {client.email}
                    {client.propertyName ? ` · ${client.propertyName}` : ""}
                    {" · "}
                    {client.assetCount} asset{client.assetCount !== 1 ? "s" : ""}
                    {" · "}
                    <span className={STATUS_COLORS[client.status] ?? "text-text-4"}>
                      {client.status}
                    </span>
                  </p>
                </Link>
                {client.status !== "activated" && (
                  <button
                    onClick={() => handleDelete(client.id)}
                    className="ml-3 p-1.5 rounded-[var(--radius-sm)] text-text-4 hover:text-red hover:bg-red/10 transition-all"
                    aria-label={`Delete ${client.fullName || client.email}`}
                  >
                    <TrashIcon width={14} height={14} />
                  </button>
                )}
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
