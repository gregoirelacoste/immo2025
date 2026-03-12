"use client";

import { useMemo } from "react";
import type {
  ChecklistCategory,
  VisitData,
  VisitItemValue,
} from "../types";

function isAnswered(value: VisitItemValue | undefined): boolean {
  if (!value) return false;
  if ("value" in value) {
    return value.value !== null && value.value !== "";
  }
  return false;
}

export interface CategoryProgress {
  key: string;
  answered: number;
  total: number;
  percent: number;
}

export function useVisitProgress(
  checklist: ChecklistCategory[],
  answers: VisitData["answers"],
) {
  const categoryProgress = useMemo<CategoryProgress[]>(() => {
    return checklist.map((cat) => {
      const total = cat.items.length;
      const answered = cat.items.filter((item) =>
        isAnswered(answers[item.key]),
      ).length;
      return {
        key: cat.key,
        answered,
        total,
        percent: total > 0 ? Math.round((answered / total) * 100) : 0,
      };
    });
  }, [checklist, answers]);

  const globalProgress = useMemo(() => {
    const totalItems = checklist.reduce(
      (sum, cat) => sum + cat.items.length,
      0,
    );
    const answeredItems = checklist.reduce(
      (sum, cat) =>
        sum +
        cat.items.filter((item) => isAnswered(answers[item.key])).length,
      0,
    );
    return {
      answered: answeredItems,
      total: totalItems,
      percent: totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0,
    };
  }, [checklist, answers]);

  return { categoryProgress, globalProgress };
}
