"use client";

import Link from "next/link";
import { Property, PropertyCalculations, type PropertyStatus } from "@/domains/property/types";
import { formatCurrency, formatPercent } from "@/lib/calculations";
import InvestmentScoreBadge from "@/components/ui/InvestmentScoreBadge";
import StatusBadge from "@/components/property/StatusBadge";
import { SortKey } from "./SortBar";

interface Props {
  sorted: Array<{ property: Property; calcs: PropertyCalculations }>;
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
  currentUserId?: string;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onToggleFavorite?: (e: React.MouseEvent, id: string) => void;
}

export default function PropertyTable({ sorted, sortKey, sortAsc, onSort, currentUserId, onDelete, onToggleFavorite }: Props) {
  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";

  const thClass =
    "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 whitespace-nowrap";

  return (
    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className={`${thClass} w-8`}></th>
            <th className={thClass} onClick={() => onSort("city")}>
              Ville{sortIcon("city")}
            </th>
            <th className={thClass}>Statut</th>
            <th className={thClass} onClick={() => onSort("purchase_price")}>
              Prix{sortIcon("purchase_price")}
            </th>
            <th className={thClass}>Surface</th>
            <th className={thClass}>Prix/m²</th>
            <th className={thClass} onClick={() => onSort("net_yield")}>
              Renta nette{sortIcon("net_yield")}
            </th>
            <th className={thClass} onClick={() => onSort("monthly_cashflow")}>
              Cash-flow{sortIcon("monthly_cashflow")}
            </th>
            <th className={thClass} onClick={() => onSort("airbnb_net_yield")}>
              Renta Airbnb{sortIcon("airbnb_net_yield")}
            </th>
            <th className={thClass}>CF Airbnb</th>
            <th className={thClass} onClick={() => onSort("investment_score")}>
              Score{sortIcon("investment_score")}
            </th>
            <th className={thClass}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sorted.map(({ property: p, calcs: c }) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-1 py-4 text-center">
                {currentUserId && p.user_id === currentUserId && onToggleFavorite ? (
                  <button
                    onClick={(e) => onToggleFavorite(e, p.id)}
                    className="text-amber-400 hover:text-amber-500 text-lg"
                  >
                    {p.is_favorite ? "\u2605" : "\u2606"}
                  </button>
                ) : (
                  <span className="text-gray-300 text-lg">{p.is_favorite ? "\u2605" : ""}</span>
                )}
              </td>
              <td className="px-3 py-4 text-sm font-medium text-gray-900">
                <div className="flex items-center gap-3">
                  {(() => {
                    try {
                      const imgs: string[] = JSON.parse(p.image_urls || "[]");
                      if (imgs.length === 0) return null;
                      return (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imgs[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      );
                    } catch { return null; }
                  })()}
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/property/${p.id}`} className="hover:text-indigo-600">
                        {p.city}
                      </Link>
                      {p.visibility === "private" && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium">Privé</span>
                      )}
                    </div>
                    {p.address && (
                      <div className="text-xs text-gray-400">{p.address}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-3 py-4 text-sm">
                <StatusBadge status={(p.property_status || "added") as PropertyStatus} />
              </td>
              <td className="px-3 py-4 text-sm text-gray-700">{formatCurrency(p.purchase_price)}</td>
              <td className="px-3 py-4 text-sm text-gray-700">{p.surface} m²</td>
              <td className="px-3 py-4 text-sm text-gray-700">
                {p.surface > 0 ? formatCurrency(p.purchase_price / p.surface) : "—"}
              </td>
              <td className="px-3 py-4 text-sm text-gray-700">{formatPercent(c.net_yield)}</td>
              <td className={`px-3 py-4 text-sm font-semibold ${c.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(c.monthly_cashflow)}
              </td>
              <td className="px-3 py-4 text-sm text-gray-700">{formatPercent(c.airbnb_net_yield)}</td>
              <td className={`px-3 py-4 text-sm font-semibold ${c.airbnb_monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(c.airbnb_monthly_cashflow)}
              </td>
              <td className="px-3 py-4 text-sm">
                <InvestmentScoreBadge score={p.investment_score} size="sm" />
              </td>
              <td className="px-3 py-4 text-sm space-x-2 whitespace-nowrap">
                <Link href={`/property/${p.id}`} className="text-indigo-600 hover:underline">
                  Voir
                </Link>
                {currentUserId && p.user_id === currentUserId && (
                  <button
                    onClick={(e) => onDelete(e, p.id)}
                    className="text-red-500 hover:underline"
                  >
                    Suppr.
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
