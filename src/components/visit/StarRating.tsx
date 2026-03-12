"use client";

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
  size?: "sm" | "lg";
}

export default function StarRating({ value, onChange, size = "lg" }: Props) {
  const starSize = size === "lg" ? "w-11 h-11 text-2xl" : "w-10 h-10 text-lg";

  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          className={`${starSize} rounded-lg transition-all active:scale-125 active:text-amber-300 ${
            value !== null && n <= value
              ? "text-amber-400 scale-110"
              : "text-gray-300 hover:text-amber-200"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
