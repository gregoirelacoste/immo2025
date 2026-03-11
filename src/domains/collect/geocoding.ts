interface GeoAddress {
  address: string;
  city: string;
  postalCode: string;
}

interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

interface AdresseApiFeature {
  properties: {
    label?: string;
    name?: string;
    city?: string;
    postcode?: string;
  };
  geometry: {
    coordinates: [number, number]; // [lon, lat]
  };
}

interface AdresseApiResponse {
  features: AdresseApiFeature[];
}

const API_BASE = "https://api-adresse.data.gouv.fr";

/** Reverse geocode GPS coordinates to an address using geo.api.gouv.fr */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<GeoAddress | null> {
  try {
    const response = await fetch(
      `${API_BASE}/reverse/?lon=${encodeURIComponent(lon)}&lat=${encodeURIComponent(lat)}`
    );

    if (!response.ok) return null;

    const data: AdresseApiResponse = await response.json();

    if (data.features.length === 0) return null;

    const props = data.features[0].properties;
    return {
      address: props.name || props.label || "",
      city: props.city || "",
      postalCode: props.postcode || "",
    };
  } catch {
    return null;
  }
}

/** Forward geocode an address to coordinates */
export async function forwardGeocode(
  address: string,
  city?: string
): Promise<GeoCoordinates | null> {
  try {
    const query = city ? `${address}, ${city}` : address;
    const response = await fetch(
      `${API_BASE}/search/?q=${encodeURIComponent(query)}&limit=1`
    );

    if (!response.ok) return null;

    const data: AdresseApiResponse = await response.json();

    if (data.features.length === 0) return null;

    const [lon, lat] = data.features[0].geometry.coordinates;
    return { latitude: lat, longitude: lon };
  } catch {
    return null;
  }
}
