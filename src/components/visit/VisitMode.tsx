"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Property } from "@/domains/property/types";
import type { Simulation } from "@/domains/simulation/types";
import type { VisitPhase } from "@/domains/visit/types";
import { parseAmenities } from "@/domains/property/amenities";
import type { Equipment } from "@/domains/property/equipment-service";
import { calculateAll, calculateSimulation, formatCurrency, formatPercent } from "@/lib/calculations";
import type { ResolvedVisitConfig } from "@/domains/visit/constants";
import { resolveVisitConfig } from "@/domains/visit/constants";
import { changePropertyStatus } from "@/domains/property/actions";
import { useVisitData } from "@/domains/visit/hooks/useVisitData";
import { useVisitPhotos } from "@/domains/visit/hooks/useVisitPhotos";
import { useVisitProgress } from "@/domains/visit/hooks/useVisitProgress";
import { useVisitVoiceNotes } from "@/domains/visit/hooks/useVisitVoiceNotes";
import VisitStickyHeader from "./VisitStickyHeader";
import VisitBottomBar from "./VisitBottomBar";
import PhotoTagSheet from "./PhotoTagSheet";
import PhotoGuidedMode from "./PhotoGuidedMode";
import VisitPrepPhase from "./phases/VisitPrepPhase";
import VisitLivePhase from "./phases/VisitLivePhase";
import VisitAnalyzePhase from "./phases/VisitAnalyzePhase";

interface Props {
  property: Property;
  simulation?: Simulation | null;
  equipments?: Equipment[];
  visitConfig?: ResolvedVisitConfig;
}

