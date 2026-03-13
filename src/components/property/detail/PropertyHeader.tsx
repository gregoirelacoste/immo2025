"use client";

import { useState } from "react";
import Link from "next/link";
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
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-900 truncate">{property.city}</h1>
        {property.address && (
          <p className="text-gray-500 text-sm truncate">{property.address}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Ajouté le{" "}
          {new Date(property.created_at).toLocaleDateString("fr-FR")}
        </p>
        {property.source_url && (
          <a
            href={property.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-500 hover:underline mt-0.5 inline-block"
          >
            Voir l&apos;annonce source
          </a>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleShare}
          className="px-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 min-h-[44px] flex items-center gap-1.5"
          title="Partager"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {shared ? "Copié !" : "Partager"}
        </button>
        {isOwner && (
          <>
            <Link
              href={`/property/${property.id}/edit`}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 min-h-[44px] flex items-center"
            >
              Modifier
            </Link>
            <button
              onClick={onDelete}
              className="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 min-h-[44px] flex items-center"
            >
              Supprimer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
