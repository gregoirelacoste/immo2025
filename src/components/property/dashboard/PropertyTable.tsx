"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Property, PropertyCalculations, type PropertyStatus } from "@/domains/property/types";
import { formatCurrency, formatPercent } from "@/lib/calculations";
import InvestmentScoreBadge from "@/components/ui/InvestmentScoreBadge";
import StatusBadge from "@/components/property/StatusBadge";
import { getGrade, rentaColor, cashflowColor } from "@/lib/grade";
import { SortKey } from "./SortBar";

const PAGE_SIZE = 50;

interface Props {
  sorted: Array<{ property: Property; calcs: PropertyCalculations }>;
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
  currentUserId?: string;
  isAdmin?: boolean;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onToggleFavorite?: (e: React.MouseEvent, id: string) => void;
}

export default function PropertyTable({ sorted, sortKey, sortAsc, onSort, currentUserId, isAdmin, onDelete, onToggleFavorite }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleRows = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount]);
  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " \u2191" : " \u2193") : "";

  const thClass =
    "px-3 py-3 text-left text-[9px] font-semibold text-[#b0b0b8] uppercase tracking-wider cursor-pointer hover:text-gray-600 whitespace-nowrap";

  return (
    <div className="hidden md:block bg-white rounded-xl border border-tiili-border overflow-x-auto">
      <table className="min-w-full divide-y divide-tiili-border">
        <thead className="bg-tiili-surface">
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
              Grade{sortIcon("investment_score")}
            </th>
            <th className={thClass}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-tiili-border">
          {visibleRows.map(({ property: p, calcs: c }) => {
            const grade = getGrade(p.investment_score);
            return (
              <tr key={p.id} className="hover:bg-tiili-surface/50">
                <td className="px-1 py-4 text-center">
                  {(isAdmin || (currentUserId && p.user_id === currentUserId)) && onToggleFavorite ? (
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
                <td className="px-3 py-4 text-sm font-semibold text-[#1a1a2e]">
                  <div className="flex items-center gap-3">
                    {(() => {
                      try {
                        const imgs: string[] = JSON.parse(p.image_urls || "[]");
                        if (imgs.length === 0) return null;
                        return (
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
                            <Image src={imgs[0]} alt={p.city} fill className="object-cover" sizes="48px" unoptimized />
                          </div>
                        );
                      } catch { return null; }
                    })()}
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/property/${p.id}`} className="hover:text-amber-600">
                          {p.city}
                        </Link>
                        {p.visibility === "private" && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium">Prive</span>
                        )}
                      </div>
                      {p.address && (
                        <div className="text-xs text-[#b0b0b8]">{p.address}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4 text-sm">
                  <StatusBadge status={(p.property_status || "added") as PropertyStatus} />
                </td>
                <td className="px-3 py-4 text-sm text-gray-700 font-[family-name:var(--font-mono)]">{formatCurrency(p.purchase_price)}</td>
                <td className="px-3 py-4 text-sm text-gray-700">{p.surface} m²</td>
                <td className="px-3 py-4 text-sm text-gray-700 font-[family-name:var(--font-mono)]">
                  {p.surface > 0 ? formatCurrency(p.purchase_price / p.surface) : "\u2014"}
                </td>
                <td className={`px-3 py-4 text-sm font-bold font-[family-name:var(--font-mono)] ${rentaColor(c.net_yield)}`}>
                  {formatPercent(c.net_yield)}
                </td>
                <td className={`px-3 py-4 text-sm font-bold font-[family-name:var(--font-mono)] ${cashflowColor(c.monthly_cashflow)}`}>
                  {formatCurrency(c.monthly_cashflow)}
                </td>
                <td className={`px-3 py-4 text-sm font-bold font-[family-name:var(--font-mono)] ${rentaColor(c.airbnb_net_yield)}`}>
                  {formatPercent(c.airbnb_net_yield)}
                </td>
                <td className={`px-3 py-4 text-sm font-bold font-[family-name:var(--font-mono)] ${cashflowColor(c.airbnb_monthly_cashflow)}`}>
                  {formatCurrency(c.airbnb_monthly_cashflow)}
                </td>
                <td className="px-3 py-4 text-sm">
                  <InvestmentScoreBadge score={p.investment_score} size="sm" />
                </td>
                <td className="px-3 py-4 text-sm space-x-2 whitespace-nowrap">
                  <Link href={`/property/${p.id}`} className="text-amber-600 hover:underline">
                    Voir
                  </Link>
                  {(isAdmin || (currentUserId && p.user_id === currentUserId)) && (
                    <button
                      onClick={(e) => onDelete(e, p.id)}
                      className="text-red-500 hover:underline"
                    >
                      Suppr.
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length > visibleCount && (
        <div className="text-center py-3 border-t border-tiili-border">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            Afficher {Math.min(PAGE_SIZE, sorted.length - visibleCount)} biens de plus ({sorted.length - visibleCount} restants)
          </button>
        </div>
      )}
    </div>
  );
}
