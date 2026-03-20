import type { LocalityDataFields } from "@/domains/locality/types";

interface FieldSource {
  localityName: string;
  localityType: string;
}

interface Props {
  cityName: string;
  fields: LocalityDataFields;
  /** Data source per field (e.g. "api:dvf", "admin", "import-initial") */
  dataSources?: Partial<Record<keyof LocalityDataFields, string>>;
  /** Which locality provided each field (for IRIS vs commune display) */
  fieldSources?: Partial<Record<keyof LocalityDataFields, FieldSource>>;
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

/** Human-readable source label */
const SOURCE_LABELS: Record<string, string> = {
  "api:dvf": "DVF",
  "api:insee": "INSEE",
  "api:insee-iris": "INSEE (IRIS)",
  "api:georisques": "Géorisques",
  "api:taxe-fonciere": "OFGL",
  "api:dpe": "ADEME",
  "api:education": "Éducation nat.",
  "api:health": "BPE INSEE",
  "api:carte-loyers": "Carte des loyers",
  "api:computed": "Calculé",
  "admin": "Admin",
  "import-initial": "Import initial",
  "blog-ai": "Blog IA",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sourceLabel(source?: string): string | null {
  if (!source) return null;
  if (SOURCE_LABELS[source]) return SOURCE_LABELS[source];
  if (source.startsWith("import:")) return source.replace("import:", "Import ");
  if (UUID_RE.test(source)) return "Admin";
  return source;
}

function SourceBadge({ source }: { source?: string }) {
  const label = sourceLabel(source);
  if (!label) return null;
  return (
    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-600 whitespace-nowrap">
      {label}
    </span>
  );
}

/** Badge indicating data granularity level (quartier IRIS vs commune fallback) */
function DataLevelBadge({ fieldSource }: { fieldSource?: FieldSource }) {
  if (!fieldSource) return null;

  if (fieldSource.localityType === "quartier") {
    return (
      <span
        className="ml-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-50 text-green-600 whitespace-nowrap"
        title={`Donnée du quartier ${fieldSource.localityName}`}
      >
        Quartier
      </span>
    );
  }

  // No badge for ville level (expected default) — only show for fallback to parent
  if (fieldSource.localityType === "departement" || fieldSource.localityType === "region") {
    const label = fieldSource.localityType === "departement" ? "Dpt." : "Rég.";
    return (
      <span
        className="ml-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-50 text-amber-600 whitespace-nowrap"
        title={`Donnée de ${fieldSource.localityName} (${fieldSource.localityType})`}
      >
        {label}
      </span>
    );
  }

  return null;
}

function DataRow({ label, value, source, fieldSource }: { label: string; value: string; source?: string; fieldSource?: FieldSource }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center">
        <span className="text-sm font-medium text-gray-900 font-[family-name:var(--font-mono)]">{value}</span>
        <SourceBadge source={source} />
        <DataLevelBadge fieldSource={fieldSource} />
      </div>
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

/** Deduplicated source badges for a section header */
function SectionSources({ fields, dataSources }: { fields: (keyof LocalityDataFields)[]; dataSources: Partial<Record<keyof LocalityDataFields, string>> }) {
  const uniqueSources = new Set<string>();
  for (const key of fields) {
    const src = dataSources[key];
    if (src) uniqueSources.add(src);
  }
  if (uniqueSources.size === 0) return null;
  return (
    <span className="ml-2 inline-flex gap-1">
      {[...uniqueSources].map((src) => (
        <span key={src} className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-600">
          {sourceLabel(src)}
        </span>
      ))}
    </span>
  );
}

export default function LocalityDataView({ cityName, fields: f, dataSources: ds = {}, fieldSources: fs = {}, propertyComparison }: Props) {
  const grossYield =
    f.avg_purchase_price_per_m2 && f.avg_rent_per_m2
      ? Math.round((f.avg_rent_per_m2 * 12 / f.avg_purchase_price_per_m2) * 1000) / 10
      : null;

  const risks: Array<{ type: string; level: string }> = Array.isArray(f.natural_risks)
    ? f.natural_risks
    : typeof f.natural_risks === "string"
      ? (() => { try { const p = JSON.parse(f.natural_risks as string); return Array.isArray(p) ? p : []; } catch { return []; } })()
      : [];

  // Check if any field comes from quartier level
  const hasQuartierData = Object.values(fs).some((s) => s?.localityType === "quartier");
  const quartierName = hasQuartierData
    ? Object.values(fs).find((s) => s?.localityType === "quartier")?.localityName
    : null;

  return (
    <div className="space-y-6">
      {/* IRIS quartier indicator */}
      {hasQuartierData && (
        <div className="flex items-center gap-2 px-1">
          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full font-medium">
            Quartier IRIS : {quartierName}
          </span>
          <span className="text-[10px] text-gray-400">
            Certaines données sont au niveau quartier
          </span>
        </div>
      )}
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
        <div className="flex items-center mb-2">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Marché immobilier</h3>
          <SectionSources fields={["avg_purchase_price_per_m2", "median_purchase_price_per_m2", "transaction_count", "price_trend_pct"]} dataSources={ds} />
        </div>
        <DataRow label="Prix moyen au m²" value={fmt(f.avg_purchase_price_per_m2, " €")} source={ds.avg_purchase_price_per_m2} fieldSource={fs.avg_purchase_price_per_m2} />
        <DataRow label="Prix médian au m²" value={fmt(f.median_purchase_price_per_m2, " €")} source={ds.median_purchase_price_per_m2} fieldSource={fs.median_purchase_price_per_m2} />
        <DataRow label="Transactions" value={fmt(f.transaction_count)} source={ds.transaction_count} fieldSource={fs.transaction_count} />
        {f.price_trend_pct != null && <DataRow label="Tendance prix (1 an)" value={`${f.price_trend_pct > 0 ? "+" : ""}${f.price_trend_pct} %`} source={ds.price_trend_pct} fieldSource={fs.price_trend_pct} />}
      </div>

      {/* Marché locatif */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center mb-2">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Marché locatif</h3>
          <SectionSources fields={["avg_rent_per_m2", "avg_rent_t1t2_per_m2", "avg_rent_t3plus_per_m2", "avg_rent_house_per_m2", "avg_rent_furnished_per_m2", "vacancy_rate"]} dataSources={ds} />
        </div>
        <DataRow label="Loyer moyen (tous appts)" value={fmt(f.avg_rent_per_m2, " €/m²")} source={ds.avg_rent_per_m2} fieldSource={fs.avg_rent_per_m2} />
        {f.avg_rent_t1t2_per_m2 != null && <DataRow label="Loyer T1-T2" value={fmt(f.avg_rent_t1t2_per_m2, " €/m²")} source={ds.avg_rent_t1t2_per_m2} fieldSource={fs.avg_rent_t1t2_per_m2} />}
        {f.avg_rent_t3plus_per_m2 != null && <DataRow label="Loyer T3+" value={fmt(f.avg_rent_t3plus_per_m2, " €/m²")} source={ds.avg_rent_t3plus_per_m2} fieldSource={fs.avg_rent_t3plus_per_m2} />}
        {f.avg_rent_house_per_m2 != null && <DataRow label="Loyer maison" value={fmt(f.avg_rent_house_per_m2, " €/m²")} source={ds.avg_rent_house_per_m2} fieldSource={fs.avg_rent_house_per_m2} />}
        <DataRow label="Loyer meublé" value={fmt(f.avg_rent_furnished_per_m2, " €/m²")} source={ds.avg_rent_furnished_per_m2} fieldSource={fs.avg_rent_furnished_per_m2} />
        <DataRow label="Vacance locative" value={f.vacancy_rate != null ? `${f.vacancy_rate} %` : "\u2014"} source={ds.vacancy_rate} fieldSource={fs.vacancy_rate} />
      </div>

      {/* Charges */}
      {(f.avg_condo_charges_per_m2 != null || f.avg_property_tax_per_m2 != null || f.property_tax_rate_pct != null) && (
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center mb-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Charges et taxes</h3>
            <SectionSources fields={["avg_condo_charges_per_m2", "avg_property_tax_per_m2", "property_tax_rate_pct"]} dataSources={ds} />
          </div>
          <DataRow label="Charges copro/m²" value={fmt(f.avg_condo_charges_per_m2, " €")} source={ds.avg_condo_charges_per_m2} fieldSource={fs.avg_condo_charges_per_m2} />
          <DataRow label="Taxe foncière/m²" value={fmt(f.avg_property_tax_per_m2, " €")} source={ds.avg_property_tax_per_m2} fieldSource={fs.avg_property_tax_per_m2} />
          {f.property_tax_rate_pct != null && <DataRow label="Taux TFB (%)" value={`${f.property_tax_rate_pct} %`} source={ds.property_tax_rate_pct} fieldSource={fs.property_tax_rate_pct} />}
        </div>
      )}

      {/* Airbnb */}
      {(f.avg_airbnb_night_price != null || f.avg_airbnb_occupancy_rate != null) && (
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center mb-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Location courte durée (Airbnb)</h3>
            <SectionSources fields={["avg_airbnb_night_price", "avg_airbnb_occupancy_rate"]} dataSources={ds} />
          </div>
          <DataRow label="Prix moyen/nuit" value={fmt(f.avg_airbnb_night_price, " €")} source={ds.avg_airbnb_night_price} fieldSource={fs.avg_airbnb_night_price} />
          <DataRow label="Taux d'occupation" value={f.avg_airbnb_occupancy_rate != null ? `${f.avg_airbnb_occupancy_rate} %` : "\u2014"} source={ds.avg_airbnb_occupancy_rate} fieldSource={fs.avg_airbnb_occupancy_rate} />
        </div>
      )}

      {/* Socio-économique */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center mb-2">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Démographie et économie</h3>
          <SectionSources fields={["population", "median_income", "unemployment_rate", "poverty_rate", "vacant_housing_pct", "owner_occupier_pct"]} dataSources={ds} />
        </div>
        <DataRow label="Population" value={fmt(f.population)} source={ds.population} fieldSource={fs.population} />
        {f.population_growth_pct != null && (
          <DataRow label="Croissance démographique" value={`${f.population_growth_pct > 0 ? "+" : ""}${f.population_growth_pct} %`} source={ds.population_growth_pct} fieldSource={fs.population_growth_pct} />
        )}
        <DataRow label="Revenu médian" value={fmt(f.median_income, " €")} source={ds.median_income} fieldSource={fs.median_income} />
        {f.poverty_rate != null && <DataRow label="Taux de pauvreté" value={`${f.poverty_rate} %`} source={ds.poverty_rate} fieldSource={fs.poverty_rate} />}
        {f.unemployment_rate != null && <DataRow label="Taux de chômage" value={`${f.unemployment_rate} %`} source={ds.unemployment_rate} fieldSource={fs.unemployment_rate} />}
        {f.vacant_housing_pct != null && <DataRow label="Logements vacants" value={`${f.vacant_housing_pct} %`} source={ds.vacant_housing_pct} fieldSource={fs.vacant_housing_pct} />}
        {f.owner_occupier_pct != null && <DataRow label="Propriétaires" value={`${f.owner_occupier_pct} %`} source={ds.owner_occupier_pct} fieldSource={fs.owner_occupier_pct} />}
      </div>

      {/* Infrastructure */}
      {(f.school_count || f.public_transport_score != null || f.doctor_count != null || f.pharmacy_count != null || f.supermarket_count != null) && (
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center mb-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Infrastructure</h3>
            <SectionSources fields={["school_count", "university_nearby", "doctor_count", "pharmacy_count", "supermarket_count"]} dataSources={ds} />
          </div>
          <DataRow label="Écoles" value={fmt(f.school_count)} source={ds.school_count} fieldSource={fs.school_count} />
          <DataRow label="Université à proximité" value={f.university_nearby ? "Oui" : f.university_nearby === false ? "Non" : "\u2014"} source={ds.university_nearby} fieldSource={fs.university_nearby} />
          {f.public_transport_score != null && <DataRow label="Score transports" value={`${f.public_transport_score}/10`} source={ds.public_transport_score} fieldSource={fs.public_transport_score} />}
          {f.doctor_count != null && <DataRow label="Médecins" value={fmt(f.doctor_count)} source={ds.doctor_count} fieldSource={fs.doctor_count} />}
          {f.pharmacy_count != null && <DataRow label="Pharmacies" value={fmt(f.pharmacy_count)} source={ds.pharmacy_count} fieldSource={fs.pharmacy_count} />}
          {f.supermarket_count != null && <DataRow label="Supermarchés" value={fmt(f.supermarket_count)} source={ds.supermarket_count} fieldSource={fs.supermarket_count} />}
        </div>
      )}

      {/* Risques */}
      {(f.risk_level || risks.length > 0 || f.flood_risk_level || f.seismic_zone != null || f.radon_level != null || f.industrial_risk != null) && (
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center mb-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Risques</h3>
            <SectionSources fields={["risk_level", "flood_risk_level", "seismic_zone", "radon_level", "industrial_risk"]} dataSources={ds} />
          </div>
          {f.risk_level && <DataRow label="Niveau de risque global" value={f.risk_level} source={ds.risk_level} fieldSource={fs.risk_level} />}
          {f.flood_risk_level && <DataRow label="Inondation" value={f.flood_risk_level} source={ds.flood_risk_level} fieldSource={fs.flood_risk_level} />}
          {f.seismic_zone != null && <DataRow label="Zone sismique" value={String(f.seismic_zone)} source={ds.seismic_zone} fieldSource={fs.seismic_zone} />}
          {f.radon_level != null && <DataRow label="Radon" value={`Classe ${f.radon_level}`} source={ds.radon_level} fieldSource={fs.radon_level} />}
          {f.industrial_risk != null && <DataRow label="Risque industriel" value={f.industrial_risk ? "Oui" : "Non"} source={ds.industrial_risk} fieldSource={fs.industrial_risk} />}
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
          <div className="flex items-center mb-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Énergie</h3>
            <SectionSources fields={["avg_dpe_class", "avg_energy_consumption", "avg_ges_class", "dpe_count"]} dataSources={ds} />
          </div>
          {f.avg_dpe_class && <DataRow label="Classe DPE moy." value={f.avg_dpe_class} source={ds.avg_dpe_class} fieldSource={fs.avg_dpe_class} />}
          {f.avg_energy_consumption != null && <DataRow label="Conso énergie (kWh/m²)" value={fmt(f.avg_energy_consumption)} source={ds.avg_energy_consumption} fieldSource={fs.avg_energy_consumption} />}
          {f.avg_ges_class && <DataRow label="Classe GES moy." value={f.avg_ges_class} source={ds.avg_ges_class} fieldSource={fs.avg_ges_class} />}
          {f.dpe_count != null && <DataRow label="Nb DPE analysés" value={fmt(f.dpe_count)} source={ds.dpe_count} fieldSource={fs.dpe_count} />}
        </div>
      )}
    </div>
  );
}
