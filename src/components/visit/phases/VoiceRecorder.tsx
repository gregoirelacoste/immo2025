"use client";

import type { LocalVoiceNote } from "@/domains/visit/hooks/useVisitVoiceNotes";

interface Props {
  notes: LocalVoiceNote[];
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onRemoveNote: (localId: number) => void;
}

export default function VoiceRecorder({
  notes,
  isRecording,
  onStartRecording,
  onStopRecording,
  onRemoveNote,
}: Props) {
  if (notes.length === 0 && !isRecording) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
        <span>🎤</span>
        <span>Notes vocales ({notes.length})</span>
      </h3>
      <div className="space-y-1.5">
        {notes.map((note) => (
          <VoiceNoteRow key={note.localId} note={note} onRemove={onRemoveNote} />
        ))}
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-red-700 flex-1">
              Enregistrement en cours…
            </span>
            <button
              type="button"
              onClick={onStopRecording}
              className="text-xs font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-full min-h-[32px]"
            >
              Stop
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function VoiceNoteRow({
  note,
  onRemove,
}: {
  note: LocalVoiceNote;
  onRemove: (id: number) => void;
}) {
  const time = new Date(note.recordedAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const duration =
    note.duration < 60
      ? `${note.duration}s`
      : `${Math.floor(note.duration / 60)}m${String(note.duration % 60).padStart(2, "0")}s`;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg">
      <audio src={note.uri} controls className="h-8 flex-1 min-w-0" />
      <span className="text-[10px] text-gray-500 whitespace-nowrap">
        {time} · {duration}
      </span>
      <button
        type="button"
        onClick={() => onRemove(note.localId)}
        className="text-gray-400 hover:text-red-500 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      </button>
    </div>
  );
}
