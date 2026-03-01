"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type Service, type ServiceHistory, FREQUENCY_OPTIONS } from "@/lib/services-data";
import type { Contractor } from "@/lib/contractors-data";
import type { HomeAsset } from "@/lib/home-assets-data";
import { supabase, type DbService, type DbContractor, type DbHomeAsset, type DbServiceHistory } from "@/lib/supabase";
import { dbToService, serviceToDb, dbToContractor, contractorToDb, dbToHomeAsset, dbToServiceHistory } from "@/lib/mappers";
import { formatDateLong as formatDate } from "@/lib/date-utils";
import {
  ChevronLeftIcon,
  PencilIcon,
  TrashIcon,
  ClipboardCheckIcon,
  PhoneIcon,
  BuildingIcon,
} from "@/components/icons";
import AddServiceModal from "./AddServiceModal";
import ServiceHistorySection from "./ServiceHistorySection";

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

function computeNextServiceDate(
  fromDate: string,
  frequencyMonths: number
): string {
  const d = new Date(fromDate + "T00:00:00");
  if (frequencyMonths < 1) {
    d.setDate(d.getDate() + Math.round(frequencyMonths * 30));
  } else {
    d.setMonth(d.getMonth() + frequencyMonths);
    const targetMonth = (d.getMonth() + frequencyMonths) % 12;
    if (d.getMonth() !== targetMonth) {
      d.setDate(0);
    }
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const [homeAssets, setHomeAssets] = useState<HomeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [serviceReset, setServiceReset] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [history, setHistory] = useState<ServiceHistory[]>([]);

  useEffect(() => {
    async function fetchData() {
      const [svcResult, conResult, assetResult, histResult] = await Promise.all([
        supabase
          .from("services")
          .select("id, user_id, name, provider, contractor_id, cost, frequency_months, last_service_date, next_service_date, home_asset_id, phone, notes, reminders_enabled, created_at")
          .eq("id", id)
          .returns<DbService[]>()
          .single(),
        supabase
          .from("contractors")
          .select("id, user_id, name, company, phone, email, specialty, rating, notes, website, logo_url, created_at")
          .order("company", { ascending: true })
          .returns<DbContractor[]>(),
        supabase
          .from("home_assets")
          .select("id, user_id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url, created_at")
          .order("name", { ascending: true })
          .returns<DbHomeAsset[]>(),
        supabase
          .from("service_history")
          .select("id, user_id, service_id, service_date, contractor_name, invoice_path, invoice_file_name, invoice_file_type, created_at")
          .eq("service_id", id)
          .order("service_date", { ascending: false })
          .returns<DbServiceHistory[]>(),
      ]);

      if (svcResult.error || !svcResult.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setService(dbToService(svcResult.data));
      if (!conResult.error && conResult.data) {
        setContractors(conResult.data.map(dbToContractor));
      }
      if (!assetResult.error && assetResult.data) {
        setHomeAssets(assetResult.data.map(dbToHomeAsset));
      }
      if (!histResult.error && histResult.data) {
        setHistory(histResult.data.map(dbToServiceHistory));
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  async function handleMarkAsServiced() {
    if (!service) return;
    const today = todayString();
    const nextDate = computeNextServiceDate(today, service.frequencyMonths);

    // Optimistic update
    setService({ ...service, lastServiceDate: today, nextServiceDate: nextDate });
    setServiceReset(true);

    const { error } = await supabase
      .from("services")
      .update({ last_service_date: today, next_service_date: nextDate })
      .eq("id", service.id);

    if (error) {
      // Revert
      setService(service);
      setServiceReset(false);
    } else {
      // Insert history entry
      const { data: histRows, error: histError } = await supabase
        .from("service_history")
        .insert({
          service_id: service.id,
          service_date: today,
          contractor_name: service.provider || "",
        } as Record<string, unknown>)
        .select()
        .returns<DbServiceHistory[]>();

      if (!histError && histRows?.length) {
        setHistory((prev) => [dbToServiceHistory(histRows[0]), ...prev]);
      }

      setTimeout(() => setServiceReset(false), 2000);
    }
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
    if (!service) return;

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", service.id);

    if (error) {
      console.error("Failed to delete service:", error);
      return;
    }
    router.push("/services");
  }

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
          className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms] mb-6"
        >
          <ChevronLeftIcon width={14} height={14} />
          Back to Services
        </Link>
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 text-center">
          <p className="text-[15px] font-semibold text-text-primary mb-1">
            Service not found
          </p>
          <p className="text-[14px] text-text-3">
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

  const linkedContractor = service.contractorId
    ? contractors.find((c) => c.id === service.contractorId)
    : null;

  const linkedAsset = service.homeAssetId
    ? homeAssets.find((a) => a.id === service.homeAssetId)
    : null;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
      {/* Back link */}
      <Link
        href="/services"
        className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms] mb-6"
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
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          >
            <PencilIcon width={13} height={13} />
            Edit
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
          >
            <TrashIcon width={13} height={13} />
            Delete
          </button>
        </div>
      </header>

      {/* Details card */}
      <div className="flex gap-5 mb-5">
        {/* Icon */}
        <div className="shrink-0">
          <div className="w-28 h-28 rounded-full bg-accent flex items-center justify-center">
            <ClipboardCheckIcon width={48} height={48} className="text-white" strokeWidth={1.5} />
          </div>
        </div>

        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-6 flex-1">
          {/* Top row: Date / Contractor / Mark as Serviced */}
          <div className="flex gap-5 mb-5">
            {/* Next Service Date */}
            <div className="flex-[35] min-w-0">
              <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                Next Service Date
              </span>
              <span className="text-[14px] font-semibold text-text-primary">
                {formatDate(service.nextServiceDate)}
              </span>
              {isOverdue ? (
                <span className="block mt-1 px-2 py-0.5 text-[14px] font-medium rounded-[var(--radius-full)] bg-red text-white w-fit">
                  {dueLabel}
                </span>
              ) : (
                <span
                  className={`block text-[14px] mt-0.5 ${
                    isSoon ? "text-accent font-medium" : "text-text-3"
                  }`}
                >
                  {dueLabel}
                </span>
              )}
            </div>

            {/* Contractor */}
            {service.provider && (
              <div className="flex-[35] min-w-0">
                <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                  Contractor
                </span>
                <div className="flex items-start gap-2.5">
                  {linkedContractor?.logoUrl?.trim() && !logoError ? (
                    <img
                      src={linkedContractor.logoUrl}
                      alt={service.provider}
                      className="w-9 h-9 rounded-full object-contain bg-white border border-border shrink-0"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center shrink-0">
                      <BuildingIcon width={18} height={18} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-[14px] text-text-primary block truncate">
                      {service.provider}
                    </span>
                    {service.phone && (
                      <span className="flex items-center gap-1.5 text-[14px] text-text-primary mt-0.5">
                        <PhoneIcon width={13} height={13} className="shrink-0" />
                        {service.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Mark as Serviced */}
            {service.frequencyMonths >= 12 && (
              <div className="flex-[30] min-w-0 flex justify-end">
                <button
                  type="button"
                  onClick={handleMarkAsServiced}
                  disabled={serviceReset}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-[14px] font-medium transition-all duration-[120ms] h-fit whitespace-nowrap ${
                    serviceReset
                      ? "bg-green text-white"
                      : "bg-accent text-white hover:brightness-110"
                  }`}
                >
                  {serviceReset ? "Date Reset!" : "Mark as Serviced"}
                </button>
              </div>
            )}
          </div>

          {/* Bottom row: Cost / Notes */}
          <div className="flex gap-5 flex-wrap">
            {service.cost !== null && (
              <div>
                <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                  Cost
                </span>
                <span className="text-[14px] text-text-primary">
                  ${service.cost.toLocaleString()}
                </span>
              </div>
            )}

            {service.notes && (
              <div className="flex-1 min-w-0">
                <span className="block text-[11px] font-medium text-text-4 uppercase tracking-wide mb-1">
                  Notes
                </span>
                <p className="text-[14px] text-text-primary leading-relaxed whitespace-pre-wrap">
                  {service.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service History */}
      <ServiceHistorySection
        serviceId={service.id}
        history={history}
        linkedAsset={linkedAsset ?? null}
        onHistoryChange={setHistory}
      />

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-6 w-full max-w-sm mx-4">
            <h2 className="text-[15px] font-semibold text-text-primary mb-2">
              Delete Service
            </h2>
            <p className="text-[14px] text-text-3 mb-5">
              Are you sure you want to delete &ldquo;{service.name}&rdquo;?
              This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-[7px] rounded-[var(--radius-sm)] bg-red text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModalOpen && (
        <AddServiceModal
          service={service}
          contractors={contractors}
          homeAssets={homeAssets}
          onSave={handleEdit}
          onDelete={handleDelete}
          onContractorAdded={handleContractorAdded}
          onClose={() => setEditModalOpen(false)}
        />
      )}
    </div>
  );
}
