import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getOwnPropertyById } from "@/domains/property/repository";
import { getRentalEntries, getRentalSummary } from "@/domains/rental/repository";
import { calculateAll, calculateSimulation } from "@/lib/calculations";
import { getFirstSimulationForProperty } from "@/domains/simulation/repository";
import Navbar from "@/components/Navbar";
import RentalTracker from "@/components/property/rental/RentalTracker";

export const dynamic = "force-dynamic";

export default async function RentalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const property = await getOwnPropertyById(id, session.user.id);

  if (!property) notFound();

  // Only accessible for purchased/managed properties
  if (property.property_status !== "purchased" && property.property_status !== "managed") {
    redirect(`/property/${id}`);
  }

  const firstSim = await getFirstSimulationForProperty(id);

  const [entries, summary] = await Promise.all([
    getRentalEntries(id),
    getRentalSummary(id, property, firstSim),
  ]);

  const calcs = firstSim ? calculateSimulation(property, firstSim) : calculateAll(property);

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/property/${id}`}
            className="text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">Suivi locatif</h1>
            <p className="text-sm text-gray-500">
              {property.address ? `${property.address}, ` : ""}{property.city}
            </p>
          </div>
        </div>

        <RentalTracker
          propertyId={id}
          entries={entries}
          summary={summary}
          calcs={calcs}
        />
      </main>
    </div>
  );
}
