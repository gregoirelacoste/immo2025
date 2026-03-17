"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

const TABS = [
  { id: "bien", label: "Bien" },
  { id: "travaux", label: "Travaux" },
  { id: "equipements", label: "Équip." },
  { id: "simulation", label: "Simulation" },
  { id: "localite", label: "Localité" },
] as const;

export type TabId = typeof TABS[number]["id"];

export default function TabNavigation() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const current = (searchParams.get("tab") as TabId) || "bien";

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
