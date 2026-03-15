"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Property } from "@/domains/property/types";
import type { Simulation } from "@/domains/simulation/types";
import { parseAmenities, AMENITY_LABELS } from "@/domains/property/amenities";
import { calculateAll, calculateSimulation, formatCurrency, formatPercent } from "@/lib/calculations";
import { resolveVisitConfig } from "@/domains/visit/constants";
import { changePropertyStatus } from "@/domains/property/actions";
import { useVisitData } from "@/domains/visit/hooks/useVisitData";
import { useVisitPhotos } from "@/domains/visit/hooks/useVisitPhotos";
import { useVisitProgress } from "@/domains/visit/hooks/useVisitProgress";
import VisitStickyHeader from "./VisitStickyHeader";
import VisitChecklist from "./VisitChecklist";
import VisitRedFlags from "./VisitRedFlags";
import VisitSellerQuestions from "./VisitSellerQuestions";
import VisitNotes from "./VisitNotes";
import VisitVerdict from "./VisitVerdict";
import VisitBottomBar from "./VisitBottomBar";
import VisitPhotoFAB from "./VisitPhotoFAB";
import PhotoTagSheet from "./PhotoTagSheet";
import PhotoGuidedMode from "./PhotoGuidedMode";

interface Props {
  property: Property;
  simulation?: Simulation | null;
}

