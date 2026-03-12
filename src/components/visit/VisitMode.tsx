"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Property } from "@/domains/property/types";
import { parseAmenities, AMENITY_LABELS } from "@/domains/property/amenities";
import { calculateAll, formatCurrency, formatPercent } from "@/lib/calculations";
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

interface Props {
  property: Property;
}

export default function VisitMode({ property }: Props) {
  const router = useRouter();
  const calculations = useMemo(() => calculateAll(property), [property]);
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

  // Verdict
  const [verdictComment, setVerdictComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleVerdict = useCallback(
    async (status: "validated" | "not_validated" | "visited") => {
      setSubmitting(true);
      try {
        await flushSave();
        await changePropertyStatus(property.id, status);
        router.push(`/property/${property.id}`);
      } catch {
        setSubmitting(false);
      }
    },
    [flushSave, property.id, router],
  );

  // Scroll helpers
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  if (!dataLoaded || !photosLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Sticky collapsed header (appears on scroll) */}
      <VisitStickyHeader property={property} calculations={calculations} />

      {/* Full header recap */}
      <header className="bg-white border-b border-gray-200 px-4 py-2.5">
        <div className="max-w-lg mx-auto space-y-2">
          {/* Back + title */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push(`/property/${property.id}`)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              Retour fiche
            </button>
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
              Mode visite
            </span>
          </div>

          {/* Property info */}
          <div>
            <h1 className="text-base font-bold text-gray-900 truncate">
              {property.city || "Bien"}{" "}
              {property.address && (
                <span className="font-normal text-gray-500">
                  — {property.address}
                </span>
              )}
            </h1>
            <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
              <span className="font-semibold">
                {formatCurrency(property.purchase_price)}
              </span>
              {property.surface > 0 && <span>{property.surface} m²</span>}
              <span className="capitalize">{property.property_type}</span>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-1">
            <KPI label="Renta nette" value={formatPercent(calculations.net_yield)} />
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
            <div className="flex flex-wrap gap-1.5">
              {amenities.map((key) => (
                <span
                  key={key}
                  className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full"
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
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
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
          onValidate={() => handleVerdict("validated")}
          onReject={() => handleVerdict("not_validated")}
          onDefer={() => handleVerdict("visited")}
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
    <div className="text-center">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className={`text-sm font-bold ${color || "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}
