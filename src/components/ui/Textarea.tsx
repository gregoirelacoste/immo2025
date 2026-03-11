import { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export default function Textarea({ label, hint, id, className = "", ...props }: TextareaProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${className}`}
        {...props}
      />
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}
