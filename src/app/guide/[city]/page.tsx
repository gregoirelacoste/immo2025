import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllLocalities } from "@/domains/locality/repository";
import { resolveLocalityData } from "@/domains/locality/resolver";
import { LocalityDataFields } from "@/domains/locality/types";

interface Props {
  params: Promise<{ city: string }>;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function generateStaticParams() {
  try {
    const localities = await getAllLocalities();
    return localities
      .filter((l) => l.type === "ville")
      .map((l) => ({ city: slugify(l.name) }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: slug } = await params;
  const cityName = await findCityNameBySlug(slug);
  if (!cityName) return { title: "Ville non trouvée" };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://tiili.io";
  const year = new Date().getFullYear();

  return {
    title: `Investir à ${cityName} en ${year} : prix, loyers, rendements`,
    description: `Guide complet pour investir dans l'immobilier locatif à ${cityName}. Prix au m², loyers, rendement brut, quartiers, fiscalité. Données DVF et INSEE.`,
    openGraph: {
      title: `Investir à ${cityName} — Guide ${year}`,
      description: `Prix, loyers, rendements et quartiers pour investir à ${cityName}.`,
      url: `${baseUrl}/guide/${slug}`,
    },
    alternates: { canonical: `${baseUrl}/guide/${slug}` },
  };
}

export const revalidate = 3600;

async function findCityNameBySlug(slug: string): Promise<string | null> {
  const localities = await getAllLocalities();
  const match = localities.find(
    (l) => l.type === "ville" && slugify(l.name) === slug
  );
  return match?.name ?? null;
}

function fmt(n: number | null | undefined, suffix = ""): string {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR") + suffix;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

export default async function CityGuidePage({ params }: Props) {
  const { city: slug } = await params;
  const cityName = await findCityNameBySlug(slug);
  if (!cityName) notFound();

  const resolved = await resolveLocalityData(cityName);
  const f: LocalityDataFields = resolved?.fields ?? {};

  const year = new Date().getFullYear();
  const grossYield =
    f.avg_purchase_price_per_m2 && f.avg_rent_per_m2
      ? Math.round((f.avg_rent_per_m2 * 12 / f.avg_purchase_price_per_m2) * 1000) / 10
      : null;

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["Article", "Place"],
    headline: `Investir à ${cityName} en ${year}`,
    name: cityName,
    description: `Guide investissement immobilier locatif à ${cityName}`,
    url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://tiili.io"}/guide/${slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-3xl px-4 py-8">
        <a href="/guide" className="text-sm text-amber-600 hover:underline mb-4 block">
          ← Toutes les villes
        </a>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          Investir à {cityName} en {year}
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          Données DVF, INSEE et Observatoire des loyers — mise à jour automatique.
        </p>

        {/* KPIs principaux */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <KpiCard label="Prix moyen/m²" value={fmt(f.avg_purchase_price_per_m2, " €")} />
          <KpiCard label="Loyer moyen/m²" value={fmt(f.avg_rent_per_m2, " €")} />
          <KpiCard label="Rendement brut" value={grossYield ? `${grossYield} %` : "—"} highlight />
          <KpiCard label="Population" value={fmt(f.population)} />
        </div>

        {/* Marché immobilier */}
        <Section title={`Marché immobilier à ${cityName}`}>
          <div className="bg-gray-50 rounded-lg p-4">
            <DataRow label="Prix moyen au m²" value={fmt(f.avg_purchase_price_per_m2, " €")} />
            <DataRow label="Prix médian au m²" value={fmt(f.median_purchase_price_per_m2, " €")} />
            <DataRow label="Transactions" value={fmt(f.transaction_count)} />
          </div>
        </Section>

        {/* Marché locatif */}
        <Section title="Marché locatif">
          <div className="bg-gray-50 rounded-lg p-4">
            <DataRow label="Loyer moyen nu (€/m²)" value={fmt(f.avg_rent_per_m2, " €")} />
            <DataRow label="Loyer meublé (€/m²)" value={fmt(f.avg_rent_furnished_per_m2, " €")} />
            <DataRow label="Vacance locative" value={f.vacancy_rate != null ? `${f.vacancy_rate} %` : "—"} />
          </div>
        </Section>

        {/* Charges */}
        {(f.avg_condo_charges_per_m2 != null || f.avg_property_tax_per_m2 != null) && (
          <Section title="Charges et taxes">
            <div className="bg-gray-50 rounded-lg p-4">
              <DataRow label="Charges copro/m²" value={fmt(f.avg_condo_charges_per_m2, " €")} />
              <DataRow label="Taxe foncière/m²" value={fmt(f.avg_property_tax_per_m2, " €")} />
            </div>
          </Section>
        )}

        {/* Airbnb */}
        {(f.avg_airbnb_night_price != null || f.avg_airbnb_occupancy_rate != null) && (
          <Section title="Location courte durée (Airbnb)">
            <div className="bg-gray-50 rounded-lg p-4">
              <DataRow label="Prix moyen/nuit" value={fmt(f.avg_airbnb_night_price, " €")} />
              <DataRow label="Taux d'occupation" value={f.avg_airbnb_occupancy_rate != null ? `${f.avg_airbnb_occupancy_rate} %` : "—"} />
            </div>
          </Section>
        )}

        {/* Socio-économique */}
        <Section title="Démographie et économie">
          <div className="bg-gray-50 rounded-lg p-4">
            <DataRow label="Population" value={fmt(f.population)} />
            <DataRow label="Croissance démographique" value={f.population_growth_pct != null ? `${f.population_growth_pct > 0 ? "+" : ""}${f.population_growth_pct} %` : "—"} />
            <DataRow label="Revenu médian" value={fmt(f.median_income, " €")} />
            <DataRow label="Taux de pauvreté" value={f.poverty_rate != null ? `${f.poverty_rate} %` : "—"} />
            <DataRow label="Taux de chômage" value={f.unemployment_rate != null ? `${f.unemployment_rate} %` : "—"} />
          </div>
        </Section>

        {/* Infrastructure */}
        {(f.school_count || f.public_transport_score != null) && (
          <Section title="Infrastructure">
            <div className="bg-gray-50 rounded-lg p-4">
              <DataRow label="Écoles" value={fmt(f.school_count)} />
              <DataRow label="Université à proximité" value={f.university_nearby ? "Oui" : f.university_nearby === false ? "Non" : "—"} />
              <DataRow label="Score transports" value={f.public_transport_score != null ? `${f.public_transport_score}/10` : "—"} />
            </div>
          </Section>
        )}

        {/* Risques */}
        {(f.risk_level || (f.natural_risks && f.natural_risks.length > 0)) && (
          <Section title="Risques">
            <div className="bg-gray-50 rounded-lg p-4">
              {f.risk_level && (
                <DataRow label="Niveau de risque global" value={f.risk_level} />
              )}
              {f.natural_risks && f.natural_risks.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 mb-1">Risques identifiés :</p>
                  <ul className="text-sm text-gray-700 list-disc list-inside">
                    {f.natural_risks.map((r, i) => (
                      <li key={i}>{r.type} ({r.level})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* CTA */}
        <div className="mt-12 rounded-xl bg-amber-50 border border-amber-200 p-6 text-center">
          <p className="text-lg font-semibold text-gray-900">
            Simulez votre investissement à {cityName}
          </p>
          <p className="text-sm text-gray-600 mt-1 mb-4">
            Calculez rendement, cashflow et mensualités avec vos paramètres.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`/property/new?city=${encodeURIComponent(cityName)}`}
              className="inline-block rounded-lg bg-amber-600 px-6 py-3 text-white font-medium hover:bg-amber-700 transition-colors"
            >
              Simuler un bien à {cityName}
            </a>
            <a
              href="/dashboard"
              className="inline-block rounded-lg border border-amber-600 px-6 py-3 text-amber-700 font-medium hover:bg-amber-50 transition-colors"
            >
              Voir le dashboard
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

function KpiCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 text-center">
      <div className={`text-2xl font-bold ${highlight ? "text-amber-600" : "text-gray-900"}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
