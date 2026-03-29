"use client";

import type {
  VisitItemValue,
} from "@/domains/visit/types";
import type { ResolvedVisitConfig } from "@/domains/visit/constants";
import type { CategoryProgress } from "@/domains/visit/hooks/useVisitProgress";
import type { LocalVisitPhoto } from "@/domains/visit/hooks/useVisitPhotos";
import type { LocalVoiceNote } from "@/domains/visit/hooks/useVisitVoiceNotes";
import VisitChecklist from "../VisitChecklist";
import VisitRedFlags from "../VisitRedFlags";
import VisitSellerQuestions from "../VisitSellerQuestions";
import VisitVerdict from "../VisitVerdict";
import VoiceRecorder from "./VoiceRecorder";

interface Props {
  config: ResolvedVisitConfig;
  answers: Record<string, VisitItemValue>;
  categoryProgress: CategoryProgress[];
  globalProgress: { answered: number; total: number; percent: number };
  redFlags: string[];
  photos: LocalVisitPhoto[];
  voiceNotes: LocalVoiceNote[];
  isRecording: boolean;
  notes: string;
  overallRating: number | null;
  verdictComment: string;
  submitting: boolean;
  onAnswer: (key: string, value: VisitItemValue) => void;
  onToggleRedFlag: (key: string) => void;
  onRemovePhoto: (localId: number) => void;
  onNotesChange: (notes: string) => void;
  onRatingChange: (r: number | null) => void;
  onVerdictCommentChange: (c: string) => void;
  onSave: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onRemoveVoiceNote: (localId: number) => void;
}

export default function VisitAnalyzePhase({
  config,
  answers,
  categoryProgress,
  globalProgress,
  redFlags,
  photos,
  voiceNotes,
  isRecording,
  notes,
  overallRating,
  verdictComment,
  submitting,
  onAnswer,
  onToggleRedFlag,
  onRemovePhoto,
  onNotesChange,
  onRatingChange,
  onVerdictCommentChange,
  onSave,
  onStartRecording,
  onStopRecording,
  onRemoveVoiceNote,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Voice notes to replay */}
      {voiceNotes.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <span>🎤</span>
            <span>Réécoutez vos notes vocales</span>
          </h3>
          <VoiceRecorder
            notes={voiceNotes}
            isRecording={isRecording}
            onStartRecording={onStartRecording}
            onStopRecording={onStopRecording}
            onRemoveNote={onRemoveVoiceNote}
          />
        </section>
      )}

      {/* Photo gallery */}
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
                  onClick={() => onRemovePhoto(photo.localId)}
                  aria-label="Supprimer la photo"
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

      {/* Free notes */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
          <span>📝</span>
          <span>Notes de visite</span>
        </h3>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Notes libres de visite..."
          className="w-full min-h-[80px] px-3 py-2.5 border border-tiili-border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y bg-white"
        />
      </section>

      {/* Full checklist */}
      <VisitChecklist
        checklist={config.checklist}
        answers={answers}
        categoryProgress={categoryProgress}
        globalProgress={globalProgress}
        photos={photos}
        onAnswer={onAnswer}
      />

      {/* Seller questions (full, with answers) */}
      <VisitSellerQuestions
        categories={config.seller_questions}
        answers={answers}
        onAnswer={onAnswer}
      />

      {/* Red flags */}
      <VisitRedFlags
        redFlags={config.red_flags}
        flaggedKeys={redFlags}
        onToggle={onToggleRedFlag}
      />

      {/* Verdict */}
      <VisitVerdict
        rating={overallRating}
        onRatingChange={onRatingChange}
        notes={verdictComment}
        onNotesChange={onVerdictCommentChange}
        onSave={onSave}
        submitting={submitting}
      />
    </div>
  );
}
