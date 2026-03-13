export interface Photo {
  id: string;
  property_id: string;
  user_id: string;
  url: string;
  thumbnail_url: string;
  source: "scraping" | "upload" | "camera" | "visit";
  tag: string;
  note: string;
  latitude: number | null;
  longitude: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
}
