"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase, type DbUtilityBill, type DbUtilityProvider } from "@/lib/supabase";
import { dbToUtilityBill, dbToUtilityProvider, utilityBillToDb } from "@/lib/mappers";
import {
  type UtilityBill,
  type UtilityProvider,
  type UtilityCategory,
  UTILITY_CATEGORIES,
  getCategoryLabel,
  getCategoryColor,
} from "@/lib/utility-bills-data";
import { PlusIcon, SearchIcon, MailIcon, ZapIcon } from "@/components/icons";
import AddBillModal from "./AddBillModal";
import UtilitySpendingChart from "./UtilitySpendingChart";

type TabFilter = "all" | UtilityCategory;

export default function UtilityBillsClient() {
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [providers, setProviders] = useState<UtilityProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ imported: number; scanned: number } | null>(null);
  const searchParams = useSearchParams();
  const didAutoScan = useRef(false);

  async function fetchData() {
    const [billResult, provResult] = await Promise.all([
      supabase
        .from("utility_bills")
        .select(
          "id, user_id, provider_id, provider_name, category, amount, due_date, billing_period_start, billing_period_end, account_number, gmail_message_id, source, notes, created_at"
        )
        .order("billing_period_start", { ascending: false, nullsFirst: false })
        .returns<DbUtilityBill[]>(),
      supabase
        .from("utility_providers")
        .select(
          "id, user_id, name, category, account_number, sender_email, logo_url, created_at"
        )
        .order("name", { ascending: true })
        .returns<DbUtilityProvider[]>(),
    ]);

    if (!billResult.error && billResult.data) {
      setBills(billResult.data.map(dbToUtilityBill));
    }
    if (!provResult.error && provResult.data) {
      setProviders(provResult.data.map(dbToUtilityProvider));
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    // Check Gmail connection status
    async function checkGmail() {
      try {
        const res = await fetch("/api/gmail/status");
        const data = await res.json();
        setGmailConnected(data.connected ?? false);
        setGmailEmail(data.email ?? null);
      } catch {
        setGmailConnected(false);
      }
    }
    checkGmail();
  }, []);

  // Auto-scan after first Gmail connection
  useEffect(() => {
    if (searchParams.get("gmail") !== "just_connected") return;
    if (didAutoScan.current) return;
    didAutoScan.current = true;

    // Clean up the URL
    window.history.replaceState({}, "", "/utility-bills");

    async function runInitialScan() {
      setScanning(true);
      setGmailConnected(true);
      try {
        const res = await fetch("/api/gmail/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lookbackDays: 365 }),
        });
        if (res.ok) {
          const data = await res.json();
          setScanResult({ imported: data.imported, scanned: data.scanned });
          await fetchData();
        }
      } catch {
        // Scan failed silently — user can retry later
      } finally {
        setScanning(false);
      }
    }
    runInitialScan();
  }, [searchParams]);

  async function handleConnectGmail() {
    setConnecting(true);
    try {
      const res = await fetch("/api/gmail/auth-url");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setConnecting(false);
    }
  }

  async function handleSaveBill(data: Omit<UtilityBill, "id" | "createdAt">) {
    const dbData = utilityBillToDb(data);
    const { error } = await supabase
      .from("utility_bills")
      .insert(dbData as Record<string, unknown>);
    if (error) {
      console.error("Failed to save bill:", error);
      throw new Error("Failed to save bill");
    }
    await fetchData();
  }

  const filtered = bills.filter((b) => {
    if (activeTab !== "all" && b.category !== activeTab) return false;
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return b.providerName.toLowerCase().includes(q);
  });

  // Category summary — totals for last 12 months
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const recentBills = bills.filter((b) => {
    const d = new Date(b.dueDate ?? b.createdAt);
    return d >= twelveMonthsAgo;
  });

  const categoryTotals: Record<string, number> = {};
  for (const b of recentBills) {
    categoryTotals[b.category] = (categoryTotals[b.category] ?? 0) + b.amount;
  }

  // Active category tabs (only show categories that have bills)
  const activeCats = UTILITY_CATEGORIES.filter(
    (c) =>
      bills.some((b) => b.category === c.value)
  );
  const tabs: { value: TabFilter; label: string }[] = [
    { value: "all", label: "All" },
    ...activeCats.map((c) => ({ value: c.value as TabFilter, label: c.label })),
  ];

  const totalSpent = Object.values(categoryTotals).reduce(
    (sum, v) => sum + v,
    0
  );

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <header className="mb-6">
          <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
            Utility Bills
          </h1>
        </header>
        <div className="text-[14px] text-text-3">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          Utility Bills
        </h1>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms]"
        >
          <PlusIcon width={15} height={15} />
          Add Bill
        </button>
      </header>

      {/* Scanning indicator */}
      {scanning && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-[var(--radius-md)] bg-accent-light border border-accent/20 text-[14px] text-accent">
          <span className="inline-block w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
          Scanning your Gmail for utility bills — this may take a moment...
        </div>
      )}

      {/* Scan result */}
      {scanResult && !scanning && (
        <div className="mb-4 px-4 py-3 rounded-[var(--radius-md)] bg-green-light text-green border border-green/20 text-[14px]">
          Scan complete! Found {scanResult.scanned} emails, imported{" "}
          {scanResult.imported} new bill{scanResult.imported !== 1 ? "s" : ""}.
        </div>
      )}

      {/* Gmail onboarding card — shown until connected */}
      {gmailConnected === false && (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-6 mb-4">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-accent-light flex items-center justify-center shrink-0">
              <ZapIcon width={20} height={20} className="text-accent" />
            </div>
            <div className="flex-1">
              <h2 className="text-[15px] font-semibold text-text-primary mb-1">
                Track your utility spending automatically
              </h2>
              <p className="text-[14px] text-text-3 mb-4 max-w-[520px]">
                Connect your Gmail and Homebot will scan for utility bills from
                your email — electric, gas, water, internet, and more. Amounts,
                due dates, and providers are extracted automatically so you can
                see exactly where your money goes.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleConnectGmail}
                  disabled={connecting}
                  className="inline-flex items-center gap-2 px-4 py-[8px] rounded-[var(--radius-sm)] bg-accent text-white text-[14px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-50"
                >
                  <MailIcon width={15} height={15} />
                  {connecting ? "Connecting..." : "Connect Gmail"}
                </button>
                <span className="text-[12px] text-text-4">
                  or{" "}
                  <Link href="/settings" className="text-text-3 underline hover:text-text-primary hover:no-underline">
                    set up in Settings
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spending Chart + Category Summary */}
      {bills.length > 0 && (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-text-primary">
              Monthly Spending
            </h2>
            <span className="text-[13px] text-text-3">
              Last 12 months:{" "}
              <strong className="text-text-primary">
                ${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </span>
          </div>
          <UtilitySpendingChart bills={bills} months={12} />

          {/* Category breakdown */}
          {Object.keys(categoryTotals).length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
              {UTILITY_CATEGORIES.filter((c) => categoryTotals[c.value]).map(
                (cat) => (
                  <div
                    key={cat.value}
                    className="flex items-center gap-2 text-[13px]"
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${getCategoryColor(cat.value)}`}
                    />
                    <span className="text-text-3">{cat.label}</span>
                    <span className="font-medium text-text-primary">
                      $
                      {categoryTotals[cat.value].toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Search + Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-[320px]">
          <SearchIcon
            width={15}
            height={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-4"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by provider..."
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border border-border bg-surface text-[14px] text-text-primary placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
          />
        </div>
        {tabs.length > 2 && (
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-[13px] font-medium whitespace-nowrap transition-all duration-[120ms] ${
                  activeTab === tab.value
                    ? "bg-accent-light text-accent"
                    : "text-text-3 hover:bg-border hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bills Table */}
      {filtered.length === 0 ? (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 text-center">
          <ZapIcon
            width={32}
            height={32}
            className="mx-auto mb-3 text-text-4"
          />
          <p className="text-[15px] font-medium text-text-primary mb-1">
            {bills.length === 0 ? "No utility bills yet" : "No bills match your filter"}
          </p>
          <p className="text-[13px] text-text-3">
            {bills.length === 0
              ? "Add a bill manually or scan your Gmail to import bills automatically."
              : "Try adjusting your search or category filter."}
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[12px] font-medium text-text-3 uppercase tracking-wide px-4 py-3">Month</th>
                <th className="text-left text-[12px] font-medium text-text-3 uppercase tracking-wide px-4 py-3">Provider</th>
                <th className="text-left text-[12px] font-medium text-text-3 uppercase tracking-wide px-4 py-3">Utility</th>
                <th className="text-right text-[12px] font-medium text-text-3 uppercase tracking-wide px-4 py-3">Bill Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((bill) => {
                const periodStr = bill.billingPeriodStart ?? bill.dueDate ?? bill.createdAt;
                const monthLabel = periodStr
                  ? new Date(periodStr + (periodStr.includes("T") ? "" : "T00:00:00")).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                  : "—";

                return (
                  <tr
                    key={bill.id}
                    className="border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors cursor-pointer group"
                    onClick={() => window.location.href = `/utility-bills/${bill.id}`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-[14px] text-text-2">{monthLabel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[14px] font-medium text-text-primary group-hover:text-accent transition-colors">
                        {bill.providerName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getCategoryColor(bill.category)}`} />
                        <span className="text-[14px] text-text-primary">{getCategoryLabel(bill.category)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[14px] font-semibold text-text-primary">
                        ${bill.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Bill Modal */}
      {modalOpen && (
        <AddBillModal
          providers={providers}
          onSave={handleSaveBill}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
