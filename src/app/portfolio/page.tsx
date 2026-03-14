import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getVisibleProperties } from "@/domains/property/repository";
import { getRentalSummary } from "@/domains/rental/repository";
import { calculateAll } from "@/lib/calculations";
import { PropertyCalculations } from "@/domains/property/types";
import { RentalSummary } from "@/domains/rental/types";
import Navbar from "@/components/Navbar";
import PortfolioView from "@/components/portfolio/PortfolioView";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const allProperties = await getVisibleProperties(session.user.id);

  // Filter to purchased/managed properties owned by user
  const ownedProperties = allProperties.filter(
    (p) =>
      p.user_id === session.user!.id &&
      (p.property_status === "purchased" || p.property_status === "managed")
  );

  // Calculate everything in parallel
  const calculationsMap = new Map<string, PropertyCalculations>();
  const rentalDataMap = new Map<string, RentalSummary>();

  await Promise.all(
    ownedProperties.map(async (property) => {
      const calcs = calculateAll(property);
      calculationsMap.set(property.id, calcs);

      const summary = await getRentalSummary(property.id, property);
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
