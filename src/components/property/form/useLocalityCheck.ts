"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { checkLocalityExists } from "@/domains/locality/actions";

type Status = "unknown" | "checking" | "found" | "not-found";

export function useLocalityCheck(cityName: string, neighborhood: string) {
  const [cityStatus, setCityStatus] = useState<Status>("unknown");
  const [neighborhoodStatus, setNeighborhoodStatus] = useState<Status>("unknown");

  const prevCityRef = useRef(cityName);
  const prevNeighborhoodRef = useRef(neighborhood);

  // Reset city status when value changes
  useEffect(() => {
    if (cityName !== prevCityRef.current) {
      setCityStatus("unknown");
      prevCityRef.current = cityName;
    }
  }, [cityName]);

  // Reset neighborhood status when value changes
  useEffect(() => {
    if (neighborhood !== prevNeighborhoodRef.current) {
      setNeighborhoodStatus("unknown");
      prevNeighborhoodRef.current = neighborhood;
    }
  }, [neighborhood]);

  const checkCity = useCallback(async () => {
    const trimmed = cityName.trim();
    if (!trimmed) {
      setCityStatus("unknown");
      return;
    }
    setCityStatus("checking");
    const result = await checkLocalityExists(trimmed, "ville");
    if (!result) {
      setCityStatus("unknown");
      return;
    }
    setCityStatus(result.found ? "found" : "not-found");
  }, [cityName]);

  const checkNeighborhood = useCallback(async () => {
    const trimmed = neighborhood.trim();
    if (!trimmed) {
      setNeighborhoodStatus("unknown");
      return;
    }
    // Can only check quartier if we have a city
    if (cityStatus !== "found") {
      setNeighborhoodStatus("unknown");
      return;
    }
    setNeighborhoodStatus("checking");
    const result = await checkLocalityExists(trimmed, "quartier");
    if (!result) {
      setNeighborhoodStatus("unknown");
      return;
    }
    setNeighborhoodStatus(result.found ? "found" : "not-found");
  }, [neighborhood, cityStatus]);

  return {
    cityStatus,
    neighborhoodStatus,
    checkCity,
    checkNeighborhood,
  };
}
