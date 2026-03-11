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
  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";

  return (
    <div className="md:hidden flex gap-2 mb-4 overflow-x-auto pb-1">
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onSort(opt.key)}
          className={`px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap min-h-[36px] ${
            sortKey === opt.key
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-600 border border-gray-200"
          }`}
        >
          {opt.label}{sortIcon(opt.key)}
        </button>
      ))}
    </div>
  );
}