export default function VisitMode({ property, simulation }: Props) {
  const router = useRouter();
  const calculations = useMemo(
    () => simulation ? calculateSimulation(property, simulation) : calculateAll(property),
    [property, simulation]
  );
  const amenities = useMemo(
    () => parseAmenities(property.amenities),
    [property.amenities],
  );
  const config = useMemo(
    () => resolveVisitConfig(amenities, property.property_type as "ancien" | "neuf"),
    [amenities, property.property_type],
  );

  const {
    data,
    loaded: dataLoaded,
    setAnswer,
    toggleRedFlag,
    setNotes,
    setOverallRating,
    flushSave,
  } = useVisitData(property.id);

  const {
    photos,
    loaded: photosLoaded,
    addPhoto,
    removePhoto,
    photoCount,
  } = useVisitPhotos(property.id);

  const { categoryProgress, globalProgress } = useVisitProgress(
    config.checklist,
    data.answers,
  );

  // Photo capture flow
  const [pendingPhoto, setPendingPhoto] = useState<{
    blob: Blob;
    url: string;
  } | null>(null);

  const handleCapture = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setPendingPhoto({ blob, url });
  }, []);

  const handleSavePhoto = useCallback(
    async (tag: string, note?: string) => {
      if (!pendingPhoto) return;
      await addPhoto(pendingPhoto.blob, tag, note);
      URL.revokeObjectURL(pendingPhoto.url);
      setPendingPhoto(null);
    },
    [pendingPhoto, addPhoto],
  );

  const handleCancelPhoto = useCallback(() => {
    if (pendingPhoto) {
      URL.revokeObjectURL(pendingPhoto.url);
      setPendingPhoto(null);
    }
  }, [pendingPhoto]);

  // Guided photo mode
  const [guidedMode, setGuidedMode] = useState(false);

  // Verdict
  const [verdictComment, setVerdictComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSaveVisit = useCallback(async () => {
    setSubmitting(true);
    try {
      await flushSave();
      await changePropertyStatus(property.id, "visited");
      router.push(`/property/${property.id}`);
    } catch {
      setSubmitting(false);
    }
  }, [flushSave, property.id, router]);

  // Scroll helpers
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  if (!dataLoaded || !photosLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f3ef] pb-24">
      {/* Sticky collapsed header (appears on scroll) */}
      <VisitStickyHeader property={property} calculations={calculations} />

      {/* Full header recap */}
      <header className="bg-white border-b border-tiili-border px-4 py-2.5">
        <div className="max-w-lg mx-auto space-y-2">
          {/* Back + title */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push(`/property/${property.id}`)}
              className="text-sm text-gray-600 hover:text-[#1a1a2e] flex items-center gap-1 min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              Retour fiche
            </button>
            <button
              type="button"
              onClick={() => setGuidedMode(true)}
              className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full hover:bg-purple-100 transition-colors min-h-[44px] flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
              Mode guide
            </button>
          </div>

          {/* Property info */}
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-[#1a1a2e] truncate">
              {property.city || "Bien"}
              {property.address && (
                <span className="font-normal text-gray-500 text-xs">
                  {" "}— {property.address}
                </span>
              )}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
              <span className="font-semibold">
                {formatCurrency(property.purchase_price)}
              </span>
              {property.surface > 0 && <span>{property.surface} m²</span>}
              <span className="capitalize">{property.property_type}</span>
            </div>
          </div>

          {/* KPIs */}
          <div className="flex items-center justify-between gap-1 py-1">
            <KPI label="Renta" value={formatPercent(calculations.net_yield)} />
            <KPI
              label="Cash-flow"
              value={`${calculations.monthly_cashflow >= 0 ? "+" : ""}${formatCurrency(calculations.monthly_cashflow)}`}
              color={calculations.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}
            />
            <KPI label="Mensualité" value={formatCurrency(calculations.monthly_payment)} />
            <KPI
              label="Score"
              value={property.investment_score != null ? `${property.investment_score}` : "—"}
            />
          </div>

          {/* Amenities badges */}
          {amenities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {amenities.map((key) => (
                <span
                  key={key}
                  className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full"
                >
                  {AMENITY_LABELS[key]}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {/* Checklist */}
        <VisitChecklist
          checklist={config.checklist}
          answers={data.answers}
          categoryProgress={categoryProgress}
          globalProgress={globalProgress}
          photos={photos}
          onAnswer={setAnswer}
        />

        {/* Red flags */}
        <div id="visit-redflags">
          <VisitRedFlags
            redFlags={config.red_flags}
            flaggedKeys={data.red_flags}
            onToggle={toggleRedFlag}
          />
        </div>

        {/* Seller questions */}
        <VisitSellerQuestions
          categories={config.seller_questions}
          answers={data.answers}
          onAnswer={setAnswer}
        />

        {/* Notes */}
        <VisitNotes notes={data.notes} onNotesChange={setNotes} />

        {/* Untagged photos gallery */}
        {photos.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#1a1a2e] uppercase tracking-wide">
              Photos ({photos.length})
            </h2>
            <div className="grid grid-cols-3 gap-1.5">
              {photos.map((photo) => (
                <div key={photo.localId} className="relative">
                  <img
                    src={photo.uri}
                    alt={photo.tag}
                    className="w-full aspect-square rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.localId)}
                    className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center text-xs shadow-sm"
                  >
                    ✕
                  </button>
                  {photo.tag && photo.tag !== "photo_other" && (
                    <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 bg-black/50 text-white rounded">
                      {photo.tag.replace("photo_", "")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Verdict */}
        <VisitVerdict
          rating={data.overall_rating}
          onRatingChange={setOverallRating}
          notes={verdictComment}
          onNotesChange={setVerdictComment}
          onSave={handleSaveVisit}
          submitting={submitting}
        />
      </main>

      {/* Photo FAB */}
      <VisitPhotoFAB photoCount={photoCount} onCapture={handleCapture} />

      {/* Bottom bar */}
      <VisitBottomBar
        progressPercent={globalProgress.percent}
        redFlagCount={data.red_flags.length}
        onScrollToRedFlags={() => scrollTo("visit-redflags")}
        onScrollToVerdict={() => scrollTo("visit-verdict")}
        onQuickNote={() => scrollTo("visit-notes")}
      />

      {/* Photo tag bottom sheet */}
      {pendingPhoto && (
        <PhotoTagSheet
          photoUrl={pendingPhoto.url}
          tags={config.photo_tags}
          onSave={handleSavePhoto}
          onCancel={handleCancelPhoto}
        />
      )}

      {/* Guided photo mode overlay */}
      {guidedMode && (
        <PhotoGuidedMode
          photos={photos}
          onCapture={addPhoto}
          onClose={() => setGuidedMode(false)}
        />
      )}
    </div>
  );
}

function KPI({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="text-center min-w-0">
      <p className="text-[10px] text-gray-500 uppercase leading-tight">
        {label}
      </p>
      <p className={`text-xs font-bold truncate ${color || "text-[#1a1a2e]"}`}>
        {value}
      </p>
    </div>
  );
}
