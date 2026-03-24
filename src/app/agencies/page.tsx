import type { Metadata } from "next";
import { getAgencyCities } from "@/domains/agency/repository";
import { getAllAgencies } from "@/domains/agency/repository";
import AgencyListClient from "@/components/agency/AgencyListClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agences de gestion locative — tiili",
  description:
    "Trouvez et comparez les agences de gestion locative par ville. Frais de gestion, avis, contacts.",
};

export default async function AgenciesPage() {
  const cities = await getAgencyCities();
  const agencies = await getAllAgencies();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agences de gestion locative</h1>
          <p className="text-sm text-gray-500 mt-1">
            {agencies.length} agence{agencies.length > 1 ? "s" : ""} dans {cities.length} ville{cities.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <AgencyListClient agencies={agencies} cities={cities} />
    </div>
  );
}
