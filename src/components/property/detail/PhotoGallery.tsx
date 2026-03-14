"use client";

import { useRef, useState, useTransition } from "react";
import type { Photo } from "@/domains/photo/types";
import { uploadPhoto, deletePhotoAction } from "@/domains/photo/actions";

interface Props {
  photos: Photo[];
  scrapedImages: string[];
  isOwner: boolean;
  propertyId: string;
}

export default function PhotoGallery({ photos, scrapedImages, isOwner, propertyId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("source", "upload");

    await uploadPhoto(propertyId, formData);
    setUploading(false);

    // Reset input
    e.target.value = "";
  };

  const handleDelete = (photoId: string) => {
    if (!confirm("Supprimer cette photo ?")) return;
    startTransition(async () => {
      await deletePhotoAction(photoId, propertyId);
    });
  };

  const allPhotos: Array<{ type: "db"; photo: Photo } | { type: "scraped"; url: string; index: number }> = [
    ...photos.map((p) => ({ type: "db" as const, photo: p })),
    ...scrapedImages.map((url, i) => ({ type: "scraped" as const, url, index: i })),
  ];

  if (allPhotos.length === 0 && !isOwner) return null;

  return (
    <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">
          Photos ({allPhotos.length})
        </h3>
        {isOwner && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            )}
            Ajouter
          </button>
        )}
      </div>

      {allPhotos.length === 0 && isOwner && (
        <div className="text-center py-8 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
          </svg>
          <p className="text-sm">Aucune photo pour le moment</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            Ajouter une photo
          </button>
        </div>
      )}

      {allPhotos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {allPhotos.map((item, i) => {
            const url = item.type === "db" ? item.photo.url : item.url;
            const tag = item.type === "db" ? item.photo.tag : "";
            const note = item.type === "db" ? item.photo.note : "";
            const key = item.type === "db" ? item.photo.id : `scraped-${item.index}`;

            return (
              <div
                key={key}
                className="relative aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => setFullscreenUrl(url)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={tag || `Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Tag badge */}
                {tag && (
                  <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 bg-black/50 text-white rounded">
                    {tag}
                  </span>
                )}
                {/* Source badge */}
                {item.type === "scraped" && (
                  <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 bg-blue-500/70 text-white rounded">
                    annonce
                  </span>
                )}
                {item.type === "db" && item.photo.source === "visit" && (
                  <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 bg-purple-500/70 text-white rounded">
                    visite
                  </span>
                )}
                {/* Note tooltip on hover */}
                {note && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[11px] text-white truncate">{note}</p>
                  </div>
                )}
                {/* Delete button */}
                {isOwner && item.type === "db" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.photo.id);
                    }}
                    disabled={isPending}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleUpload}
        className="hidden"
      />

      {/* Fullscreen overlay */}
      {fullscreenUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreenUrl(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center text-xl hover:bg-white/30 transition-colors"
            onClick={() => setFullscreenUrl(null)}
          >
            &times;
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullscreenUrl}
            alt="Photo plein écran"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
