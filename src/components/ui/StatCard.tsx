type Color = "green" | "red" | "default";

interface StatCardProps {
  label: string;
  value: string;
  color?: Color;
}

const colorClasses: Record<Color, string> = {
  green: "text-green-600",
  red: "text-red-600",
  default: "text-gray-900",
};

export default function StatCard({ label, value, color = "default" }: StatCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-lg font-bold ${colorClasses[color]}`}>{value}</div>
    </div>
  );
}
