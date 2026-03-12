"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Property, PROPERTY_STATUSES, PROPERTY_STATUS_CONFIG, type PropertyStatus } from "@/domains/property/types";
import { calculateAll } from "@/lib/calculations";
import { removeProperty } from "@/domains/property/actions";
import SortBar, { SortKey } from "./SortBar";
import PropertyCard from "./PropertyCard";
import PropertyTable from "./PropertyTable";
import SmartCollector from "@/components/collect/SmartCollector";

interface Props {
  properties: Property[];
  currentUserId?: string;
}

export default function DashboardClient({ properties, currentUserId }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<PropertyStatus>>(new Set(PROPERTY_STATUSES));
  const router = useRouter();

  const allSelected = statusFilter.size === PROPERTY_STATUSES.length;

  function toggleStatusFilter(status: PropertyStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        // Don't allow deselecting the last one
        if (next.size <= 1) return prev;
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }

  function selectAll() {
    setStatusFilter(new Set(PROPERTY_STATUSES));
  }

  const filteredProperties = allSelected
    ? properties
    : properties.filter((p) => statusFilter.has((p.property_status || "added") as PropertyStatus));

  const propertiesWithCalcs = filteredProperties.map((p) => ({
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
      case "investment_score":
        aVal = a.property.investment_score ?? -1;
        bVal = b.property.investment_score ?? -1;
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
    const result = await removeProperty(id);
    if (!result.success) {
      alert(result.error ?? "Erreur lors de la suppression.");
      return;
    }
    router.refresh();
  }

  // Count per status (from unfiltered list)
  const statusCounts: Record<string, number> = {};
  for (const p of properties) {
    const s = p.property_status || "added";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  return (
    <div className="pb-safe">
      <SmartCollector compact />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Biens immobiliers</h1>
          <p className="text-gray-500 text-sm mt-1">
            {filteredProperties.length === properties.length
              ? `${properties.length} bien${properties.length !== 1 ? "s" : ""}`
              : `${filteredProperties.length} / ${properties.length} bien${properties.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/property/new"
          className="hidden md:inline-flex px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Nouveau bien
        </Link>
      </div>

      {/* Status filter bar — only for logged-in users */}
      {properties.length > 0 && currentUserId && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={selectAll}
            className={`text-xs px-2.5 py-1.5 rounded-full font-medium transition-colors ${
              allSelected
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Tous ({properties.length})
          </button>
          {PROPERTY_STATUSES.map((status) => {
            const config = PROPERTY_STATUS_CONFIG[status];
            const count = statusCounts[status] || 0;
            if (count === 0 && allSelected) return null;
            const active = statusFilter.has(status) && !allSelected;
            return (
              <button
                key={status}
                onClick={() => {
                  if (allSelected) {
                    // Switch from "all" to single filter
                    setStatusFilter(new Set([status]));
                  } else {
                    toggleStatusFilter(status);
                  }
                }}
                className={`text-xs px-2.5 py-1.5 rounded-full font-medium transition-colors inline-flex items-center gap-1 ${
                  active
                    ? `${config.bgColor} ${config.color} ring-1 ring-current/20`
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                <span>{config.icon}</span>
                {config.label}
                {count > 0 && <span className="opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>
      )}

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
      ) : filteredProperties.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Aucun bien avec ce statut.</p>
        </div>
      ) : (
        <>
          <SortBar sortKey={sortKey} sortAsc={sortAsc} onSort={toggleSort} />

          <div className="md:hidden space-y-3">
            {sorted.map(({ property, calcs }) => (
              <PropertyCard
                key={property.id}
                property={property}
                calcs={calcs}
                currentUserId={currentUserId}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <PropertyTable
            sorted={sorted}
            sortKey={sortKey}
            sortAsc={sortAsc}
            onSort={toggleSort}
            currentUserId={currentUserId}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
}
