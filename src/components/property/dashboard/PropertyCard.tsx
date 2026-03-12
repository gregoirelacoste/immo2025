"use client";

import Link from "next/link";
import { Property, PropertyCalculations } from "@/domains/property/types";
import { formatCurrency, formatPercent } from "@/lib/calculations";
import InvestmentScoreBadge from "@/components/ui/InvestmentScoreBadge";
import { parseAmenities, AMENITY_ICONS } from "@/domains/property/amenities";

interface Props {
  property: Property;
  calcs: PropertyCalculations;
  currentUserId?: string;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

/** Barre colorée en haut de la card selon le cashflow */
function getCashflowAccent(cashflow: number): string {
  if (cashflow >= 100) return "bg-green-500";
  if (cashflow >= 0) return "bg-green-300";
  if (cashflow >= -100) return "bg-amber-400";
  return "bg-red-400";
}

export default function PropertyCard({ property: p, calcs: c, currentUserId, onDelete }: Props) {
  const images: string[] = (() => {
    try { return JSON.parse(p.image_urls || "[]"); }
    catch { return []; }
  })();
  const amenities = parseAmenities(p.amenities);
  const hasImage = images.length > 0;

  return (
    <Link
      href={`/property/${p.id}`}
      className="block bg-white rounded-xl border border-gray-200 overflow-hidden active:bg-gray-50 transition-colors relative"
    >
      {/* Accent bar — couleur selon cashflow */}
      <div className={`h-1 ${getCashflowAccent(c.monthly_cashflow)}`} />

      {/* Image (optionnel) */}
      {hasImage && (
        <div className="relative aspect-[16/9] bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[0]} alt={p.city} className="w-full h-full object-cover" loading="lazy" />
          {/* Overlay gradient pour lisibilité */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {/* Prix overlay sur l'image */}
          <div className="absolute bottom-2 left-3">
            <p className="text-white font-bold text-lg drop-shadow-sm">{formatCurrency(p.purchase_price)}</p>
            <p className="text-white/80 text-xs">{p.surface} m²</p>
          </div>
          {p.investment_score != null && (
            <div className="absolute top-2 right-2">
              <InvestmentScoreBadge score={p.investment_score} size="md" />
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Header : Ville + badge */}
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 truncate">{p.city}</h3>
              <span className="text-xs text-gray-400 capitalize shrink-0">{p.property_type}</span>
              {p.visibility === "private" && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium shrink-0">Prive</span>
              )}
            </div>
            {p.address && (
              <p className="text-xs text-gray-400 truncate">{p.address}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Score badge quand pas d'image */}
            {!hasImage && p.investment_score != null && (
              <InvestmentScoreBadge score={p.investment_score} size="md" />
            )}
            {currentUserId && p.user_id === currentUserId && (
              <button
                onClick={(e) => onDelete(e, p.id)}
                className="p-2 -mr-2 -mt-1 text-gray-400 hover:text-red-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Prix + Surface (quand pas d'image) */}
        {!hasImage && (
          <div className="flex items-baseline gap-3 mb-3">
            <p className="text-lg font-bold text-gray-900">{formatCurrency(p.purchase_price)}</p>
            <p className="text-sm text-gray-500">{p.surface} m²</p>
          </div>
        )}

        {/* KPIs principaux — 2x2 grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Renta nette</p>
            <p className={`text-sm font-bold ${c.net_yield >= 6 ? "text-green-600" : c.net_yield >= 4 ? "text-blue-600" : c.net_yield >= 2 ? "text-amber-600" : "text-red-600"}`}>
              {formatPercent(c.net_yield)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Cash-flow</p>
            <p className={`text-sm font-bold ${c.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(c.monthly_cashflow)}
            </p>
          </div>
          {p.airbnb_price_per_night > 0 && (
            <>
              <div className="bg-purple-50 rounded-lg px-3 py-2">
                <p className="text-[10px] text-purple-500 uppercase tracking-wide">Airbnb</p>
                <p className={`text-sm font-bold ${c.airbnb_net_yield >= 6 ? "text-green-600" : c.airbnb_net_yield >= 4 ? "text-blue-600" : "text-amber-600"}`}>
                  {formatPercent(c.airbnb_net_yield)}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg px-3 py-2">
                <p className="text-[10px] text-purple-500 uppercase tracking-wide">CF Airbnb</p>
                <p className={`text-sm font-bold ${c.airbnb_monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(c.airbnb_monthly_cashflow)}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Amenities chips (max 4, compact) */}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {amenities.slice(0, 4).map((key) => (
              <span key={key} className="text-[11px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                {AMENITY_ICONS[key]}
              </span>
            ))}
            {amenities.length > 4 && (
              <span className="text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                +{amenities.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
