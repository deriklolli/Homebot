"use client";

import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { type HomeAssetDocument } from "@/lib/home-assets-data";
import { supabase, type DbHomeAssetDocument } from "@/lib/supabase";
import { dbToHomeAssetDocument } from "@/lib/mappers";

const BUCKET = "home-asset-documents";

export interface HomeAssetDocumentsHandle {
  triggerUpload: (documentType: string) => void;
  deleteDocument: (doc: HomeAssetDocument) => void;
  getFileUrl: (doc: HomeAssetDocument) => string;
  uploading: boolean;
}

interface HomeAssetDocumentsProps {
  assetId: string;
  documents: HomeAssetDocument[];
  onDocumentsChange: (
    docs: HomeAssetDocument[] | ((prev: HomeAssetDocument[]) => HomeAssetDocument[])
  ) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

const HomeAssetDocuments = forwardRef<HomeAssetDocumentsHandle, HomeAssetDocumentsProps>(
  function HomeAssetDocuments({ assetId, documents, onDocumentsChange, onUploadingChange }, ref) {
    const [uploading, setUploading] = useState(false);
    const [pendingDocType, setPendingDocType] = useState("Other");
    const fileInputRef = useRef<HTMLInputElement>(null);

    function getFileUrl(doc: HomeAssetDocument): string {
      const { data } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(doc.storagePath);
      return data.publicUrl;
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

    useImperativeHandle(ref, () => ({
      triggerUpload: (documentType: string) => {
        setPendingDocType(documentType);
        fileInputRef.current?.click();
      },
      deleteDocument: handleDelete,
      getFileUrl,
      uploading,
    }));

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      onUploadingChange?.(true);
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
      onUploadingChange?.(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    return (
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
  }
);

export default HomeAssetDocuments;
