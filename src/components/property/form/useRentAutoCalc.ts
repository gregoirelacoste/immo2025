"use client";

import { useEffect, useState, useRef, Dispatch, SetStateAction } from "react";
import { PropertyFormData } from "@/domains/property/types";
import { estimateMonthlyRent } from "@/domains/market/actions";

/**
 * Auto-estimate monthly rent when city + surface are set and rent is 0.
 * Fetches market data server-side and fills monthly_rent.
 * User can override manually — auto-calc won't overwrite non-zero values.
 */
export function useRentAutoCalc(
  form: PropertyFormData,
  setForm: Dispatch<SetStateAction<PropertyFormData>>
): { rentManuallySet: boolean; setRentManuallySet: Dispatch<SetStateAction<boolean>> } {
  const [rentManuallySet, setRentManuallySet] = useState(
    () => form.monthly_rent > 0
  );
  const lastCity = useRef(form.city);
  const lastSurface = useRef(form.surface);

  useEffect(() => {
    // Only auto-estimate if rent is not manually set
    if (rentManuallySet) return;

    const city = form.city.trim();
    const surface = form.surface;

    // Skip if no city or surface
    if (!city || surface <= 0) return;

    // Skip if nothing changed
    if (city === lastCity.current && surface === lastSurface.current) return;
    lastCity.current = city;
    lastSurface.current = surface;

    // Debounce: wait 500ms after last change
    const timer = setTimeout(async () => {
      const result = await estimateMonthlyRent(city, surface);
      if (result) {
        setForm((prev) => {
          // Don't overwrite if user set it meanwhile
          if (prev.monthly_rent > 0) return prev;
          return { ...prev, monthly_rent: result.rent };
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.city, form.surface, rentManuallySet, setForm]);

  return { rentManuallySet, setRentManuallySet };
}
