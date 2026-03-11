"use client";

import { PhotoExtractedListing } from "@/domains/collect/types";
import { formatCurrency } from "@/lib/calculations";

interface Props {
  listings: PhotoExtractedListing[];
  onSelect: (listing: PhotoExtractedListing) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function PhotoListingPicker({ listings, onSelect, onCancel, loading }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-indigo-700">
          {listings.length} annonces détectées
        </span>
        <span className="text-xs text-gray-500">— sélectionnez celle à importer</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {listings.map((listing, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(listing)}
            disabled={loading}
            className="w-full text-left px-3 py-3 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold text-gray-900 text-sm">
                {listing.purchase_price
                  ? formatCurrency(listing.purchase_price)
                  : "Prix non indiqué"}
              </span>
              {listing.surface && (
                <span className="text-xs text-gray-500">{listing.surface} m²</span>
              )}
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              {[listing.city, listing.postal_code, listing.address]
                .filter(Boolean)
                .join(" — ") || "Localisation non indiquée"}
            </div>
            {listing.description && (
              <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                {listing.description}
              </p>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="w-full px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors min-h-[44px]"
      >
        Annuler
      </button>
    </div>
  );
}
