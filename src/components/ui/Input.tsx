import { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: ReactNode;
  error?: string;
}

export default function Input({ label, hint, error, id, className = "", ...props }: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2.5 border rounded-lg text-base focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[44px] ${
          error ? "border-red-300" : "border-gray-300"
        } ${className}`}
        {...props}
      />
      {hint && <div className="mt-1 text-xs text-amber-600">{hint}</div>}
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </div>
  );
}
