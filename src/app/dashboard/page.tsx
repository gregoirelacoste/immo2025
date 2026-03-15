import { auth } from "@/lib/auth";
import { getVisibleProperties } from "@/domains/property/repository";
import { getFirstSimulationsForProperties } from "@/domains/simulation/repository";
import { isAdmin } from "@/lib/auth-actions";
import Navbar from "@/components/Navbar";
import DashboardClient from "@/components/property/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const admin = userId ? await isAdmin() : false;

  const properties = await getVisibleProperties(userId, admin);

  // Load first simulation for each property (for KPI calculations)
  const simMap = await getFirstSimulationsForProperties(properties.map((p) => p.id));
  // Serialize as a plain object for the client component
  const simulationsMap: Record<string, import("@/domains/simulation/types").Simulation> = {};
  for (const [pid, sim] of simMap) {
    simulationsMap[pid] = sim;
  }

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-8 md:py-8">
        <DashboardClient properties={properties} currentUserId={userId} isAdmin={admin} simulationsMap={simulationsMap} />
      </main>
    </div>
  );
}
