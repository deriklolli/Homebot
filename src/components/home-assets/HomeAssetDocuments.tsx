"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { type HomeAssetDocument } from "@/lib/home-assets-data";
import { supabase, type DbHomeAssetDocument } from "@/lib/supabase";
import { dbToHomeAssetDocument } from "@/lib/mappers";
import { XIcon } from "@/components/icons";
import { formatDateShort } from "@/lib/date-utils";

const BUCKET = "home-asset-documents";

export interface HomeAssetDocumentsHandle {
  triggerUpload: (documentType: string) => void;
}

interface HomeAssetDocumentsProps {
  assetId: string;
  documents: HomeAssetDocument[];
  onDocumentsChange: (
    docs: HomeAssetDocument[] | ((prev: HomeAssetDocument[]) => HomeAssetDocument[])
  ) => void;
}

const HomeAssetDocuments = forwardRef<HomeAssetDocumentsHandle, HomeAssetDocumentsProps>(
  function HomeAssetDocuments({ assetId, documents, onDocumentsChange }, ref) {
    const [uploading, setUploading] = useState(false);
    const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
    const [pendingDocType, setPendingDocType] = useState("Other");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      triggerUpload: (documentType: string) => {
        setPendingDocType(documentType);
        fileInputRef.current?.click();
      },
    }));

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
              document_type: pendingDocType,
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
              // Will fall back to placeholder
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

    if (documents.length === 0 && !uploading) return (
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif,.pdf,application/pdf"
        multiple
        onChange={handleUpload}
        className="hidden"
        aria-label="Upload asset documents"
      />
    );

    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif,.pdf,application/pdf"
          multiple
          onChange={handleUpload}
          className="hidden"
          aria-label="Upload asset documents"
        />

        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-border bg-bg/50">
            <span className="text-[14px] font-semibold text-text-primary">
              Important Docs
            </span>
          </div>

          <ul role="list">
            {documents.map((doc) => {
              const thumbUrl = thumbnailUrls[doc.id];

              return (
                <li
                  key={doc.id}
                  className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-b-0 group hover:bg-surface-hover transition-[background] duration-[120ms]"
                >
                  {/* Thumbnail */}
                  <div
                    className="w-10 h-10 rounded-[var(--radius-sm)] overflow-hidden border border-border bg-border/30 shrink-0 cursor-pointer"
                    onClick={() => window.open(getFileUrl(doc), "_blank")}
                  >
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={doc.documentType}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center animate-pulse">
                        <span className="text-[9px] text-text-4">...</span>
                      </div>
                    )}
                  </div>

                  {/* Document type + file name */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => window.open(getFileUrl(doc), "_blank")}
                  >
                    <span className="block text-[14px] font-semibold text-text-primary truncate">
                      {doc.documentType}
                    </span>
                    <span className="block text-[12px] text-text-3 truncate">
                      {doc.fileName}
                    </span>
                  </div>

                  {/* Date */}
                  <span className="shrink-0 text-[12px] text-text-3">
                    {formatDateShort(doc.createdAt)}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(doc)}
                    className="shrink-0 p-1.5 rounded-[var(--radius-sm)] text-text-4 opacity-0 group-hover:opacity-100 hover:bg-border hover:text-red transition-all duration-[120ms] cursor-pointer"
                    aria-label="Delete document"
                  >
                    <XIcon width={14} height={14} />
                  </button>
                </li>
              );
            })}
            {uploading && (
              <li className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-b-0">
                <div className="w-10 h-10 rounded-[var(--radius-sm)] border border-border bg-border/30 shrink-0 flex items-center justify-center">
                  <span className="inline-block w-3.5 h-3.5 border-2 border-text-4 border-t-transparent rounded-full animate-spin" />
                </div>
                <span className="text-[14px] text-text-3">Uploading...</span>
              </li>
            )}
          </ul>
        </div>
      </>
    );
  }
);

export default HomeAssetDocuments;
