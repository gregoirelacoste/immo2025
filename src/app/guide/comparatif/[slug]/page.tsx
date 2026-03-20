import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllLocalities } from "@/domains/locality/repository";
import { resolveLocalityData } from "@/domains/locality/resolver";
import type { LocalityDataFields, Locality } from "@/domains/locality/types";

import { slugify, citySlug } from "@/lib/slugify";

interface Props {
  params: Promise<{ slug: string }>;
}

/** Pick the top N cities by data completeness (number of non-null fields in locality row). */
async function getTopCities(limit = 30): Promise<Locality[]> {
  const localities = await getAllLocalities();
  const cities = localities.filter((l) => l.type === "ville");
  // Heuristic: cities with a code (code INSEE) and most recently updated are likely the richest
  // Sort by updated_at descending as a proxy for data richness
  cities.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
  return cities.slice(0, limit);
}

export async function generateStaticParams() {
  try {
    const cities = await getTopCities(30);
    const params: { slug: string }[] = [];
    for (let i = 0; i < cities.length; i++) {
      for (let j = i + 1; j < cities.length; j++) {
        const s1 = citySlug(cities[i].name, cities[i].code);
        const s2 = citySlug(cities[j].name, cities[j].code);
        params.push({ slug: `${s1}-vs-${s2}` });
      }
    }
    return params;
  } catch {
    return [];
  }
}

