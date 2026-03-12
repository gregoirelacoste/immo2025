"use client";

import { useEffect, useState } from "react";
import type { Property, PropertyCalculations } from "@/domains/property/types";
import { formatCurrency, formatPercent } from "@/lib/calculations";

interface Props {
  property: Property;
  calculations: PropertyCalculations;
}

export default function VisitStickyHeader({ property, calculations }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setCollapsed(window.scrollY > 120);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (collapsed) {
    return (
      <div
        className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-1.5"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <div className="flex items-center justify-between text-sm max-w-lg mx-auto">
          <span className="font-semibold text-gray-900 truncate">
            {property.city || "Bien"}
          </span>
          <div className="flex items-center gap-3 text-xs shrink-0">
            <span className="font-medium">
              {formatCurrency(property.purchase_price)}
            </span>
            <span className="text-indigo-600 font-semibold">
              {formatPercent(calculations.net_yield)}
            </span>
            <span
              className={`font-semibold ${
                calculations.monthly_cashflow >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {calculations.monthly_cashflow >= 0 ? "+" : ""}
              {formatCurrency(calculations.monthly_cashflow)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
