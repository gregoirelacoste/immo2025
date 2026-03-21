"use client";

import { ReactNode, useMemo } from "react";
import { PropertyFormData } from "@/domains/property/types";
import { formatCurrency } from "@/lib/calculations";
import { MarketData } from "@/domains/market/types";
import FieldTooltip from "@/components/ui/FieldTooltip";
import { useLocalityCheck } from "./useLocalityCheck";

interface Props {
  form: PropertyFormData;
  onChange: (field: keyof PropertyFormData, value: string | number) => void;
  prefillHint: (field: string) => ReactNode;
  marketDataJson?: string;
}

const inputClass =
  "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base min-h-[44px]";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const selectClass =
  "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base min-h-[44px] bg-white";
const valueClass = "text-base font-medium text-[#1a1a2e] py-2";

function LocalityBadge({ status }: { status: "unknown" | "checking" | "found" | "not-found" }) {
  if (status === "unknown") return null;
  if (status === "checking") {
    return <span className="ml-2 inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />;
  }
  if (status === "found") {
    return <span className="ml-2 text-xs text-green-600" title="Ville connue">✓</span>;
  }
  return <span className="ml-2 text-xs text-gray-400" title="Ville inconnue">?</span>;
}

/** Get market price/m² for the selected room count, falling back to general average */
function getMarketPriceForRooms(md: MarketData | null, roomCount: number): number | null {
  if (!md) return null;
  if (roomCount === 1 && md.avgPriceT1PerM2) return md.avgPriceT1PerM2;
  if (roomCount === 2 && md.avgPriceT2PerM2) return md.avgPriceT2PerM2;
  if (roomCount === 3 && md.avgPriceT3PerM2) return md.avgPriceT3PerM2;
  if (roomCount >= 4 && md.avgPriceT4PlusPerM2) return md.avgPriceT4PlusPerM2;
  return md.medianPurchasePricePerM2 ?? md.avgPurchasePricePerM2 ?? null;
}

function getRoomLabel(roomCount: number): string {
  if (roomCount === 1) return "T1";
  if (roomCount === 2) return "T2";
  if (roomCount === 3) return "T3";
  if (roomCount >= 4) return "T4+";
  return "";
}

