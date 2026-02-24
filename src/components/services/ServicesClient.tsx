"use client";

import { useState, useEffect } from "react";
import { type Service, FREQUENCY_OPTIONS } from "@/lib/services-data";
import type { Contractor } from "@/lib/contractors-data";
import type { HomeAsset } from "@/lib/home-assets-data";
import { supabase, type DbService, type DbContractor, type DbHomeAsset } from "@/lib/supabase";
import { dbToService, serviceToDb, dbToContractor, contractorToDb, dbToHomeAsset } from "@/lib/mappers";
import { formatDateShort as formatDate } from "@/lib/date-utils";
import { PlusIcon, SearchIcon } from "@/components/icons";
import AddServiceModal from "./AddServiceModal";


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

export default function ServicesClient() {
  const [services, setServices] = useState<Service[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [homeAssets, setHomeAssets] = useState<HomeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  useEffect(() => {
    async function fetchData() {
      const [svcResult, conResult, assetResult] = await Promise.all([
        supabase
          .from("services")
          .select("id, name, provider, contractor_id, cost, frequency_months, last_service_date, next_service_date, home_asset_id, phone, notes, created_at")
          .order("next_service_date", { ascending: true })
          .returns<DbService[]>(),
        supabase
          .from("contractors")
          .select("id, name, company, phone, email, specialty, rating, notes, website, logo_url, created_at")
          .order("company", { ascending: true })
          .returns<DbContractor[]>(),
        supabase
          .from("home_assets")
          .select("id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url, created_at")
          .order("name", { ascending: true })
          .returns<DbHomeAsset[]>(),
      ]);

      if (svcResult.error) {
        console.error("Failed to fetch services:", svcResult.error);
      } else {
        setServices(svcResult.data.map(dbToService));
      }
      if (!conResult.error && conResult.data) {
        setContractors(conResult.data.map(dbToContractor));
      }
      if (!assetResult.error && assetResult.data) {
        setHomeAssets(assetResult.data.map(dbToHomeAsset));
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const filtered = services.filter((s) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.provider.toLowerCase().includes(q)
    );
  });

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

  async function handleAdd(data: Omit<Service, "id" | "createdAt">) {
    const { data: rows, error } = await supabase
      .from("services")
      .insert(serviceToDb(data) as Record<string, unknown>)
      .select()
      .returns<DbService[]>();

    if (error) {
      console.error("Failed to add service:", error);
      return;
    }
    setServices(
      [...services, dbToService(rows[0])].sort((a, b) =>
        a.nextServiceDate.localeCompare(b.nextServiceDate)
      )
    );
    setModalOpen(false);
  }

  async function handleEdit(data: Omit<Service, "id" | "createdAt">) {
    if (!editingService) return;

    const { data: rows, error } = await supabase
      .from("services")
      .update(serviceToDb(data) as Record<string, unknown>)
      .eq("id", editingService.id)
      .select()
      .returns<DbService[]>();

    if (error) {
      console.error("Failed to update service:", error);
      return;
    }
    setServices(
      services
        .map((s) => (s.id === editingService.id ? dbToService(rows[0]) : s))
        .sort((a, b) => a.nextServiceDate.localeCompare(b.nextServiceDate))
    );
    setEditingService(null);
  }

  async function handleDelete() {
    if (!editingService) return;

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", editingService.id);

    if (error) {
      console.error("Failed to delete service:", error);
      return;
    }
    setServices(services.filter((s) => s.id !== editingService.id));
    setEditingService(null);
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          Home Services
        </h1>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[13px] font-medium hover:brightness-110 transition-all duration-[120ms]"
        >
          <PlusIcon width={14} height={14} />
          Add Service
        </button>
      </header>

      {/* Search */}
      {services.length > 0 && (
        <div className="mb-4">
          <div className="relative max-w-full sm:max-w-[350px]">
            <SearchIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-4"
              width={14}
              height={14}
            />
            <input
              type="text"
              placeholder="Search Home Services"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-[7px] text-[13px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent transition-all duration-[120ms]"
            />
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <p className="text-sm text-text-3">Loading services...</p>
      ) : services.length === 0 ? (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 text-center">
          <p className="text-sm font-semibold text-text-primary mb-1">
            No services yet
          </p>
          <p className="text-[13px] text-text-3">
            Start tracking recurring home services like mowing, plowing, and maintenance.
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden">
          <ul role="list" aria-label="Home services">
            {filtered.map((s) => {
              const days = daysUntil(s.nextServiceDate);
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
                <li key={s.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setEditingService(s)}
                    className="w-full text-left flex items-center gap-3 px-5 py-3.5 hover:bg-surface-hover transition-[background] duration-[120ms]"
                  >
                    {/* Service info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[13px] font-semibold text-text-primary truncate">
                          {s.name}
                        </span>
                        <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-[var(--radius-full)] bg-purple-light text-purple">
                          {frequencyLabel(s.frequencyMonths)}
                        </span>
                      </div>
                      {s.provider && (
                        <p className="text-[12px] text-text-3 truncate">
                          {s.provider}
                          {s.cost !== null && ` — $${s.cost.toLocaleString()}`}
                        </p>
                      )}
                    </div>

                    {/* Due date */}
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span
                        className={`text-[13px] font-medium whitespace-nowrap ${
                          isOverdue
                            ? "text-red"
                            : isSoon
                              ? "text-accent"
                              : "text-text-primary"
                        }`}
                      >
                        {formatDate(s.nextServiceDate)}
                      </span>
                      <span
                        className={`text-[11px] ${
                          isOverdue
                            ? "text-red font-medium"
                            : "text-text-3"
                        }`}
                      >
                        {dueLabel}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Add modal */}
      {modalOpen && (
        <AddServiceModal
          contractors={contractors}
          homeAssets={homeAssets}
          onSave={handleAdd}
          onContractorAdded={handleContractorAdded}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Edit modal */}
      {editingService && (
        <AddServiceModal
          service={editingService}
          contractors={contractors}
          homeAssets={homeAssets}
          onSave={handleEdit}
          onDelete={handleDelete}
          onContractorAdded={handleContractorAdded}
          onClose={() => setEditingService(null)}
        />
      )}
    </div>
  );
}
