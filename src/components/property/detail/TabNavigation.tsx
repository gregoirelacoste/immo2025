"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

const TABS = [
  { id: "bien", label: "Bien" },
  { id: "simulation", label: "Simulation" },
  { id: "score", label: "Score" },
  { id: "visite", label: "Visite" },
] as const;

export type TabId = typeof TABS[number]["id"];

interface Props {
  activeTab?: TabId;
}

export default function TabNavigation({ activeTab }: Props) {
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
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
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
  );
}

export { TABS };
