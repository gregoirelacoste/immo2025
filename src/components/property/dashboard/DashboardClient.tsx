"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Property, PROPERTY_STATUSES, PROPERTY_STATUS_CONFIG, type PropertyStatus } from "@/domains/property/types";
import { calculateAll } from "@/lib/calculations";
import { removeProperty, toggleFavorite } from "@/domains/property/actions";
import SortBar, { SortKey } from "./SortBar";
import PropertyCard from "./PropertyCard";
import PropertyTable from "./PropertyTable";


interface Props {
  properties: Property[];
  currentUserId?: string;
}

const STATUS_DOT_COLORS: Record<string, string> = {
  added: "bg-blue-500",
  visited: "bg-violet-500",
  offer_made: "bg-amber-500",
  won: "bg-green-500",
  invalid: "bg-red-500",
};

export default function DashboardClient({ properties, currentUserId }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<PropertyStatus>>(new Set(PROPERTY_STATUSES));
  const [favoriteFilter, setFavoriteFilter] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "mine" | "fav">("all");
  const router = useRouter();

  const allSelected = statusFilter.size === PROPERTY_STATUSES.length;

  function toggleStatusFilter(status: PropertyStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
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
    setFavoriteFilter(false);
    setOnlyMine(false);
    setActiveTab("all");
  }

  function handleTabChange(tab: "all" | "mine" | "fav") {
    setActiveTab(tab);
    if (tab === "all") {
      setOnlyMine(false);
      setFavoriteFilter(false);
    } else if (tab === "mine") {
      setOnlyMine(true);
      setFavoriteFilter(false);
    } else if (tab === "fav") {
      setFavoriteFilter(true);
      setOnlyMine(false);
    }
  }

  const ownerFiltered = onlyMine && currentUserId
    ? properties.filter((p) => p.user_id === currentUserId)
    : properties;

  const statusFiltered = allSelected
    ? ownerFiltered
    : ownerFiltered.filter((p) => statusFilter.has((p.property_status || "added") as PropertyStatus));

  const filteredProperties = favoriteFilter
    ? statusFiltered.filter((p) => p.is_favorite)
    : statusFiltered;

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

  async function handleToggleFavorite(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    await toggleFavorite(id);
    router.refresh();
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

  // Count per status (from owner-filtered list)
  const statusCounts: Record<string, number> = {};
  for (const p of ownerFiltered) {
    const s = p.property_status || "added";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  const mineCount = currentUserId ? properties.filter(p => p.user_id === currentUserId).length : 0;
  const favCount = properties.filter(p => p.is_favorite).length;

  const tabs = [
    { key: "all" as const, label: "Tous", count: properties.length },
    ...(currentUserId && properties.some(p => p.user_id !== currentUserId)
      ? [{ key: "mine" as const, label: "Mes biens", count: mineCount }]
      : []),
    { key: "fav" as const, label: "\u2605", count: favCount },
  ];

  return (
    <div className="pb-safe">
      {/* ═══ Sticky header with tabs + status filters ═══ */}
      <div className="md:hidden sticky top-12 z-30 bg-white border-b border-tiili-border -mx-4">
        {/* Tabs */}
        <div className="flex gap-0 px-4 border-b border-[#f0f0ee]">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`px-3.5 py-2 pb-2.5 text-[13px] font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === t.key
                  ? "border-[#1a1a2e] text-[#1a1a2e] font-bold"
                  : "border-transparent text-[#9ca3af]"
              }`}
            >
              {t.label}
              <span className={`text-[10px] font-semibold ${
                activeTab === t.key ? "text-gray-500" : "text-[#c4c4c8]"
              }`}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Status filters */}
        {currentUserId && (
          <div className="flex gap-1.5 px-4 py-2 overflow-x-auto scrollbar-hide">
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
                      setStatusFilter(new Set([status]));
                    } else {
                      toggleStatusFilter(status);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? "bg-tiili-surface border border-tiili-border text-[#1a1a2e]"
                      : "bg-tiili-surface border border-tiili-border text-gray-500"
                  }`}
                >
                  <span className={`w-[5px] h-[5px] rounded-full ${STATUS_DOT_COLORS[status] || "bg-gray-400"}`} />
                  {config.label}
                  <span className="text-[#b0b0b8]">{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Desktop header ═══ */}
      <div className="hidden md:flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === t.key
                  ? "border-[#1a1a2e] text-[#1a1a2e] font-bold"
                  : "border-transparent text-[#9ca3af] hover:text-gray-600"
              }`}
            >
              {t.label}
              <span className={`text-xs ${activeTab === t.key ? "text-gray-500" : "text-[#c4c4c8]"}`}>{t.count}</span>
            </button>
          ))}
        </div>
        <Link
          href="/property/new"
          className="inline-flex px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors shadow-[0_2px_8px_rgba(217,119,6,0.2)]"
        >
          + Nouveau bien
        </Link>
      </div>

      {/* Desktop status filter bar */}
      {properties.length > 0 && currentUserId && (
        <div className="hidden md:flex flex-wrap gap-1.5 mb-4">
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
                    setStatusFilter(new Set([status]));
                  } else {
                    toggleStatusFilter(status);
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? "bg-tiili-surface border border-tiili-border text-[#1a1a2e]"
                    : "bg-tiili-surface border border-tiili-border text-gray-500 hover:bg-gray-100"
                }`}
              >
                <span className={`w-[5px] h-[5px] rounded-full ${STATUS_DOT_COLORS[status] || "bg-gray-400"}`} />
                {config.label}
                <span className="text-[#b0b0b8]">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {properties.length === 0 ? (
        <div className="bg-white rounded-xl border border-tiili-border p-12 text-center">
          <p className="text-[#9ca3af] text-lg mb-4">
            Aucun bien enregistre pour le moment.
          </p>
          <Link
            href="/property/new"
            className="inline-flex px-5 py-3 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors min-h-[44px] items-center shadow-[0_2px_8px_rgba(217,119,6,0.2)]"
          >
            Ajouter mon premier bien
          </Link>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="bg-white rounded-xl border border-tiili-border p-8 text-center">
          <p className="text-[#9ca3af]">Aucun bien avec ce statut.</p>
        </div>
      ) : (
        <>
          <SortBar sortKey={sortKey} sortAsc={sortAsc} onSort={toggleSort} />

          {/* Column header — IDE-style (mobile only) */}
          <div className="md:hidden flex justify-between items-center px-5 pt-2 pb-1">
            <span className="text-[9px] text-[#b0b0b8] font-semibold tracking-wider uppercase">Bien</span>
            <div className="flex gap-6">
              <span className="text-[9px] text-[#b0b0b8] font-semibold tracking-wider uppercase w-14 text-right">Prix</span>
              <span className="text-[9px] text-[#b0b0b8] font-semibold tracking-wider uppercase w-10 text-right">Renta</span>
              <span className="text-[9px] text-[#b0b0b8] font-semibold tracking-wider uppercase w-12 text-right">CF</span>
            </div>
          </div>

          <div className="md:hidden flex flex-col gap-1.5">
            {sorted.map(({ property, calcs }) => (
              <PropertyCard
                key={property.id}
                property={property}
                calcs={calcs}
                currentUserId={currentUserId}
                onDelete={handleDelete}
                onToggleFavorite={handleToggleFavorite}
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
            onToggleFavorite={handleToggleFavorite}
          />
        </>
      )}
    </div>
  );
}
