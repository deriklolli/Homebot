"use client";

import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { type HomeAssetDocument } from "@/lib/home-assets-data";
import { supabase, type DbHomeAssetDocument } from "@/lib/supabase";
import { dbToHomeAssetDocument } from "@/lib/mappers";
import { XIcon } from "@/components/icons";

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
    const [pendingDocType, setPendingDocType] = useState("Other");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      triggerUpload: (documentType: string) => {
        setPendingDocType(documentType);
        fileInputRef.current?.click();
      },
    }));

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      const newDocs: HomeAssetDocument[] = [];

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

          newDocs.push(dbToHomeAssetDocument(rows[0]));
        } catch (err) {
          console.error("Document processing failed:", err);
        }
      }

      if (newDocs.length > 0) {
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

        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-5 mb-5">
          <span className="block text-[11px] font-medium text-[#D4BDAB] uppercase tracking-wide mb-3">
            Important Docs
          </span>
          <div className="flex flex-wrap gap-2">
            {documents.map((doc) => (
              <div key={doc.id} className="group relative inline-flex">
                <a
                  href={getFileUrl(doc)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[var(--radius-sm)] border border-border-strong bg-bg text-[13px] text-text-2 hover:bg-border hover:text-text-primary transition-all duration-[120ms]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  {doc.documentType}
                </a>
                <button
                  onClick={() => handleDelete(doc)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms] cursor-pointer"
                  aria-label={`Delete ${doc.documentType}`}
                >
                  <XIcon width={10} height={10} />
                </button>
              </div>
            ))}
            {uploading && (
              <div className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[var(--radius-sm)] border border-border-strong bg-bg text-[13px] text-text-3">
                <span className="inline-block w-3.5 h-3.5 border-2 border-text-4 border-t-transparent rounded-full animate-spin" />
                Uploading...
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
);

export default HomeAssetDocuments;
