import { parseAmenities, AMENITY_LABELS, AMENITY_ICONS } from "@/domains/property/amenities";

interface Props {
  amenitiesJson: string;
}

export default function AmenitiesPanel({ amenitiesJson }: Props) {
  const amenities = parseAmenities(amenitiesJson);

  if (amenities.length === 0) return null;

  return (
    <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-3">Equipements</h2>
      <div className="flex flex-wrap gap-2">
        {amenities.map((key) => (
          <span
            key={key}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-amber-50 text-amber-700 border border-amber-100"
          >
            <span>{AMENITY_ICONS[key]}</span>
            <span>{AMENITY_LABELS[key]}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
