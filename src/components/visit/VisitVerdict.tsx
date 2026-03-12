"use client";

import StarRating from "./StarRating";

interface Props {
  rating: number | null;
  onRatingChange: (rating: number | null) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onValidate: () => void;
  onReject: () => void;
  onDefer: () => void;
  submitting: boolean;
}

export default function VisitVerdict({
  rating,
  onRatingChange,
  notes,
  onNotesChange,
  onValidate,
  onReject,
  onDefer,
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

      {/* CTA buttons */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={onValidate}
          disabled={submitting}
          className="w-full bg-green-600 text-white font-semibold py-3.5 rounded-xl min-h-[48px] hover:bg-green-700 transition-colors active:scale-[0.98] disabled:opacity-50"
        >
          Je valide ce bien
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={submitting}
          className="w-full bg-red-50 text-red-700 font-semibold py-3.5 rounded-xl min-h-[48px] border border-red-200 hover:bg-red-100 transition-colors active:scale-[0.98] disabled:opacity-50"
        >
          Je ne valide pas
        </button>
        <button
          type="button"
          onClick={onDefer}
          disabled={submitting}
          className="w-full text-sm text-gray-500 py-2 min-h-[44px] hover:text-gray-700 transition-colors"
        >
          Décider plus tard
        </button>
      </div>
    </section>
  );
}
