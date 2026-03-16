"use client";

interface Props {
  percent: number;
  size?: "sm" | "md";
}

export default function CompletionBadge({ percent, size = "md" }: Props) {
  const isSm = size === "sm";
  const radius = isSm ? 14 : 18;
  const stroke = isSm ? 3 : 3.5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const viewBox = isSm ? 34 : 44;
  const center = viewBox / 2;

  const color =
    percent >= 80 ? "text-green-500" :
    percent >= 50 ? "text-amber-500" :
    "text-red-400";

  const strokeColor =
    percent >= 80 ? "#22c55e" :
    percent >= 50 ? "#f59e0b" :
    "#f87171";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={viewBox} height={viewBox} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className={`absolute ${color} font-bold ${isSm ? "text-[9px]" : "text-[11px]"}`}>
        {percent}%
      </span>
    </div>
  );
}
