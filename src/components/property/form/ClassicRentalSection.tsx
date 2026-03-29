import { ReactNode, useState } from "react";
import { PropertyFormData } from "@/domains/property/types";
import { fetchLocalityFields } from "@/domains/locality/actions";
import { adjustRentPerM2, calculateDegressiveRent } from "@/domains/market/rent-degressive";
import type { LocalityDataFields } from "@/domains/locality/types";
import FieldTooltip from "@/components/ui/FieldTooltip";

interface Props {
  form: PropertyFormData;
  onChange: (field: keyof PropertyFormData, value: string | number) => void;
  prefillHint: (field: string) => ReactNode;
}

const inputClass =
  "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base min-h-[44px]";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

/**
 * Pick the best rent/m² for the given building_type + room_count.
 * Priority: neighborhood AI pricing > segmented locality data > generic avg.
 * When room_count is 0 (unknown), skips segmented data and falls back to generic avg.
 */
function pickBestRentPerM2(
  fields: LocalityDataFields,
  roomCount: number,
  buildingType: "appartement" | "maison"
): number | null {
  const isMaison = buildingType === "maison";

  // 1. Neighborhood-level AI pricing (highest priority)
  if (isMaison && fields.neighborhood_rent_price_house) return fields.neighborhood_rent_price_house;
  if (!isMaison && roomCount > 0) {
    if (roomCount === 1 && fields.neighborhood_rent_price_t1) return fields.neighborhood_rent_price_t1;
    if (roomCount === 2 && fields.neighborhood_rent_price_t2) return fields.neighborhood_rent_price_t2;
    if (roomCount === 3 && fields.neighborhood_rent_price_t3) return fields.neighborhood_rent_price_t3;
    if (roomCount >= 4 && fields.neighborhood_rent_price_t4plus) return fields.neighborhood_rent_price_t4plus;
  }

  // 2. Segmented locality data
  if (isMaison && fields.avg_rent_house_per_m2) return fields.avg_rent_house_per_m2;
  if (!isMaison && roomCount > 0) {
    if (roomCount <= 2 && fields.avg_rent_t1t2_per_m2) return fields.avg_rent_t1t2_per_m2;
    if (roomCount >= 3 && fields.avg_rent_t3plus_per_m2) return fields.avg_rent_t3plus_per_m2;
  }

  // 3. Generic fallback (also used when room_count is 0 / unknown)
  return fields.avg_rent_per_m2 ?? null;
}

export default function ClassicRentalSection({ form, onChange, prefillHint }: Props) {
  const [loading, setLoading] = useState(false);
  const [recalcError, setRecalcError] = useState("");

  const canRecalc = form.city.trim().length > 0 && form.surface > 0;

  async function handleRecalcFromLocality() {
    setRecalcError("");
    setLoading(true);
    try {
      // Pass neighborhood for quartier-level resolution
      const result = await fetchLocalityFields(
        form.city.trim(),
        form.postal_code || undefined,
        form.neighborhood?.trim() || undefined
      );
      if (!result) {
        setRecalcError("Aucune donnée locale trouvée pour cette ville.");
        return;
      }

      const { fields } = result;
      const surface = form.surface;

      // Pick best rent/m² based on building_type + room_count
      const baseRent = pickBestRentPerM2(fields, form.room_count, form.building_type || "appartement");

      if (baseRent) {
        const alpha = fields.rent_elasticity_alpha ?? undefined;
        const refSurface = fields.rent_reference_surface ?? undefined;
        const rentPerM2 = adjustRentPerM2(baseRent, surface, alpha, refSurface);
        const monthlyRent = calculateDegressiveRent(baseRent, surface, alpha, refSurface);
        onChange("rent_per_m2", Math.round(rentPerM2 * 100) / 100);
        onChange("monthly_rent", monthlyRent);

        // property_tax
        if (fields.avg_property_tax_per_m2) {
          onChange("property_tax", Math.round(fields.avg_property_tax_per_m2 * surface));
        } else {
          onChange("property_tax", Math.round(monthlyRent * 1));
        }
      } else {
        setRecalcError("Pas de données de loyer disponibles pour cette ville.");
        return;
      }

      // condo_charges — pas de copro pour les maisons
      if (form.building_type === "maison") {
        onChange("condo_charges", 0);
      } else if (fields.avg_condo_charges_per_m2) {
        onChange("condo_charges", Math.round(fields.avg_condo_charges_per_m2 * surface * 12));
      } else if (form.property_type === "ancien") {
        onChange("condo_charges", Math.round(surface * 30));
      }
    } catch {
      setRecalcError("Erreur lors de la récupération des données.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-tiili-border p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Location classique</h2>
        <button
          type="button"
          disabled={!canRecalc || loading}
          onClick={handleRecalcFromLocality}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title={!canRecalc ? "Renseignez la ville et la surface d'abord" : "Recalculer à partir des données locales"}
        >
          {loading ? (
            <span className="animate-spin w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          Estimer via localité
        </button>
      </div>
      {recalcError && (
        <p className="text-xs text-red-600 mb-3">{recalcError}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Loyer mensuel</label>
          <input type="number" inputMode="numeric" value={form.monthly_rent || ""} onChange={(e) => onChange("monthly_rent", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="800" />
          {prefillHint("monthly_rent")}
        </div>
        <div>
          <label className={labelClass}>Charges copro / an<FieldTooltip text="Charges de copropriété annuelles (entretien, gardien, ascenseur...). Demandez le PV d'AG pour les connaître." /></label>
          {form.building_type === "maison" ? (
            <p className="text-sm text-gray-400 py-3">Pas de copropriété (maison)</p>
          ) : (
            <>
              <input type="number" inputMode="numeric" value={form.condo_charges || ""} onChange={(e) => onChange("condo_charges", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="1200" />
              {prefillHint("condo_charges")}
            </>
          )}
        </div>
        <div>
          <label className={labelClass}>Taxe foncière / an<FieldTooltip text="Taxe foncière annuelle. Consultez l'avis d'imposition du vendeur ou estimez ~1 mois de loyer." /></label>
          <input type="number" inputMode="numeric" value={form.property_tax || ""} onChange={(e) => onChange("property_tax", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="800" />
          {prefillHint("property_tax")}
        </div>
      </div>
    </section>
  );
}
