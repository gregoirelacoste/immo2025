"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VisitData, VisitItemValue } from "../types";
import { loadVisitData, saveVisitData } from "../storage";

function createEmptyVisitData(propertyId: string): VisitData {
  return {
    property_id: propertyId,
    visited_at: new Date().toISOString(),
    answers: {},
    red_flags: [],
    photos: [],
    notes: "",
    overall_rating: null,
  };
}

export function useVisitData(propertyId: string) {
  const [data, setData] = useState<VisitData>(() =>
    createEmptyVisitData(propertyId),
  );
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from IndexedDB on mount
  useEffect(() => {
    loadVisitData(propertyId).then((stored) => {
      if (stored) setData(stored);
      setLoaded(true);
    });
  }, [propertyId]);

  // Debounced persist to IndexedDB
  const persist = useCallback(
    (next: VisitData) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        saveVisitData(next);
      }, 300);
    },
    [],
  );

  const updateData = useCallback(
    (updater: (prev: VisitData) => VisitData) => {
      setData((prev) => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setAnswer = useCallback(
    (key: string, value: VisitItemValue) => {
      updateData((prev) => ({
        ...prev,
        answers: { ...prev.answers, [key]: value },
      }));
    },
    [updateData],
  );

  const toggleRedFlag = useCallback(
    (key: string) => {
      updateData((prev) => {
        const flags = prev.red_flags.includes(key)
          ? prev.red_flags.filter((f) => f !== key)
          : [...prev.red_flags, key];
        return { ...prev, red_flags: flags };
      });
    },
    [updateData],
  );

  const setNotes = useCallback(
    (notes: string) => {
      updateData((prev) => ({ ...prev, notes }));
    },
    [updateData],
  );

  const setOverallRating = useCallback(
    (rating: number | null) => {
      updateData((prev) => ({ ...prev, overall_rating: rating }));
    },
    [updateData],
  );

  // Force-save immediately (e.g. before navigating away)
  const flushSave = useCallback(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    return saveVisitData(data);
  }, [data]);

  return {
    data,
    loaded,
    setAnswer,
    toggleRedFlag,
    setNotes,
    setOverallRating,
    flushSave,
  };
}
