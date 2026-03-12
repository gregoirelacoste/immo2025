/**
 * Client-side helper to capture a "street photo" with GPS coordinates.
 * Opens the camera via a hidden file input and resolves GPS from
 * navigator.geolocation.
 */

export interface StreetCaptureResult {
  file: File;
  latitude: number;
  longitude: number;
}

export function captureStreetPhoto(): Promise<StreetCaptureResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      // Try to get GPS coordinates
      let latitude = 0;
      let longitude = 0;

      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // GPS unavailable — continue without coordinates
      }

      resolve({ file, latitude, longitude });
    };

    // If user cancels file picker
    input.oncancel = () => resolve(null);

    // Some browsers don't fire oncancel, use focus fallback
    const handleFocus = () => {
      setTimeout(() => {
        if (!input.files?.length) {
          resolve(null);
        }
        window.removeEventListener("focus", handleFocus);
      }, 500);
    };
    window.addEventListener("focus", handleFocus);

    input.click();
  });
}
