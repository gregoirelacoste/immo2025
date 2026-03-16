import { getAuthContext } from "@/lib/auth-actions";
import { getVisibleProperties } from "@/domains/property/repository";
import { getActiveSimulationsForProperties } from "@/domains/simulation/repository";
import Navbar from "@/components/Navbar";
import CompareView from "@/components/compare/CompareView";
import type { Simulation } from "@/domains/simulation/types";

export default async function ComparePage() {
  const { userId } = await getAuthContext();

  const properties = await getVisibleProperties(userId);
  const simMap = await getActiveSimulationsForProperties(
    properties.map((p) => ({ id: p.id, active_simulation_id: p.active_simulation_id }))
  );
  const simulationsMap: Record<string, Simulation> = {};
  for (const [pid, sim] of simMap) {
    if (sim) simulationsMap[pid] = sim;
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
