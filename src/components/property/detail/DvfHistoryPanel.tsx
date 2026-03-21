"use client";

import { useEffect, useState } from "react";
import { getDvfHistoryForProperty } from "@/domains/market/dvf-actions";
import type { DvfTransaction } from "@/domains/market/dvf-history";
import { formatCurrency } from "@/lib/calculations";
import CollapsibleSection from "@/components/ui/CollapsibleSection";

interface Props {
  city: string;
  postalCode: string;
  currentPricePerM2: number;
  roomCount?: number;
}

export default function DvfHistoryPanel({ city, postalCode, currentPricePerM2, roomCount }: Props) {
  const [transactions, setTransactions] = useState<DvfTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!city) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getDvfHistoryForProperty(city, postalCode || undefined)
      .then((data) => {
        if (!cancelled) setTransactions(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [city, postalCode]);

  // Filter by room count if available, for a more targeted comparison
  const filteredByRooms = roomCount && roomCount > 0
    ? transactions.filter(t => roomCount >= 5 ? t.rooms >= 5 : t.rooms === roomCount)
    : [];
  const hasRoomFiltered = filteredByRooms.length >= 3;
  const compareSet = hasRoomFiltered ? filteredByRooms : transactions;

  const avgPricePerM2 =
    compareSet.length > 0
      ? Math.round(compareSet.reduce((sum, t) => sum + t.pricePerM2, 0) / compareSet.length)
      : 0;

  const delta =
    avgPricePerM2 > 0 && currentPricePerM2 > 0
      ? ((currentPricePerM2 - avgPricePerM2) / avgPricePerM2) * 100
      : null;

  function isCloseToCurrentPrice(txPricePerM2: number): boolean {
    if (currentPricePerM2 <= 0) return false;
    const ratio = txPricePerM2 / currentPricePerM2;
    return ratio >= 0.85 && ratio <= 1.15;
  }

  function formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <CollapsibleSection title="Historique des ventes (DVF)" variant="emerald">
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">Erreur lors du chargement des données DVF.</p>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-gray-500">Aucune transaction trouvée pour {city}.</p>
      ) : (
        <div className="space-y-3">
          {/* Delta summary */}
          {delta !== null && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">
                Votre prix/m² vs moyenne DVF{hasRoomFiltered && roomCount ? ` (${roomCount >= 5 ? "T5+" : `T${roomCount}`})` : ""} :
              </span>
              <span className={`font-semibold ${delta <= 0 ? "text-green-600" : "text-red-600"}`}>
                {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
              </span>
              <span className="text-gray-400">
                ({formatCurrency(currentPricePerM2)} vs {formatCurrency(avgPricePerM2)}/m²)
              </span>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto -mx-4 md:-mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-tiili-border text-left text-gray-500">
                  <th className="px-4 md:px-6 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium text-right">Prix</th>
                  <th className="px-2 py-2 font-medium text-right">Surface</th>
                  <th className="px-2 py-2 font-medium text-right">Prix/m²</th>
                  <th className="px-2 py-2 font-medium hidden md:table-cell">Type</th>
                  <th className="px-2 py-2 font-medium text-right hidden md:table-cell">Pièces</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => {
                  const highlighted = isCloseToCurrentPrice(tx.pricePerM2);
                  return (
                    <tr
                      key={i}
                      className={`border-b border-gray-100 ${
                        highlighted ? "bg-emerald-50" : ""
                      }`}
                    >
                      <td className="px-4 md:px-6 py-2 whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="px-2 py-2 text-right whitespace-nowrap font-medium">
                        {formatCurrency(tx.price)}
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap">{tx.surface} m²</td>
                      <td className="px-2 py-2 text-right whitespace-nowrap font-medium">
                        {formatCurrency(tx.pricePerM2)}
                      </td>
                      <td className="px-2 py-2 hidden md:table-cell">{tx.type}</td>
                      <td className="px-2 py-2 text-right hidden md:table-cell">
                        {tx.rooms > 0 ? tx.rooms : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 mt-1">
            Source : DVF (Demandes de Valeurs Foncières) — données publiques
          </p>
        </div>
      )}
    </CollapsibleSection>
  );
}
