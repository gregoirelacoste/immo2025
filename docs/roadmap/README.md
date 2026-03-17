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
| 7 | [Capacitor + CI/CD stores automatise](./phase-7-capacitor-cicd.md) | A faire | Aucune (parallele) |

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

Distribution (Phase 7)
  |
  v
Vercel (web) ←── Capacitor WebView (iOS/Android)
  |
  ├── git tag vX.Y.Z → GitHub Actions
  │     ├── Fastlane iOS → TestFlight → App Store
  │     └── Fastlane Android → Play Store (internal)
  |
  └── merge main → Capgo OTA (updates JS instantanees)
```
