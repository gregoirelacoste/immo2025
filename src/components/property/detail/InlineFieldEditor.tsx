"use client";

import { useState, useTransition } from "react";
import { updatePropertyField } from "@/domains/property/actions";
import type { FieldMetadata } from "@/domains/property/field-registry";

interface Props {
  propertyId: string;
  field: FieldMetadata;
  onSaved?: () => void;
}

export default function InlineFieldEditor({ propertyId, field, onSaved }: Props) {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const parsed = field.inputType === "text" || field.inputType === "select"
      ? value.trim()
      : parseFloat(value.replace(/\s/g, "").replace(",", "."));

    if (field.inputType !== "text" && field.inputType !== "select" && isNaN(parsed as number)) return;

    startTransition(async () => {
      const result = await updatePropertyField(propertyId, field.key, parsed);
      if (result.success) {
        setSaved(true);
        onSaved?.();
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  const inputMode =
    field.inputType === "currency" || field.inputType === "number" ? "decimal" as const :
    field.inputType === "percent" ? "decimal" as const :
    "text" as const;

  if (field.inputType === "select" && field.key === "dpe_rating") {
    return (
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
        >
          <option value="">—</option>
          {["A", "B", "C", "D", "E", "F", "G"].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <button
          onClick={handleSave}
          disabled={isPending || !value}
          className="shrink-0 px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-40 transition-colors min-h-[38px]"
        >
          {isPending ? "…" : saved ? "✓" : "OK"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 relative">
        <input
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={field.placeholder}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 pr-14"
        />
        {field.suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
            {field.suffix}
          </span>
        )}
      </div>
      <button
        onClick={handleSave}
        disabled={isPending || !value.trim()}
        className="shrink-0 px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-40 transition-colors min-h-[38px]"
      >
        {isPending ? "…" : saved ? "✓" : "OK"}
      </button>
    </div>
  );
}
