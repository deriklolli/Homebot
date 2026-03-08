"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, type DbUtilityBill, type DbUtilityProvider } from "@/lib/supabase";
import { dbToUtilityBill, dbToUtilityProvider, utilityBillToDb } from "@/lib/mappers";
import {
  type UtilityBill,
  type UtilityProvider,
  getCategoryLabel,
  getCategoryColor,
} from "@/lib/utility-bills-data";
import { formatDateShort } from "@/lib/date-utils";
import { ChevronLeftIcon, MailIcon, PencilIcon } from "@/components/icons";
import AddBillModal from "./AddBillModal";

interface UtilityBillDetailClientProps {
  id: string;
}

export default function UtilityBillDetailClient({
  id,
}: UtilityBillDetailClientProps) {
  const router = useRouter();
  const [bill, setBill] = useState<UtilityBill | null>(null);
  const [providers, setProviders] = useState<UtilityProvider[]>([]);
  const [providerBills, setProviderBills] = useState<UtilityBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from("utility_bills")
        .select(
          "id, user_id, provider_id, provider_name, category, amount, due_date, billing_period_start, billing_period_end, account_number, gmail_message_id, source, notes, created_at"
        )
        .eq("id", id)
        .single()
        .returns<DbUtilityBill>();

      if (error || !data) {
        setLoading(false);
        return;
      }

      const mapped = dbToUtilityBill(data);
      setBill(mapped);

      // Fetch provider history + providers
      const [histResult, provResult] = await Promise.all([
        supabase
          .from("utility_bills")
          .select(
            "id, user_id, provider_id, provider_name, category, amount, due_date, billing_period_start, billing_period_end, account_number, gmail_message_id, source, notes, created_at"
          )
          .ilike("provider_name", mapped.providerName)
          .neq("id", id)
          .order("due_date", { ascending: false })
          .limit(12)
          .returns<DbUtilityBill[]>(),
        supabase
          .from("utility_providers")
          .select(
            "id, user_id, name, category, account_number, sender_email, logo_url, created_at"
          )
          .order("name", { ascending: true })
          .returns<DbUtilityProvider[]>(),
      ]);

      if (!histResult.error && histResult.data) {
        setProviderBills(histResult.data.map(dbToUtilityBill));
      }
      if (!provResult.error && provResult.data) {
        setProviders(provResult.data.map(dbToUtilityProvider));
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  async function handleUpdate(data: Omit<UtilityBill, "id" | "createdAt">) {
    const dbData = utilityBillToDb(data);
    const { error } = await supabase
      .from("utility_bills")
      .update(dbData as Record<string, unknown>)
      .eq("id", id);
    if (error) {
      console.error("Failed to update bill:", error);
      throw new Error("Failed to update bill");
    }
    // Refetch
    const { data: updated } = await supabase
      .from("utility_bills")
      .select(
        "id, user_id, provider_id, provider_name, category, amount, due_date, billing_period_start, billing_period_end, account_number, gmail_message_id, source, notes, created_at"
      )
      .eq("id", id)
      .single()
      .returns<DbUtilityBill>();
    if (updated) setBill(dbToUtilityBill(updated));
  }

  async function handleDelete() {
    if (!confirm("Delete this bill? This action cannot be undone.")) return;
    await supabase.from("utility_bills").delete().eq("id", id);
    router.push("/utility-bills");
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="text-[14px] text-text-3">Loading...</div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <p className="text-[14px] text-text-3">Bill not found.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
      {/* Back nav */}
      <button
        onClick={() => router.push("/utility-bills")}
        className="inline-flex items-center gap-1 text-[13px] text-text-3 hover:text-text-primary transition-colors mb-4"
      >
        <ChevronLeftIcon width={14} height={14} />
        Back to Utility Bills
      </button>

      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span
            className={`w-4 h-4 rounded-full shrink-0 ${getCategoryColor(bill.category)}`}
          />
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
              {bill.providerName}
            </h1>
            <p className="text-[14px] text-text-3">
              {getCategoryLabel(bill.category)}
              {bill.source === "gmail_scan" && (
                <span className="inline-flex items-center gap-1 ml-2 text-text-4">
                  <MailIcon width={12} height={12} />
                  Imported from Gmail
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
        >
          <PencilIcon width={14} height={14} />
          Edit
        </button>
      </header>

      {/* Bill Details Card */}
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-5 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailRow label="Amount">
            <span className="text-[18px] font-semibold text-text-primary">
              $
              {bill.amount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </DetailRow>
          {bill.dueDate && (
            <DetailRow label="Due Date">
              {formatDateShort(bill.dueDate)}
            </DetailRow>
          )}
          {bill.billingPeriodStart && bill.billingPeriodEnd && (
            <DetailRow label="Billing Period">
              {formatDateShort(bill.billingPeriodStart)} &mdash;{" "}
              {formatDateShort(bill.billingPeriodEnd)}
            </DetailRow>
          )}
          {bill.accountNumber && (
            <DetailRow label="Account Number">
              {bill.accountNumber}
            </DetailRow>
          )}
          {bill.notes && (
            <DetailRow label="Notes" fullWidth>
              {bill.notes}
            </DetailRow>
          )}
        </div>
      </div>

      {/* Provider History */}
      {providerBills.length > 0 && (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-5">
          <h2 className="text-[15px] font-semibold text-text-primary mb-3">
            {bill.providerName} History
          </h2>
          <div className="space-y-2">
            {providerBills.map((b) => (
              <button
                key={b.id}
                onClick={() => router.push(`/utility-bills/${b.id}`)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-[var(--radius-md)] hover:bg-surface-hover transition-colors text-left"
              >
                <span className="text-[14px] text-text-primary">
                  {b.dueDate ? formatDateShort(b.dueDate) : "No date"}
                </span>
                <span className="text-[14px] font-medium text-text-primary">
                  $
                  {b.amount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && (
        <AddBillModal
          bill={bill}
          providers={providers}
          onSave={handleUpdate}
          onDelete={handleDelete}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}

function DetailRow({
  label,
  children,
  fullWidth,
}: {
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <p className="text-[12px] text-text-3 mb-0.5">{label}</p>
      <div className="text-[14px] text-text-primary">{children}</div>
    </div>
  );
}
