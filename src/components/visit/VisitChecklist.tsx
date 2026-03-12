"use client";

import { useEffect, useState } from "react";
import type { ChecklistCategory, VisitItemValue } from "@/domains/visit/types";
import type { CategoryProgress } from "@/domains/visit/hooks/useVisitProgress";
import type { LocalVisitPhoto } from "@/domains/visit/hooks/useVisitPhotos";
import ChecklistItemRow from "./ChecklistItemRow";

interface Props {
  checklist: ChecklistCategory[];
  answers: Record<string, VisitItemValue>;
  categoryProgress: CategoryProgress[];
  globalProgress: { answered: number; total: number; percent: number };
  photos: LocalVisitPhoto[];
  onAnswer: (key: string, value: VisitItemValue) => void;
}

export default function VisitChecklist({
  checklist,
  answers,
  categoryProgress,
  globalProgress,
  photos,
  onAnswer,
}: Props) {
  const [openCategory, setOpenCategory] = useState<string | null>(
    checklist[0]?.key ?? null,
  );

  // Track which categories already auto-advanced so we don't re-trigger
  const [autoAdvanced, setAutoAdvanced] = useState<Set<string>>(new Set());

  // Auto-advance: when a category reaches 100% for the first time, open the next
  useEffect(() => {
    if (!openCategory) return;
    if (autoAdvanced.has(openCategory)) return;
    const idx = checklist.findIndex((c) => c.key === openCategory);
    const progress = categoryProgress.find((p) => p.key === openCategory);
    if (progress && progress.percent === 100 && idx < checklist.length - 1) {
      setAutoAdvanced((prev) => new Set(prev).add(openCategory));
      const nextKey = checklist[idx + 1].key;
      setOpenCategory(nextKey);
    }
  }, [categoryProgress, openCategory, checklist, autoAdvanced]);

  return (
    <section className="space-y-2.5">
      {/* Global progress — title + bar inline */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide shrink-0">
          Checklist
        </h2>
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${globalProgress.percent}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 tabular-nums shrink-0">
          {globalProgress.answered}/{globalProgress.total}
        </span>
      </div>

      {/* Categories */}
      {checklist.map((cat) => {
        const progress = categoryProgress.find((p) => p.key === cat.key);
        const isOpen = openCategory === cat.key;
        const isComplete = progress?.percent === 100;
        const catPhotos = photos.filter(
          (p) =>
            p.tag === `photo_${cat.key}` ||
            cat.items.some((item) => p.tag.includes(item.key)),
        );

        return (
          <div
            key={cat.key}
            className={`rounded-xl border transition-colors ${
              isComplete
                ? "border-green-200 bg-green-50/50"
                : "border-gray-200 bg-white"
            }`}
          >
            {/* Category header */}
            <button
              type="button"
              onClick={() => setOpenCategory(isOpen ? null : cat.key)}
              className="w-full flex items-center justify-between px-3 py-2.5 min-h-[44px]"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{cat.icon}</span>
                <span className="text-[13px] font-semibold text-gray-900">
                  {cat.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 tabular-nums">
                  {progress?.answered ?? 0}/{progress?.total ?? 0}
                </span>
                {/* Mini progress bar */}
                <div className="w-10 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isComplete ? "bg-green-500" : "bg-indigo-500"
                    }`}
                    style={{ width: `${progress?.percent ?? 0}%` }}
                  />
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </div>
            </button>

            {/* Items */}
            {isOpen && (
              <div className="px-3 pb-2 space-y-0">
                {cat.items.map((item) => (
                  <ChecklistItemRow
                    key={item.key}
                    item={item}
                    value={answers[item.key]}
                    onChange={onAnswer}
                  />
                ))}

                {/* Photos for this category */}
                {catPhotos.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-gray-500 mb-1">
                      Photos ({catPhotos.length})
                    </p>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {catPhotos.map((photo) => (
                        <img
                          key={photo.localId}
                          src={photo.uri}
                          alt={photo.tag}
                          className="w-14 h-14 rounded-lg object-cover shrink-0"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
