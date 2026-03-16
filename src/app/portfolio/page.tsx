import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-actions";
import { getVisibleProperties } from "@/domains/property/repository";
import { getFirstSimulationsForProperties } from "@/domains/simulation/repository";
import { getRentalSummary } from "@/domains/rental/repository";
import { calculateAll, calculateSimulation } from "@/lib/calculations";
import { PropertyCalculations } from "@/domains/property/types";
import { RentalSummary } from "@/domains/rental/types";
import Navbar from "@/components/Navbar";
import PortfolioView from "@/components/portfolio/PortfolioView";

export default async function PortfolioPage() {
  const { userId } = await getAuthContext();
  if (!userId) redirect("/login");

  const allProperties = await getVisibleProperties(userId);

  // Filter to purchased/managed properties owned by user
  const ownedProperties = allProperties.filter(
    (p) =>
      p.user_id === userId &&
      (p.property_status === "purchased" || p.property_status === "managed")
  );

  // Load first simulations for owned properties
  const simMap = await getFirstSimulationsForProperties(ownedProperties.map((p) => p.id));

  // Calculate everything in parallel
  const calculationsMap = new Map<string, PropertyCalculations>();
  const rentalDataMap = new Map<string, RentalSummary>();

  await Promise.all(
    ownedProperties.map(async (property) => {
      const sim = simMap.get(property.id);
      const calcs = sim ? calculateSimulation(property, sim) : calculateAll(property);
      calculationsMap.set(property.id, calcs);

      const summary = await getRentalSummary(property.id, property, sim);
      if (summary) {
        rentalDataMap.set(property.id, summary);
      }
    })
  );

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <h1 className="text-2xl font-bold text-[#1a1a2e] mb-6">Mon patrimoine</h1>
        <PortfolioView
          properties={ownedProperties}
          calculations={calculationsMap}
          rentalData={rentalDataMap}
        />
      </main>
    </div>
  );
}
