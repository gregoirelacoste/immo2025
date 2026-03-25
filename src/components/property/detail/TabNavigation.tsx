"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useUserMode } from "@/contexts/UserModeContext";

const TABS = [
  { id: "bien", label: "Bien" },
  { id: "financement", label: "Finance." },
  { id: "travaux", label: "Travaux" },
  { id: "equipements", label: "Équip." },
  { id: "amenagement", label: "Meublé" },
  { id: "localite", label: "Localité" },
] as const;

/** Tabs shown in beginner mode */
const BEGINNER_TAB_IDS = new Set(["bien", "financement"]);

export type TabId = typeof TABS[number]["id"];

export default function TabNavigation() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { isBeginner } = useUserMode();
  const current = (searchParams.get("tab") as TabId) || "bien";

  const visibleTabs = isBeginner ? TABS.filter(t => BEGINNER_TAB_IDS.has(t.id)) : TABS;

  function setTab(tab: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 min-w-max md:min-w-0">
        {visibleTabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2.5 px-3 text-sm font-medium text-center rounded-lg transition-colors whitespace-nowrap ${
              current === id
                ? "bg-white text-amber-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { TABS };
