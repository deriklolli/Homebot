"use client";

import { useState, useRef, useEffect } from "react";
import type { ServiceHistory } from "@/lib/services-data";
import type { HomeAsset } from "@/lib/home-assets-data";
import { supabase, type DbServiceHistory } from "@/lib/supabase";
import { dbToServiceHistory } from "@/lib/mappers";
import { formatDateLong } from "@/lib/date-utils";
import { UploadIcon, XIcon, InvoiceIcon } from "@/components/icons";

const BUCKET = "service-invoices";

interface ServiceHistorySectionProps {
  serviceId: string;
  history: ServiceHistory[];
  linkedAsset: HomeAsset | null;
  onHistoryChange: (history: ServiceHistory[]) => void;
}

export default function ServiceHistorySection({
  serviceId,
  history,
  linkedAsset,
  onHistoryChange,
}: ServiceHistorySectionProps) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetId = useRef<string | null>(null);

  // Pre-fetch signed URLs for invoices
  const [invoiceUrls, setInvoiceUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchUrls() {
      const need = history.filter(
        (h) => h.invoicePath && !invoiceUrls[h.id]
      );
      if (need.length === 0) return;

      for (const entry of need) {
        try {
          const { data } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(entry.invoicePath);
          if (data?.publicUrl) {
            setInvoiceUrls((prev) => ({ ...prev, [entry.id]: data.publicUrl }));
          }
        } catch {
          // Skip
        }
      }
    }

    fetchUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    const targetId = uploadTargetId.current;
    if (!files || files.length === 0 || !targetId) return;

    setUploadingId(targetId);
    const file = files[0];

    try {
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

      let uploadBlob: Blob;
      let contentType: string;
      let ext: string;

      if (isPdf) {
        uploadBlob = file;
        contentType = "application/pdf";
        ext = "pdf";
      } else {
        const { compressImage } = await import("@/lib/compress-image");
        uploadBlob = await compressImage(file);
        contentType = "image/jpeg";
        ext = "jpg";
      }

      const storagePath = `${serviceId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, uploadBlob, {
          contentType,
          cacheControl: "31536000",
        });

      if (uploadError) {
        console.error("Invoice upload failed:", uploadError);
        return;
      }

      const { data: rows, error: dbError } = await supabase
        .from("service_history")
        .update({
          invoice_path: storagePath,
          invoice_file_name: file.name,
          invoice_file_type: contentType,
        } as Record<string, unknown>)
        .eq("id", targetId)
        .select()
        .returns<DbServiceHistory[]>();

      if (dbError || !rows?.length) {
        console.error("Failed to update history with invoice:", dbError);
        return;
      }

      const updated = dbToServiceHistory(rows[0]);
      onHistoryChange(
        history.map((h) => (h.id === targetId ? updated : h))
      );

      // Set URL immediately
      const { data } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);
      if (data?.publicUrl) {
        setInvoiceUrls((prev) => ({ ...prev, [targetId]: data.publicUrl }));
      }
    } catch (err) {
      console.error("Invoice processing failed:", err);
    } finally {
      setUploadingId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(entry: ServiceHistory) {
    if (entry.invoicePath) {
      await supabase.storage.from(BUCKET).remove([entry.invoicePath]);
    }

    const { error } = await supabase
      .from("service_history")
      .delete()
      .eq("id", entry.id);

    if (error) {
      console.error("Failed to delete history entry:", error);
      return;
    }

    onHistoryChange(history.filter((h) => h.id !== entry.id));
  }

  if (history.length === 0) return null;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif,.pdf,application/pdf"
        onChange={handleUpload}
        className="hidden"
        aria-label="Upload service invoice"
      />

      <div className="mt-[50px]">
        <h2 className="text-[15px] font-semibold text-text-primary mb-3">
          Service History
        </h2>
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-[11px] font-medium text-text-4 uppercase tracking-wide">
                  Service Date
                </th>
                <th className="px-5 py-3 text-[11px] font-medium text-text-4 uppercase tracking-wide">
                  Contractor
                </th>
                <th className="px-5 py-3 text-[11px] font-medium text-text-4 uppercase tracking-wide">
                  Asset Make
                </th>
                <th className="px-5 py-3 text-[11px] font-medium text-text-4 uppercase tracking-wide">
                  Asset Model
                </th>
                <th className="pl-5 pr-2 py-3 text-[11px] font-medium text-text-4 uppercase tracking-wide text-right">
                  Invoice
                </th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => {
                const hasInvoice = !!entry.invoicePath;
                const url = invoiceUrls[entry.id];

                return (
                  <tr
                    key={entry.id}
                    className="group border-b border-border last:border-b-0 hover:bg-surface-hover transition-[background] duration-[120ms]"
                  >
                    <td className="px-5 py-3">
                      <span className="text-[14px] text-text-primary">
                        {formatDateLong(entry.serviceDate)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[14px] text-text-primary">
                        {entry.contractorName || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[14px] text-text-primary">
                        {linkedAsset?.make || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[14px] text-text-primary">
                        {linkedAsset?.model || "—"}
                      </span>
                    </td>
                    <td className="pl-5 pr-2 py-3 text-right">
                      {hasInvoice ? (
                        <a
                          href={url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-border-strong bg-surface text-accent text-[12px] font-medium hover:bg-accent-light transition-all duration-[120ms]"
                        >
                          <InvoiceIcon width={12} height={12} />
                          View Invoice
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            uploadTargetId.current = entry.id;
                            fileInputRef.current?.click();
                          }}
                          disabled={uploadingId === entry.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-3 text-[12px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms] disabled:opacity-40"
                        >
                          {uploadingId === entry.id ? (
                            "Uploading..."
                          ) : (
                            <>
                              <UploadIcon width={12} height={12} />
                              Attach Invoice
                            </>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="pr-3 py-3">
                      <button
                        type="button"
                        onClick={() => handleDelete(entry)}
                        className="p-1 rounded-[var(--radius-sm)] text-text-4 hover:bg-red-light hover:text-red transition-all duration-[120ms]"
                        aria-label="Delete history entry"
                      >
                        <XIcon width={14} height={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
