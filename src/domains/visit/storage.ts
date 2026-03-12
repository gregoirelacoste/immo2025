import type { VisitData, VisitPhoto } from "./types";

// ─────────────────────────────────────────────
// IndexedDB storage for visit data (offline-first)
// ─────────────────────────────────────────────

const DB_NAME = "immo2025-visits";
const DB_VERSION = 1;

const STORE_VISITS = "visits";
const STORE_PHOTOS = "photos";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_VISITS)) {
        db.createObjectStore(STORE_VISITS, { keyPath: "property_id" });
      }
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        const store = db.createObjectStore(STORE_PHOTOS, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("property_id", "property_id", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Visit data ──

export async function loadVisitData(
  propertyId: string,
): Promise<VisitData | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VISITS, "readonly");
    const req = tx.objectStore(STORE_VISITS).get(propertyId);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVisitData(data: VisitData): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VISITS, "readwrite");
    tx.objectStore(STORE_VISITS).put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Photos (blobs stored separately for perf) ──

export interface StoredVisitPhoto {
  id?: number;
  property_id: string;
  blob: Blob;
  tag: string;
  takenAt: string;
  note?: string;
}

export async function saveVisitPhoto(
  photo: StoredVisitPhoto,
): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, "readwrite");
    const req = tx.objectStore(STORE_PHOTOS).add(photo);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function loadVisitPhotos(
  propertyId: string,
): Promise<StoredVisitPhoto[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, "readonly");
    const idx = tx.objectStore(STORE_PHOTOS).index("property_id");
    const req = idx.getAll(propertyId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteVisitPhoto(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, "readwrite");
    tx.objectStore(STORE_PHOTOS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Convert stored photos to VisitData-compatible format (object URLs) */
export function storedPhotoToVisitPhoto(
  stored: StoredVisitPhoto,
): VisitPhoto & { localId: number } {
  return {
    localId: stored.id!,
    uri: URL.createObjectURL(stored.blob),
    tag: stored.tag,
    takenAt: stored.takenAt,
    note: stored.note,
  };
}
