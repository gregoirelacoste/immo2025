"use client";

import Link from "next/link";
import { Property, PropertyCalculations } from "@/domains/property/types";
import { formatCurrency, formatPercent } from "@/lib/calculations";

interface Props {
  property: Property;
  calcs: PropertyCalculations;
  currentUserId?: string;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

export default function PropertyCard({ property: p, calcs: c, currentUserId, onDelete }: Props) {
  return (
    <Link
      href={`/property/${p.id}`}
      className="block bg-white rounded-xl border border-gray-200 overflow-hidden active:bg-gray-50 transition-colors"
    >
      {(() => {
        try {
          const imgs: string[] = JSON.parse(p.image_urls || "[]");
          if (imgs.length === 0) return null;
          return (
            <div className="aspect-[16/9] bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgs[0]} alt={p.city} className="w-full h-full object-cover" loading="lazy" />
            </div>
          );
        } catch { return null; }
      })()}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{p.city}</h3>
              {p.visibility === "private" && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium">Privé</span>
              )}
            </div>
            {p.address && (
              <p className="text-xs text-gray-400">{p.address}</p>
            )}
          </div>
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500">Prix</p>
            <p className="text-sm font-medium">{formatCurrency(p.purchase_price)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Surface</p>
            <p className="text-sm font-medium">{p.surface} m²</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Renta nette</p>
            <p className="text-sm font-medium">{formatPercent(c.net_yield)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Cash-flow</p>
            <p className={`text-sm font-bold ${c.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(c.monthly_cashflow)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Renta Airbnb</p>
            <p className="text-sm font-medium">{formatPercent(c.airbnb_net_yield)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">CF Airbnb</p>
            <p className={`text-sm font-bold ${c.airbnb_monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(c.airbnb_monthly_cashflow)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
