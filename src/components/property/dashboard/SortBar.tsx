"use client";

type SortKey =
  | "city"
  | "purchase_price"
  | "net_yield"
  | "monthly_cashflow"
  | "airbnb_net_yield"
  | "investment_score"
  | "created_at";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "created_at", label: "Date" },
  { key: "investment_score", label: "Score" },
  { key: "city", label: "Ville" },
  { key: "purchase_price", label: "Prix" },
  { key: "net_yield", label: "Renta nette" },
  { key: "monthly_cashflow", label: "Cash-flow" },
  { key: "airbnb_net_yield", label: "Renta Airbnb" },
];

interface Props {
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
}

export type { SortKey };
export { SORT_OPTIONS };

export default function SortBar({ sortKey, sortAsc, onSort }: Props) {
  return (
    <div className="md:hidden flex items-center gap-2 mb-4">
      <label className="text-xs text-gray-500 shrink-0">Trier par</label>
      <select
        value={sortKey}
        onChange={(e) => onSort(e.target.value as SortKey)}
        className="flex-1 px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 min-h-[36px]"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="px-2 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 text-sm min-h-[36px]"
        title={sortAsc ? "Tri croissant" : "Tri décroissant"}
      >
        {sortAsc ? "↑" : "↓"}
      </button>
    </div>
  );
}
