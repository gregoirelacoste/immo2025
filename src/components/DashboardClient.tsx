"use client";

import { useState } from "react";
import Link from "next/link";
import { Property } from "@/types/property";
import { calculateAll, formatCurrency, formatPercent } from "@/lib/calculations";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type SortKey =
  | "city"
  | "purchase_price"
  | "surface"
  | "gross_yield"
  | "net_yield"
  | "monthly_cashflow"
  | "airbnb_net_yield"
  | "airbnb_monthly_cashflow"
  | "created_at";

interface Props {
  properties: Property[];
}

export default function DashboardClient({ properties }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Pre-calculate all properties
  const propertiesWithCalcs = properties.map((p) => ({
    property: p,
    calcs: calculateAll(p),
  }));

  // Sort
  const sorted = [...propertiesWithCalcs].sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;

    switch (sortKey) {
      case "city":
        aVal = a.property.city;
        bVal = b.property.city;
        break;
      case "purchase_price":
        aVal = a.property.purchase_price;
        bVal = b.property.purchase_price;
        break;
      case "surface":
        aVal = a.property.surface;
        bVal = b.property.surface;
        break;
      case "gross_yield":
        aVal = a.calcs.gross_yield;
        bVal = b.calcs.gross_yield;
        break;
      case "net_yield":
        aVal = a.calcs.net_yield;
        bVal = b.calcs.net_yield;
        break;
      case "monthly_cashflow":
        aVal = a.calcs.monthly_cashflow;
        bVal = b.calcs.monthly_cashflow;
        break;
      case "airbnb_net_yield":
        aVal = a.calcs.airbnb_net_yield;
        bVal = b.calcs.airbnb_net_yield;
        break;
      case "airbnb_monthly_cashflow":
        aVal = a.calcs.airbnb_monthly_cashflow;
        bVal = b.calcs.airbnb_monthly_cashflow;
        break;
      default:
        aVal = a.property.created_at;
        bVal = b.property.created_at;
    }

    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce bien ?")) return;
    await supabase.from("properties").delete().eq("id", id);
    router.refresh();
  }

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";

  const thClass =
    "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 whitespace-nowrap";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes biens</h1>
          <p className="text-gray-500 text-sm mt-1">
            {properties.length} bien{properties.length !== 1 ? "s" : ""} enregistré
            {properties.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/property/new"
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Nouveau bien
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">
            Aucun bien enregistré pour le moment.
          </p>
          <Link
            href="/property/new"
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Ajouter mon premier bien
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={thClass} onClick={() => toggleSort("city")}>
                  Ville{sortIcon("city")}
                </th>
                <th className={thClass} onClick={() => toggleSort("purchase_price")}>
                  Prix{sortIcon("purchase_price")}
                </th>
                <th className={thClass} onClick={() => toggleSort("surface")}>
                  Surface{sortIcon("surface")}
                </th>
                <th className={thClass}>Prix/m²</th>
                <th className={thClass} onClick={() => toggleSort("gross_yield")}>
                  Renta brute{sortIcon("gross_yield")}
                </th>
                <th className={thClass} onClick={() => toggleSort("net_yield")}>
                  Renta nette{sortIcon("net_yield")}
                </th>
                <th className={thClass} onClick={() => toggleSort("monthly_cashflow")}>
                  Cash-flow{sortIcon("monthly_cashflow")}
                </th>
                <th className={thClass} onClick={() => toggleSort("airbnb_net_yield")}>
                  Renta Airbnb{sortIcon("airbnb_net_yield")}
                </th>
                <th className={thClass} onClick={() => toggleSort("airbnb_monthly_cashflow")}>
                  CF Airbnb{sortIcon("airbnb_monthly_cashflow")}
                </th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sorted.map(({ property: p, calcs: c }) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-4 text-sm font-medium text-gray-900">
                    <Link
                      href={`/property/${p.id}`}
                      className="hover:text-indigo-600"
                    >
                      {p.city}
                    </Link>
                    {p.address && (
                      <div className="text-xs text-gray-400">{p.address}</div>
                    )}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-700">
                    {formatCurrency(p.purchase_price)}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-700">
                    {p.surface} m²
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-700">
                    {p.surface > 0
                      ? formatCurrency(p.purchase_price / p.surface)
                      : "—"}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-700">
                    {formatPercent(c.gross_yield)}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-700">
                    {formatPercent(c.net_yield)}
                  </td>
                  <td
                    className={`px-3 py-4 text-sm font-semibold ${
                      c.monthly_cashflow >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(c.monthly_cashflow)}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-700">
                    {formatPercent(c.airbnb_net_yield)}
                  </td>
                  <td
                    className={`px-3 py-4 text-sm font-semibold ${
                      c.airbnb_monthly_cashflow >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(c.airbnb_monthly_cashflow)}
                  </td>
                  <td className="px-3 py-4 text-sm space-x-2 whitespace-nowrap">
                    <Link
                      href={`/property/${p.id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      Voir
                    </Link>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-red-500 hover:underline"
                    >
                      Suppr.
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
