"use client";

import { ReactNode } from "react";
import { PropertyFormData } from "@/domains/property/types";
import { formatCurrency } from "@/lib/calculations";
import FieldTooltip from "@/components/ui/FieldTooltip";
import { useLocalityCheck } from "./useLocalityCheck";

interface Props {
  form: PropertyFormData;
  onChange: (field: keyof PropertyFormData, value: string | number) => void;
  prefillHint: (field: string) => ReactNode;
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

export default function PropertyInfoSection({ form, onChange, prefillHint }: Props) {
  const dpe = form.dpe_rating;
  const isDpeAlert = dpe === "F" || dpe === "G";
  const { cityStatus, neighborhoodStatus, checkCity, checkNeighborhood } = useLocalityCheck(form.city, form.neighborhood ?? "");

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
          </label>
          <p className={valueClass}>
            {form.surface > 0 ? formatCurrency(form.purchase_price / form.surface) : "—"}
          </p>
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
