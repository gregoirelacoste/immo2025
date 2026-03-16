import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth-actions";
import { getPropertyById } from "@/domains/property/repository";
import { getFirstSimulationForProperty } from "@/domains/simulation/repository";
import { getAllEquipments } from "@/domains/property/equipment-service";
import { parseAmenities } from "@/domains/property/amenities";
import { resolveVisitConfigFromDb } from "@/domains/visit/config-resolver";
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

  const amenities = parseAmenities(property.amenities);
  const propType = property.property_type as "ancien" | "neuf";

  const [firstSim, equipments, visitConfig] = await Promise.all([
    getFirstSimulationForProperty(id),
    getAllEquipments(),
    resolveVisitConfigFromDb(amenities, propType),
  ]);

  return <VisitMode property={property} simulation={firstSim} equipments={equipments} visitConfig={visitConfig} />;
}
