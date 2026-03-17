"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const TABS = [
  { id: "bien", label: "Bien" },
  { id: "travaux", label: "Travaux" },
  { id: "equipements", label: "Équip." },
  { id: "simulation", label: "Simulation" },
  { id: "score", label: "Score" },
] as const;

export type TabId = typeof TABS[number]["id"];

interface Props {
  activeTab?: TabId;
  propertyId?: string;
  isOwner?: boolean;
}

export default function TabNavigation({ activeTab, propertyId, isOwner }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const current = activeTab || (searchParams.get("tab") as TabId) || "bien";

  function setTab(tab: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-1 min-w-0">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2.5 px-3 text-sm font-medium text-center rounded-lg transition-colors ${
              current === id
                ? "bg-white text-amber-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {isOwner && propertyId && (
        <Link
          href={`/property/${propertyId}/edit`}
          className="shrink-0 px-3.5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors min-h-[44px] flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
          <span className="hidden sm:inline">Modifier</span>
        </Link>
      )}
    </div>
  );
}

export { TABS };
