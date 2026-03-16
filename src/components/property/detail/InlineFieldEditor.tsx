"use client";

import { useState, useTransition } from "react";
import { updatePropertyField } from "@/domains/property/actions";
import type { FieldMetadata } from "@/domains/property/field-registry";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";

interface Props {
  propertyId: string;
  field: FieldMetadata;
  onSaved?: () => void;
}

const DPE_OPTIONS = [
  { value: "", label: "—" },
  ...["A", "B", "C", "D", "E", "F", "G"].map((v) => ({ value: v, label: v })),
];

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

  const inputMode = field.inputType === "text" ? "text" as const : "decimal" as const;

  if (field.inputType === "select" && field.key === "dpe_rating") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select
            options={DPE_OPTIONS}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending || !value}
          loading={isPending}
        >
          {saved ? "✓" : "OK"}
        </Button>
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
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[44px] pr-14"
        />
        {field.suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
            {field.suffix}
          </span>
        )}
      </div>
      <Button
        size="sm"
        onClick={handleSave}
        disabled={isPending || !value.trim()}
        loading={isPending}
      >
        {saved ? "✓" : "OK"}
      </Button>
    </div>
  );
}
