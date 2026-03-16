"use client";

import type { ReferenceItem } from "@/domains/reference/types";
import ReferenceItemsTable from "./ReferenceItemsTable";
import type { ColumnDef } from "./ReferenceItemsTable";

const CATEGORIES = [
  { value: "exterieur", label: "Extérieur" },
  { value: "securite", label: "Sécurité" },
  { value: "confort", label: "Confort" },
  { value: "technique", label: "Technique" },
  { value: "general", label: "Autres" },
];

const COLUMNS: ColumnDef[] = [
  {
    key: "value_impact_per_sqm",
    label: "Impact €/m²",
    type: "number",
    configKey: "value_impact_per_sqm",
  },
];

interface Props {
  equipments: ReferenceItem[];
}

export default function AdminEquipmentsClient({ equipments }: Props) {
  return (
    <ReferenceItemsTable
      type="equipment"
      items={equipments}
      columns={COLUMNS}
      categories={CATEGORIES}
      title="Equipements"
      defaultConfig={JSON.stringify({ value_impact_per_sqm: null })}
    />
  );
}
