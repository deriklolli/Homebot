"use client";

import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { type ProjectInvoice } from "@/lib/projects-data";
import { supabase, type DbProjectInvoice } from "@/lib/supabase";
import { dbToProjectInvoice } from "@/lib/mappers";
import { compressImage } from "@/lib/compress-image";
import { extractInvoiceTotal } from "@/lib/extract-invoice-total";
import { InvoiceSolidIcon, InvoiceIcon, XIcon } from "@/components/icons";

export interface ProjectInvoiceSectionHandle {
  triggerUpload: () => void;
}

interface ProjectInvoiceSectionProps {
  projectId: string;
  invoices: ProjectInvoice[];
  onInvoicesChange: (invoices: ProjectInvoice[] | ((prev: ProjectInvoice[]) => ProjectInvoice[])) => void;
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
        onInvoicesChange(
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
              <div className="flex flex-col gap-2">
                {invoices.map((inv) => {
                  const isImage = inv.fileType.startsWith("image/");
                  const url = getPublicUrl(inv.storagePath);

                  return (
                    <div
                      key={inv.id}
                      className="flex items-center gap-3 rounded-[var(--radius-sm)] hover:bg-border/50 cursor-pointer group transition-colors duration-[120ms] p-1.5"
                      onClick={() => window.open(url, "_blank")}
                    >
                      {isImage ? (
                        <img
                          src={url}
                          alt="Invoice"
                          className="w-[52px] h-[52px] object-cover rounded-[var(--radius-sm)] border border-border shrink-0"
                        />
                      ) : (
                        <div className="w-[52px] h-[52px] rounded-[var(--radius-sm)] border border-border bg-border/40 flex items-center justify-center shrink-0">
                          <InvoiceIcon width={22} height={22} className="text-text-3" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {scanningIds.has(inv.id) ? (
                          <span className="text-[12px] text-text-3 italic">Scanning for total...</span>
                        ) : inv.amount !== null ? (
                          <span className="text-[15px] font-semibold text-text-primary">
                            {formatAmount(inv.amount)}
                          </span>
                        ) : (
                          <span className="text-[12px] text-text-4">No total detected</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(inv);
                        }}
                        className="text-text-4 hover:text-red opacity-0 group-hover:opacity-100 transition-all duration-[120ms] shrink-0"
                        aria-label="Delete invoice"
                      >
                        <XIcon width={14} height={14} />
                      </button>
                    </div>
                  );
                })}
                {uploading && (
                  <p className="text-[12px] text-text-3 px-1.5 py-2">Uploading...</p>
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
