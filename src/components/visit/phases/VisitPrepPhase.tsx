"use client";

import type { Property } from "@/domains/property/types";
import type { SellerQuestionCategory } from "@/domains/visit/types";
import { PREP_CHECKLIST } from "@/domains/visit/constants";
import { formatCurrency } from "@/lib/calculations";

interface Props {
  property: Property;
  sellerQuestions: SellerQuestionCategory[];
  prepChecklist: Record<string, boolean>;
  onPrepToggle: (key: string) => void;
}

export default function VisitPrepPhase({
  property,
  sellerQuestions,
  prepChecklist,
  onPrepToggle,
}: Props) {
  const checkedCount = Object.values(prepChecklist).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Property summary */}
      <section className="bg-white rounded-xl border border-tiili-border p-4 space-y-2">
        <h2 className="text-sm font-bold text-[#1a1a2e]">
          {property.city || "Bien"}
          {property.address && (
            <span className="font-normal text-gray-500 text-xs">
              {" "}— {property.address}
            </span>
          )}
        </h2>
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          <span className="font-semibold text-[#1a1a2e]">
            {formatCurrency(property.purchase_price)}
          </span>
          {property.surface > 0 && <span>{property.surface} m²</span>}
          <span className="capitalize">{property.property_type}</span>
        </div>
        {property.source_url && (
          <a
            href={property.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-amber-600 hover:underline truncate block"
          >
            Voir l&apos;annonce →
          </a>
        )}
      </section>

      {/* Prep checklist */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
            <span>📋</span>
            <span>Préparation</span>
          </h3>
          <span className="text-xs text-gray-500">
            {checkedCount}/{PREP_CHECKLIST.length}
          </span>
        </div>
        <div className="space-y-1">
          {PREP_CHECKLIST.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onPrepToggle(item.key)}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors min-h-[44px] ${
                prepChecklist[item.key]
                  ? "bg-green-50 border-green-200"
                  : "bg-white border-gray-200"
              }`}
            >
              <span
                className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center text-xs ${
                  prepChecklist[item.key]
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-gray-300"
                }`}
              >
                {prepChecklist[item.key] && "✓"}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-sm ${
                    prepChecklist[item.key]
                      ? "text-gray-500 line-through"
                      : "text-gray-800"
                  }`}
                >
                  {item.label}
                </p>
                {item.hint && (
                  <p className="text-xs text-gray-400 mt-0.5">{item.hint}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Seller questions preview (read-only) */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
          <span>❓</span>
          <span>Questions à poser (aperçu)</span>
        </h3>
        <p className="text-xs text-gray-500">
          Relisez ces questions avant la visite. Vous les remplirez pendant la visite.
        </p>
        {sellerQuestions.map((cat) => {
          const essentialCount = cat.questions.filter((q) => q.essential).length;
          return (
            <div
              key={cat.key}
              className="bg-white rounded-xl border border-tiili-border px-3 py-2.5"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm">{cat.icon}</span>
                <span className="text-[13px] font-semibold text-[#1a1a2e]">
                  {cat.label}
                </span>
                {essentialCount > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">
                    {essentialCount} essentielles
                  </span>
                )}
              </div>
              <ul className="space-y-1">
                {cat.questions.map((q) => (
                  <li
                    key={q.key}
                    className="text-xs text-gray-600 flex items-start gap-1.5"
                  >
                    {q.essential ? (
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">★</span>
                    ) : (
                      <span className="text-gray-300 mt-0.5 flex-shrink-0">·</span>
                    )}
                    <span>{q.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
