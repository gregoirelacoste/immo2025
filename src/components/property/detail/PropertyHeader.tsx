import Link from "next/link";
import { Property } from "@/domains/property/types";

interface Props {
  property: Property;
  isOwner: boolean;
  onDelete: () => void;
}

export default function PropertyHeader({ property, isOwner, onDelete }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-900 truncate">{property.city}</h1>
        {property.address && (
          <p className="text-gray-500 text-sm truncate">{property.address}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Ajouté le{" "}
          {new Date(property.created_at).toLocaleDateString("fr-FR")}
        </p>
        {property.source_url && (
          <a
            href={property.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-500 hover:underline mt-0.5 inline-block"
          >
            Voir l&apos;annonce source
          </a>
        )}
      </div>
      {isOwner && (
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/property/${property.id}/edit`}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 min-h-[44px] flex items-center"
          >
            Modifier
          </Link>
          <button
            onClick={onDelete}
            className="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 min-h-[44px] flex items-center"
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}
