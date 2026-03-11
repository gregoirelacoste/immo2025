"use client";

import { useEffect, useState, useRef, Dispatch, SetStateAction } from "react";
import { PropertyFormData } from "@/domains/property/types";
import { estimateMonthlyRent } from "@/domains/market/actions";

/**
 * Auto-estimate monthly rent when city + surface are set and rent is 0.
 * Fetches market data server-side and fills monthly_rent.
 * User can override manually — auto-calc won't overwrite.
 */
export function useRentAutoCalc(
  form: PropertyFormData,
  setForm: Dispatch<SetStateAction<PropertyFormData>>
): { rentManuallySet: boolean; setRentManuallySet: Dispatch<SetStateAction<boolean>> } {
  const [rentManuallySet, setRentManuallySet] = useState(
    () => form.monthly_rent > 0
  );
  const pendingRef = useRef(false);

  // Reset manual flag when form is synced with new server data
  // (e.g. after text extraction fills monthly_rent)
  useEffect(() => {
    if (form.monthly_rent > 0) {
      setRentManuallySet(true);
    }
  }, [form.monthly_rent]);

  useEffect(() => {
    if (rentManuallySet) return;

    const city = form.city.trim();
    const surface = form.surface;

    if (!city || surface <= 0) return;

    // Debounce: wait 500ms
    pendingRef.current = true;
    const timer = setTimeout(async () => {
      if (!pendingRef.current) return;
      const result = await estimateMonthlyRent(city, surface);
      if (result && pendingRef.current) {
        setForm((prev) => {
          if (prev.monthly_rent > 0) return prev;
          return { ...prev, monthly_rent: result.rent };
        });
      }
    }, 500);

    return () => {
      pendingRef.current = false;
      clearTimeout(timer);
    };
  }, [form.city, form.surface, rentManuallySet, setForm]);

  return { rentManuallySet, setRentManuallySet };
}
