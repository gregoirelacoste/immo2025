"use client";

import { Property } from "@/domains/property/types";
import { formatCurrency } from "@/lib/calculations";

interface CompareSelectorProps {
  properties: Property[];
  selected: string[];
  onToggle: (id: string) => void;
  maxSelected: number;
}

export default function CompareSelector({
  properties,
  selected,
  onToggle,
  maxSelected,
}: CompareSelectorProps) {
  const isMaxReached = selected.length >= maxSelected;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {properties.map((p) => {
        const isSelected = selected.includes(p.id);
        const isDisabled = !isSelected && isMaxReached;
        const images: string[] = p.image_urls ? (() => { try { return JSON.parse(p.image_urls); } catch { return []; } })() : [];
        const thumb = images[0] || null;

        return (
          <button
            key={p.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onToggle(p.id)}
            className={`relative text-left rounded-xl border-2 p-3 transition-all ${
              isSelected
                ? "border-amber-500 ring-2 ring-amber-200 bg-amber-50"
                : isDisabled
                  ? "border-tiili-border bg-gray-50 opacity-50 cursor-not-allowed"
                  : "border-tiili-border bg-white hover:border-gray-300 hover:shadow-sm cursor-pointer"
            }`}
          >
            {/* Checkbox indicator */}
            <div
              className={`absolute top-2 right-2 w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                isSelected
                  ? "bg-amber-600 border-amber-600"
                  : "border-gray-300 bg-white"
              }`}
            >
              {isSelected && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>

            {/* Thumbnail */}
            {thumb && (
              <div className="w-full h-20 mb-2 rounded-lg overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Info */}
            <div className="pr-6">
              <p className="font-semibold text-sm text-[#1a1a2e] truncate">
                {p.city || "Ville inconnue"}
              </p>
              {p.address && (
                <p className="text-xs text-gray-500 truncate">{p.address}</p>
              )}
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
                <span className="font-medium">{formatCurrency(p.purchase_price)}</span>
                {p.surface > 0 && <span>{p.surface} m²</span>}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
