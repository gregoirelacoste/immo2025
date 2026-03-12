"use client";

import { useEffect, useState, useRef, Dispatch, SetStateAction } from "react";
import { PropertyFormData } from "@/domains/property/types";

/**
 * Auto-calculate monthly_rent from rent_per_m2 × surface.
 * Priority: manual monthly_rent > scraped monthly_rent > calculated (rent_per_m2 × surface).
 * No longer fetches market data — rent_per_m2 is stored on the property.
 */
export function useRentAutoCalc(
  form: PropertyFormData,
  setForm: Dispatch<SetStateAction<PropertyFormData>>
): { rentManuallySet: boolean; setRentManuallySet: Dispatch<SetStateAction<boolean>> } {
  const [rentManuallySet, setRentManuallySet] = useState(
    () => form.monthly_rent > 0
  );
  const prevRentPerM2Ref = useRef(form.rent_per_m2);
  const prevSurfaceRef = useRef(form.surface);

  // Sync manual flag when form is synced with new server data
  useEffect(() => {
    if (form.monthly_rent > 0) {
      setRentManuallySet(true);
    }
  }, [form.monthly_rent]);

  // Auto-calc monthly_rent when rent_per_m2 or surface changes
  useEffect(() => {
    // Skip if rent was manually set by user
    if (rentManuallySet) {
      prevRentPerM2Ref.current = form.rent_per_m2;
      prevSurfaceRef.current = form.surface;
      return;
    }

    const rentPerM2 = form.rent_per_m2;
    const surface = form.surface;

    // Only auto-calc if rent_per_m2 or surface actually changed
    if (
      rentPerM2 === prevRentPerM2Ref.current &&
      surface === prevSurfaceRef.current
    ) {
      return;
    }

    prevRentPerM2Ref.current = rentPerM2;
    prevSurfaceRef.current = surface;

    if (rentPerM2 > 0 && surface > 0) {
      const calculatedRent = Math.round(rentPerM2 * surface);
      setForm((prev) => ({
        ...prev,
        monthly_rent: calculatedRent,
      }));
    }
  }, [form.rent_per_m2, form.surface, rentManuallySet, setForm]);

  return { rentManuallySet, setRentManuallySet };
}
