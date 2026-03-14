import { ReactNode } from "react";
import { PropertyFormData } from "@/domains/property/types";
import { formatCurrency } from "@/lib/calculations";

interface Props {
  form: PropertyFormData;
  onChange: (field: keyof PropertyFormData, value: string | number) => void;
  prefillHint: (field: string) => ReactNode;
  readOnly?: boolean;
}

const inputClass =
  "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base min-h-[44px]";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

const valueClass = "text-base font-medium text-[#1a1a2e] py-2";

export default function PropertyInfoSection({ form, onChange, prefillHint, readOnly }: Props) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-tiili-border p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Informations du bien</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Adresse</label>
          {readOnly ? (
            <p className={valueClass}>{form.address || "—"}</p>
          ) : (
            <input
              type="text"
              value={form.address}
              onChange={(e) => onChange("address", e.target.value)}
              className={inputClass}
              placeholder="12 rue de la Paix"
            />
          )}
          {!readOnly && prefillHint("address")}
        </div>
        <div>
          <label className={labelClass}>Ville</label>
          {readOnly ? (
            <p className={valueClass}>{form.city || "—"}</p>
          ) : (
            <input
              type="text"
              value={form.city}
              onChange={(e) => onChange("city", e.target.value)}
              className={inputClass}
              placeholder="Paris"
            />
          )}
          {!readOnly && prefillHint("city")}
        </div>
        <div>
          <label className={labelClass}>Prix d&apos;achat</label>
          {readOnly ? (
            <p className={valueClass}>{form.purchase_price > 0 ? formatCurrency(form.purchase_price) : "—"}</p>
          ) : (
            <input
              type="number"
              inputMode="numeric"
              value={form.purchase_price || ""}
              onChange={(e) => onChange("purchase_price", parseFloat(e.target.value) || 0)}
              className={inputClass}
              placeholder="200000"
            />
          )}
          {!readOnly && prefillHint("purchase_price")}
        </div>
        <div>
          <label className={labelClass}>Surface (m²)</label>
          {readOnly ? (
            <p className={valueClass}>{form.surface > 0 ? `${form.surface} m²` : "—"}</p>
          ) : (
            <input
              type="number"
              inputMode="decimal"
              value={form.surface || ""}
              onChange={(e) => onChange("surface", parseFloat(e.target.value) || 0)}
              className={inputClass}
              placeholder="45"
            />
          )}
          {!readOnly && prefillHint("surface")}
        </div>
        <div>
          <label className={labelClass}>Type de bien</label>
          {readOnly ? (
            <p className={valueClass}>{form.property_type === "neuf" ? "Neuf" : "Ancien"}</p>
          ) : (
            <select
              value={form.property_type}
              onChange={(e) => onChange("property_type", e.target.value as "ancien" | "neuf")}
              className={inputClass}
            >
              <option value="ancien">Ancien (~7.5% frais notaire)</option>
              <option value="neuf">Neuf (~2.5% frais notaire)</option>
            </select>
          )}
        </div>
        <div>
          <label className={labelClass}>
            Prix au m²
          </label>
          <p className={valueClass}>
            {form.surface > 0 ? formatCurrency(form.purchase_price / form.surface) : "—"}
          </p>
        </div>
        {!readOnly && (
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
        )}
        {form.description && (
          <div className="md:col-span-2">
            <label className={labelClass}>Description / Notes</label>
            {readOnly ? (
              <p className="text-sm text-gray-600 leading-relaxed py-2">{form.description}</p>
            ) : (
              <textarea
                value={form.description}
                onChange={(e) => onChange("description", e.target.value)}
                className={inputClass + " min-h-[80px]"}
                rows={2}
                placeholder="Notes libres sur le bien..."
              />
            )}
          </div>
        )}
        {!readOnly && !form.description && (
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
        )}
      </div>
    </section>
  );
}
