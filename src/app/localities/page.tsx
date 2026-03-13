import { getAllLocalities } from "@/domains/locality/repository";
import { getLocalityDataHistory } from "@/domains/locality/repository";
import LocalitiesClient from "@/components/locality/LocalitiesClient";
import { Locality, LocalityData } from "@/domains/locality/types";
import Navbar from "@/components/Navbar";

export default async function LocalitiesPage() {
  const localities = await getAllLocalities();

  // Load latest data count per locality
  const dataMap: Record<string, LocalityData[]> = {};
  for (const loc of localities) {
    dataMap[loc.id] = await getLocalityDataHistory(loc.id);
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Données locales</h1>
          <LocalitiesClient localities={localities} dataMap={dataMap} />
        </div>
      </main>
    </>
  );
}
