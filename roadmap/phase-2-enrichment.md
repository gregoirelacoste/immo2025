# Phase 2 — Enrichissement automatique post-collecte

## Objectif

Apres chaque creation/modification de bien, lancer automatiquement un pipeline d'enrichissement : geocoding, donnees marche, comparaison, score d'investissement. Les resultats sont persistes en DB et affiches en temps reel.

## Pipeline

```
enrichProperty(propertyId)
  1. Charger le bien
  2. enrichment_status = "running"
  3. Geocoding : address → latitude/longitude
  4. Donnees marche : city → prix medians, loyers
  5. Comparaison : rang dans la ville (rendement, prix/m²)
  6. Score : 0-100 base sur rendement, cashflow, marche
  7. Persister en DB (UPDATE enrichment fields only)
  8. enrichment_status = "done"
  9. revalidatePath
```

## Nouveaux champs Property

```typescript
// Geocoding
latitude: number | null;
longitude: number | null;

// Donnees marche (snapshot persiste)
market_data: string; // JSON: MarketData | null

// Score
investment_score: number | null; // 0-100

// Status pipeline
enrichment_status: "pending" | "running" | "done" | "error";
enrichment_error: string;
enrichment_at: string; // ISO timestamp
```

## Score d'investissement (0-100)

| Composante | Points | Critere |
|-----------|--------|---------|
| Rendement net | 0-30 | >= 8% → 30, >= 6% → 25, >= 4% → 18, >= 2% → 10 |
| Cashflow mensuel | 0-25 | >= 200€ → 25, >= 0€ → 15, >= -100€ → 8 |
| Prix vs marche | 0-25 | <= 85% median → 25, <= 100% → 18, <= 115% → 10 |
| Loyer vs marche | 0-20 | >= 110% ref → 20, >= 95% → 15, >= 80% → 8 |

Labels : 0-30 "Faible", 30-50 "Moyen", 50-70 "Bon", 70-100 "Excellent"

## Nouveau domaine `src/domains/enrich/`

| Fichier | Role |
|---------|------|
| `types.ts` | `EnrichmentResult`, `InvestmentScoreBreakdown`, `CityComparison` |
| `service.ts` | `runEnrichmentPipeline()` — orchestration sequentielle |
| `scoring.ts` | `computeInvestmentScore()` — fonction pure |
| `comparison.ts` | `compareToCity()` — rang parmi les biens de la ville |
| `actions.ts` | `enrichProperty()`, `refreshEnrichment()` — server actions |

## Declenchement

1. **Apres collecte** : fire-and-forget `enrichProperty(id)` dans `collectProperty()`
2. **Apres sauvegarde** : si ville/adresse change, reset `enrichment_status = "pending"`
3. **Manuel** : bouton "Rafraichir" sur la page detail

## Changements UI

### Page detail
- Supprimer `useGeocoding` et `useMarketData` hooks → utiliser les donnees persistees
- Ajouter `EnrichmentBadge` (status avec animation)
- Ajouter `InvestmentScorePanel` (jauge circulaire + decomposition)
- Polling : `router.refresh()` toutes les 3s tant que status != "done"

### Dashboard
- Badge score sur `PropertyCard` (coin superieur droit)
- Colonne score dans `PropertyTable`
- Tri par score dans `SortBar`

## Migration DB

```sql
ALTER TABLE properties ADD COLUMN latitude REAL DEFAULT NULL;
ALTER TABLE properties ADD COLUMN longitude REAL DEFAULT NULL;
ALTER TABLE properties ADD COLUMN market_data TEXT DEFAULT '';
ALTER TABLE properties ADD COLUMN investment_score REAL DEFAULT NULL;
ALTER TABLE properties ADD COLUMN enrichment_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE properties ADD COLUMN enrichment_error TEXT DEFAULT '';
ALTER TABLE properties ADD COLUMN enrichment_at TEXT DEFAULT '';
```

## PropertyFormData

Mettre a jour pour exclure les champs d'enrichissement :

```typescript
export type PropertyFormData = Omit<Property,
  "id" | "created_at" | "updated_at" |
  "latitude" | "longitude" | "market_data" |
  "investment_score" | "enrichment_status" | "enrichment_error" | "enrichment_at"
>;
```

## Repository

Nouvelle fonction `updateEnrichmentFields(id, fields)` qui ne touche QUE les colonnes d'enrichissement → evite les race conditions avec les edits utilisateur.

## Points d'attention

- Le pipeline ne modifie JAMAIS les champs financiers (prix, loyer, etc.)
- Chaque etape est fail-safe : si le geocoding echoue, le marche tourne quand meme
- `market_data` stocke en JSON TEXT pour eviter les migrations futures
