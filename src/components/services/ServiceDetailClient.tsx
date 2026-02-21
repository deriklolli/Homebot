"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type Service, FREQUENCY_OPTIONS } from "@/lib/services-data";
import type { Contractor } from "@/lib/contractors-data";
import { supabase, type DbService, type DbContractor } from "@/lib/supabase";
import { dbToService, serviceToDb, dbToContractor, contractorToDb } from "@/lib/mappers";
import {
  ChevronLeftIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/icons";
import AddServiceModal from "./AddServiceModal";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function frequencyLabel(months: number): string {
  const opt = FREQUENCY_OPTIONS.find((o) => o.value === months);
  return opt?.label ?? `Every ${months} months`;
}

export default function ServiceDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [svcResult, conResult] = await Promise.all([
        supabase
          .from("services")
          .select("*")
          .eq("id", id)
          .returns<DbService[]>()
          .single(),
        supabase
          .from("contractors")
          .select("*")
          .order("company", { ascending: true })
          .returns<DbContractor[]>(),
      ]);

      if (svcResult.error || !svcResult.data) {
        setNotFound(true);
      } else {
        setService(dbToService(svcResult.data));
      }
      if (!conResult.error && conResult.data) {
        setContractors(conResult.data.map(dbToContractor));
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  const linkedContractor = contractors.find(
    (c) => c.id === service?.contractorId
  );

  async function handleContractorAdded(
    data: Omit<Contractor, "id" | "createdAt">
  ): Promise<Contractor> {
    const { data: rows, error } = await supabase
      .from("contractors")
      .insert(contractorToDb(data) as Record<string, unknown>)
      .select()
      .returns<DbContractor[]>();

    if (error || !rows?.length) {
      throw new Error("Failed to add contractor");
    }
    const newContractor = dbToContractor(rows[0]);
    setContractors((prev) =>
      [...prev, newContractor].sort((a, b) =>
        a.company.localeCompare(b.company)
      )
    );
    return newContractor;
  }

  async function handleEdit(data: Omit<Service, "id" | "createdAt">) {
    if (!service) return;

    const { data: rows, error } = await supabase
      .from("services")
      .update(serviceToDb(data) as Record<string, unknown>)
      .eq("id", service.id)
      .select()
      .returns<DbService[]>();

    if (error) {
      console.error("Failed to update service:", error);
      return;
    }
    setService(dbToService(rows[0]));
    setEditModalOpen(false);
  }

  async function handleDelete() {
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", service!.id);

    if (error) {
      console.error("Failed to delete service:", error);
      return;
    }
    router.push("/services");
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
        <p className="text-sm text-text-3">Loading service...</p>
      </div>
    );
  }

  if (notFound || !service) {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[13px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms] mb-6"
        >
          <ChevronLeftIcon width={14} height={14} />
          Back to Services
        </Link>
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 text-center">
          <p className="text-sm font-semibold text-text-primary mb-1">
            Service not found
          </p>
          <p className="text-[13px] text-text-3">
            This service may have been removed.
          </p>
        </div>
      </div>
    );
  }

  const days = daysUntil(service.nextServiceDate);
  const isOverdue = days <= 0;
  const isSoon = days > 0 && days <= 30;

  let dueLabel: string;
  if (isOverdue) {
    dueLabel =
      days === 0
        ? "Due today"
        : `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`;
  } else {
    dueLabel = `in ${days} day${days !== 1 ? "s" : ""}`;
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
      {/* Back link */}
      <Link
        href="/services"
        className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[13px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms] mb-6"
      >
        <ChevronLeftIcon width={14} height={14} />
        Back to Services
      </Link>

      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold tracking-tight text-text-primary truncate">
              {service.name}
            </h1>
            <span className="shrink-0 px-2.5 py-0.5 text-[11px] font-medium rounded-[var(--radius-full)] bg-purple-light text-purple">
              {frequencyLabel(service.frequencyMonths)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[13px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          >
            <PencilIcon width={13} height={13} />
            Edit
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[13px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          >
            <TrashIcon width={13} height={13} />
            Delete
          </button>
        </div>
      </header>

      {/* Details card */}
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-6 mb-5">
        <div className="grid grid-cols-2 gap-5">
          {/* Contractor / Provider */}
          <div>
            <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
              {linkedContractor ? "Contractor" : "Provider"}
            </span>
            {linkedContractor ? (
              <Link
                href={`/contractors`}
                className="text-[14px] text-accent hover:underline"
              >
                {linkedContractor.name
                  ? `${linkedContractor.name} — ${linkedContractor.company}`
                  : linkedContractor.company}
              </Link>
            ) : (
              <span className="text-[14px] text-text-primary">
                {service.provider || "—"}
              </span>
            )}
          </div>

          {/* Phone */}
          <div>
            <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
              Phone
            </span>
            <span className="text-[14px] text-text-primary">
              {linkedContractor?.phone || service.phone || "—"}
            </span>
          </div>

          {/* Cost */}
          <div>
            <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
              Cost
            </span>
            <span className="text-[14px] text-text-primary">
              {service.cost !== null ? `$${service.cost.toLocaleString()}` : "—"}
            </span>
          </div>

          {/* Last Service */}
          <div>
            <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
              Last Service
            </span>
            <span className="text-[14px] text-text-primary">
              {service.lastServiceDate ? formatDate(service.lastServiceDate) : "—"}
            </span>
          </div>

          {/* Next Service */}
          <div className="col-span-2">
            <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
              Next Service
            </span>
            <span
              className={`text-[14px] font-semibold ${
                isOverdue
                  ? "text-red"
                  : isSoon
                    ? "text-accent"
                    : "text-text-primary"
              }`}
            >
              {formatDate(service.nextServiceDate)}
            </span>
            <span
              className={`block text-[12px] mt-0.5 ${
                isOverdue ? "text-red font-medium" : "text-text-3"
              }`}
            >
              {dueLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {service.notes && (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-6 mb-5">
          <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-2">
            Notes
          </span>
          <p className="text-[14px] text-text-primary leading-relaxed whitespace-pre-wrap">
            {service.notes}
          </p>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="mt-4 flex items-center gap-3 bg-surface rounded-[var(--radius-lg)] border border-red/20 shadow-[var(--shadow-card)] px-5 py-3">
          <span className="text-[13px] text-text-3 flex-1">
            Are you sure you want to delete this service? This cannot be undone.
          </span>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] bg-red text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms]"
          >
            Yes, Delete
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[13px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Edit modal */}
      {editModalOpen && (
        <AddServiceModal
          service={service}
          contractors={contractors}
          onSave={handleEdit}
          onContractorAdded={handleContractorAdded}
          onClose={() => setEditModalOpen(false)}
        />
      )}
    </div>
  );
}
