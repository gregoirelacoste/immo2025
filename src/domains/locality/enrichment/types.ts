export interface EnrichLocalityResult {
  localityId: string;
  localityName: string;
  fieldsUpdated: number;
  fieldsSkipped: number;
  sourceReports: Array<{
    source: string;
    status: "ok" | "error" | "skipped";
    fieldCount: number;
    error?: string;
  }>;
  parentResults?: EnrichLocalityResult[];
  durationMs: number;
}
