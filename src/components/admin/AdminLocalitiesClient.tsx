"use client";

import LocalitiesClient from "@/components/locality/LocalitiesClient";
import type { Locality, LocalityData } from "@/domains/locality/types";

interface Props {
  localities: Locality[];
  dataMap: Record<string, LocalityData[]>;
}

export default function AdminLocalitiesClient({ localities, dataMap }: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Localités</h2>
      <LocalitiesClient localities={localities} dataMap={dataMap} />
    </div>
  );
}
