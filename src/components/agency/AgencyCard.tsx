"use client";

import { Agency } from "@/domains/agency/types";

interface Props {
  agency: Agency;
  onEdit: () => void;
  onDelete: () => void;
  /** If provided, shows impact on cashflow */
  monthlyRent?: number;
}

export default function AgencyCard({ agency, onEdit, onDelete, monthlyRent }: Props) {
  const monthlyCost = monthlyRent ? monthlyRent * (agency.management_fee_rate / 100) : null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{agency.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {agency.city}{agency.postal_code ? ` (${agency.postal_code})` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors"
            title="Modifier"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
            title="Supprimer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Fee rate */}
      <div className="mt-3 flex items-center gap-3">
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-sm font-semibold">
          {agency.management_fee_rate}% du loyer
        </span>
        {agency.google_rating != null && (
          <span className="text-sm text-gray-500">
            {agency.google_rating.toFixed(1)} ({agency.google_reviews_count ?? 0} avis)
          </span>
        )}
      </div>

      {/* Monthly cost impact */}
      {monthlyCost != null && monthlyCost > 0 && (
        <div className="mt-2 text-sm text-red-600 font-medium">
          -{monthlyCost.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}/mois
        </div>
      )}

      {/* Contact info */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {agency.phone && (
          <a href={`tel:${agency.phone}`} className="hover:text-amber-700">
            {agency.phone}
          </a>
        )}
        {agency.email && (
          <a href={`mailto:${agency.email}`} className="hover:text-amber-700 truncate max-w-[200px]">
            {agency.email}
          </a>
        )}
        {agency.website && (
          <a
            href={agency.website.startsWith("http") ? agency.website : `https://${agency.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-700 truncate max-w-[200px]"
          >
            Site web
          </a>
        )}
      </div>

      {agency.source !== "manual" && (
        <div className="mt-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 uppercase tracking-wider">
            {agency.source}
          </span>
        </div>
      )}
    </div>
  );
}
