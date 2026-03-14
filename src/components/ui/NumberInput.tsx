import { ReactNode } from "react";

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  step?: number;
  decimal?: boolean;
  prefillHint?: ReactNode;
  required?: boolean;
  min?: number;
  max?: number;
  suffix?: string;
}

export default function NumberInput({
  label,
  value,
  onChange,
  placeholder,
  step,
  decimal = false,
  prefillHint,
  required,
  min,
  max,
  suffix,
}: NumberInputProps) {
  const id = label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode={decimal ? "decimal" : "numeric"}
          value={value || ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "" || raw === "-") {
              onChange(0);
            } else {
              onChange(decimal ? parseFloat(raw) || 0 : parseInt(raw, 10) || 0);
            }
          }}
          placeholder={placeholder}
          step={step}
          required={required}
          min={min}
          max={max}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-[family-name:var(--font-mono)] min-h-[44px]"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {prefillHint && <div className="mt-1 text-xs text-amber-600">{prefillHint}</div>}
    </div>
  );
}
