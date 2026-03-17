"use client";

import { useEffect, useState, useRef, useMemo, Dispatch, SetStateAction } from "react";
import { PropertyFormData } from "@/domains/property/types";
import { MarketData } from "@/domains/market/types";
import { adjustRentPerM2 } from "@/domains/market/rent-degressive";

interface MarketRentParams {
  baseRentPerM2: number;      // loyer/m² non ajusté (market data brut)
  alpha: number | null;        // exposant dégressivité
  referenceSurface: number | null; // surface de référence
}

/**
 * Auto-calculate rent_per_m2 and monthly_rent with surface degressive adjustment.
 *
 * When rent_mode is "auto" and surface changes:
 * 1. Adjusts rent_per_m2 using power law: baseRent × (S / Sref)^(α-1)
 * 2. Recalculates monthly_rent = adjustedRentPerM2 × surface
 *
 * When rent_mode is "manual", no auto-calculation is performed.
 */
export function useRentAutoCalc(
  form: PropertyFormData,
  setForm: Dispatch<SetStateAction<PropertyFormData>>,
  marketDataJson?: string
): { rentManuallySet: boolean; setRentManuallySet: Dispatch<SetStateAction<boolean>> } {
  const [rentManuallySet, setRentManuallySet] = useState(
    () => form.rent_mode === "manual" && form.monthly_rent > 0
  );
  const prevSurfaceRef = useRef(form.surface);
  const prevRentPerM2Ref = useRef(form.rent_per_m2);

  // Parse market data to get base rent params
  const marketParams = useMemo((): MarketRentParams | null => {
    if (!marketDataJson) return null;
    try {
      const md: MarketData = JSON.parse(marketDataJson);
      if (!md.avgRentPerM2) return null;
      return {
        baseRentPerM2: md.avgRentPerM2,
        alpha: md.rentElasticityAlpha ?? null,
        referenceSurface: md.rentReferenceSurface ?? null,
      };
    } catch {
      return null;
    }
  }, [marketDataJson]);

  // When rent_mode switches to "auto", enable auto-calc
  useEffect(() => {
    if (form.rent_mode === "auto") {
      setRentManuallySet(false);
    } else {
      setRentManuallySet(true);
    }
  }, [form.rent_mode]);

  // Auto-calc when rent_per_m2 or surface changes (and mode is auto)
  useEffect(() => {
    if (rentManuallySet) {
      prevRentPerM2Ref.current = form.rent_per_m2;
      prevSurfaceRef.current = form.surface;
      return;
    }

    const rentPerM2 = form.rent_per_m2;
    const surface = form.surface;

    // Only react to actual changes
    if (
      rentPerM2 === prevRentPerM2Ref.current &&
      surface === prevSurfaceRef.current
    ) {
      return;
    }

    const surfaceChanged = surface !== prevSurfaceRef.current;
    prevRentPerM2Ref.current = rentPerM2;
    prevSurfaceRef.current = surface;

    if (surface <= 0) return;

    // If surface changed and we have market data, apply degressive adjustment
    if (surfaceChanged && marketParams && marketParams.baseRentPerM2 > 0) {
      const adjustedRent = adjustRentPerM2(
        marketParams.baseRentPerM2,
        surface,
        marketParams.alpha ?? undefined,
        marketParams.referenceSurface ?? undefined
      );
      const monthlyRent = Math.round(adjustedRent * surface);
      setForm((prev) => ({
        ...prev,
        rent_per_m2: adjustedRent,
        monthly_rent: monthlyRent,
      }));
      return;
    }

    // Fallback: simple rent_per_m2 × surface
    if (rentPerM2 > 0) {
      setForm((prev) => ({
        ...prev,
        monthly_rent: Math.round(rentPerM2 * surface),
      }));
    }
  }, [form.rent_per_m2, form.surface, rentManuallySet, setForm, marketParams]);

  return { rentManuallySet, setRentManuallySet };
}
