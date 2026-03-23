"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Property } from "@/domains/property/types";
import { formatCurrency, calculateFiscalImpact, getEffectivePrice } from "@/lib/calculations";
import {
  suggestTypology,
  getPacksForTypology,
  PACK_LEVEL_CONFIG,
  TYPOLOGY_CONFIG,
  FURNITURE_AMORTIZATION_YEARS,
  groupItemsByCategory,
  CATEGORY_LABELS,
  type PackLevel,
  type FurniturePack,
} from "@/domains/property/furniture-packs";
import { saveMeubleChoice } from "@/domains/property/actions";

type MeubleStatus = "non_meuble" | "meuble" | "deja_meuble";

const STATUS_OPTIONS: { value: MeubleStatus; label: string; desc: string }[] = [
  { value: "non_meuble", label: "Non meublé", desc: "Location nue classique" },
  { value: "meuble",     label: "Meublé",     desc: "Ameublement à prévoir" },
  { value: "deja_meuble", label: "Déjà meublé", desc: "Mobilier inclus à l'achat" },
];

interface Props {
  property: Property;
  isOwner: boolean;
}

export default function AmenagementTab({ property, isOwner }: Props) {
  const router = useRouter();
  const typology = suggestTypology(property.surface);
  const packs = useMemo(() => getPacksForTypology(typology), [typology]);

  const [status, setStatus] = useState<MeubleStatus>(
    (property.meuble_status as MeubleStatus) || "non_meuble"
  );
  const currentCost = property.furniture_cost || 0;
  const [selectedCost, setSelectedCost] = useState(currentCost);
  const [customMode, setCustomMode] = useState(
    currentCost > 0 && !packs.some((p) => p.totalPrice === currentCost)
  );
  const [customValue, setCustomValue] = useState(
    customMode ? String(currentCost) : ""
  );
  const [expandedPack, setExpandedPack] = useState<PackLevel | null>(null);
  const [isPending, startTransition] = useTransition();

  // Fiscal impact for the selected cost
  const fiscalWithFurniture = useMemo(() => {
    const cost = selectedCost > 0 ? selectedCost : 5000;
    const interestYear1 = property.loan_amount * (property.interest_rate / 100);
    return calculateFiscalImpact({
      annualRent: property.monthly_rent * 12,
      purchasePrice: getEffectivePrice(property),
      renovationCost: property.renovation_cost,
      deductibleCharges: {
        condoCharges: property.condo_charges,
        propertyTax: property.property_tax,
        pnoInsurance: property.pno_insurance || 0,
        maintenance: (property.maintenance_per_m2 || 0) * (property.surface || 0),
        gliCost: 0,
        loanInsurance: 0,
        interestYear1,
      },
      furnitureCost: cost,
    });
  }, [property, selectedCost]);

  const effectiveCost = selectedCost > 0 ? selectedCost : 5000;
  const annualAmort = Math.round(effectiveCost / FURNITURE_AMORTIZATION_YEARS);

  function persist(newStatus: MeubleStatus, cost: number) {
    startTransition(async () => {
      await saveMeubleChoice(property.id, newStatus, cost);
      router.refresh();
    });
  }

  function handleStatusChange(newStatus: MeubleStatus) {
    if (!isOwner) return;
    setStatus(newStatus);
    if (newStatus === "meuble") {
      persist(newStatus, selectedCost);
    } else {
      // non_meuble / deja_meuble: reset furniture cost
      setSelectedCost(0);
      setCustomMode(false);
      setCustomValue("");
      persist(newStatus, 0);
    }
  }

  function handleSelectPack(pack: FurniturePack) {
    if (!isOwner) return;
    setCustomMode(false);
    setCustomValue("");
    const newCost = selectedCost === pack.totalPrice ? 0 : pack.totalPrice;
    setSelectedCost(newCost);
    persist("meuble", newCost);
  }

  function handleCustomSubmit() {
    const val = parseInt(customValue, 10);
    if (isNaN(val) || val < 0) return;
    setSelectedCost(val);
    persist("meuble", val);
  }

  const isFurnished = status === "meuble" || status === "deja_meuble";

  return (
    <div className="space-y-4 mt-4">
      {/* ═══ Regime selector ═══ */}
      <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          Type de location
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Le choix meublé bascule automatiquement toutes vos simulations en régime LMNP Réel.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const active = status === opt.value;
            return (
              <button
                key={opt.value}
                disabled={!isOwner}
                onClick={() => handleStatusChange(opt.value)}
                className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                  active
                    ? "border-amber-400 bg-amber-50 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                } ${!isOwner ? "opacity-60 cursor-default" : "cursor-pointer"}`}
              >
                {active && (
                  <div className="absolute -top-2 right-3 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <span className={`block text-sm font-semibold ${active ? "text-amber-800" : "text-gray-900"}`}>
                  {opt.label}
                </span>
                <span className="block text-[11px] text-gray-400 mt-0.5">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Regime impact badge */}
        {isFurnished && (
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200">
            <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs text-blue-700">
              Régime fiscal <strong>LMNP Réel</strong> appliqué à toutes les simulations
            </span>
          </div>
        )}
      </section>

      {/* ═══ Already furnished info ═══ */}
      {status === "deja_meuble" && (
        <section className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-green-800 space-y-1">
              <p className="font-semibold">Bien déjà meublé</p>
              <p>
                Le mobilier est inclus dans le prix d&apos;achat. Le régime LMNP Réel est activé
                sur vos simulations. L&apos;amortissement mobilier utilise le forfait par défaut
                (5 000 €) dans le calcul fiscal.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ═══ Pack selection (only when "meuble") ═══ */}
      {status === "meuble" && (
        <>
          <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-gray-900">
                Pack ameublement
              </h3>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                {TYPOLOGY_CONFIG[typology].label} — {property.surface} m²
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Sélectionnez un pack pour intégrer le coût mobilier dans
              l&apos;amortissement LMNP (amorti sur {FURNITURE_AMORTIZATION_YEARS} ans).
            </p>

            {/* Pack cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {packs.map((pack) => {
                const config = PACK_LEVEL_CONFIG[pack.level];
                const isSelected = selectedCost === pack.totalPrice && !customMode;
                const grouped = groupItemsByCategory(pack.items);
                const isExpanded = expandedPack === pack.level;

                return (
                  <div
                    key={pack.level}
                    className={`relative bg-white rounded-xl border-2 transition-all ${
                      isSelected
                        ? `${config.borderColor} ${config.bgColor} shadow-md`
                        : "border-tiili-border hover:border-gray-300"
                    } ${isOwner ? "cursor-pointer" : ""}`}
                    onClick={() => handleSelectPack(pack)}
                  >
                    {isSelected && (
                      <div
                        className={`absolute -top-2.5 left-4 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full ${config.bgColor} ${config.color} border ${config.borderColor}`}
                      >
                        Sélectionné
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-bold ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-lg font-extrabold text-[#1a1a2e] font-[family-name:var(--font-mono)]">
                          {formatCurrency(pack.totalPrice)}
                        </span>
                      </div>

                      <p className="text-xs text-gray-400 mb-3">
                        {config.description}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 pb-3 border-b border-gray-100">
                        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                        </svg>
                        <span>
                          Amortissement :{" "}
                          <strong className="text-gray-700">
                            {formatCurrency(Math.round(pack.totalPrice / FURNITURE_AMORTIZATION_YEARS))}/an
                          </strong>{" "}
                          sur {FURNITURE_AMORTIZATION_YEARS} ans
                        </span>
                      </div>

                      <button
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedPack(isExpanded ? null : pack.level);
                        }}
                      >
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <span>{pack.items.length} éléments inclus</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2">
                          {Object.entries(grouped).map(([cat, items]) => (
                            <div key={cat}>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                {CATEGORY_LABELS[cat] || cat}
                              </p>
                              <ul className="space-y-0.5">
                                {items.map((item, i) => (
                                  <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                                    <span className="w-1 h-1 bg-gray-300 rounded-full shrink-0" />
                                    {item.quantity > 1 && (
                                      <span className="text-gray-400">{item.quantity}×</span>
                                    )}
                                    {item.label}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Custom amount */}
          {isOwner && (
            <section className="bg-white rounded-xl border border-tiili-border p-4">
              <div className="flex items-center gap-3">
                <button
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                    customMode
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                  onClick={() => {
                    setCustomMode(!customMode);
                    if (!customMode) {
                      setSelectedCost(0);
                    }
                  }}
                >
                  Montant personnalisé
                </button>
                {customMode && (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Ex: 4200"
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCustomSubmit();
                      }}
                      className="w-28 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-amber-400 font-[family-name:var(--font-mono)]"
                    />
                    <span className="text-xs text-gray-400">€</span>
                    <button
                      onClick={handleCustomSubmit}
                      className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      Appliquer
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Fiscal impact card */}
          {selectedCost > 0 && (
            <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Impact fiscal LMNP Réel
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Coût mobilier</span>
                    <span className="font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)]">
                      {formatCurrency(selectedCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Amortissement/an</span>
                    <span className="font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)]">
                      {formatCurrency(annualAmort)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Durée</span>
                    <span className="font-semibold text-[#1a1a2e]">
                      {FURNITURE_AMORTIZATION_YEARS} ans
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Impôt LMNP Réel</span>
                    <span className="font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)]">
                      {formatCurrency(fiscalWithFurniture.lmnp_reel_tax)}/an
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Revenu net-net</span>
                    <span className="font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)]">
                      {formatCurrency(fiscalWithFurniture.net_net_income_reel)}/an
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* ═══ Non meublé info ═══ */}
      {status === "non_meuble" && (
        <section className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-700">Location non meublée</p>
              <p>
                Le régime Micro-BIC est appliqué par défaut. Vous pouvez changer le
                régime fiscal directement dans l&apos;onglet Simulation.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ═══ Info box (shown when furnished) ═══ */}
      {isFurnished && (
        <section className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-amber-800 space-y-1">
              <p className="font-semibold">Régime LMNP — Amortissement du mobilier</p>
              <p>
                En LMNP au réel, le mobilier est amortissable sur 5 à 10 ans
                (7 ans en standard). Cet amortissement vient en déduction de vos
                revenus locatifs, réduisant votre base imposable.
              </p>
              <p>
                Le pack inclut les éléments obligatoires du décret n°2015-981
                pour qualifier un logement de &laquo;&nbsp;meublé&nbsp;&raquo;.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Saving indicator */}
      {isPending && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#1a1a2e] text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg z-50">
          Enregistrement...
        </div>
      )}
    </div>
  );
}
