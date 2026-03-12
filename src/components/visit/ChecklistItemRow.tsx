"use client";

import { useState } from "react";
import type {
  CheckItemType,
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
    <div className="py-2 border-b border-gray-100 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800">{item.label}</p>
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
    onChange({ value: current === target ? null : target });
  };

  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={() => toggle(true)}
        className={`w-11 h-11 rounded-lg text-sm font-semibold transition-colors ${
          current === true
            ? "bg-green-600 text-white"
            : "bg-gray-100 text-gray-500 hover:bg-green-50"
        }`}
      >
        OK
      </button>
      <button
        type="button"
        onClick={() => toggle(false)}
        className={`w-11 h-11 rounded-lg text-sm font-semibold transition-colors ${
          current === false
            ? "bg-red-600 text-white"
            : "bg-gray-100 text-gray-500 hover:bg-red-50"
        }`}
      >
        NOK
      </button>
      <button
        type="button"
        onClick={() => toggle(null)}
        className={`w-11 h-11 rounded-lg text-sm transition-colors ${
          current === null && value !== undefined
            ? "bg-gray-400 text-white"
            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
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
          className={`w-9 h-9 text-lg transition-colors ${
            current !== null && n <= current
              ? "text-amber-400"
              : "text-gray-300"
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
      className="mt-1 w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
    />
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
        // Store NOK note as a separate text answer with _note suffix
        onChange(`${itemKey}_note`, { value: e.target.value });
      }}
      placeholder="Précisez le problème..."
      className="mt-1.5 w-full text-sm px-3 py-2 border border-red-200 rounded-lg bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
    />
  );
}
