"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Props {
  /** Latitude */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** Address to show in popup */
  address?: string;
  /** City name */
  city?: string;
}

/** Recenters the map when coordinates change */
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const prevRef = useRef({ lat, lng });

  useEffect(() => {
    if (prevRef.current.lat !== lat || prevRef.current.lng !== lng) {
      map.setView([lat, lng], map.getZoom(), { animate: true });
      prevRef.current = { lat, lng };
    }
  }, [lat, lng, map]);

  return null;
}

export default function PropertyMap({
  latitude,
  longitude,
  address,
  city,
}: Props) {
  const position: [number, number] = [latitude, longitude];

  const popupContent =
    address && city
      ? `${address}, ${city}`
      : address ?? city ?? "Localisation du bien";

  return (
    <div className="rounded-xl overflow-hidden h-[300px] md:h-[400px]">
      <MapContainer
        center={position}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={icon}>
          <Popup>{popupContent}</Popup>
        </Marker>
        <MapRecenter lat={latitude} lng={longitude} />
      </MapContainer>
    </div>
  );
}
