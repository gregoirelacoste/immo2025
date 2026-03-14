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
              className="w-14 h-14 rounded-lg object-cover shrink-0"
            />
            <div>
              <p className="font-semibold text-[#1a1a2e]">Tagger cette photo</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Sélectionnez une catégorie pour retrouver la photo facilement
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {tags.map((tag) => (
              <button
                key={tag.key}
                type="button"
                onClick={() =>
                  setSelectedTag(selectedTag === tag.key ? "" : tag.key)
                }
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors min-h-[40px] ${
                  selectedTag === tag.key
                    ? "bg-amber-100 text-amber-700 ring-2 ring-amber-500"
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
            className="w-full text-sm px-3 py-2.5 border border-tiili-border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />

          {/* Actions */}
          <button
            type="button"
            onClick={() => onSave(selectedTag || "photo_other", note || undefined)}
            className="w-full bg-amber-600 text-white font-semibold py-3 rounded-xl min-h-[48px] hover:bg-amber-700 transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
