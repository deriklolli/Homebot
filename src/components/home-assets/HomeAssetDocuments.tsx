"use client";

import { useState, useRef, useEffect } from "react";
import { type HomeAssetDocument } from "@/lib/home-assets-data";
import { supabase, type DbHomeAssetDocument } from "@/lib/supabase";
import { dbToHomeAssetDocument } from "@/lib/mappers";
import { UploadIcon, XIcon } from "@/components/icons";
import { formatDateShort } from "@/lib/date-utils";

const BUCKET = "home-asset-documents";

interface HomeAssetDocumentsProps {
  assetId: string;
  documents: HomeAssetDocument[];
  onDocumentsChange: (
    docs: HomeAssetDocument[] | ((prev: HomeAssetDocument[]) => HomeAssetDocument[])
  ) => void;
}

export default function HomeAssetDocuments({
  assetId,
  documents,
  onDocumentsChange,
}: HomeAssetDocumentsProps) {
  const [uploading, setUploading] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate thumbnails for documents
  useEffect(() => {
    async function fetchThumbnails() {
      const need = documents.filter((doc) => !thumbnailUrls[doc.id]);
      if (need.length === 0) return;

      for (const doc of need) {
        try {
          const isPdf =
            doc.fileType === "application/pdf" ||
            doc.storagePath.endsWith(".pdf");

          if (isPdf) {
            const { data, error } = await supabase.storage
              .from(BUCKET)
              .download(doc.storagePath);

            if (error || !data) continue;

            const { renderPdfThumbnail } = await import(
              "@/lib/pdf-thumbnail"
            );
            const dataUrl = await renderPdfThumbnail(
              await data.arrayBuffer()
            );
            setThumbnailUrls((prev) => ({ ...prev, [doc.id]: dataUrl }));
          } else {
            const { data, error } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(doc.storagePath, 3600);

            if (error || !data?.signedUrl) continue;
            setThumbnailUrls((prev) => ({
              ...prev,
              [doc.id]: data.signedUrl,
            }));
          }
        } catch {
          // Silently skip — will show fallback
        }
      }
    }

    fetchThumbnails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newDocs: HomeAssetDocument[] = [];
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
          const { compressImage } = await import("@/lib/compress-image");
          uploadBlob = await compressImage(file);
          contentType = "image/jpeg";
          ext = "jpg";
        }

        const storagePath = `${assetId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, uploadBlob, {
            contentType,
            cacheControl: "31536000",
          });

        if (uploadError) {
          console.error("Document upload failed:", uploadError);
          continue;
        }

        const { data: rows, error: dbError } = await supabase
          .from("home_asset_documents")
          .insert({
            home_asset_id: assetId,
            storage_path: storagePath,
            file_name: file.name,
            file_type: contentType,
          } as Record<string, unknown>)
          .select()
          .returns<DbHomeAssetDocument[]>();

        if (dbError) {
          console.error("Document DB insert failed:", dbError);
          continue;
        }

        const doc = dbToHomeAssetDocument(rows[0]);
        newDocs.push(doc);

        // Immediate local thumbnail
        if (isPdf) {
          try {
            const { renderPdfThumbnail } = await import(
              "@/lib/pdf-thumbnail"
            );
            localUrls[doc.id] = await renderPdfThumbnail(file);
          } catch {
            // Will fall back to icon
          }
        } else {
          localUrls[doc.id] = URL.createObjectURL(uploadBlob);
        }
      } catch (err) {
        console.error("Document processing failed:", err);
      }
    }

    if (newDocs.length > 0) {
      if (Object.keys(localUrls).length > 0) {
        setThumbnailUrls((prev) => ({ ...prev, ...localUrls }));
      }
      onDocumentsChange([...documents, ...newDocs]);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(doc: HomeAssetDocument) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([doc.storagePath]);

    if (storageError) {
      console.error("Document storage delete failed:", storageError);
    }

    const { error: dbError } = await supabase
      .from("home_asset_documents")
      .delete()
      .eq("id", doc.id);

    if (dbError) {
      console.error("Document DB delete failed:", dbError);
      return;
    }

    // Revoke blob URL if it exists
    if (thumbnailUrls[doc.id]?.startsWith("blob:")) {
      URL.revokeObjectURL(thumbnailUrls[doc.id]);
    }
    setThumbnailUrls((prev) => {
      const next = { ...prev };
      delete next[doc.id];
      return next;
    });

    onDocumentsChange(documents.filter((d) => d.id !== doc.id));
  }

  function getFileUrl(doc: HomeAssetDocument): string {
    const { data } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(doc.storagePath);
    return data.publicUrl;
  }

  return (
    <div className="pt-4 border-t border-dotted border-border-strong mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium text-text-4 uppercase tracking-wide">
          Documents & Manuals
        </span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-2.5 py-[4px] rounded-[var(--radius-sm)] bg-accent text-white text-[11px] font-medium hover:brightness-110 transition-all duration-[120ms] disabled:opacity-50 cursor-pointer"
        >
          <UploadIcon width={12} height={12} />
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif,.pdf,application/pdf"
        multiple
        onChange={handleUpload}
        className="hidden"
        aria-label="Upload asset documents"
      />

      {/* Content */}
      {documents.length === 0 && !uploading ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-6 rounded-[var(--radius-md)] border-2 border-dashed border-border-strong flex flex-col items-center gap-2 text-text-4 hover:border-accent hover:text-accent transition-all duration-[120ms] cursor-pointer"
        >
          <UploadIcon width={22} height={22} />
          <span className="text-[12px] font-medium">
            Upload manuals, warranty cards, receipts...
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-3">
          {documents.map((doc) => {
            const thumbUrl = thumbnailUrls[doc.id];

            return (
              <div key={doc.id} className="flex flex-col">
                <div
                  className="relative aspect-square rounded-[var(--radius-md)] overflow-hidden group cursor-pointer border border-border hover:border-accent hover:scale-105 transition-all duration-[160ms] ease-out"
                  onClick={() => window.open(getFileUrl(doc), "_blank")}
                >
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={doc.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-border/40 flex items-center justify-center animate-pulse">
                      <UploadIcon
                        width={18}
                        height={18}
                        className="text-text-4"
                      />
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc);
                    }}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms] hover:bg-red cursor-pointer"
                    aria-label="Delete document"
                  >
                    <XIcon width={12} height={12} />
                  </button>
                </div>
                <span className="text-[10px] text-text-4 text-center mt-1 truncate">
                  {doc.fileName}
                </span>
                <span className="text-[9px] text-text-4 text-center">
                  {formatDateShort(doc.createdAt)}
                </span>
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
      )}
    </div>
  );
}
