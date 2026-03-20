import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllLocalities } from "@/domains/locality/repository";
import { resolveLocalityData } from "@/domains/locality/resolver";
import LocalityDataView from "@/components/locality/LocalityDataView";
import ShareButtons from "@/components/ShareButtons";
import { slugify } from "@/lib/slugify";

interface Props {
  params: Promise<{ city: string }>;
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

export default async function CityGuidePage({ params }: Props) {
  const { city: slug } = await params;
  const cityName = await findCityNameBySlug(slug);
  if (!cityName) notFound();

  const resolved = await resolveLocalityData(cityName);
  const f = resolved?.fields ?? {};
  const ds = resolved?.dataSources ?? {};
  const fsRaw = resolved?.fieldSources ?? {};
  const fsSafe: Partial<Record<keyof typeof f, { localityName: string; localityType: string }>> = {};
  for (const [key, source] of Object.entries(fsRaw)) {
    if (source) fsSafe[key as keyof typeof f] = { localityName: source.localityName, localityType: source.localityType };
  }

  const year = new Date().getFullYear();

  // JSON-LD: Article + Place
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["Article", "Place"],
    headline: `Investir à ${cityName} en ${year}`,
    name: cityName,
    description: `Guide investissement immobilier locatif à ${cityName}`,
    url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://tiili.io"}/guide/${slug}`,
  };

  // JSON-LD: FAQPage — dynamic questions based on available data
  const faqEntries: { name: string; text: string }[] = [];

  if (f.avg_purchase_price_per_m2 != null) {
    faqEntries.push({
      name: `Quel est le prix moyen au m² à ${cityName} ?`,
      text: `Le prix moyen au m² à ${cityName} est d'environ ${Math.round(f.avg_purchase_price_per_m2).toLocaleString("fr-FR")} €/m², selon les données DVF (Demandes de Valeurs Foncières).`,
    });
  }

  if (f.avg_purchase_price_per_m2 != null && f.avg_rent_per_m2 != null) {
    const grossYield = ((f.avg_rent_per_m2 * 12) / f.avg_purchase_price_per_m2) * 100;
    faqEntries.push({
      name: `Quel est le rendement locatif à ${cityName} ?`,
      text: `Le rendement locatif brut moyen à ${cityName} est estimé à ${grossYield.toFixed(1).replace(".", ",")} %, calculé à partir d'un prix moyen de ${Math.round(f.avg_purchase_price_per_m2).toLocaleString("fr-FR")} €/m² et d'un loyer moyen de ${f.avg_rent_per_m2.toFixed(1).replace(".", ",")} €/m²/mois.`,
    });
  }

  if (f.avg_purchase_price_per_m2 != null || f.avg_rent_per_m2 != null) {
    const dataPoints: string[] = [];
    if (f.avg_purchase_price_per_m2 != null) dataPoints.push(`un prix moyen de ${Math.round(f.avg_purchase_price_per_m2).toLocaleString("fr-FR")} €/m²`);
    if (f.avg_rent_per_m2 != null) dataPoints.push(`un loyer moyen de ${f.avg_rent_per_m2.toFixed(1).replace(".", ",")} €/m²`);
    faqEntries.push({
      name: `Faut-il investir à ${cityName} en ${year} ?`,
      text: `${cityName} présente ${dataPoints.join(" et ")}. L'opportunité d'investissement dépend de votre stratégie (location longue durée, meublé, colocation) et de votre capacité de financement. Utilisez notre simulateur pour évaluer la rentabilité d'un bien spécifique.`,
    });
  }

  if (f.avg_rent_per_m2 != null) {
    faqEntries.push({
      name: `Quel est le loyer moyen à ${cityName} ?`,
      text: `Le loyer moyen à ${cityName} est d'environ ${f.avg_rent_per_m2.toFixed(1).replace(".", ",")} €/m²/mois, selon les données de l'Observatoire des loyers.`,
    });
  }

  if (f.risk_level != null) {
    const riskDescriptions: Record<string, string> = {
      faible: "un niveau de risque naturel faible",
      moyen: "un niveau de risque naturel moyen, nécessitant une vigilance standard",
      "élevé": "un niveau de risque naturel élevé — il est conseillé de vérifier les plans de prévention des risques (PPR) avant d'investir",
    };
    faqEntries.push({
      name: `Quels sont les risques naturels à ${cityName} ?`,
      text: `${cityName} présente ${riskDescriptions[f.risk_level] || `un niveau de risque naturel qualifié de « ${f.risk_level} »`}, selon les données Géorisques.`,
    });
  }

  const faqJsonLd = faqEntries.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqEntries.map((q) => ({
          "@type": "Question",
          name: q.name,
          acceptedAnswer: { "@type": "Answer", text: q.text },
        })),
      }
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <div className="mx-auto max-w-3xl px-4 py-8">
        <a href="/guide" className="text-sm text-amber-600 hover:underline mb-4 block">
          &larr; Toutes les villes
        </a>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          Investir à {cityName} en {year}
        </h1>
        <p className="text-gray-500 mt-2 text-sm mb-8">
          Données DVF, INSEE et Observatoire des loyers — mise à jour automatique.
        </p>

        <div className="mb-8">
          <ShareButtons
            url={`${process.env.NEXT_PUBLIC_BASE_URL || "https://tiili.io"}/guide/${slug}`}
            title={`Investir à ${cityName} en ${year}`}
          />
        </div>

        <LocalityDataView cityName={cityName} fields={f} dataSources={ds} fieldSources={fsSafe} />

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