export default function VisitMode({ property, simulation, equipments = [], visitConfig }: Props) {
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
    () => visitConfig ?? resolveVisitConfig(amenities, property.property_type as "ancien" | "neuf"),
    [visitConfig, amenities, property.property_type],
  );

  // Visit data (answers, red flags, notes, etc.)
  const {
    data,
    loaded: dataLoaded,
    setAnswer,
    toggleRedFlag,
    setNotes,
    setOverallRating,
    setCurrentPhase,
    setPrepChecklist,
    flushSave,
  } = useVisitData(property.id);

  // Photos
  const {
    photos,
    loaded: photosLoaded,
    addPhoto,
    removePhoto,
    photoCount,
  } = useVisitPhotos(property.id);

  // Voice notes
  const {
    notes: voiceNotes,
    loaded: voiceLoaded,
    isRecording,
    startRecording,
    stopRecording,
    removeNote: removeVoiceNote,
  } = useVisitVoiceNotes(property.id);

  // Checklist progress
  const { categoryProgress, globalProgress } = useVisitProgress(
    config.checklist,
    data.answers,
  );

  // Phase navigation — default to "pendant", restore from loaded data
  const [phase, setPhase] = useState<VisitPhase>("pendant");
  const phaseRestoredRef = useRef(false);
  useEffect(() => {
    if (dataLoaded && !phaseRestoredRef.current) {
      phaseRestoredRef.current = true;
      if (data.current_phase) setPhase(data.current_phase);
    }
  }, [dataLoaded, data.current_phase]);

  const handlePhaseChange = useCallback(
    (newPhase: VisitPhase) => {
      setPhase(newPhase);
      setCurrentPhase(newPhase);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setCurrentPhase],
  );

  // Prep checklist
  const handlePrepToggle = useCallback(
    (key: string) => {
      const current = data.prep_checklist ?? {};
      setPrepChecklist(key, !current[key]);
    },
    [data.prep_checklist, setPrepChecklist],
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

  if (!dataLoaded || !photosLoaded || !voiceLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f3ef] pb-16">
      {/* Sticky collapsed header */}
      <VisitStickyHeader property={property} calculations={calculations} />

      {/* Full header */}
      <header className="bg-white border-b border-tiili-border px-4 py-2.5">
        <div className="max-w-lg mx-auto space-y-2">
          {/* Back + title + guide */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push(`/property/${property.id}`)}
              className="text-sm text-gray-600 hover:text-[#1a1a2e] flex items-center gap-1 min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              Retour
            </button>

            {/* Phase indicator */}
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
              {phase === "avant" && "Préparation"}
              {phase === "pendant" && "En visite"}
              {phase === "apres" && "Analyse"}
            </span>

            {phase === "pendant" && (
              <button
                type="button"
                onClick={() => setGuidedMode(true)}
                className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full hover:bg-purple-100 transition-colors min-h-[44px] flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                </svg>
                Guide
              </button>
            )}
            {phase !== "pendant" && <div className="w-16" />}
          </div>

          {/* Property info (compact) */}
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-bold text-[#1a1a2e] truncate">
              {property.city || "Bien"}
            </span>
            <span className="font-semibold">
              {formatCurrency(property.purchase_price)}
            </span>
            {property.surface > 0 && <span>{property.surface} m²</span>}
          </div>

          {/* KPIs (only show in avant and apres phases) */}
          {phase !== "pendant" && (
            <div className="flex items-center justify-between gap-1 py-1">
              <KPI label="Renta" value={formatPercent(calculations.net_yield)} />
              <KPI
                label="Cash-flow"
                value={`${calculations.monthly_cashflow >= 0 ? "+" : ""}${formatCurrency(calculations.monthly_cashflow)}`}
                color={calculations.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}
              />
              <KPI label="Mensualité" value={formatCurrency(calculations.monthly_payment)} />
            </div>
          )}

          {/* Amenities (only avant) */}
          {phase === "avant" && amenities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {amenities.map((key) => (
                <span
                  key={key}
                  className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full"
                >
                  {equipments.find((e) => e.key === key)?.label ?? key}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Phase content */}
      <main className="max-w-lg mx-auto px-4 py-4">
        {phase === "avant" && (
          <VisitPrepPhase
            property={property}
            sellerQuestions={config.seller_questions}
            prepChecklist={data.prep_checklist ?? {}}
            onPrepToggle={handlePrepToggle}
          />
        )}

        {phase === "pendant" && (
          <VisitLivePhase
            config={config}
            onPhaseChange={handlePhaseChange}
            answers={data.answers}
            redFlags={data.red_flags}
            photos={photos}
            photoCount={photoCount}
            notes={data.notes}
            voiceNotes={voiceNotes}
            isRecording={isRecording}
            onAnswer={setAnswer}
            onToggleRedFlag={toggleRedFlag}
            onCapture={handleCapture}
            onRemovePhoto={removePhoto}
            onNotesChange={setNotes}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onRemoveVoiceNote={removeVoiceNote}
          />
        )}

        {phase === "apres" && (
          <VisitAnalyzePhase
            config={config}
            answers={data.answers}
            categoryProgress={categoryProgress}
            globalProgress={globalProgress}
            redFlags={data.red_flags}
            photos={photos}
            voiceNotes={voiceNotes}
            isRecording={isRecording}
            notes={data.notes}
            overallRating={data.overall_rating}
            verdictComment={verdictComment}
            submitting={submitting}
            onAnswer={setAnswer}
            onToggleRedFlag={toggleRedFlag}
            onRemovePhoto={removePhoto}
            onNotesChange={setNotes}
            onRatingChange={setOverallRating}
            onVerdictCommentChange={setVerdictComment}
            onSave={handleSaveVisit}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onRemoveVoiceNote={removeVoiceNote}
          />
        )}
      </main>

      {/* Phase selector bottom bar (hidden during "pendant" phase where LiveActionBar takes over) */}
      {phase !== "pendant" && (
        <VisitBottomBar
          currentPhase={phase}
          onPhaseChange={handlePhaseChange}
          redFlagCount={data.red_flags.length}
          photoCount={photoCount}
        />
      )}

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
