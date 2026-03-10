"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Property } from "@/types/property";
import { calculateAll, formatCurrency, formatPercent } from "@/lib/calculations";
import { removeProperty } from "@/lib/actions";

type SortKey =
  | "city"
  | "purchase_price"
  | "net_yield"
  | "monthly_cashflow"
  | "airbnb_net_yield"
  | "created_at";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "created_at", label: "Date" },
  { key: "city", label: "Ville" },
  { key: "purchase_price", label: "Prix" },
  { key: "net_yield", label: "Renta nette" },
  { key: "monthly_cashflow", label: "Cash-flow" },
  { key: "airbnb_net_yield", label: "Renta Airbnb" },
];

interface Props {
  properties: Property[];
}

export default function DashboardClient({ properties }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const router = useRouter();

  const propertiesWithCalcs = properties.map((p) => ({
    property: p,
    calcs: calculateAll(p),
  }));

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

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Supprimer ce bien ?")) return;
    await removeProperty(id);
    router.refresh();
  }

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";

  const thClass =
    "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 whitespace-nowrap";

  return (
    <div className="pb-safe">
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
          className="hidden md:inline-flex px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
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
            className="inline-flex px-5 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors min-h-[44px] items-center"
          >
            Ajouter mon premier bien
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile sort control */}
          <div className="md:hidden flex gap-2 mb-4 overflow-x-auto pb-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => toggleSort(opt.key)}
                className={`px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap min-h-[36px] ${
                  sortKey === opt.key
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200"
                }`}
              >
                {opt.label}{sortIcon(opt.key)}
              </button>
            ))}
          </div>

          {/* Mobile card view */}
          <div className="md:hidden space-y-3">
            {sorted.map(({ property: p, calcs: c }) => (
              <Link
                key={p.id}
                href={`/property/${p.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.city}</h3>
                    {p.address && (
                      <p className="text-xs text-gray-400">{p.address}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, p.id)}
                    className="p-2 -mr-2 -mt-1 text-gray-400 hover:text-red-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
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
                    <p
                      className={`text-sm font-bold ${
                        c.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(c.monthly_cashflow)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Renta Airbnb</p>
                    <p className="text-sm font-medium">{formatPercent(c.airbnb_net_yield)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">CF Airbnb</p>
                    <p
                      className={`text-sm font-bold ${
                        c.airbnb_monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(c.airbnb_monthly_cashflow)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className={thClass} onClick={() => toggleSort("city")}>
                    Ville{sortIcon("city")}
                  </th>
                  <th className={thClass} onClick={() => toggleSort("purchase_price")}>
                    Prix{sortIcon("purchase_price")}
                  </th>
                  <th className={thClass}>Surface</th>
                  <th className={thClass}>Prix/m²</th>
                  <th className={thClass} onClick={() => toggleSort("net_yield")}>
                    Renta nette{sortIcon("net_yield")}
                  </th>
                  <th className={thClass} onClick={() => toggleSort("monthly_cashflow")}>
                    Cash-flow{sortIcon("monthly_cashflow")}
                  </th>
                  <th className={thClass} onClick={() => toggleSort("airbnb_net_yield")}>
                    Renta Airbnb{sortIcon("airbnb_net_yield")}
                  </th>
                  <th className={thClass}>CF Airbnb</th>
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
                        onClick={(e) => handleDelete(e, p.id)}
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
        </>
      )}
    </div>
  );
}
