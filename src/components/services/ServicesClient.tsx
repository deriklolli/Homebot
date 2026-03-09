"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { type Service, FREQUENCY_OPTIONS } from "@/lib/services-data";
import type { Contractor } from "@/lib/contractors-data";
import type { HomeAsset } from "@/lib/home-assets-data";
import { supabase, type DbService, type DbContractor, type DbHomeAsset } from "@/lib/supabase";
import { dbToService, serviceToDb, dbToContractor, contractorToDb, dbToHomeAsset } from "@/lib/mappers";
import { formatDateShort as formatDate } from "@/lib/date-utils";
import { PlusIcon, SearchIcon, BuildingIcon } from "@/components/icons";
import AddServiceModal from "./AddServiceModal";
import HomeServiceAlerts from "@/components/HomeServiceAlerts";


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
  const [activeTab, setActiveTab] = useState<"all" | "regular" | "annual">("all");

  useEffect(() => {
    async function fetchData() {
      const [svcResult, conResult, assetResult] = await Promise.all([
        supabase
          .from("services")
          .select("id, user_id, name, provider, contractor_id, cost, frequency_months, last_service_date, next_service_date, home_asset_id, phone, notes, reminders_enabled, created_at")
          .order("next_service_date", { ascending: true })
          .returns<DbService[]>(),
        supabase
          .from("contractors")
          .select("id, user_id, name, company, phone, email, specialty, rating, notes, website, logo_url, created_at")
          .order("company", { ascending: true })
          .returns<DbContractor[]>(),
        supabase
          .from("home_assets")
          .select("id, user_id, name, category, make, model, serial_number, purchase_date, warranty_expiration, location, notes, product_url, image_url, enrichment_data, enriched_at, created_at")
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
    // Tab filter
    if (activeTab === "regular" && s.frequencyMonths >= 12) return false;
    if (activeTab === "annual" && s.frequencyMonths < 12) return false;

    // Search filter
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

  async function handleToggleReminder(serviceId: string, enabled: boolean) {
    // Optimistic update
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, remindersEnabled: enabled } : s))
    );
    const { error } = await supabase
      .from("services")
      .update({ reminders_enabled: enabled })
      .eq("id", serviceId);
    if (error) {
      // Revert on failure
      setServices((prev) =>
        prev.map((s) => (s.id === serviceId ? { ...s, remindersEnabled: !enabled } : s))
      );
    }
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
          className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms]"
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
              className="w-full pl-9 pr-3 py-[7px] text-[14px] bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent transition-all duration-[120ms]"
            />
          </div>
        </div>
      )}

      <HomeServiceAlerts />

      {/* Tabs */}
      {services.length > 0 && (
        <div className="flex gap-6 mb-5 border-b border-[#DAD3CE]">
          {(["all", "regular", "annual"] as const).map((tab) => {
            const label = tab === "all" ? "All Services" : tab === "regular" ? "Regular Services" : "Annual Services";
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2.5 text-[14px] font-medium transition-colors duration-[120ms] border-b-2 -mb-px ${
                  isActive
                    ? "text-text-primary border-accent"
                    : "text-text-3 border-transparent hover:text-text-primary"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <p className="text-sm text-text-3">Loading services...</p>
      ) : services.length === 0 ? (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 text-center">
          <p className="text-[15px] font-semibold text-text-primary mb-1">
            No services yet
          </p>
          <p className="text-[14px] text-text-3">
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
                  <div className="flex items-center gap-5 px-5 py-3.5 hover:bg-surface-hover transition-[background] duration-[120ms]">
                    <Link
                      href={`/services/${s.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      {/* Contractor thumbnail */}
                      {(() => {
                        const c = s.contractorId ? contractors.find((c) => c.id === s.contractorId) : null;
                        return c?.logoUrl ? (
                          <img src={c.logoUrl} alt="" className="w-9 h-9 rounded-full object-contain bg-white border border-border shrink-0" />
                        ) : (
                          <span className="w-9 h-9 rounded-full bg-accent shrink-0 flex items-center justify-center">
                            <BuildingIcon width={16} height={16} className="text-white" />
                          </span>
                        );
                      })()}

                      {/* Service info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[14px] font-semibold text-text-primary truncate">
                            {s.name}
                          </span>
                          <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-[var(--radius-full)] bg-accent-light text-accent">
                            {frequencyLabel(s.frequencyMonths)}
                          </span>
                        </div>
                        {(s.provider || (s.contractorId && contractors.find((c) => c.id === s.contractorId)?.company)) && (
                          <p className="text-[12px] text-text-3 truncate">
                            {s.provider || contractors.find((c) => c.id === s.contractorId)?.company}
                            {s.cost !== null && ` — $${s.cost.toLocaleString()}`}
                          </p>
                        )}
                      </div>

                      {/* Due date */}
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span
                          className={`text-[14px] font-medium whitespace-nowrap ${
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
                    </Link>

                    {/* Remind me toggle */}
                    <button
                      type="button"
                      title="Remind Me"
                      onClick={() => handleToggleReminder(s.id, !s.remindersEnabled)}
                      className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-[120ms] ${
                        s.remindersEnabled
                          ? "bg-accent border-accent"
                          : "bg-transparent border-text-4 hover:border-text-3"
                      }`}
                      aria-label={s.remindersEnabled ? "Disable reminder" : "Enable reminder"}
                    >
                      {s.remindersEnabled && (
                        <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden="true">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </div>
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
    </div>
  );
}
