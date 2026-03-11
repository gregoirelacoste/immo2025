import { ShareData } from "@/domains/collect/types";

const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface PendingShare {
  data: ShareData;
  expiresAt: number;
}

const pendingShares = new Map<string, PendingShare>();

/** Store share data and return a session ID */
export function storeShareData(data: ShareData): string {
  cleanup();
  const sessionId = crypto.randomUUID();
  pendingShares.set(sessionId, {
    data,
    expiresAt: Date.now() + TTL_MS,
  });
  return sessionId;
}

/** Retrieve and consume share data (one-time read) */
export function getShareData(sessionId: string): ShareData | undefined {
  cleanup();
  const entry = pendingShares.get(sessionId);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    pendingShares.delete(sessionId);
    return undefined;
  }
  return entry.data;
}

/** Remove a consumed session */
export function consumeShareData(sessionId: string): ShareData | undefined {
  const data = getShareData(sessionId);
  if (data) pendingShares.delete(sessionId);
  return data;
}

/** Purge expired entries */
function cleanup() {
  const now = Date.now();
  for (const [id, entry] of pendingShares) {
    if (entry.expiresAt < now) pendingShares.delete(id);
  }
}
