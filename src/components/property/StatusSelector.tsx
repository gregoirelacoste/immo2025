"use client";

import { useState, useRef, useEffect } from "react";
import { PROPERTY_STATUSES, PROPERTY_STATUS_CONFIG, type PropertyStatus } from "@/domains/property/types";
import { changePropertyStatus } from "@/domains/property/actions";

interface Props {
  propertyId: string;
  currentStatus: PropertyStatus;
}

export default function StatusSelector({ propertyId, currentStatus }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSelect(newStatus: PropertyStatus) {
    if (newStatus === status) {
      setOpen(false);
      return;
    }
    setSaving(true);
    setStatus(newStatus);
    setOpen(false);
    await changePropertyStatus(propertyId, newStatus);
    setSaving(false);
  }

  const config = PROPERTY_STATUS_CONFIG[status] || PROPERTY_STATUS_CONFIG.added;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={saving}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors min-h-[36px] ${config.bgColor} ${config.color} border-current/20 hover:opacity-80 disabled:opacity-50`}
      >
        <span>{config.icon}</span>
        {config.label}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 left-0">
          {PROPERTY_STATUSES.map((s) => {
            const c = PROPERTY_STATUS_CONFIG[s];
            const active = s === status;
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleSelect(s)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${active ? "font-semibold" : ""}`}
              >
                <span className={`w-5 text-center ${c.color}`}>{c.icon}</span>
                <span className={active ? c.color : "text-gray-700"}>{c.label}</span>
                {active && (
                  <svg className="w-4 h-4 ml-auto text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
