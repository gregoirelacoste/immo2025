"use client";

import { useMemo } from "react";
import type {
  ChecklistItem,
  SellerQuestionCategory,
  RedFlag,
  VisitItemValue,
} from "@/domains/visit/types";
import type { ResolvedVisitConfig } from "@/domains/visit/constants";
import { FIELD_CHECK_KEYS } from "@/domains/visit/constants";
import type { LocalVoiceNote } from "@/domains/visit/hooks/useVisitVoiceNotes";
import LivePhotoStrip from "./LivePhotoStrip";
import LiveFieldChecklist from "./LiveFieldChecklist";
import LiveActionBar from "./LiveActionBar";
import VoiceRecorder from "./VoiceRecorder";
import VisitSellerQuestions from "../VisitSellerQuestions";
import VisitRedFlags from "../VisitRedFlags";

interface PhotoItem {
  localId: number;
  uri: string;
  tag: string;
  note?: string;
}

interface Props {
  config: ResolvedVisitConfig;
  answers: Record<string, VisitItemValue>;
  redFlags: string[];
  photos: PhotoItem[];
  photoCount: number;
  notes: string;
  voiceNotes: LocalVoiceNote[];
  isRecording: boolean;
  onAnswer: (key: string, value: VisitItemValue) => void;
  onToggleRedFlag: (key: string) => void;
  onCapture: (blob: Blob) => void;
  onRemovePhoto: (localId: number) => void;
  onNotesChange: (notes: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onRemoveVoiceNote: (localId: number) => void;
}

export default function VisitLivePhase({
  config,
  answers,
  redFlags,
  photos,
  photoCount,
  notes,
  voiceNotes,
  isRecording,
  onAnswer,
  onToggleRedFlag,
  onCapture,
  onRemovePhoto,
  onNotesChange,
  onStartRecording,
  onStopRecording,
  onRemoveVoiceNote,
}: Props) {
  // Extract field check items from the full checklist
  const fieldCheckItems = useMemo(() => {
    const allItems: ChecklistItem[] = config.checklist.flatMap((c) => c.items);
    return FIELD_CHECK_KEYS
      .map((key) => allItems.find((item) => item.key === key))
      .filter((item): item is ChecklistItem => item != null);
  }, [config.checklist]);

  return (
    <div className="pb-24">
      {/* Photo strip */}
      <LivePhotoStrip photos={photos} onRemove={onRemovePhoto} />

      {/* Main scrollable content */}
      <div className="px-4 space-y-4 mt-2">
        {/* Seller questions (accordions, closed by default) */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
            <span>📋</span>
            <span>Questions au vendeur</span>
          </h3>
          <VisitSellerQuestions
            categories={config.seller_questions}
            answers={answers}
            onAnswer={onAnswer}
            compact
          />
        </div>

        {/* Field checklist */}
        <LiveFieldChecklist
          items={fieldCheckItems}
          answers={answers}
          onAnswer={onAnswer}
        />

        {/* Red flags */}
        <VisitRedFlags
          redFlags={config.red_flags}
          flaggedKeys={redFlags}
          onToggle={onToggleRedFlag}
        />

        {/* Voice notes list */}
        <VoiceRecorder
          notes={voiceNotes}
          isRecording={isRecording}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
          onRemoveNote={onRemoveVoiceNote}
        />
      </div>

      {/* Sticky action bar */}
      <LiveActionBar
        photoCount={photoCount}
        isRecording={isRecording}
        onCapture={onCapture}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        notes={notes}
        onNotesChange={onNotesChange}
      />
    </div>
  );
}
