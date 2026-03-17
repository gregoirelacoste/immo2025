"use client";

interface Props {
  percent: number;
}

export default function CompletionBadge({ percent }: Props) {
  const color =
    percent >= 80 ? "bg-green-500" :
    percent >= 50 ? "bg-amber-500" :
    "bg-red-400";

  const textColor =
    percent >= 80 ? "text-green-600" :
    percent >= 50 ? "text-amber-600" :
    "text-red-500";

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden max-w-[120px]">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-[10px] font-semibold ${textColor}`}>
        {percent}%
      </span>
    </div>
  );
}
