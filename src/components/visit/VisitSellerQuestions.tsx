"use client";

import { useState } from "react";
import type { SellerQuestionCategory, VisitItemValue } from "@/domains/visit/types";

interface Props {
  categories: SellerQuestionCategory[];
  answers: Record<string, VisitItemValue>;
  onAnswer: (key: string, value: VisitItemValue) => void;
}

export default function VisitSellerQuestions({
  categories,
  answers,
  onAnswer,
}: Props) {
  const [openCat, setOpenCat] = useState<string | null>(null);

  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-gray-900">
        Questions au vendeur
      </h2>

      {categories.map((cat) => {
        const isOpen = openCat === cat.key;
        const answeredCount = cat.questions.filter(
          (q) => answers[q.key] && (answers[q.key] as { value: string }).value,
        ).length;

        return (
          <div key={cat.key} className="rounded-xl border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setOpenCat(isOpen ? null : cat.key)}
              className="w-full flex items-center justify-between px-4 py-3 min-h-[48px]"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{cat.icon}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {cat.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {answeredCount}/{cat.questions.length}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-3 space-y-3">
                {cat.questions.map((q) => (
                  <div key={q.key}>
                    <p className="text-sm font-medium text-gray-800">
                      {q.label}
                    </p>
                    {q.hint && (
                      <p className="text-xs text-gray-500 mb-1">{q.hint}</p>
                    )}
                    <input
                      type="text"
                      value={
                        (answers[q.key] as { value: string })?.value ?? ""
                      }
                      onChange={(e) =>
                        onAnswer(q.key, { value: e.target.value })
                      }
                      placeholder="Réponse..."
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
