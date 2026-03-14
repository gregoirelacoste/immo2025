"use client";

import { useState } from "react";
import type {
  ChecklistItem,
  VisitCheckValue,
  VisitItemValue,
  VisitRatingValue,
  VisitTextValue,
} from "@/domains/visit/types";

interface Props {
  item: ChecklistItem;
  value: VisitItemValue | undefined;
  onChange: (key: string, value: VisitItemValue) => void;
}

export default function ChecklistItemRow({ item, value, onChange }: Props) {
  return (
    <div className="py-1.5 border-b border-gray-100 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] leading-tight font-medium text-gray-800">{item.label}</p>
          {item.hint && (
            <p className="text-xs text-gray-500 mt-0.5">{item.hint}</p>
          )}
        </div>
        <div className="shrink-0">
          {item.type === "check" && (
            <CheckInput
              value={value as VisitCheckValue | undefined}
              onChange={(v) => onChange(item.key, v)}
            />
          )}
          {item.type === "rating" && (
            <RatingInput
              value={value as VisitRatingValue | undefined}
              onChange={(v) => onChange(item.key, v)}
            />
          )}
        </div>
      </div>
      {item.type === "text" && (
        <TextInput
          value={value as VisitTextValue | undefined}
          onChange={(v) => onChange(item.key, v)}
        />
      )}
      {item.type === "select" && item.options && (
        <SelectInput
          options={item.options}
          value={value as VisitTextValue | undefined}
          onChange={(v) => onChange(item.key, v)}
        />
      )}
      {/* Show note field when NOK is selected */}
      {item.type === "check" &&
        (value as VisitCheckValue)?.value === false && (
          <NoteField
            itemKey={item.key}
            onChange={onChange}
          />
        )}
    </div>
  );
}

// ── Check (OK / NOK / ?) ──

function CheckInput({
  value,
  onChange,
}: {
  value: VisitCheckValue | undefined;
  onChange: (v: VisitCheckValue) => void;
}) {
  const current = value?.value ?? null;

  const toggle = (target: boolean | null) => {
    if (navigator.vibrate) navigator.vibrate(target === false ? [10, 50, 10] : 10);
    onChange({ value: current === target ? null : target });
  };

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={() => toggle(true)}
        className={`w-11 h-11 rounded-lg text-sm font-semibold transition-all ${
          current === true
            ? "bg-green-600 text-white shadow-sm"
            : "bg-gray-100 text-gray-500 hover:bg-green-50 active:scale-95"
        }`}
      >
        OK
      </button>
      <button
        type="button"
        onClick={() => toggle(false)}
        className={`w-11 h-11 rounded-lg text-sm font-semibold transition-all ${
          current === false
            ? "bg-red-600 text-white shadow-sm"
            : "bg-gray-100 text-gray-500 hover:bg-red-50 active:scale-95"
        }`}
      >
        NOK
      </button>
      <button
        type="button"
        onClick={() => toggle(null)}
        className={`w-11 h-11 rounded-lg text-sm transition-all ${
          current === null && value !== undefined
            ? "bg-gray-400 text-white shadow-sm"
            : "bg-gray-100 text-gray-400 hover:bg-gray-200 active:scale-95"
        }`}
      >
        ?
      </button>
    </div>
  );
}

// ── Rating (1-5 inline stars) ──

function RatingInput({
  value,
  onChange,
}: {
  value: VisitRatingValue | undefined;
  onChange: (v: VisitRatingValue) => void;
}) {
  const current = value?.value ?? null;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange({ value: current === n ? null : n })}
          className={`w-10 h-10 text-xl transition-all ${
            current !== null && n <= current
              ? "text-amber-400"
              : "text-gray-300 active:scale-110"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ── Text input ──

function TextInput({
  value,
  onChange,
}: {
  value: VisitTextValue | undefined;
  onChange: (v: VisitTextValue) => void;
}) {
  return (
    <input
      type="text"
      value={value?.value ?? ""}
      onChange={(e) => onChange({ value: e.target.value })}
      placeholder="Précisez..."
      className="mt-1 w-full text-[13px] px-2.5 py-1.5 border border-tiili-border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
    />
  );
}

// ── Select input ──

function SelectInput({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: VisitTextValue | undefined;
  onChange: (v: VisitTextValue) => void;
}) {
  return (
    <select
      value={value?.value ?? ""}
      onChange={(e) => onChange({ value: e.target.value })}
      className="mt-1 w-full text-[13px] px-2.5 py-1.5 border border-tiili-border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none"
    >
      <option value="">Sélectionner...</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

// ── Note field (appears on NOK) ──

function NoteField({
  itemKey,
  onChange,
}: {
  itemKey: string;
  onChange: (key: string, value: VisitItemValue) => void;
}) {
  const [note, setNote] = useState("");

  return (
    <input
      type="text"
      value={note}
      onChange={(e) => {
        setNote(e.target.value);
        onChange(`${itemKey}_note`, { value: e.target.value });
      }}
      placeholder="Précisez le problème..."
      className="mt-1 w-full text-[13px] px-2.5 py-1.5 border border-red-200 rounded-lg bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
    />
  );
}
