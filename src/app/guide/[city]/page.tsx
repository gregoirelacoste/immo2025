import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllLocalities } from "@/domains/locality/repository";
import { resolveLocalityData } from "@/domains/locality/resolver";
import LocalityDataView from "@/components/locality/LocalityDataView";

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

export default async function CityGuidePage({ params }: Props) {
  const { city: slug } = await params;
  const cityName = await findCityNameBySlug(slug);
  if (!cityName) notFound();

  const resolved = await resolveLocalityData(cityName);
  const f = resolved?.fields ?? {};
  const ds = resolved?.dataSources ?? {};

  const year = new Date().getFullYear();

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
          &larr; Toutes les villes
        </a>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          Investir à {cityName} en {year}
        </h1>
        <p className="text-gray-500 mt-2 text-sm mb-8">
          Données DVF, INSEE et Observatoire des loyers — mise à jour automatique.
        </p>

        <LocalityDataView cityName={cityName} fields={f} dataSources={ds} />

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
