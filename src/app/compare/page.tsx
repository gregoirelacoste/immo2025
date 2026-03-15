import { auth } from "@/lib/auth";
import { getVisibleProperties } from "@/domains/property/repository";
import { getFirstSimulationsForProperties } from "@/domains/simulation/repository";
import Navbar from "@/components/Navbar";
import CompareView from "@/components/compare/CompareView";
import type { Simulation } from "@/domains/simulation/types";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const session = await auth();
  const userId = session?.user?.id;

  const properties = await getVisibleProperties(userId);
  const simMap = await getFirstSimulationsForProperties(properties.map((p) => p.id));
  const simulationsMap: Record<string, Simulation> = {};
  for (const [pid, sim] of simMap) {
    simulationsMap[pid] = sim;
  }

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CompareView properties={properties} simulationsMap={simulationsMap} />
      </main>
    </div>
  );
}
