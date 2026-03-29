"use client";

import { useCallback } from "react";
import type { ChecklistItem, VisitItemValue, VisitCheckValue } from "@/domains/visit/types";

interface Props {
  items: ChecklistItem[];
  answers: Record<string, VisitItemValue>;
  onAnswer: (key: string, value: VisitItemValue) => void;
}

export default function LiveFieldChecklist({ items, answers, onAnswer }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
        <span>👁</span>
        <span>À vérifier sur place</span>
      </h3>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((item) => (
          <FieldCheckItem
            key={item.key}
            item={item}
            value={(answers[item.key] as VisitCheckValue | undefined)?.value ?? null}
            onAnswer={onAnswer}
          />
        ))}
      </div>
    </div>
  );
}

function FieldCheckItem({
  item,
  value,
  onAnswer,
}: {
  item: ChecklistItem;
  value: boolean | null;
  onAnswer: (key: string, value: VisitItemValue) => void;
}) {
  const cycle = useCallback(() => {
    // null → true (OK) → false (Problem) → null
    let next: boolean | null;
    if (value === null) next = true;
    else if (value === true) next = false;
    else next = null;
    onAnswer(item.key, { value: next });
    if (navigator.vibrate) navigator.vibrate(15);
  }, [item.key, value, onAnswer]);

  const bgColor =
    value === true
      ? "bg-green-50 border-green-300"
      : value === false
        ? "bg-red-50 border-red-300"
        : "bg-white border-gray-200";

  const icon =
    value === true ? "✓" : value === false ? "✕" : "?";

  const iconColor =
    value === true
      ? "text-green-600"
      : value === false
        ? "text-red-600"
        : "text-gray-400";

  return (
    <button
      type="button"
      onClick={cycle}
      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors min-h-[44px] ${bgColor}`}
    >
      <span className={`text-sm font-bold ${iconColor}`}>{icon}</span>
      <span className="text-xs text-gray-700 leading-tight line-clamp-2">
        {item.label}
      </span>
    </button>
  );
}
