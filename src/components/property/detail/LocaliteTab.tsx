"use client";

import { useState, useEffect, useCallback } from "react";
import { Property } from "@/domains/property/types";
import { getEffectivePrice } from "@/lib/calculations";
import type { LocalityDataFields } from "@/domains/locality/types";
import { fetchLocalityFields, searchQuartier } from "@/domains/locality/actions";
import LocalityDataView from "@/components/locality/LocalityDataView";
import { PremiumGateModal } from "@/components/ui/PremiumGate";

interface Props {
  property: Property;
  isPremium?: boolean;
}

export default function LocaliteTab({ property, isPremium = false }: Props) {
  const [loading, setLoading] = useState(true);
  const [cityName, setCityName] = useState<string | null>(null);
  const [fields, setFields] = useState<LocalityDataFields | null>(null);
  const [dataSources, setDataSources] = useState<Partial<Record<keyof LocalityDataFields, string>>>({});
  const [fieldSources, setFieldSources] = useState<Partial<Record<keyof LocalityDataFields, { localityName: string; localityType: string }>>>({});

  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [showPremiumGate, setShowPremiumGate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await fetchLocalityFields(property.city, property.postal_code || undefined, property.neighborhood || undefined);
      if (cancelled) return;
      if (result) {
        setCityName(result.cityName);
        setFields(result.fields);
        setDataSources(result.dataSources);
        setFieldSources(result.fieldSources);
      }
      setLoading(false);
    }
    if (property.city) load();
    else setLoading(false);
    return () => { cancelled = true; };
  }, [property.city, property.postal_code, property.neighborhood]);

  const pricePerM2 = property.surface > 0 ? getEffectivePrice(property) / property.surface : null;
  const rentPerM2 = property.monthly_rent > 0 && property.surface > 0
    ? property.monthly_rent / property.surface
    : null;

  const hasResearch = !!fields?.neighborhood_vibe;

  const handleSearchClick = useCallback(async () => {
    if (!isPremium) {
      setShowPremiumGate(true);
      return;
    }
    setResearchLoading(true);
    setResearchError(null);
    const result = await searchQuartier(property.id, { force: hasResearch });
    setResearchLoading(false);
    if (result.success && result.fields) {
      setFields(prev => prev ? { ...prev, ...result.fields } : result.fields as LocalityDataFields);
    } else {
      setResearchError(result.error || "Erreur inconnue");
    }
  }, [isPremium, property.id, hasResearch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 mt-4">
        <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-500">Chargement des données localité...</span>
      </div>
    );
  }

  if (!fields) {
    return (
      <div className="text-center py-12 mt-4 text-gray-400 text-sm">
        Aucune donnée de localité disponible pour {property.city || "cette ville"}.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-lg font-bold text-[#1a1a2e]">
          Données localité — {cityName || property.city}
        </h2>
        <button
          onClick={handleSearchClick}
          disabled={researchLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
          {researchLoading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              Recherche en cours…
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              {hasResearch ? "Actualiser" : "Recherche quartier"}
            </>
          )}
        </button>
      </div>

      {researchError && (
        <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {researchError}
        </div>
      )}

      <LocalityDataView
        cityName={cityName || property.city}
        fields={fields}
        dataSources={dataSources}
        fieldSources={fieldSources}
        propertyComparison={{ pricePerM2, rentPerM2 }}
      />

      {showPremiumGate && (
        <PremiumGateModal
          icon={
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          }
          title="Recherche quartier approfondie"
          description="Obtenez des données précises sur le quartier : loyers réels, qualité de vie, projets urbains, tendances micro-locales et plus encore."
          onClose={() => setShowPremiumGate(false)}
        />
      )}
    </div>
  );
}
