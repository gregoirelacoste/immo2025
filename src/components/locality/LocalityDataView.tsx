import type { LocalityDataFields } from "@/domains/locality/types";

interface Props {
  cityName: string;
  fields: LocalityDataFields;
  /** Comparaison bien vs marché (optionnel — uniquement sur la page propriété) */
  propertyComparison?: {
    pricePerM2: number | null;
    rentPerM2: number | null;
  };
}

function fmt(n: number | null | undefined, suffix = ""): string {
  if (n == null) return "\u2014";
  return n.toLocaleString("fr-FR") + suffix;
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-900 font-[family-name:var(--font-mono)]">{value}</span>
    </div>
  );
}

function KpiCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 text-center">
      <div className={`text-xl font-bold ${highlight ? "text-amber-600" : "text-gray-900"}`}>
        {value}
      </div>
      <div className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider font-semibold">{label}</div>
    </div>
  );
}

function ComparisonRow({ label, propertyValue, marketValue, unit, lowerIsBetter = false }: {
  label: string;
  propertyValue: number | null;
  marketValue: number | null;
  unit: string;
  lowerIsBetter?: boolean;
}) {
  if (propertyValue == null || marketValue == null || marketValue === 0) return null;
  const diff = ((propertyValue - marketValue) / marketValue) * 100;
  const isGood = lowerIsBetter ? diff <= 0 : diff >= 0;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-b-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)]">
          {fmt(Math.round(propertyValue), ` ${unit}`)}
        </span>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
          isGood ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
        }`}>
          {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
        </span>
        <span className="text-[11px] text-gray-400">
          vs {fmt(Math.round(marketValue), ` ${unit}`)}
        </span>
      </div>
    </div>
  );
}

export default function LocalityDataView({ cityName, fields: f, propertyComparison }: Props) {
  const grossYield =
    f.avg_purchase_price_per_m2 && f.avg_rent_per_m2
      ? Math.round((f.avg_rent_per_m2 * 12 / f.avg_purchase_price_per_m2) * 1000) / 10
      : null;

  const risks: Array<{ type: string; level: string }> = Array.isArray(f.natural_risks)
    ? f.natural_risks
    : typeof f.natural_risks === "string"
      ? (() => { try { const p = JSON.parse(f.natural_risks as string); return Array.isArray(p) ? p : []; } catch { return []; } })()
      : [];

  return (
    <div className="space-y-6">
      {/* Property vs Market comparison */}
      {propertyComparison && (f.avg_purchase_price_per_m2 || f.avg_rent_per_m2) && (
        <div className="bg-white rounded-xl border border-tiili-border p-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Votre bien vs le marché</h3>
          <ComparisonRow
            label="Prix au m²"
            propertyValue={propertyComparison.pricePerM2}
            marketValue={f.median_purchase_price_per_m2 ?? f.avg_purchase_price_per_m2 ?? null}
            unit="€/m²"
            lowerIsBetter
          />
          <ComparisonRow
            label="Loyer au m²"
            propertyValue={propertyComparison.rentPerM2}
            marketValue={f.avg_rent_per_m2 ?? null}
            unit="€/m²"
          />
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Prix moyen/m²" value={fmt(f.avg_purchase_price_per_m2, " €")} />
        <KpiCard label="Loyer moyen/m²" value={fmt(f.avg_rent_per_m2, " €")} />
        <KpiCard label="Rendement brut" value={grossYield ? `${grossYield} %` : "\u2014"} highlight />
        <KpiCard label="Population" value={fmt(f.population)} />
      </div>

      {/* Marché immobilier */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Marché immobilier</h3>
        <DataRow label="Prix moyen au m²" value={fmt(f.avg_purchase_price_per_m2, " €")} />
        <DataRow label="Prix médian au m²" value={fmt(f.median_purchase_price_per_m2, " €")} />
        <DataRow label="Transactions" value={fmt(f.transaction_count)} />
      </div>

      {/* Marché locatif */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Marché locatif</h3>
        <DataRow label="Loyer moyen nu (€/m²)" value={fmt(f.avg_rent_per_m2, " €")} />
        <DataRow label="Loyer meublé (€/m²)" value={fmt(f.avg_rent_furnished_per_m2, " €")} />
        <DataRow label="Vacance locative" value={f.vacancy_rate != null ? `${f.vacancy_rate} %` : "\u2014"} />
      </div>

      {/* Charges */}
      {(f.avg_condo_charges_per_m2 != null || f.avg_property_tax_per_m2 != null || f.property_tax_rate_pct != null) && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Charges et taxes</h3>
          <DataRow label="Charges copro/m²" value={fmt(f.avg_condo_charges_per_m2, " €")} />
          <DataRow label="Taxe foncière/m²" value={fmt(f.avg_property_tax_per_m2, " €")} />
          {f.property_tax_rate_pct != null && <DataRow label="Taux TFB (%)" value={`${f.property_tax_rate_pct} %`} />}
        </div>
      )}

      {/* Airbnb */}
      {(f.avg_airbnb_night_price != null || f.avg_airbnb_occupancy_rate != null) && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Location courte durée (Airbnb)</h3>
          <DataRow label="Prix moyen/nuit" value={fmt(f.avg_airbnb_night_price, " €")} />
          <DataRow label="Taux d'occupation" value={f.avg_airbnb_occupancy_rate != null ? `${f.avg_airbnb_occupancy_rate} %` : "\u2014"} />
        </div>
      )}

      {/* Socio-économique */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Démographie et économie</h3>
        <DataRow label="Population" value={fmt(f.population)} />
        {f.population_growth_pct != null && (
          <DataRow label="Croissance démographique" value={`${f.population_growth_pct > 0 ? "+" : ""}${f.population_growth_pct} %`} />
        )}
        <DataRow label="Revenu médian" value={fmt(f.median_income, " €")} />
        {f.poverty_rate != null && <DataRow label="Taux de pauvreté" value={`${f.poverty_rate} %`} />}
        {f.unemployment_rate != null && <DataRow label="Taux de chômage" value={`${f.unemployment_rate} %`} />}
        {f.vacant_housing_pct != null && <DataRow label="Logements vacants" value={`${f.vacant_housing_pct} %`} />}
        {f.owner_occupier_pct != null && <DataRow label="Propriétaires" value={`${f.owner_occupier_pct} %`} />}
      </div>

      {/* Infrastructure */}
      {(f.school_count || f.public_transport_score != null || f.doctor_count != null || f.pharmacy_count != null || f.supermarket_count != null) && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Infrastructure</h3>
          <DataRow label="Écoles" value={fmt(f.school_count)} />
          <DataRow label="Université à proximité" value={f.university_nearby ? "Oui" : f.university_nearby === false ? "Non" : "\u2014"} />
          {f.public_transport_score != null && <DataRow label="Score transports" value={`${f.public_transport_score}/10`} />}
          {f.doctor_count != null && <DataRow label="Médecins" value={fmt(f.doctor_count)} />}
          {f.pharmacy_count != null && <DataRow label="Pharmacies" value={fmt(f.pharmacy_count)} />}
          {f.supermarket_count != null && <DataRow label="Supermarchés" value={fmt(f.supermarket_count)} />}
        </div>
      )}

      {/* Risques */}
      {(f.risk_level || risks.length > 0 || f.flood_risk_level || f.seismic_zone != null || f.radon_level != null || f.industrial_risk != null) && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Risques</h3>
          {f.risk_level && <DataRow label="Niveau de risque global" value={f.risk_level} />}
          {f.flood_risk_level && <DataRow label="Inondation" value={f.flood_risk_level} />}
          {f.seismic_zone != null && <DataRow label="Zone sismique" value={String(f.seismic_zone)} />}
          {f.radon_level != null && <DataRow label="Radon" value={`Classe ${f.radon_level}`} />}
          {f.industrial_risk != null && <DataRow label="Risque industriel" value={f.industrial_risk ? "Oui" : "Non"} />}
          {risks.length > 0 && (
            <div className="mt-2">
              <ul className="text-sm text-gray-700 list-disc list-inside">
                {risks.map((r, i) => (
                  <li key={i}>{r.type} ({r.level})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Énergie (DPE) */}
      {(f.avg_dpe_class || f.avg_energy_consumption != null || f.avg_ges_class || f.dpe_count != null) && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Énergie</h3>
          {f.avg_dpe_class && <DataRow label="Classe DPE moy." value={f.avg_dpe_class} />}
          {f.avg_energy_consumption != null && <DataRow label="Conso énergie (kWh/m²)" value={fmt(f.avg_energy_consumption)} />}
          {f.avg_ges_class && <DataRow label="Classe GES moy." value={f.avg_ges_class} />}
          {f.dpe_count != null && <DataRow label="Nb DPE analysés" value={fmt(f.dpe_count)} />}
        </div>
      )}
    </div>
  );
}
