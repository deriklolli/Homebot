"use client";

import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { type ProjectInvoice } from "@/lib/projects-data";
import { supabase, type DbProjectInvoice } from "@/lib/supabase";
import { dbToProjectInvoice } from "@/lib/mappers";
import { compressImage } from "@/lib/compress-image";
import { InvoiceSolidIcon, InvoiceIcon, XIcon } from "@/components/icons";

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

const ProjectInvoiceSection = forwardRef<ProjectInvoiceSectionHandle, ProjectInvoiceSectionProps>(
  function ProjectInvoiceSection({ projectId, invoices, onInvoicesChange }, ref) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      triggerUpload: () => fileInputRef.current?.click(),
    }));

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      const newInvoices: ProjectInvoice[] = [];

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

          newInvoices.push(dbToProjectInvoice(rows[0]));
        } catch (err) {
          console.error("Invoice processing failed:", err);
        }
      }

      if (newInvoices.length > 0) {
        onInvoicesChange([...invoices, ...newInvoices]);
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
              <div className="flex flex-col gap-1">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] hover:bg-border/50 cursor-pointer group transition-colors duration-[120ms]"
                    onClick={() => window.open(getPublicUrl(inv.storagePath), "_blank")}
                  >
                    <InvoiceIcon width={16} height={16} className="text-text-3 shrink-0" />
                    <span className="text-[13px] text-text-primary font-medium truncate flex-1">
                      {inv.fileName}
                    </span>
                    <span className="text-[10px] text-text-4 shrink-0">
                      {formatDate(inv.createdAt)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(inv);
                      }}
                      className="text-text-4 hover:text-red opacity-0 group-hover:opacity-100 transition-all duration-[120ms]"
                      aria-label="Delete invoice"
                    >
                      <XIcon width={14} height={14} />
                    </button>
                  </div>
                ))}
                {uploading && (
                  <p className="text-[12px] text-text-3 px-3 py-2">Uploading...</p>
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
