"use client";

import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { type ProjectImage } from "@/lib/projects-data";
import { supabase, type DbProjectImage } from "@/lib/supabase";
import { dbToProjectImage } from "@/lib/mappers";
import { compressImage } from "@/lib/compress-image";
import {
  CameraIcon,
  XIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/icons";

export interface ProjectImageGalleryHandle {
  triggerUpload: () => void;
}

interface ProjectImageGalleryProps {
  projectId: string;
  images: ProjectImage[];
  onImagesChange: (images: ProjectImage[]) => void;
}

const BUCKET = "project-images";

function getPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

const ProjectImageGallery = forwardRef<ProjectImageGalleryHandle, ProjectImageGalleryProps>(function ProjectImageGallery({
  projectId,
  images,
  onImagesChange,
}, ref) {
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    triggerUpload: () => fileInputRef.current?.click(),
  }));

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: ProjectImage[] = [];

    for (const file of Array.from(files)) {
      try {
        const compressed = await compressImage(file);
        const ext = "jpg";
        const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(fileName, compressed, {
            contentType: "image/jpeg",
            cacheControl: "31536000",
          });

        if (uploadError) {
          console.error("Upload failed:", uploadError);
          continue;
        }

        const { data: rows, error: dbError } = await supabase
          .from("project_images")
          .insert({
            project_id: projectId,
            storage_path: fileName,
            caption: "",
          } as Record<string, unknown>)
          .select()
          .returns<DbProjectImage[]>();

        if (dbError) {
          console.error("DB insert failed:", dbError);
          continue;
        }

        newImages.push(dbToProjectImage(rows[0]));
      } catch (err) {
        console.error("Image processing failed:", err);
      }
    }

    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages]);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(image: ProjectImage) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([image.storagePath]);

    if (storageError) {
      console.error("Storage delete failed:", storageError);
    }

    const { error: dbError } = await supabase
      .from("project_images")
      .delete()
      .eq("id", image.id);

    if (dbError) {
      console.error("DB delete failed:", dbError);
      return;
    }

    const updated = images.filter((img) => img.id !== image.id);
    onImagesChange(updated);

    if (lightboxIndex !== null) {
      if (updated.length === 0) {
        setLightboxIndex(null);
      } else if (lightboxIndex >= updated.length) {
        setLightboxIndex(updated.length - 1);
      }
    }
  }

  function openLightbox(index: number) {
    setLightboxIndex(index);
  }

  function closeLightbox() {
    setLightboxIndex(null);
  }

  function prevImage() {
    if (lightboxIndex === null) return;
    setLightboxIndex(lightboxIndex === 0 ? images.length - 1 : lightboxIndex - 1);
  }

  function nextImage() {
    if (lightboxIndex === null) return;
    setLightboxIndex(lightboxIndex === images.length - 1 ? 0 : lightboxIndex + 1);
  }

  return (
    <>
      {/* Hidden file input — always rendered so triggerUpload works from the dropdown */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        className="hidden"
        aria-label="Upload project photos"
      />

      {images.length > 0 && (
        <div className="flex items-start gap-4 mb-3">
          <span className="flex flex-col items-end gap-0.5 text-[11px] font-medium text-text-4 uppercase tracking-wide w-[80px] shrink-0 mt-4">
            <CameraIcon width={30} height={30} className="text-accent" />
            Photos
          </span>
          <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-5 flex-1">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
              {images.map((img, i) => (
                <div
                  key={img.id}
                  className="relative aspect-square rounded-[var(--radius-md)] overflow-hidden group cursor-pointer border border-border hover:border-accent hover:scale-105 transition-all duration-[160ms] ease-out"
                  onClick={() => openLightbox(i)}
                >
                  <img
                    src={getPublicUrl(img.storagePath)}
                    alt={img.caption || "Project photo"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(img);
                    }}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms] hover:bg-red"
                    aria-label="Delete photo"
                  >
                    <XIcon width={12} height={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
            aria-label="Close lightbox"
          >
            <XIcon width={20} height={20} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(images[lightboxIndex]);
            }}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/10 text-white hover:bg-red transition-colors z-10"
            aria-label="Delete photo"
          >
            <TrashIcon width={18} height={18} />
          </button>

          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Previous photo"
            >
              <ChevronLeftIcon width={24} height={24} />
            </button>
          )}

          <img
            src={getPublicUrl(images[lightboxIndex].storagePath)}
            alt={images[lightboxIndex].caption || "Project photo"}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-[var(--radius-md)]"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Next photo"
            >
              <ChevronRightIcon width={24} height={24} />
            </button>
          )}

          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-[13px] font-medium">
            {lightboxIndex + 1} / {images.length}
          </span>
        </div>
      )}
    </>
  );
});

export default ProjectImageGallery;
