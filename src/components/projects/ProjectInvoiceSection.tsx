"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { type ProjectInvoice } from "@/lib/projects-data";
import { supabase, type DbProjectInvoice } from "@/lib/supabase";
import { dbToProjectInvoice } from "@/lib/mappers";
import { compressImage } from "@/lib/compress-image";
import { extractInvoiceTotal } from "@/lib/extract-invoice-total";
import { renderPdfThumbnail } from "@/lib/pdf-thumbnail";
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

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ProjectInvoiceSection = forwardRef<ProjectInvoiceSectionHandle, ProjectInvoiceSectionProps>(
  function ProjectInvoiceSection({ projectId, invoices, onInvoicesChange }, ref) {
    const [uploading, setUploading] = useState(false);
    const [scanningIds, setScanningIds] = useState<Set<string>>(new Set());
    const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      triggerUpload: () => fileInputRef.current?.click(),
    }));

    // Generate thumbnails for invoices that don't have one yet
    useEffect(() => {
      async function fetchThumbnails() {
        const need = invoices.filter((inv) => !thumbnailUrls[inv.id]);
        if (need.length === 0) return;

        for (const inv of need) {
          try {
            const isPdf = inv.fileType === "application/pdf" || inv.storagePath.endsWith(".pdf");

            if (isPdf) {
              // Download the PDF and render first page as thumbnail
              const { data, error } = await supabase.storage
                .from(BUCKET)
                .download(inv.storagePath);

              if (error || !data) continue;

              const dataUrl = await renderPdfThumbnail(await data.arrayBuffer());
              setThumbnailUrls((prev) => ({ ...prev, [inv.id]: dataUrl }));
            } else {
              // For images, use a signed URL
              const { data, error } = await supabase.storage
                .from(BUCKET)
                .createSignedUrl(inv.storagePath, 3600);

              if (error || !data?.signedUrl) continue;
              setThumbnailUrls((prev) => ({ ...prev, [inv.id]: data.signedUrl }));
            }
          } catch {
            // Silently skip — will show fallback icon
          }
        }
      }

      fetchThumbnails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invoices]);

    async function scanAndUpdateAmount(invoiceId: string, file: File) {
      setScanningIds((prev) => new Set(prev).add(invoiceId));

      const amount = await extractInvoiceTotal(file);

      if (amount !== null) {
        await supabase
          .from("project_invoices")
          .update({ amount } as Record<string, unknown>)
          .eq("id", invoiceId);

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
      const localUrls: Record<string, string> = {};

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

          // Create immediate local thumbnail
          if (isPdf) {
            try {
              localUrls[invoice.id] = await renderPdfThumbnail(file);
            } catch {
              // Will fall back to icon
            }
          } else {
            localUrls[invoice.id] = URL.createObjectURL(uploadBlob);
          }
        } catch (err) {
          console.error("Invoice processing failed:", err);
        }
      }

      if (newInvoices.length > 0) {
        if (Object.keys(localUrls).length > 0) {
          setThumbnailUrls((prev) => ({ ...prev, ...localUrls }));
        }

        const updated = [...invoices, ...newInvoices];
        onInvoicesChange(updated);

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

      // Revoke blob URL if it exists
      if (thumbnailUrls[invoice.id]?.startsWith("blob:")) {
        URL.revokeObjectURL(thumbnailUrls[invoice.id]);
      }
      setThumbnailUrls((prev) => {
        const next = { ...prev };
        delete next[invoice.id];
        return next;
      });

      onInvoicesChange(invoices.filter((inv) => inv.id !== invoice.id));
    }

    function getFileUrl(inv: ProjectInvoice): string {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(inv.storagePath);
      return data.publicUrl;
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
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {invoices.map((inv) => {
                  const thumbUrl = thumbnailUrls[inv.id];

                  return (
                    <div
                      key={inv.id}
                      className="relative aspect-square rounded-[var(--radius-md)] overflow-hidden group cursor-pointer border border-border hover:border-accent hover:scale-105 transition-all duration-[160ms] ease-out"
                      onClick={() => window.open(getFileUrl(inv), "_blank")}
                    >
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt="Invoice"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-border/40 flex items-center justify-center animate-pulse">
                          <InvoiceIcon width={22} height={22} className="text-text-4" />
                        </div>
                      )}
                      {scanningIds.has(inv.id) ? (
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5">
                          Scanning...
                        </span>
                      ) : inv.amount !== null ? (
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-center py-0.5 flex flex-col leading-tight">
                          <span className="text-[8px] font-medium text-white/80">Invoice Total:</span>
                          <span className="text-[10px] font-semibold text-green">{formatAmount(inv.amount)}</span>
                        </span>
                      ) : null}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(inv);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms] hover:bg-red"
                        aria-label="Delete invoice"
                      >
                        <XIcon width={12} height={12} />
                      </button>
                    </div>
                  );
                })}
                {uploading && (
                  <div className="aspect-square rounded-[var(--radius-md)] border border-border bg-border/30 flex items-center justify-center">
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
