import type { Metadata } from "next";
import { getAllLocalities, getLatestLocalityFieldsBatch } from "@/domains/locality/repository";

export const metadata: Metadata = {
  title: "Guides villes — Investissement immobilier locatif",
  description:
    "Classement des villes françaises pour l'investissement locatif : prix, loyers, rendements, qualité de vie. Données DVF et INSEE.",
};

export const revalidate = 3600;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function fmt(n: number | null | undefined, suffix = ""): string {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR") + suffix;
}

export default async function GuidePage() {
  const localities = await getAllLocalities();
  const cities = localities.filter((l) => l.type === "ville");

  // Batch-fetch toutes les données localité from thematic tables
  const cityIds = cities.map((c) => c.id);
  const fieldsMap = await getLatestLocalityFieldsBatch(cityIds);

  // Construire les lignes du tableau
  const rows = cities
    .map((city) => {
      const fields = fieldsMap.get(city.id) ?? {};

      const price = fields.avg_purchase_price_per_m2 ?? null;
      const rent = fields.avg_rent_per_m2 ?? null;
      const grossYield = price && rent ? Math.round((rent * 12 / price) * 1000) / 10 : null;

      return {
        id: city.id,
        name: city.name,
        slug: slugify(city.name),
        population: fields.population ?? null,
        price,
        rent,
        grossYield,
        vacancyRate: fields.vacancy_rate ?? null,
      };
    })
    .sort((a, b) => (b.grossYield ?? 0) - (a.grossYield ?? 0));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Guides investissement par ville
      </h1>
      <p className="text-gray-600 mb-8">
        Classement des villes françaises par rendement locatif brut estimé.
        Données DVF, INSEE et Observatoire des loyers.
      </p>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">Aucune ville en base pour le moment.</p>
          <p className="mt-2">
            Les guides villes seront disponibles après l&apos;import initial des données.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 text-left text-gray-600">
                <th className="py-3 pr-4 font-semibold">Ville</th>
                <th className="py-3 px-4 font-semibold text-right">Population</th>
                <th className="py-3 px-4 font-semibold text-right">Prix/m²</th>
                <th className="py-3 px-4 font-semibold text-right">Loyer/m²</th>
                <th className="py-3 px-4 font-semibold text-right">Rendement brut</th>
                <th className="py-3 pl-4 font-semibold text-right">Vacance</th>
                <th className="py-3 pl-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 hover:bg-amber-50 transition-colors"
                >
                  <td className="py-3 pr-4">
                    <a
                      href={`/guide/${row.slug}`}
                      className="font-medium text-amber-600 hover:underline"
                    >
                      {row.name}
                    </a>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    {fmt(row.population)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    {fmt(row.price, " €")}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    {fmt(row.rent, " €")}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">
                    {row.grossYield != null ? (
                      <span className={row.grossYield >= 6 ? "text-green-600" : row.grossYield >= 4 ? "text-amber-600" : "text-gray-600"}>
                        {row.grossYield.toFixed(1)} %
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-3 pl-4 text-right text-gray-600">
                    {row.vacancyRate != null ? `${row.vacancyRate} %` : "—"}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <a
                      href={`/property/new?city=${encodeURIComponent(row.name)}`}
                      className="text-xs text-amber-600 hover:underline whitespace-nowrap"
                    >
                      Simuler
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
