"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { submitFeedback } from "@/domains/roadmap/actions";
import type { FeedbackType } from "@/domains/roadmap/types";

const TYPE_OPTIONS: { value: FeedbackType; label: string; icon: string }[] = [
  { value: "feature", label: "Nouvelle fonctionnalité", icon: "✨" },
  { value: "bug", label: "Bug / Problème", icon: "🐛" },
  { value: "improvement", label: "Amélioration", icon: "🔧" },
  { value: "other", label: "Autre", icon: "💬" },
];

export default function FeedbackWidget() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("feature");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Only show for logged-in users
  if (!session?.user?.id) return null;

  function reset() {
    setType("feature");
    setTitle("");
    setDescription("");
    setError("");
    setSuccess(false);
  }

  function handleSubmit() {
    if (!title.trim()) {
      setError("Titre requis");
      return;
    }
    startTransition(async () => {
      const res = await submitFeedback({
        type,
        title: title.trim(),
        description: description.trim(),
        page_url: pathname,
      });
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          reset();
        }, 1500);
      } else {
        setError(res.error ?? "Erreur inconnue");
      }
    });
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(true); reset(); }}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 rounded-full bg-amber-500 p-3 text-white shadow-lg hover:bg-amber-600 transition-colors"
        title="Envoyer un retour"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Votre retour</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">
                &times;
              </button>
            </div>

            {success ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-sm text-gray-600">Merci pour votre retour !</p>
              </div>
            ) : (
              <>
                {/* Type selector */}
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setType(opt.value)}
                      className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                        type === opt.value
                          ? "border-amber-400 bg-amber-50 font-medium"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <span className="mr-1.5">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Titre (ex: Ajouter le calcul de la plus-value)"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setError(""); }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                  autoFocus
                />

                <textarea
                  placeholder="Détails (optionnel) — décrivez votre idée ou le problème rencontré"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none resize-none"
                />

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={isPending || !title.trim()}
                  className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                  {isPending ? "Envoi..." : "Envoyer"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
