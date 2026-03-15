"use client";

import { useState } from "react";
import { Property } from "@/domains/property/types";
import { formatCurrency } from "@/lib/calculations";

interface Props {
  property: Property;
  isOwner: boolean;
  onDelete: () => void;
}

export default function PropertyHeader({ property, isOwner, onDelete }: Props) {
  const [shared, setShared] = useState(false);

  async function handleShare() {
    const title = property.city || "Bien immobilier";
    const text = [
      property.city,
      property.address,
      property.purchase_price > 0 ? formatCurrency(property.purchase_price) : null,
      property.surface > 0 ? `${property.surface} m²` : null,
    ].filter(Boolean).join(" — ");
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // User cancelled or error — ignore
      }
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 mb-1">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-[#1a1a2e] leading-tight">{property.city}</h1>
        {property.address && (
          <p className="text-gray-500 text-sm leading-snug">{property.address}</p>
        )}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs text-gray-400">
            Ajouté le{" "}
            {new Date(property.created_at).toLocaleDateString("fr-FR")}
          </span>
          {property.source_url && (
            <a
              href={property.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-500 hover:underline"
            >
              Voir l&apos;annonce source
            </a>
          )}
        </div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={handleShare}
          className="p-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
          title={shared ? "Copié !" : "Partager"}
        >
          {shared ? (
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          )}
        </button>
        {isOwner && (
          <button
            onClick={onDelete}
            className="p-2.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Supprimer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
