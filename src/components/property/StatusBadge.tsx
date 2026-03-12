"use client";

import { PROPERTY_STATUS_CONFIG, type PropertyStatus } from "@/domains/property/types";

interface Props {
  status: PropertyStatus;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "sm" }: Props) {
  const config = PROPERTY_STATUS_CONFIG[status] || PROPERTY_STATUS_CONFIG.added;
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bgColor} ${config.color} ${sizeClass}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
