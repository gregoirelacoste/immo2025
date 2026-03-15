import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPropertyById } from "@/domains/property/repository";
import { getFirstSimulationForProperty } from "@/domains/simulation/repository";
import VisitMode from "@/components/visit/VisitMode";

export const dynamic = "force-dynamic";

export default async function VisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;

  const { id } = await params;
  const property = await getPropertyById(id, userId);

  if (!property) {
    notFound();
  }

  const firstSim = await getFirstSimulationForProperty(id);

  return <VisitMode property={property} simulation={firstSim} />;
}
