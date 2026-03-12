"use client";

import StarRating from "./StarRating";

interface Props {
  rating: number | null;
  onRatingChange: (rating: number | null) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSave: () => void;
  submitting: boolean;
}

export default function VisitVerdict({
  rating,
  onRatingChange,
  notes,
  onNotesChange,
  onSave,
  submitting,
}: Props) {
  return (
    <section id="visit-verdict" className="space-y-3">
      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Verdict final</h2>

      {/* Star rating */}
      <div className="text-center space-y-1">
        <StarRating value={rating} onChange={onRatingChange} size="lg" />
      </div>

      {/* Comment */}
      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Commentaire final (négociation, travaux, potentiel...)"
        rows={3}
        className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
      />

      {/* Save button */}
      <button
        type="button"
        onClick={onSave}
        disabled={submitting}
        className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-xl min-h-[48px] hover:bg-indigo-700 transition-colors active:scale-[0.98] disabled:opacity-50"
      >
        {submitting ? "Enregistrement..." : "Enregistrer la visite"}
      </button>
    </section>
  );
}
