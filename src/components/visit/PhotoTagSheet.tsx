"use client";

import { useState } from "react";
import type { PhotoTag } from "@/domains/visit/types";

interface Props {
  photoUrl: string;
  tags: PhotoTag[];
  suggestedTag?: string;
  onSave: (tag: string, note?: string) => void;
  onCancel: () => void;
}

export default function PhotoTagSheet({
  photoUrl,
  tags,
  suggestedTag,
  onSave,
  onCancel,
}: Props) {
  const [selectedTag, setSelectedTag] = useState(suggestedTag ?? "");
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
      />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg bg-white rounded-t-2xl shadow-xl animate-slide-up"
        style={{ paddingBottom: "var(--sab, 0px)" }}
      >
        <div className="p-4 space-y-4">
          {/* Handle */}
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />

          {/* Photo preview + title */}
          <div className="flex items-start gap-3">
            <img
              src={photoUrl}
              alt="Photo"
              className="w-20 h-20 rounded-lg object-cover shrink-0"
            />
            <div>
              <p className="font-semibold text-gray-900">Tagger cette photo</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Sélectionnez une catégorie pour retrouver la photo facilement
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {tags.map((tag) => (
              <button
                key={tag.key}
                type="button"
                onClick={() =>
                  setSelectedTag(selectedTag === tag.key ? "" : tag.key)
                }
                className={`inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
                  selectedTag === tag.key
                    ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span>{tag.icon}</span>
                <span>{tag.label}</span>
              </button>
            ))}
          </div>

          {/* Note */}
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note photo (optionnel)..."
            className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Actions */}
          <button
            type="button"
            onClick={() => onSave(selectedTag || "photo_other", note || undefined)}
            className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl min-h-[48px] hover:bg-indigo-700 transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
