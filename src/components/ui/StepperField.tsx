"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface StepperFieldConfig {
  field: string;
  label: string;
  step: number;
  unit: string;
  decimals?: number;
  min?: number;
}

export function formatStepperValue(value: number, config: StepperFieldConfig): string {
  if (config.decimals != null) return value.toFixed(config.decimals);
  if (config.unit === "€") return Math.round(value).toLocaleString("fr-FR");
  return String(value);
}

interface Props {
  config: StepperFieldConfig;
  value: number;
  /** Called on every change (stepper click or text commit) — use for local state */
  onChange: (field: string, v: number) => void;
  /** Called after a pause in stepper clicks (debounced) or on text commit — use for server persist */
  onCommit?: (field: string, v: number) => void;
  readOnly?: boolean;
}

export default function StepperField({
  config,
  value,
  onChange,
  onCommit,
  readOnly,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [textValue, setTextValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear debounce timer on unmount to prevent stale saves
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // Debounced commit for stepper +/- clicks (500ms)
  const debouncedCommit = useCallback((field: string, v: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onCommit?.(field, v);
    }, 500);
  }, [onCommit]);

  if (readOnly) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-b-0">
        <span className="text-sm text-gray-600 font-medium">{config.label}</span>
        <span className="text-sm font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)] py-1 px-2">
          {formatStepperValue(value, config)}{"\u202f"}{config.unit}
        </span>
      </div>
    );
  }

  function startEdit() {
    setTextValue(config.decimals ? value.toFixed(config.decimals) : String(value));
    setEditing(true);
  }

  function commitText() {
    const parsed = parseFloat(textValue.replace(/\s/g, "").replace(",", "."));
    const minVal = config.min ?? 0;
    if (!isNaN(parsed) && parsed >= minVal) {
      onChange(config.field, parsed);
      // Text commit is immediate (user pressed Enter or blurred)
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onCommit?.(config.field, parsed);
    }
    setEditing(false);
  }

  function step(dir: 1 | -1) {
    const minVal = config.min ?? 0;
    const next = Math.max(minVal, +(value + dir * config.step).toFixed(config.decimals ?? 0));
    onChange(config.field, next);
    // Stepper clicks are debounced — waits for pause before committing
    debouncedCommit(config.field, next);
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-b-0">
      <label className="text-sm text-gray-600 font-medium">{config.label}</label>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => step(-1)}
          className="w-8 h-8 min-w-[44px] min-h-[44px] rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-600 flex items-center justify-center transition-colors text-lg font-medium select-none"
          aria-label={`Diminuer ${config.label}`}
        >
          −
        </button>
        {editing ? (
          <input
            type="text"
            inputMode="decimal"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => { if (e.key === "Enter") commitText(); }}
            className="w-24 text-center text-sm font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)] bg-amber-50 border border-amber-300 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="min-w-[6rem] text-center text-sm font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)] py-1 px-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {formatStepperValue(value, config)}{"\u202f"}{config.unit}
          </button>
        )}
        <button
          type="button"
          onClick={() => step(1)}
          className="w-8 h-8 min-w-[44px] min-h-[44px] rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-600 flex items-center justify-center transition-colors text-lg font-medium select-none"
          aria-label={`Augmenter ${config.label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
