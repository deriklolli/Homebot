"use client";

import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { type ProjectInvoice } from "@/lib/projects-data";
import { supabase, type DbProjectInvoice } from "@/lib/supabase";
import { dbToProjectInvoice } from "@/lib/mappers";
import { compressImage } from "@/lib/compress-image";
import { extractInvoiceTotal } from "@/lib/extract-invoice-total";
import { InvoiceSolidIcon, XIcon } from "@/components/icons";

export interface ProjectInvoiceSectionHandle {
  triggerUpload: () => void;
}

interface ProjectInvoiceSectionProps {
  projectId: string;
  invoices: ProjectInvoice[];
  onInvoicesChange: (invoices: ProjectInvoice[]) => void;
}

const BUCKET = "project-invoices";

function getPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ProjectInvoiceSection = forwardRef<ProjectInvoiceSectionHandle, ProjectInvoiceSectionProps>(
  function ProjectInvoiceSection({ projectId, invoices, onInvoicesChange }, ref) {
    const [uploading, setUploading] = useState(false);
    const [scanningIds, setScanningIds] = useState<Set<string>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      triggerUpload: () => fileInputRef.current?.click(),
    }));

    async function scanAndUpdateAmount(invoiceId: string, file: File) {
      setScanningIds((prev) => new Set(prev).add(invoiceId));

      const amount = await extractInvoiceTotal(file);

      if (amount !== null) {
        await supabase
          .from("project_invoices")
          .update({ amount } as Record<string, unknown>)
          .eq("id", invoiceId);

        // Use functional updater to avoid stale closure over invoices
        (onInvoicesChange as (fn: (prev: ProjectInvoice[]) => ProjectInvoice[]) => void)(
          (prev) => prev.map((inv) => (inv.id === invoiceId ? { ...inv, amount } : inv))
        );
      }

      setScanningIds((prev) => {
        const next = new Set(prev);
        next.delete(invoiceId);
        return next;
      });
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      const newInvoices: ProjectInvoice[] = [];
      const filesToScan: { id: string; file: File }[] = [];

      for (const file of Array.from(files)) {
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
            uploadBlob = await compressImage(file);
            contentType = "image/jpeg";
            ext = "jpg";
          }

          const storagePath = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, uploadBlob, {
              contentType,
              cacheControl: "31536000",
            });

          if (uploadError) {
            console.error("Invoice upload failed:", uploadError);
            continue;
          }

          const { data: rows, error: dbError } = await supabase
            .from("project_invoices")
            .insert({
              project_id: projectId,
              storage_path: storagePath,
              file_name: file.name,
              file_type: contentType,
            } as Record<string, unknown>)
            .select()
            .returns<DbProjectInvoice[]>();

          if (dbError) {
            console.error("Invoice DB insert failed:", dbError);
            continue;
          }

          const invoice = dbToProjectInvoice(rows[0]);
          newInvoices.push(invoice);
          filesToScan.push({ id: invoice.id, file });
        } catch (err) {
          console.error("Invoice processing failed:", err);
        }
      }

      if (newInvoices.length > 0) {
        const updated = [...invoices, ...newInvoices];
        onInvoicesChange(updated);

        // Scan for totals in the background after state update
        for (const { id, file } of filesToScan) {
          scanAndUpdateAmount(id, file);
        }
      }

      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    async function handleDelete(invoice: ProjectInvoice) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([invoice.storagePath]);

      if (storageError) {
        console.error("Invoice storage delete failed:", storageError);
      }

      const { error: dbError } = await supabase
        .from("project_invoices")
        .delete()
        .eq("id", invoice.id);

      if (dbError) {
        console.error("Invoice DB delete failed:", dbError);
        return;
      }

      onInvoicesChange(invoices.filter((inv) => inv.id !== invoice.id));
    }

    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif,.pdf,application/pdf"
          multiple
          onChange={handleUpload}
          className="hidden"
          aria-label="Upload project invoices"
        />

        {(invoices.length > 0 || uploading) && (
          <div className="flex items-start gap-4 mb-3">
            <span className="flex flex-col items-end gap-0.5 text-[11px] font-medium text-text-4 uppercase tracking-wide w-[80px] shrink-0 mt-4">
              <InvoiceSolidIcon width={30} height={30} className="text-accent" />
              Invoices
            </span>
            <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-5 flex-1">
              <div className="flex flex-wrap gap-3">
                {invoices.map((inv) => {
                  const isImage = inv.fileType.startsWith("image/");
                  const url = getPublicUrl(inv.storagePath);

                  return (
                    <div
                      key={inv.id}
                      className="relative group cursor-pointer"
                      onClick={() => window.open(url, "_blank")}
                    >
                      {isImage ? (
                        <img
                          src={url}
                          alt="Invoice"
                          className="w-[80px] h-[80px] object-cover rounded-[var(--radius-md)] border border-border"
                        />
                      ) : (
                        <div className="w-[80px] h-[80px] rounded-[var(--radius-md)] border border-border bg-border/50 flex flex-col items-center justify-center gap-1">
                          <span className="text-[11px] font-bold text-text-3 uppercase">PDF</span>
                        </div>
                      )}
                      {scanningIds.has(inv.id) ? (
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5 rounded-b-[var(--radius-md)]">
                          Scanning...
                        </span>
                      ) : inv.amount !== null ? (
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] font-semibold text-center py-0.5 rounded-b-[var(--radius-md)]">
                          {formatAmount(inv.amount)}
                        </span>
                      ) : null}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(inv);
                        }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-surface border border-border shadow-sm flex items-center justify-center text-text-4 hover:text-red opacity-0 group-hover:opacity-100 transition-all duration-[120ms]"
                        aria-label="Delete invoice"
                      >
                        <XIcon width={10} height={10} />
                      </button>
                    </div>
                  );
                })}
                {uploading && (
                  <div className="w-[80px] h-[80px] rounded-[var(--radius-md)] border border-border bg-border/30 flex items-center justify-center">
                    <span className="text-[10px] text-text-3">Uploading...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
);

export default ProjectInvoiceSection;
