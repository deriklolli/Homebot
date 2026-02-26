"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeftIcon, TrashIcon } from "@/components/icons";
import { useRouter } from "next/navigation";

interface Manager {
  id: string;
  email: string;
  fullName: string | null;
  status: string;
  clientCount: number;
  createdAt: string;
}

export default function OrgDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [org, setOrg] = useState<{ id: string; name: string; createdAt: string } | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/superadmin/organizations/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setOrg(data.organization ?? null);
        setManagers(data.managers ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleDeleteOrg() {
    if (!confirm("Delete this organization? Manager accounts will be unlinked but not deleted.")) return;
    setDeleting(true);

    const res = await fetch(`/api/superadmin/organizations/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/superadmin/organizations");
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  async function handleDeleteManager(managerId: string) {
    if (!confirm("Delete this manager account? This cannot be undone.")) return;

    await fetch(`/api/superadmin/managers/${managerId}`, { method: "DELETE" });
    setManagers((prev) => prev.filter((m) => m.id !== managerId));
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
        <p className="text-[13px] text-text-3">Loading...</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
        <p className="text-[14px] text-text-primary">Organization not found.</p>
      </div>
    );
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

      <header className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          {org.name}
        </h1>
        <button
          onClick={handleDeleteOrg}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[var(--radius-sm)] border border-red/30 text-red text-[12px] font-medium hover:bg-red/10 transition-all disabled:opacity-50"
        >
          <TrashIcon width={13} height={13} />
          {deleting ? "Deleting..." : "Delete Org"}
        </button>
      </header>

      {/* Managers */}
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Managers</h2>
          <Link
            href={`/superadmin/managers/new?org=${id}`}
            className="text-[13px] text-accent font-medium hover:underline"
          >
            + Add Manager
          </Link>
        </div>

        {managers.length === 0 ? (
          <p className="px-5 py-8 text-[13px] text-text-3 text-center">
            No managers in this organization yet.
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
                    {mgr.email} · {mgr.clientCount} client{mgr.clientCount !== 1 ? "s" : ""} ·{" "}
                    <span className={mgr.status === "active" ? "text-green" : "text-text-4"}>
                      {mgr.status}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteManager(mgr.id)}
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
