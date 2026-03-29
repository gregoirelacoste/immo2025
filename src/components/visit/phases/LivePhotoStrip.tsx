"use client";

import { useCallback } from "react";

interface PhotoItem {
  localId: number;
  uri: string;
  tag: string;
  note?: string;
}

interface Props {
  photos: PhotoItem[];
  onRemove: (localId: number) => void;
}

export default function LivePhotoStrip({ photos, onRemove }: Props) {
  if (photos.length === 0) return null;

  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Photos
        </span>
        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">
          {photos.length}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {photos.map((photo) => (
          <PhotoThumb
            key={photo.localId}
            photo={photo}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}

function PhotoThumb({
  photo,
  onRemove,
}: {
  photo: PhotoItem;
  onRemove: (id: number) => void;
}) {
  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove(photo.localId);
    },
    [photo.localId, onRemove],
  );

  return (
    <div className="relative flex-shrink-0">
      <img
        src={photo.uri}
        alt={photo.tag}
        className="w-16 h-16 rounded-lg object-cover"
      />
      <button
        type="button"
        onClick={handleRemove}
        aria-label="Supprimer la photo"
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px]"
      >
        ✕
      </button>
      {photo.tag && photo.tag !== "photo_other" && (
        <span className="absolute bottom-0.5 left-0.5 text-[8px] px-1 py-0.5 bg-black/50 text-white rounded leading-tight">
          {photo.tag.replace("photo_", "")}
        </span>
      )}
    </div>
  );
}
