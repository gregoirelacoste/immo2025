"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

import { Property, PROPERTY_STATUSES, PROPERTY_STATUS_CONFIG, type PropertyStatus } from "@/domains/property/types";
import { calculateAll, calculateSimulation, getEffectivePrice } from "@/lib/calculations";
import type { Simulation } from "@/domains/simulation/types";
import { removeProperty, toggleFavorite } from "@/domains/property/actions";
import SortBar, { SortKey } from "./SortBar";
import PropertyCard from "./PropertyCard";
import PropertyTable from "./PropertyTable";

interface Props {
  properties: Property[];
  currentUserId?: string;
  isAdmin?: boolean;
  simulationsMap?: Record<string, Simulation>;
}

export default function DashboardClient({ properties: initialProperties, currentUserId, isAdmin, simulationsMap = {} }: Props) {
  const [properties, setProperties] = useState(initialProperties);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<PropertyStatus>>(new Set(PROPERTY_STATUSES));
  const [favoriteFilter, setFavoriteFilter] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(true); // true par défaut pour éviter flash
  useEffect(() => {
    setBannerDismissed(localStorage.getItem("tiili-welcome-dismissed") === "1");
  }, []);
  function dismissBanner() {
    localStorage.setItem("tiili-welcome-dismissed", "1");
    setBannerDismissed(true);
  }

  const hasOtherUsersProperties = !!currentUserId && initialProperties.some(p => p.user_id !== currentUserId);
  const [onlyMine, setOnlyMine] = useState(hasOtherUsersProperties);
  const [activeTab, setActiveTab] = useState<"all" | "mine" | "fav">(hasOtherUsersProperties ? "mine" : "all");

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
    ? statusFiltered.filter((p) => p.is_favorite && p.user_id === currentUserId)
    : statusFiltered;

  const propertiesWithCalcs = useMemo(
    () =>
      filteredProperties.map((p) => {
        const sim = simulationsMap[p.id];
        return {
          property: p,
          calcs: sim ? calculateSimulation(p, sim) : calculateAll(p),
        };
      }),
    [filteredProperties, simulationsMap]
  );

  const sorted = useMemo(() => {
    return [...propertiesWithCalcs].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortKey) {
        case "city":
          aVal = a.property.city;
          bVal = b.property.city;
          break;
        case "purchase_price":
          aVal = getEffectivePrice(a.property);
          bVal = getEffectivePrice(b.property);
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
  }, [propertiesWithCalcs, sortKey, sortAsc]);

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
    // Optimistic update
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_favorite: p.is_favorite ? 0 : 1 } : p))
    );
    await toggleFavorite(id);
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Supprimer ce bien ?")) return;
    // Optimistic update
    setProperties((prev) => prev.filter((p) => p.id !== id));
    const result = await removeProperty(id);
    if (!result.success) {
      alert(result.error ?? "Erreur lors de la suppression.");
      // Revert on failure
      setProperties(initialProperties);
    }
  }

  // Count per status (from owner-filtered list)
  const statusCounts: Record<string, number> = {};
  for (const p of ownerFiltered) {
    const s = p.property_status || "added";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  const mineCount = currentUserId ? properties.filter(p => p.user_id === currentUserId).length : 0;
  const favCount = currentUserId ? properties.filter(p => p.is_favorite && p.user_id === currentUserId).length : 0;

  const tabs = [
    { key: "all" as const, label: "Tous", count: properties.length },
    ...(currentUserId && properties.some(p => p.user_id !== currentUserId)
      ? [{ key: "mine" as const, label: "Mes biens", count: mineCount }]
      : []),
    ...(currentUserId
      ? [{ key: "fav" as const, label: "\u2605", count: favCount }]
      : []),
  ];

  return (
    <div className="pb-safe">
      {/* ═══ Welcome banner for anonymous visitors ═══ */}
      {!currentUserId && !bannerDismissed && (
        <div className="bg-white rounded-xl border border-tiili-border p-5 md:p-6 mb-4 relative">
          <button
            onClick={dismissBanner}
            className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-300 hover:text-gray-500 transition-colors"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-[#1a1a2e] mb-1">
                Analysez un investissement locatif en 30 secondes
              </h2>
              <p className="text-sm text-gray-500 max-w-lg">
                Collez un lien d&apos;annonce ou le texte d&apos;une fiche — tiili calcule rendement, cash-flow et score automatiquement. Les biens ci-dessous sont des exemples publics.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Link
                href="/property/new"
                className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition-colors shadow-[0_2px_8px_rgba(217,119,6,0.25)]"
              >
                Essayer gratuitement
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] border border-tiili-border text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Créer un compte
              </Link>
            </div>
          </div>
        </div>
      )}

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
                  <span className={`w-[5px] h-[5px] rounded-full ${PROPERTY_STATUS_CONFIG[status]?.dotColor || "bg-gray-400"}`} />
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
                <span className={`w-[5px] h-[5px] rounded-full ${PROPERTY_STATUS_CONFIG[status]?.dotColor || "bg-gray-400"}`} />
                {config.label}
                <span className="text-[#b0b0b8]">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {(properties.length === 0 || (activeTab === "mine" && mineCount === 0)) && currentUserId ? (
        <div className="bg-white rounded-xl border border-tiili-border p-8 md:p-10">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-3 bg-amber-50 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-[#1a1a2e] mb-1">Ajoutez votre premier bien</h2>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              tiili calcule rendement, cash-flow et score d&apos;investissement automatiquement.
            </p>
          </div>

          <div className="grid gap-3 max-w-lg mx-auto">
            <Link
              href="/property/new"
              className="flex items-start gap-3 p-4 rounded-xl border border-tiili-border hover:border-amber-300 hover:bg-amber-50/30 transition-colors group"
            >
              <span className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
                <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-[#1a1a2e]">Coller un lien d&apos;annonce</p>
                <p className="text-xs text-gray-400 mt-0.5">LeBonCoin, SeLoger, PAP... le lien est conservé et les données extraites si possible</p>
              </div>
            </Link>

            <Link
              href="/property/new"
              className="flex items-start gap-3 p-4 rounded-xl border border-tiili-border hover:border-amber-300 hover:bg-amber-50/30 transition-colors group"
            >
              <span className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                <svg className="w-5 h-5 text-blue-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-[#1a1a2e]">Copier-coller le texte d&apos;une annonce</p>
                <p className="text-xs text-gray-400 mt-0.5">L&apos;IA extrait prix, surface, loyer et plus depuis le texte brut</p>
              </div>
            </Link>

            <Link
              href="/property/new"
              className="flex items-start gap-3 p-4 rounded-xl border border-tiili-border hover:border-amber-300 hover:bg-amber-50/30 transition-colors group"
            >
              <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-[#1a1a2e]">Saisir manuellement</p>
                <p className="text-xs text-gray-400 mt-0.5">Remplissez les champs vous-même, les calculs se font en temps réel</p>
              </div>
            </Link>
          </div>

          {properties.length > 0 && activeTab === "mine" && (
            <p className="text-center mt-4">
              <button
                onClick={() => handleTabChange("all")}
                className="text-xs text-gray-400 hover:text-amber-600 underline underline-offset-2 transition-colors"
              >
                Voir les {properties.length} biens publics
              </button>
            </p>
          )}
        </div>
      ) : properties.length === 0 && !currentUserId ? (
        <div className="bg-white rounded-xl border border-tiili-border p-12 text-center">
          <p className="text-[#9ca3af] text-lg mb-4">
            Aucun bien enregistré pour le moment.
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

          <div className="md:hidden flex flex-col gap-2 pt-1">
            {sorted.map(({ property, calcs }, i) => (
              <PropertyCard
                key={property.id}
                property={property}
                calcs={calcs}
                index={i}
              />
            ))}
          </div>

          <PropertyTable
            sorted={sorted}
            sortKey={sortKey}
            sortAsc={sortAsc}
            onSort={toggleSort}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
          />
        </>
      )}
    </div>
  );
}
