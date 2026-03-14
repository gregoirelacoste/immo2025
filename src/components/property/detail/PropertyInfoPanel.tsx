import { Property } from "@/domains/property/types";
import { formatCurrency } from "@/lib/calculations";

interface Props {
  property: Property;
}

export default function PropertyInfoPanel({ property }: Props) {
  return (
    <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Le bien</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Prix d&apos;achat</span>
          <p className="font-semibold">{formatCurrency(property.purchase_price)}</p>
        </div>
        <div>
          <span className="text-gray-500">Surface</span>
          <p className="font-semibold">{property.surface} m²</p>
        </div>
        <div>
          <span className="text-gray-500">Prix au m²</span>
          <p className="font-semibold">
            {property.surface > 0
              ? formatCurrency(property.purchase_price / property.surface)
              : "—"}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Type</span>
          <p className="font-semibold capitalize">{property.property_type}</p>
        </div>
      </div>
      {property.description && (
        <p className="text-sm text-gray-600 mt-4 p-3 bg-gray-50 rounded-lg">
          {property.description}
        </p>
      )}
    </section>
  );
}
