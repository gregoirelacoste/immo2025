import { parseAmenities } from "@/domains/property/amenities";
import type { Equipment } from "@/domains/property/equipment-service";

interface Props {
  amenitiesJson: string;
  equipments: Equipment[];
}

export default function AmenitiesPanel({ amenitiesJson, equipments }: Props) {
  const amenities = parseAmenities(amenitiesJson);

  if (amenities.length === 0) return null;

  const eqMap = new Map(equipments.map((e) => [e.key, e]));

  return (
    <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-3">Equipements</h2>
      <div className="flex flex-wrap gap-2">
        {amenities.map((key) => {
          const eq = eqMap.get(key);
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-amber-50 text-amber-700 border border-amber-100"
            >
              <span>{eq?.icon ?? "🏠"}</span>
              <span>{eq?.label ?? key}</span>
            </span>
          );
        })}
      </div>
    </section>
  );
}
