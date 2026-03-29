"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  saveVoiceNote,
  loadVoiceNotes,
  deleteVoiceNote,
  storedVoiceNoteToLocal,
} from "../storage";

export interface LocalVoiceNote {
  localId: number;
  uri: string;
  recordedAt: string;
  duration: number;
}

export function useVisitVoiceNotes(propertyId: string) {
  const [notes, setNotes] = useState<LocalVoiceNote[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const mountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load existing notes
  useEffect(() => {
    let cancelled = false;
    loadVoiceNotes(propertyId).then((stored) => {
      if (cancelled) return;
      const loaded = stored.map(storedVoiceNoteToLocal);
      setNotes(loaded);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  // Revoke all object URLs on unmount or propertyId change
  useEffect(() => {
    return () => {
      setNotes((prev) => {
        prev.forEach((n) => URL.revokeObjectURL(n.uri));
        return [];
      });
    };
  }, [propertyId]);

  // Cleanup recorder on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg",
      });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (!mountedRef.current) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        const id = await saveVoiceNote({
          property_id: propertyId,
          blob,
          recordedAt: new Date().toISOString(),
          duration,
        });
        if (!mountedRef.current) return;
        const uri = URL.createObjectURL(blob);
        setNotes((prev) => [
          ...prev,
          { localId: id, uri, recordedAt: new Date().toISOString(), duration },
        ]);
        setIsRecording(false);
      };
      recorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start();
      setIsRecording(true);
    } catch {
      // Microphone permission denied or not available
      if (mountedRef.current) setIsRecording(false);
    }
  }, [propertyId]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const removeNote = useCallback(async (localId: number) => {
    await deleteVoiceNote(localId);
    setNotes((prev) => {
      const note = prev.find((n) => n.localId === localId);
      if (note) URL.revokeObjectURL(note.uri);
      return prev.filter((n) => n.localId !== localId);
    });
  }, []);

  return { notes, loaded, isRecording, startRecording, stopRecording, removeNote };
}