export default function PropertyInfoSection({ form, onChange, prefillHint, marketDataJson }: Props) {
  const dpe = form.dpe_rating;
  const isDpeAlert = dpe === "F" || dpe === "G";
  const { cityStatus, neighborhoodStatus, checkCity, checkNeighborhood } = useLocalityCheck(form.city, form.neighborhood ?? "");

  const marketData = useMemo((): MarketData | null => {
    if (!marketDataJson) return null;
    try { return JSON.parse(marketDataJson); } catch { return null; }
  }, [marketDataJson]);

  const pricePerM2 = form.surface > 0 ? form.purchase_price / form.surface : 0;
  const marketPricePerM2 = getMarketPriceForRooms(marketData, form.room_count);
  const priceDelta = pricePerM2 > 0 && marketPricePerM2
    ? ((pricePerM2 - marketPricePerM2) / marketPricePerM2) * 100
    : null;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-tiili-border p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Informations du bien</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Adresse</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => onChange("address", e.target.value)}
            className={inputClass}
            placeholder="12 rue de la Paix"
          />
          {prefillHint("address")}
        </div>
        <div>
          <label className={labelClass}>Ville<LocalityBadge status={cityStatus} /></label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => onChange("city", e.target.value)}
            onBlur={checkCity}
            className={inputClass}
            placeholder="Paris"
          />
          {prefillHint("city")}
        </div>
        <div>
          <label className={labelClass}>Quartier<LocalityBadge status={neighborhoodStatus} /></label>
          <input
            type="text"
            value={form.neighborhood}
            onChange={(e) => onChange("neighborhood", e.target.value)}
            onBlur={checkNeighborhood}
            className={inputClass}
            placeholder="Centre historique"
          />
          {prefillHint("neighborhood")}
        </div>
        <div>
          <label className={labelClass}>Prix d&apos;achat</label>
          <input
            type="number"
            inputMode="numeric"
            value={form.purchase_price || ""}
            onChange={(e) => onChange("purchase_price", parseFloat(e.target.value) || 0)}
            className={inputClass}
            placeholder="200000"
          />
          {prefillHint("purchase_price")}
        </div>
        <div>
          <label className={labelClass}>Surface (m²)</label>
          <input
            type="number"
            inputMode="decimal"
            value={form.surface || ""}
            onChange={(e) => onChange("surface", parseFloat(e.target.value) || 0)}
            className={inputClass}
            placeholder="45"
          />
          {prefillHint("surface")}
        </div>
        <div>
          <label className={labelClass}>Nombre de pièces</label>
          <select
            value={form.room_count || 0}
            onChange={(e) => onChange("room_count", parseInt(e.target.value) || 0)}
            className={selectClass}
          >
            <option value={0}>Non renseigné</option>
            <option value={1}>T1 — 1 pièce</option>
            <option value={2}>T2 — 2 pièces</option>
            <option value={3}>T3 — 3 pièces</option>
            <option value={4}>T4 — 4 pièces</option>
            <option value={5}>T5+ — 5 pièces et +</option>
          </select>
          {prefillHint("room_count")}
        </div>
        <div>
          <label className={labelClass}>Type de bien</label>
          <select
            value={form.property_type}
            onChange={(e) => onChange("property_type", e.target.value as "ancien" | "neuf")}
            className={inputClass}
          >
            <option value="ancien">Ancien (~7.5% frais notaire)</option>
            <option value="neuf">Neuf (~2.5% frais notaire)</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>
            Prix au m²
            {marketPricePerM2 && form.room_count > 0 && (
              <span className="ml-1 text-xs font-normal text-gray-400">
                (marché {getRoomLabel(form.room_count)} : {formatCurrency(marketPricePerM2)})
              </span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <p className={valueClass}>
              {pricePerM2 > 0 ? formatCurrency(pricePerM2) : "—"}
            </p>
            {priceDelta !== null && form.room_count > 0 && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                priceDelta <= 0 ? "bg-green-100 text-green-700" : "bg-red-50 text-red-700"
              }`}>
                {priceDelta > 0 ? "+" : ""}{priceDelta.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div>
          <label className={labelClass}>DPE<FieldTooltip text="Diagnostic de Performance Énergétique (A=excellent, G=passoire). Les DPE F et G ont des restrictions de location." /></label>
          <select
            className={selectClass}
            value={form.dpe_rating || ""}
            onChange={e => onChange("dpe_rating", e.target.value || "")}
          >
            <option value="">Non renseigné</option>
            {["A", "B", "C", "D", "E", "F", "G"].map(grade => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
          {prefillHint("dpe_rating")}
        </div>
        <div>
          <label className={labelClass}>Visibilité</label>
          <select
            value={form.visibility}
            onChange={(e) => onChange("visibility", e.target.value as "public" | "private")}
            className={inputClass}
          >
            <option value="public">Public — visible par tous</option>
            <option value="private">Privé — visible uniquement par vous</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Description / Notes</label>
          <textarea
            value={form.description}
            onChange={(e) => onChange("description", e.target.value)}
            className={inputClass + " min-h-[80px]"}
            rows={2}
            placeholder="Notes libres sur le bien..."
          />
        </div>
      </div>

      {isDpeAlert && (
        <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${dpe === "G" ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700"}`}>
          {dpe === "G"
            ? "⚠ DPE G : interdiction de location depuis 2025. Travaux énergétiques obligatoires."
            : "⚠ DPE F : interdiction de location à partir de 2028. Anticiper les travaux énergétiques."}
        </div>
      )}
    </section>
  );
}
