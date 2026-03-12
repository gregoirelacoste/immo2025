"use client";

interface Props {
  notes: string;
  onNotesChange: (notes: string) => void;
}

export default function VisitNotes({ notes, onNotesChange }: Props) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-gray-900">Notes</h2>
      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Notes libres de visite..."
        rows={4}
        className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y min-h-[100px]"
      />
    </section>
  );
}
