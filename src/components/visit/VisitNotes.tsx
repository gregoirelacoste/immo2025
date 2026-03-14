"use client";

interface Props {
  notes: string;
  onNotesChange: (notes: string) => void;
}

export default function VisitNotes({ notes, onNotesChange }: Props) {
  return (
    <section id="visit-notes" className="space-y-3">
      <h2 className="text-sm font-bold text-[#1a1a2e] uppercase tracking-wide">Notes</h2>
      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Notes libres de visite..."
        rows={2}
        className="w-full text-sm px-3 py-2.5 border border-tiili-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y min-h-[60px]"
      />
    </section>
  );
}
