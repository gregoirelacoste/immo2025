"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

const TABS = [
  { id: "financier", label: "Financier" },
  { id: "contexte", label: "Contexte" },
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
  const current = activeTab || (searchParams.get("tab") as TabId) || "financier";

  function setTab(tab: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-hidden">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          className={`flex-1 py-3 px-2 text-sm font-medium text-center transition-colors relative ${
            current === id
              ? "text-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {label}
          {current === id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
          )}
        </button>
      ))}
    </div>
  );
}

export { TABS };
