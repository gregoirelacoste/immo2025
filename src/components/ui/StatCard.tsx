type Color = "green" | "red" | "default";

interface StatCardProps {
  label: string;
  value: string;
  color?: Color;
}

const colorClasses: Record<Color, string> = {
  green: "text-green-600",
  red: "text-red-600",
  default: "text-[#1a1a2e]",
};

export default function StatCard({ label, value, color = "default" }: StatCardProps) {
  return (
    <div className="bg-tiili-surface rounded-lg p-3">
      <div className="text-[10px] text-tiili-muted uppercase tracking-wide font-semibold mb-1">{label}</div>
      <div className={`text-lg font-bold font-[family-name:var(--font-mono)] tracking-tight ${colorClasses[color]}`}>{value}</div>
    </div>
  );
}
