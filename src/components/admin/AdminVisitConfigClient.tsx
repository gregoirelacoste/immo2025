"use client";

import { useState } from "react";
import type { ReferenceItem } from "@/domains/reference/types";
import ReferenceItemsTable from "./ReferenceItemsTable";
import type { ColumnDef } from "./ReferenceItemsTable";

// ─── Tab config ─────────────────────────────────────────

const TABS = [
  { key: "checklist", label: "Checklist", icon: "✅" },
  { key: "photo_tag", label: "Tags photo", icon: "📷" },
  { key: "red_flag", label: "Red flags", icon: "🚩" },
  { key: "seller_question", label: "Questions vendeur", icon: "❓" },
] as const;

// ─── Category options per type ──────────────────────────

const CHECKLIST_CATEGORIES = [
  { value: "exterior", label: "Extérieur & environnement" },
  { value: "common_areas", label: "Parties communes" },
  { value: "interior_structure", label: "Structure & gros œuvre" },
  { value: "interior_layout", label: "Agencement & volumes" },
  { value: "windows", label: "Fenêtres & ouvertures" },
  { value: "electricity", label: "Électricité" },
  { value: "plumbing", label: "Plomberie" },
  { value: "heating", label: "Chauffage & ventilation" },
  { value: "kitchen", label: "Cuisine" },
  { value: "bathroom", label: "Salle de bain & WC" },
  { value: "connectivity", label: "Connectivité" },
  { value: "general", label: "Impression générale" },
  { value: "amenity_specifics", label: "Équipements spécifiques" },
  { value: "type_specifics", label: "Spécifique bien" },
];

const PHOTO_TAG_CATEGORIES = [
  { value: "base", label: "Base" },
  { value: "amenity", label: "Par équipement" },
];

const RED_FLAG_CATEGORIES = [
  { value: "critical", label: "Critique" },
  { value: "warning", label: "Attention" },
];

const SELLER_QUESTION_CATEGORIES = [
  { value: "sq_financial", label: "Finances & charges" },
  { value: "sq_legal", label: "Juridique & copro" },
  { value: "sq_technical", label: "Technique & travaux" },
  { value: "sq_rental", label: "Potentiel locatif" },
];

// ─── Column definitions per type ────────────────────────

const CHECKLIST_COLUMNS: ColumnDef[] = [
  {
    key: "input_type",
    label: "Type",
    type: "select",
    configKey: "input_type",
    options: [
      { value: "check", label: "Check (oui/non)" },
      { value: "rating", label: "Rating (1-5)" },
      { value: "text", label: "Texte libre" },
      { value: "select", label: "Choix" },
    ],
  },
  { key: "hint", label: "Indice", type: "text", configKey: "hint" },
];

const RED_FLAG_COLUMNS: ColumnDef[] = [
  {
    key: "severity",
    label: "Sévérité",
    type: "select",
    configKey: "severity",
    options: [
      { value: "critical", label: "Critique" },
      { value: "warning", label: "Attention" },
    ],
  },
  { key: "hint", label: "Indice", type: "text", configKey: "hint" },
];

const SELLER_QUESTION_COLUMNS: ColumnDef[] = [
  { key: "hint", label: "Indice", type: "text", configKey: "hint" },
];

const PHOTO_TAG_COLUMNS: ColumnDef[] = [];

// ─── Component ──────────────────────────────────────────

interface Props {
  checklist: ReferenceItem[];
  photoTags: ReferenceItem[];
  redFlags: ReferenceItem[];
  sellerQuestions: ReferenceItem[];
}

export default function AdminVisitConfigClient({ checklist, photoTags, redFlags, sellerQuestions }: Props) {
  const [activeTab, setActiveTab] = useState<string>("checklist");

  const tabConfig: Record<string, {
    items: ReferenceItem[];
    columns: ColumnDef[];
    categories: { value: string; label: string }[];
    title: string;
    defaultConfig: string;
    type: "checklist" | "photo_tag" | "red_flag" | "seller_question";
  }> = {
    checklist: {
      items: checklist,
      columns: CHECKLIST_COLUMNS,
      categories: CHECKLIST_CATEGORIES,
      title: "Items de checklist",
      defaultConfig: JSON.stringify({ input_type: "check" }),
      type: "checklist",
    },
    photo_tag: {
      items: photoTags,
      columns: PHOTO_TAG_COLUMNS,
      categories: PHOTO_TAG_CATEGORIES,
      title: "Tags photo",
      defaultConfig: "{}",
      type: "photo_tag",
    },
    red_flag: {
      items: redFlags,
      columns: RED_FLAG_COLUMNS,
      categories: RED_FLAG_CATEGORIES,
      title: "Red flags",
      defaultConfig: JSON.stringify({ severity: "warning" }),
      type: "red_flag",
    },
    seller_question: {
      items: sellerQuestions,
      columns: SELLER_QUESTION_COLUMNS,
      categories: SELLER_QUESTION_CATEGORIES,
      title: "Questions vendeur",
      defaultConfig: "{}",
      type: "seller_question",
    },
  };

  const current = tabConfig[activeTab];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors
              ${activeTab === tab.key
                ? "bg-amber-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }
            `}
          >
            {tab.icon} {tab.label}
            <span className="ml-1.5 text-xs opacity-75">
              ({tabConfig[tab.key].items.length})
            </span>
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <ReferenceItemsTable
        key={activeTab}
        type={current.type}
        items={current.items}
        columns={current.columns}
        categories={current.categories}
        title={current.title}
        defaultConfig={current.defaultConfig}
      />
    </div>
  );
}