async function parseCitySlugs(slug: string): Promise<[Locality, Locality] | null> {
  const localities = await getAllLocalities();
  const cities = localities.filter((l) => l.type === "ville");
  const slugMap = new Map(cities.map((c) => [citySlug(c.name, c.code), c]));

  // Try all possible split points for "-vs-" (handles city names with hyphens)
  const marker = "-vs-";
  for (let i = slug.indexOf(marker); i !== -1; i = slug.indexOf(marker, i + 1)) {
    const s1 = slug.slice(0, i);
    const s2 = slug.slice(i + marker.length);
    const c1 = slugMap.get(s1);
    const c2 = slugMap.get(s2);
    if (c1 && c2) return [c1, c2];
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cities = await parseCitySlugs(slug);
  if (!cities) return { title: "Comparatif non trouvé" };

  const [c1, c2] = cities;

  const year = new Date().getFullYear();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://tiili.io";

  return {
    title: `${c1.name} vs ${c2.name} : où investir en ${year} ?`,
    description: `Comparatif investissement locatif ${c1.name} vs ${c2.name}. Prix au m², loyers, rendement brut, vacance, risques. Données DVF et INSEE ${year}.`,
    openGraph: {
      title: `${c1.name} vs ${c2.name} — Comparatif immobilier ${year}`,
      description: `Comparez ${c1.name} et ${c2.name} pour votre investissement locatif.`,
      url: `${baseUrl}/guide/comparatif/${slug}`,
    },
    alternates: { canonical: `${baseUrl}/guide/comparatif/${slug}` },
  };
}

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// Comparison row definitions
// ---------------------------------------------------------------------------

interface ComparisonRow {
  label: string;
  key: string;
  getValue: (f: LocalityDataFields) => number | string | null | undefined;
  format: (v: number | string | null | undefined) => string;
  /** "higher" = higher is better, "lower" = lower is better, "none" = no winner */
  betterIs: "higher" | "lower" | "none";
}

function fmtEur(v: number | string | null | undefined): string {
  if (v == null) return "—";
  return Number(v).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function fmtEurDec(v: number | string | null | undefined): string {
  if (v == null) return "—";
  return Number(v).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}

function fmtPct(v: number | string | null | undefined): string {
  if (v == null) return "—";
  return `${Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
}

function fmtNum(v: number | string | null | undefined): string {
  if (v == null) return "—";
  return Number(v).toLocaleString("fr-FR");
}

function computeYield(f: LocalityDataFields): number | null {
  const price = f.avg_purchase_price_per_m2;
  const rent = f.avg_rent_per_m2;
  if (!price || !rent) return null;
  return (rent * 12 / price) * 100;
}

const ROWS: ComparisonRow[] = [
  {
    label: "Prix moyen / m²",
    key: "price",
    getValue: (f) => f.avg_purchase_price_per_m2,
    format: fmtEur,
    betterIs: "lower",
  },
  {
    label: "Loyer moyen / m²",
    key: "rent",
    getValue: (f) => f.avg_rent_per_m2,
    format: fmtEurDec,
    betterIs: "higher",
  },
  {
    label: "Rendement brut",
    key: "yield",
    getValue: computeYield,
    format: fmtPct,
    betterIs: "higher",
  },
  {
    label: "Taux de vacance",
    key: "vacancy",
    getValue: (f) => f.vacancy_rate,
    format: fmtPct,
    betterIs: "lower",
  },
  {
    label: "Population",
    key: "pop",
    getValue: (f) => f.population,
    format: fmtNum,
    betterIs: "none",
  },
  {
    label: "Revenu médian",
    key: "income",
    getValue: (f) => f.median_income,
    format: fmtEur,
    betterIs: "higher",
  },
  {
    label: "Niveau de risque",
    key: "risk",
    getValue: (f) => f.risk_level,
    format: (v) => {
      if (v == null) return "—";
      const map: Record<string, string> = { faible: "Faible", moyen: "Moyen", "élevé": "Élevé" };
      return map[String(v)] ?? String(v);
    },
    betterIs: "lower",
  },
  {
    label: "Charges copro / m²",
    key: "condo",
    getValue: (f) => f.avg_condo_charges_per_m2,
    format: fmtEurDec,
    betterIs: "lower",
  },
  {
    label: "Taxe foncière / m²",
    key: "tax",
    getValue: (f) => f.avg_property_tax_per_m2,
    format: fmtEurDec,
    betterIs: "lower",
  },
  {
    label: "Airbnb prix / nuit",
    key: "airbnb",
    getValue: (f) => f.avg_airbnb_night_price,
    format: fmtEur,
    betterIs: "higher",
  },
];

function pickWinner(
  v1: number | string | null | undefined,
  v2: number | string | null | undefined,
  betterIs: "higher" | "lower" | "none"
): "city1" | "city2" | "tie" | "none" {
  if (betterIs === "none" || v1 == null || v2 == null) return "none";

  // For risk_level, convert to numeric
  const riskMap: Record<string, number> = { faible: 1, moyen: 2, "élevé": 3 };
  const n1 = typeof v1 === "string" && v1 in riskMap ? riskMap[v1] : Number(v1);
  const n2 = typeof v2 === "string" && v2 in riskMap ? riskMap[v2] : Number(v2);

  if (isNaN(n1) || isNaN(n2)) return "none";
  if (n1 === n2) return "tie";

  if (betterIs === "higher") return n1 > n2 ? "city1" : "city2";
  return n1 < n2 ? "city1" : "city2";
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function ComparatifPage({ params }: Props) {
  const { slug } = await params;
  const cities = await parseCitySlugs(slug);
  if (!cities) notFound();

  const [city1, city2] = cities;
  const pc1: string[] = JSON.parse(city1.postal_codes || "[]");
  const pc2: string[] = JSON.parse(city2.postal_codes || "[]");

  const [data1, data2] = await Promise.all([
    resolveLocalityData(city1.name),
    resolveLocalityData(city2.name),
  ]);

  const f1 = data1?.fields ?? {};
  const f2 = data2?.fields ?? {};

  const year = new Date().getFullYear();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://tiili.io";

  // JSON-LD Article
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${city1.name} vs ${city2.name} : comparatif investissement locatif ${year}`,
    description: `Comparatif détaillé entre ${city1.name} et ${city2.name} pour l'investissement locatif.`,
    url: `${baseUrl}/guide/comparatif/${slug}`,
  };

  // JSON-LD FAQPage
  const yieldCity1 = computeYield(f1);
  const yieldCity2 = computeYield(f2);
  const riskCity1 = f1.risk_level;
  const riskCity2 = f2.risk_level;

  const bestYield =
    yieldCity1 != null && yieldCity2 != null
      ? yieldCity1 > yieldCity2
        ? city1.name
        : city2.name
      : null;

  const riskMap: Record<string, number> = { faible: 1, moyen: 2, "élevé": 3 };
  const leastRisky =
    riskCity1 && riskCity2
      ? (riskMap[riskCity1] ?? 99) <= (riskMap[riskCity2] ?? 99)
        ? city1.name
        : city2.name
      : null;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Où investir entre ${city1.name} et ${city2.name} ?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: bestYield
            ? `En termes de rendement brut, ${bestYield} offre un meilleur rendement locatif. Consultez le comparatif complet pour voir tous les critères.`
            : `Consultez notre comparatif complet pour comparer ${city1.name} et ${city2.name} sur tous les critères d'investissement.`,
        },
      },
      {
        "@type": "Question",
        name: `Quel rendement à ${city1.name} vs ${city2.name} ?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            yieldCity1 != null && yieldCity2 != null
              ? `Le rendement brut estimé est de ${yieldCity1.toFixed(2)} % à ${city1.name} contre ${yieldCity2.toFixed(2)} % à ${city2.name}.`
              : `Les données de rendement ne sont pas encore disponibles pour ces deux villes.`,
        },
      },
      {
        "@type": "Question",
        name: `Quelle ville est la moins risquée ?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: leastRisky
            ? `${leastRisky} présente un niveau de risque plus faible selon nos données. Vérifiez les détails dans le comparatif.`
            : `Les données de risque ne sont pas encore disponibles pour comparer ces deux villes.`,
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <a href="/guide" className="text-amber-600 hover:underline">
            Guide
          </a>
          <span>/</span>
          <span>Comparatif</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
          {city1.name} vs {city2.name} : comparatif investissement locatif {year}
        </h1>
        <p className="text-gray-500 mt-2 text-sm mb-8">
          Données DVF, INSEE et Observatoire des loyers — mise à jour automatique.
        </p>

        {/* Comparison table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Critère</th>
                <th className="text-center px-4 py-3">
                  <span className="font-semibold text-gray-900">{city1.name}</span>
                  {pc1.length > 0 && <span className="block text-xs font-normal text-gray-400">{pc1[0]}</span>}
                </th>
                <th className="text-center px-4 py-3">
                  <span className="font-semibold text-gray-900">{city2.name}</span>
                  {pc2.length > 0 && <span className="block text-xs font-normal text-gray-400">{pc2[0]}</span>}
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, idx) => {
                const v1 = row.getValue(f1);
                const v2 = row.getValue(f2);
                const winner = pickWinner(v1, v2, row.betterIs);

                return (
                  <tr
                    key={row.key}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                  >
                    <td className="px-4 py-3 font-medium text-gray-700">{row.label}</td>
                    <td
                      className={`px-4 py-3 text-center ${
                        winner === "city1"
                          ? "text-green-700 font-semibold bg-green-50"
                          : "text-gray-700"
                      }`}
                    >
                      {row.format(v1)}
                    </td>
                    <td
                      className={`px-4 py-3 text-center ${
                        winner === "city2"
                          ? "text-green-700 font-semibold bg-green-50"
                          : "text-gray-700"
                      }`}
                    >
                      {row.format(v2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 mt-2">
          En vert : valeur la plus favorable pour l&apos;investisseur.
        </p>

        {/* Links to individual guides */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href={`/guide/${citySlug(city1.name, city1.code)}`}
            className="block rounded-lg border border-gray-200 p-4 hover:border-amber-400 transition-colors"
          >
            <p className="font-semibold text-gray-900">Guide {city1.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              Voir toutes les données détaillées pour {city1.name}
            </p>
          </a>
          <a
            href={`/guide/${citySlug(city2.name, city2.code)}`}
            className="block rounded-lg border border-gray-200 p-4 hover:border-amber-400 transition-colors"
          >
            <p className="font-semibold text-gray-900">Guide {city2.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              Voir toutes les données détaillées pour {city2.name}
            </p>
          </a>
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-xl bg-amber-50 border border-amber-200 p-6 text-center">
          <p className="text-lg font-semibold text-gray-900">
            Simulez votre investissement
          </p>
          <p className="text-sm text-gray-600 mt-1 mb-4">
            Calculez rendement, cashflow et mensualités pour chaque ville.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`/property/new?city=${encodeURIComponent(city1.name)}`}
              className="inline-block rounded-lg bg-amber-600 px-6 py-3 text-white font-medium hover:bg-amber-700 transition-colors"
            >
              Simuler à {city1.name}
            </a>
            <a
              href={`/property/new?city=${encodeURIComponent(city2.name)}`}
              className="inline-block rounded-lg border border-amber-600 px-6 py-3 text-amber-700 font-medium hover:bg-amber-50 transition-colors"
            >
              Simuler à {city2.name}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
