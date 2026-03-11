# Roadmap — Systeme de collecte intelligent

## Ordre d'implementation

| Phase | Nom | Statut | Dependances |
|-------|-----|--------|-------------|
| 1 | [Champ unifie auto-detect](./phase-1-unified-input.md) | A faire | - |
| 2 | [Enrichissement automatique](./phase-2-enrichment.md) | A faire | - |
| 3 | [Analyse photo Gemini Vision](./phase-3-photo-analysis.md) | A faire | Phase 1 (UI unifiee) |
| 4 | [Collecte en lot (batch)](./phase-4-batch.md) | A faire | Phase 1 |
| 5 | [Re-scraping intelligent](./phase-5-rescraping.md) | A faire | - |
| 6 | [Partage PWA ameliore](./phase-6-pwa-share.md) | A faire | Phase 3 (analyse image) |

## Architecture cible

```
SmartCollector (UI unifiee)
  |
  v
collectProperty() --- detecte auto: URL / texte / photo / batch
  |
  ├── URL  ──> scrapeAndSaveProperty()
  ├── Texte ──> createPropertyFromText()
  ├── Photo ──> extractFromPhoto() [Gemini Vision]
  └── Batch ──> collectBatchUrls() / splitTextIntoListings()
        |
        v
  enrichProperty() [fire-and-forget]
    ├── geocoding
    ├── donnees marche
    ├── comparaison
    └── score investissement
        |
        v
  rescrapeProperty() [periodique]
    ├── historique de scrape
    ├── detection changement prix
    └── notifications
```
