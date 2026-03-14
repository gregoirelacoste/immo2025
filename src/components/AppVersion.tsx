"use client";

import { useState, useEffect, useCallback } from "react";

const LOCAL_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.1.0";
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export default function AppVersion() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;
      const { version } = await res.json();
      if (version && version !== LOCAL_VERSION) {
        setUpdateAvailable(true);
      }
    } catch {
      // Offline or network error — ignore
    }
  }, []);

  useEffect(() => {
    // Check on mount (with delay to not block initial render)
    const initialTimer = setTimeout(checkVersion, 3000);

    // Periodic check
    const interval = setInterval(checkVersion, CHECK_INTERVAL_MS);

    // Also check when app becomes visible again
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkVersion]);

  async function handleUpdate() {
    setUpdating(true);
    try {
      // Tell waiting SW to activate
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg?.waiting) {
        reg.waiting.postMessage("SKIP_WAITING");
      }
      // Force SW update check
      await reg?.update();

      // Reload to get new version
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {/* Version number — triple tap to force update */}
      <button
        onClick={handleUpdate}
        className="text-[10px] text-gray-300 hover:text-gray-400 transition-colors"
        title="Forcer la mise à jour"
      >
        v{LOCAL_VERSION}
      </button>

      {/* Update badge */}
      {updateAvailable && !updating && (
        <button
          onClick={handleUpdate}
          className="text-[10px] font-medium text-amber-500 hover:text-amber-700 animate-pulse"
        >
          Mise à jour disponible
        </button>
      )}
      {updating && (
        <span className="text-[10px] text-gray-400">Mise à jour...</span>
      )}
    </div>
  );
}
