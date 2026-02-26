"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, TrashIcon } from "@/components/icons";

interface ClientDetail {
  id: string;
  email: string;
  fullName: string | null;
  propertyName: string | null;
  status: "pending" | "invited" | "activated";
  activatedAt: string | null;
  createdAt: string;
  assetCount: number;
  inventoryCount: number;
  assets: { id: string; name: string; category: string; make: string; model: string }[];
}

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  pending: { text: "Pending", className: "bg-border text-text-3" },
  invited: { text: "Invited", className: "bg-accent/10 text-accent" },
  activated: { text: "Activated", className: "bg-green/10 text-green" },
};

export default function ClientDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/clients/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setClient(data.client ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleInvite() {
    setInviting(true);
    setInviteSuccess(false);

    const res = await fetch(`/api/admin/clients/${id}/invite`, { method: "POST" });
    if (res.ok) {
      setInviteSuccess(true);
      setClient((prev) =>
        prev ? { ...prev, status: prev.status === "pending" ? "invited" : prev.status } : prev
      );
    }
    setInviting(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this client account and all pre-loaded data? This cannot be undone.")) return;
    setDeleting(true);

    const res = await fetch(`/api/admin/clients/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
        <p className="text-[13px] text-text-3">Loading...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
        <p className="text-[14px] text-text-primary">Client not found.</p>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[client.status] ?? STATUS_LABELS.pending;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-[13px] text-text-3 hover:text-accent mb-4 transition-colors"
      >
        <ChevronLeftIcon width={14} height={14} />
        Back to Clients
      </Link>

      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
            {client.fullName || client.email}
          </h1>
          {client.propertyName && (
            <p className="text-[13px] text-text-3 mt-0.5">{client.propertyName}</p>
          )}
        </div>
        <span
          className={`px-2.5 py-1 rounded-[var(--radius-full)] text-[11px] font-semibold uppercase tracking-wide ${statusInfo.className}`}
        >
          {statusInfo.text}
        </span>
      </header>

      {/* Info card */}
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-5 mb-4 max-w-[520px]">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-medium text-text-4 uppercase tracking-wide mb-0.5">Email</p>
            <p className="text-[14px] text-text-primary">{client.email}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-text-4 uppercase tracking-wide mb-0.5">Created</p>
            <p className="text-[14px] text-text-primary">
              {new Date(client.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-text-4 uppercase tracking-wide mb-0.5">Assets</p>
            <p className="text-[14px] text-text-primary">{client.assetCount}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-text-4 uppercase tracking-wide mb-0.5">Inventory</p>
            <p className="text-[14px] text-text-primary">{client.inventoryCount}</p>
          </div>
        </div>
      </div>

      {/* Invite success */}
      {inviteSuccess && (
        <div className="mb-4 px-4 py-3 rounded-[var(--radius-md)] bg-green/10 border border-green/20 max-w-[520px]">
          <p className="text-[13px] text-green font-medium">
            Invite email sent to {client.email}
          </p>
        </div>
      )}

      {/* Actions */}
      {client.status !== "activated" && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleInvite}
            disabled={inviting}
            className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-50"
          >
            {inviting ? "Sending..." : client.status === "invited" ? "Resend Invite" : "Send Invite"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[var(--radius-sm)] border border-red/30 text-red text-[12px] font-medium hover:bg-red/10 transition-all disabled:opacity-50"
          >
            <TrashIcon width={13} height={13} />
            {deleting ? "Deleting..." : "Delete Client"}
          </button>
        </div>
      )}

      {client.status === "activated" && (
        <div className="mb-6 px-4 py-3 rounded-[var(--radius-md)] bg-green/10 border border-green/20 max-w-[520px]">
          <p className="text-[13px] text-green font-medium">
            This client has activated their account. You no longer have access to their data.
          </p>
        </div>
      )}

      {/* Pre-loaded assets */}
      {client.assets.length > 0 && (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] max-w-[520px]">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">Pre-loaded Assets</h2>
          </div>
          <ul className="divide-y divide-border">
            {client.assets.map((asset) => (
              <li key={asset.id} className="px-5 py-3">
                <p className="text-[14px] font-medium text-text-primary">{asset.name}</p>
                <p className="text-[12px] text-text-3">
                  {asset.category}
                  {asset.make ? ` · ${asset.make}` : ""}
                  {asset.model ? ` ${asset.model}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
