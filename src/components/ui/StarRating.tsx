"use client";

import { RATING_LABELS, RATING_STAR_COLORS } from "@/domains/property/travaux-registry";

interface Props {
  value: number | null;
  onChange?: (value: number | null) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}

const STAR_COUNT = 5;

export default function StarRating({ value, onChange, readonly = false, size = "md" }: Props) {
  const starSize = size === "sm" ? "w-5 h-5" : "w-7 h-7";
  const touchSize = size === "sm" ? "p-0.5" : "p-1";
  const colorClass = value !== null ? (RATING_STAR_COLORS[value] ?? "text-gray-300") : "text-gray-300";

  function handleClick(star: number) {
    if (readonly || !onChange) return;
    // Tap sur l'étoile déjà sélectionnée → reset à null
    if (value === star) {
      onChange(null);
    } else {
      onChange(star);
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <div className="flex">
        {Array.from({ length: STAR_COUNT }, (_, i) => {
          const star = i + 1;
          const filled = value !== null && star <= value;
          return (
            <button
              key={star}
              type="button"
              onClick={() => handleClick(star)}
              disabled={readonly}
              className={`${touchSize} ${readonly ? "cursor-default" : "cursor-pointer"} transition-colors min-h-[44px] flex items-center`}
              aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
            >
              <svg
                className={`${starSize} ${filled ? colorClass : "text-gray-200"}`}
                fill={filled ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={filled ? 0 : 1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                />
              </svg>
            </button>
          );
        })}
      </div>
      {value !== null && (
        <span className={`text-xs font-medium ml-1 ${colorClass}`}>
          {RATING_LABELS[value] ?? ""}
        </span>
      )}
    </div>
  );
}
