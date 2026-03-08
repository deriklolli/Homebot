"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { type ProjectEstimate } from "@/lib/projects-data";
import { supabase, type DbProjectEstimate } from "@/lib/supabase";
import { dbToProjectEstimate } from "@/lib/mappers";
import { compressImage } from "@/lib/compress-image";
import { extractInvoiceTotal } from "@/lib/extract-invoice-total";
import { renderPdfThumbnail } from "@/lib/pdf-thumbnail";
import { InvoiceIcon, XIcon } from "@/components/icons";
import { formatDateShort } from "@/lib/date-utils";

export interface ProjectEstimateSectionHandle {
  triggerUpload: () => void;
}

interface ProjectEstimateSectionProps {
  projectId: string;
  estimates: ProjectEstimate[];
  onEstimatesChange: (estimates: ProjectEstimate[] | ((prev: ProjectEstimate[]) => ProjectEstimate[])) => void;
  iconColorClass?: string;
}

const BUCKET = "project-estimates";

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ProjectEstimateSection = forwardRef<ProjectEstimateSectionHandle, ProjectEstimateSectionProps>(
  function ProjectEstimateSection({ projectId, estimates, onEstimatesChange, iconColorClass = "text-accent" }, ref) {
    const [uploading, setUploading] = useState(false);
    const [scanningIds, setScanningIds] = useState<Set<string>>(new Set());
    const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      triggerUpload: () => fileInputRef.current?.click(),
    }));

    // Generate thumbnails for estimates that don't have one yet
    useEffect(() => {
      async function fetchThumbnails() {
        const need = estimates.filter((est) => !thumbnailUrls[est.id]);
        if (need.length === 0) return;

        for (const est of need) {
          try {
            const isPdf = est.fileType === "application/pdf" || est.storagePath.endsWith(".pdf");

            if (isPdf) {
              const { data, error } = await supabase.storage
                .from(BUCKET)
                .download(est.storagePath);

              if (error || !data) continue;

              const dataUrl = await renderPdfThumbnail(await data.arrayBuffer());
              setThumbnailUrls((prev) => ({ ...prev, [est.id]: dataUrl }));
            } else {
              const { data, error } = await supabase.storage
                .from(BUCKET)
                .createSignedUrl(est.storagePath, 3600);

              if (error || !data?.signedUrl) continue;
              setThumbnailUrls((prev) => ({ ...prev, [est.id]: data.signedUrl }));
            }
          } catch {
            // Silently skip — will show fallback icon
          }
        }
      }

      fetchThumbnails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estimates]);

    async function scanAndUpdateAmount(estimateId: string, file: File) {
      setScanningIds((prev) => new Set(prev).add(estimateId));

      const amount = await extractInvoiceTotal(file);

      if (amount !== null) {
        const { error: updateError } = await supabase
          .from("project_estimates")
          .update({ amount } as Record<string, unknown>)
          .eq("id", estimateId);

        if (updateError) {
          console.error("Failed to save estimate amount:", updateError);
        }

        onEstimatesChange(
          (prev) => prev.map((est) => (est.id === estimateId ? { ...est, amount } : est))
        );
      }

      setScanningIds((prev) => {
        const next = new Set(prev);
        next.delete(estimateId);
        return next;
      });
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      const newEstimates: ProjectEstimate[] = [];
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
            console.error("Estimate upload failed:", uploadError);
            continue;
          }

          const { data: rows, error: dbError } = await supabase
            .from("project_estimates")
            .insert({
              project_id: projectId,
              storage_path: storagePath,
              file_name: file.name,
              file_type: contentType,
            } as Record<string, unknown>)
            .select()
            .returns<DbProjectEstimate[]>();

          if (dbError) {
            console.error("Estimate DB insert failed:", dbError);
            continue;
          }

          const estimate = dbToProjectEstimate(rows[0]);
          newEstimates.push(estimate);
          filesToScan.push({ id: estimate.id, file });

          // Create immediate local thumbnail
          if (isPdf) {
            try {
              localUrls[estimate.id] = await renderPdfThumbnail(file);
            } catch {
              // Will fall back to icon
            }
          } else {
            localUrls[estimate.id] = URL.createObjectURL(uploadBlob);
          }
        } catch (err) {
          console.error("Estimate processing failed:", err);
        }
      }

      if (newEstimates.length > 0) {
        if (Object.keys(localUrls).length > 0) {
          setThumbnailUrls((prev) => ({ ...prev, ...localUrls }));
        }

        const updated = [...estimates, ...newEstimates];
        onEstimatesChange(updated);

        for (const { id, file } of filesToScan) {
          scanAndUpdateAmount(id, file);
        }
      }

      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    async function handleDelete(estimate: ProjectEstimate) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([estimate.storagePath]);

      if (storageError) {
        console.error("Estimate storage delete failed:", storageError);
      }

      const { error: dbError } = await supabase
        .from("project_estimates")
        .delete()
        .eq("id", estimate.id);

      if (dbError) {
        console.error("Estimate DB delete failed:", dbError);
        return;
      }

      if (thumbnailUrls[estimate.id]?.startsWith("blob:")) {
        URL.revokeObjectURL(thumbnailUrls[estimate.id]);
      }
      setThumbnailUrls((prev) => {
        const next = { ...prev };
        delete next[estimate.id];
        return next;
      });

      onEstimatesChange(estimates.filter((est) => est.id !== estimate.id));
    }

    function getFileUrl(est: ProjectEstimate): string {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(est.storagePath);
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
          aria-label="Upload project estimates"
        />

        {(estimates.length > 0 || uploading) && (
          <div className="flex items-start gap-4 mb-3">
            <span className={`flex flex-col items-end gap-0.5 text-[11px] font-medium uppercase tracking-wide w-[80px] shrink-0 mt-4 ${iconColorClass}`}>
              <InvoiceIcon size={30} />
              Estimates
            </span>
            <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-5 flex-1">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-2 gap-y-3">
                {estimates.map((est) => {
                  const thumbUrl = thumbnailUrls[est.id];

                  return (
                    <div key={est.id} className="flex flex-col">
                      <div
                        className="relative aspect-square rounded-[var(--radius-md)] overflow-hidden group cursor-pointer border border-border hover:border-accent hover:scale-105 transition-all duration-[160ms] ease-out"
                        onClick={() => window.open(getFileUrl(est), "_blank")}
                      >
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt="Estimate"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-border/40 flex items-center justify-center animate-pulse">
                            <InvoiceIcon width={22} height={22} className="text-text-4" />
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(est);
                          }}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms] hover:bg-red"
                          aria-label="Delete estimate"
                        >
                          <XIcon width={12} height={12} />
                        </button>
                      </div>
                      <span className="text-[10px] text-text-4 text-center mt-1">
                        {formatDateShort(est.createdAt)}
                      </span>
                      {scanningIds.has(est.id) ? (
                        <span className="text-[10px] text-text-3 italic text-center">Scanning...</span>
                      ) : est.amount !== null ? (
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-text-4">Estimate Total:</span>
                          <span className="text-[11px] font-semibold text-green">{formatAmount(est.amount)}</span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {uploading && (
                  <div className="flex flex-col">
                    <div className="aspect-square rounded-[var(--radius-md)] border border-border bg-border/30 flex items-center justify-center">
                      <span className="text-[10px] text-text-3">Uploading...</span>
                    </div>
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

export default ProjectEstimateSection;
