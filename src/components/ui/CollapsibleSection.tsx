"use client";

import { useState, type ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  /** Couleur du header */
  variant?: "default" | "blue" | "purple" | "emerald" | "violet";
}

const variantClasses = {
  default: {
    section: "bg-white border-gray-200",
    header: "text-gray-900 hover:bg-gray-50",
    chevron: "text-gray-400",
  },
  blue: {
    section: "bg-blue-50 border-blue-200",
    header: "text-blue-900 hover:bg-blue-100/50",
    chevron: "text-blue-400",
  },
  purple: {
    section: "bg-purple-50 border-purple-200",
    header: "text-purple-900 hover:bg-purple-100/50",
    chevron: "text-purple-400",
  },
  emerald: {
    section: "bg-emerald-50 border-emerald-200",
    header: "text-emerald-900 hover:bg-emerald-100/50",
    chevron: "text-emerald-400",
  },
  violet: {
    section: "bg-violet-50 border-violet-200",
    header: "text-violet-900 hover:bg-violet-100/50",
    chevron: "text-violet-400",
  },
};

export default function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  className = "",
  variant = "default",
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const v = variantClasses[variant];

  return (
    <section className={`rounded-xl border ${v.section} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 md:px-6 md:py-4 rounded-xl transition-colors min-h-[48px] ${v.header}`}
      >
        <h2 className="text-base font-semibold">{title}</h2>
        <svg
          className={`w-5 h-5 shrink-0 transition-transform duration-200 ${v.chevron} ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4 md:px-6 md:pb-6">{children}</div>
      </div>
    </section>
  );
}
