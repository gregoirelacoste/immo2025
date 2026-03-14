"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Property } from "@/domains/property/types";
import { rescrapeProperty } from "@/domains/property/actions";
import { extractAndUpdateFromText } from "@/domains/scraping/actions";
import Spinner from "@/components/ui/Spinner";

interface Props {
  property: Property;
  isOwner: boolean;
}

export default function RescrapePanel({ property, isOwner }: Props) {
  const router = useRouter();
  const [rescraping, setRescraping] = useState(false);
  const [rescrapeMsg, setRescrapeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPasteForm, setShowPasteForm] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleRescrape() {
    setRescraping(true);
    setRescrapeMsg(null);
    const result = await rescrapeProperty(property.id);
    setRescraping(false);
    if (result.success) {
      setRescrapeMsg({ type: "success", text: "Données mises à jour." });
      router.refresh();
    } else {
      setRescrapeMsg({ type: "error", text: result.error || "Échec." });
    }
  }

  async function handleExtractFromText() {
    if (!pastedText.trim()) return;
    setExtracting(true);
    setExtractMsg(null);
    const result = await extractAndUpdateFromText(property.id, pastedText.trim());
    setExtracting(false);
    if (result.success) {
      setExtractMsg({ type: "success", text: "Données extraites et mises à jour." });
      setPastedText("");
      setShowPasteForm(false);
      router.refresh();
    } else {
      setExtractMsg({ type: "error", text: result.error || "Échec de l'extraction." });
    }
  }

  return (
    <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
      <div className="flex flex-col items-center gap-3">
        {isOwner && property.source_url && (
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={handleRescrape}
              disabled={rescraping}
              className="px-5 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 min-h-[44px] flex items-center gap-2"
            >
              {rescraping ? (
                <>
                  <Spinner />
                  Scraping...
                </>
              ) : (
                "Relancer le scraping"
              )}
            </button>
            <button
              onClick={() => setShowPasteForm(!showPasteForm)}
              className="px-5 py-3 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors min-h-[44px]"
            >
              {showPasteForm ? "Masquer" : "Coller le texte de l'annonce"}
            </button>
          </div>
        )}

        {isOwner && !property.source_url && (
          <button
            onClick={() => setShowPasteForm(!showPasteForm)}
            className="px-5 py-3 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors min-h-[44px]"
          >
            {showPasteForm ? "Masquer" : "Coller le texte d'une annonce"}
          </button>
        )}

        {rescrapeMsg && (
          <p className={`text-sm ${rescrapeMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>
            {rescrapeMsg.text}
          </p>
        )}

        {showPasteForm && (
          <div className="w-full mt-2 space-y-3">
            <p className="text-sm text-gray-500">
              Si le scraping automatique ne fonctionne pas, ouvrez l&apos;annonce dans votre navigateur,
              s&eacute;lectionnez tout le texte (Ctrl+A), copiez-le (Ctrl+C) et collez-le ci-dessous.
            </p>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Collez ici le texte complet de l'annonce..."
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm min-h-[120px] focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              rows={5}
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleExtractFromText}
                disabled={extracting || !pastedText.trim()}
                className="px-5 py-3 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 min-h-[44px] flex items-center gap-2"
              >
                {extracting ? (
                  <>
                    <Spinner />
                    Extraction...
                  </>
                ) : (
                  "Extraire les données"
                )}
              </button>
              {extractMsg && (
                <p className={`text-sm ${extractMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>
                  {extractMsg.text}
                </p>
              )}
            </div>
          </div>
        )}

        <Link
          href="/dashboard"
          className="inline-flex items-center text-amber-600 hover:underline text-sm min-h-[44px]"
        >
          &larr; Retour au dashboard
        </Link>
      </div>
    </section>
  );
}
