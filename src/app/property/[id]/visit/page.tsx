import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth-actions";
import { getPropertyById } from "@/domains/property/repository";
import { getFirstSimulationForProperty } from "@/domains/simulation/repository";
import VisitMode from "@/components/visit/VisitMode";

export default async function VisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await getAuthContext();

  const { id } = await params;
  const property = await getPropertyById(id, userId);

  if (!property) {
    notFound();
  }

  const firstSim = await getFirstSimulationForProperty(id);

  return <VisitMode property={property} simulation={firstSim} />;
}
