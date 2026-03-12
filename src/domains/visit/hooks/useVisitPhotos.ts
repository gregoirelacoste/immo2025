"use client";

import { useCallback, useEffect, useState } from "react";
import type { VisitPhoto } from "../types";
import {
  type StoredVisitPhoto,
  deleteVisitPhoto,
  loadVisitPhotos,
  saveVisitPhoto,
  storedPhotoToVisitPhoto,
} from "../storage";

export interface LocalVisitPhoto extends VisitPhoto {
  localId: number;
}

export function useVisitPhotos(propertyId: string) {
  const [photos, setPhotos] = useState<LocalVisitPhoto[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadVisitPhotos(propertyId).then((stored) => {
      setPhotos(stored.map(storedPhotoToVisitPhoto));
      setLoaded(true);
    });
  }, [propertyId]);

  const addPhoto = useCallback(
    async (blob: Blob, tag: string, note?: string) => {
      const stored: StoredVisitPhoto = {
        property_id: propertyId,
        blob,
        tag,
        takenAt: new Date().toISOString(),
        note,
      };
      const id = await saveVisitPhoto(stored);
      const local: LocalVisitPhoto = {
        localId: id,
        uri: URL.createObjectURL(blob),
        tag,
        takenAt: stored.takenAt,
        note,
      };
      setPhotos((prev) => [...prev, local]);
      return local;
    },
    [propertyId],
  );

  const removePhoto = useCallback(async (localId: number) => {
    await deleteVisitPhoto(localId);
    setPhotos((prev) => {
      const removed = prev.find((p) => p.localId === localId);
      if (removed) URL.revokeObjectURL(removed.uri);
      return prev.filter((p) => p.localId !== localId);
    });
  }, []);

  const photoCount = photos.length;

  const photosByTag = (tag: string) =>
    photos.filter((p) => p.tag === tag);

  return { photos, loaded, addPhoto, removePhoto, photoCount, photosByTag };
}
