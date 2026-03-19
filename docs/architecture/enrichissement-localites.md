# Système d'enrichissement centralisé des localités

> Rédigé le 2026-03-19 — Commit `f04ae65`

## Contexte

Avant cette refonte, les données de localité provenaient de 3 sources :
- **Admin** : saisie manuelle via JSON dans `/admin` → source `"admin"`
- **Import initial** : script `seed-localities.ts` → source `"import-initial"`
- **Blog IA** : extraction par Gemini depuis les articles générés → source `"blog-ai"` (risque d'hallucination)

Le blog maintenait ses propres fetchers en doublon (`src/domains/blog/fetchers/`), créant de la duplication et un couplage fort.

## Architecture actuelle

### Infrastructure data-sources (`src/infrastructure/data-sources/`)

Clients API centralisés, réutilisables par tout le projet :

| Client | API | Auth | Données |
|--------|-----|------|---------|
| `geo-client.ts` | geo.api.gouv.fr | Aucune | Code INSEE, département, région, population |
| `dvf-client.ts` | api.cquest.org/dvf | Aucune | Prix moyen/médian, transactions, tendance 1 an |
| `insee-client.ts` | api.insee.fr | OAuth2 | Population, revenus, chômage, vacance, propriétaires |
| `georisques-client.ts` | georisques.gouv.fr | Aucune | Risques naturels, inondation, sismique, radon, SEVESO |
| `taxe-fonciere-client.ts` | data.ofgl.fr (OFGL) | Aucune | Taux TFB voté par commune |
| `dpe-client.ts` | data.ademe.fr | Aucune | Classe DPE/GES moyenne, consommation |
| `education-client.ts` | data.education.gouv.fr | Aucune | Nombre d'écoles, universités |
| `health-client.ts` | data.opendatasoft.com (BPE) | Aucune | Médecins généralistes, pharmacies |
| `loyers-client.ts` | data.gouv.fr (Carte des loyers CSV) | Aucune | Loyer médian au m² par commune |

Chaque client :
- Fonction async pure, retourne `T | null`
- Timeout 8-15s via `AbortSignal.timeout()`
- User-Agent: `tiili.io/locality-enrichment/1.0`
- Fail-safe (try/catch → null)

### Pipeline d'enrichissement (`src/domains/locality/enrichment/`)

| Fichier | Rôle |
|---------|------|
| `types.ts` | `EnrichLocalityResult` — rapport détaillé par source |
| `mappers.ts` | 7 fonctions pures : données API → `Partial<LocalityDataFields>` |
| `pipeline.ts` | `enrichLocality()` — orchestrateur principal |
| `ensure.ts` | `ensureLocalityEnriched()` — guard fire-and-forget |

### Flux `enrichLocality()`

```
1. Charger la localité depuis DB
2. Résoudre le code INSEE (champ `code` ou via geo API)
3. Si !force et données clés fiables → skip
4. Promise.allSettled sur les 7 clients API
5. Mapper chaque résultat → Partial<LocalityDataFields>
6. Vérifier protection source (admin, import-initial ne sont JAMAIS écrasés)
7. upsertLocalityData() par source ("api:dvf", "api:insee", etc.)
8. Si enrichParents → remonter parent_id
```

### Protection des sources

Les données de source `"admin"` ou `"import-initial"` ne sont **jamais** écrasées par l'enrichissement API. En revanche, `"blog-ai"` est **toujours** écrasé car considéré non fiable.

Le guard `ensureLocalityEnriched()` re-déclenche l'enrichissement même si des données existent, si la source principale est `"blog-ai"`.

## 4 triggers d'enrichissement

| Trigger | Fichier | Comportement |
|---------|---------|-------------|
| **Admin "Enrichir"** | `locality/actions.ts` → `enrichLocalityAction()` | `force: true`, `enrichParents: true` |
| **Ajout d'un bien** | `enrich/actions.ts` → `enrichPropertyQuiet()` | `ensureLocalityEnriched()` fire-and-forget |
| **Blog pipeline** | `blog/pipeline.ts` → `runPipeline()` | `ensureLocalityEnriched()` avant collecte données |
| **CLI batch** | `scripts/enrich-locality.ts` | `--city`, `--code`, `--all`, `--dry-run` |

## Sources de données (colonne `source`)

| Valeur | Origine | Fiabilité |
|--------|---------|-----------|
| `api:dvf` | API DVF (cquest.org) — données notariales | Haute |
| `api:insee` | API INSEE — données recensement | Haute |
| `api:georisques` | API Géorisques — données officielles | Haute |
| `api:taxe-fonciere` | DGFiP — taux votés | Haute |
| `api:dpe` | ADEME — diagnostics énergétiques | Haute |
| `api:education` | Éducation nationale | Haute |
| `api:health` | BPE INSEE | Haute |
| `api:carte-loyers` | Carte des loyers (data.gouv.fr) | Haute |
| `api:computed` | Calculé (TF/m², cashflow) | Estimée |
| `admin` | Saisie manuelle admin | Vérifiée |
| `import-initial` | Script de seed initial | Estimée |
| `blog-ai` | Extraction IA (Gemini) | **Basse — obsolète** |
| `import:carte-loyers-YYYY` | CSV data.gouv.fr | Haute |
| `import:ssmsi-YYYY` | CSV délinquance SSMSI | Haute |

## Traçabilité dans l'UI

L'onglet Localité (`LocalityDataView`) affiche la source de chaque donnée via des badges bleus :
- **Par ligne** : badge à droite de la valeur (ex: "4 200 € `DVF`")
- **Par section** : badges dans le header (ex: "Marché immobilier `DVF`")

Le resolver (`resolver.ts`) renvoie :
- `fieldSources` : quelle localité de la hiérarchie a fourni chaque champ
- `dataSources` : quelle source de données (API, admin, import) a fourni chaque champ

## Schema DB (v7)

Nouveaux champs ajoutés aux tables existantes :

| Table | Nouveaux champs |
|-------|----------------|
| `locality_charges` | `property_tax_rate_pct` |
| `locality_socio` | `vacant_housing_pct`, `owner_occupier_pct` |
| `locality_infra` | `doctor_count`, `pharmacy_count`, `supermarket_count` |
| `locality_risks` | `flood_risk_level`, `seismic_zone`, `radon_level`, `industrial_risk` |

Nouvelle table :

| Table | Champs |
|-------|--------|
| `locality_energy` | `avg_dpe_class`, `avg_energy_consumption`, `avg_ges_class`, `dpe_count` |

## Scripts batch

| Script | Usage | Source |
|--------|-------|--------|
| `scripts/enrich-locality.ts` | Enrichissement API par ville ou toutes | `api:*` |
| `scripts/import-loyers.ts` | Import CSV Carte des loyers | `import:carte-loyers-YYYY` |
| `scripts/import-delinquance.ts` | Import CSV délinquance SSMSI | `import:ssmsi-YYYY` |

## Nettoyage du blog

Les fetchers du blog (`src/domains/blog/fetchers/`) ont été remplacés par des re-exports `@deprecated` vers `src/infrastructure/data-sources/`. Le `data-injector.ts` n'est plus appelé automatiquement par le pipeline — les données sont enrichies en amont via `ensureLocalityEnriched()`.

## Fichiers clés

```
src/infrastructure/data-sources/     # Clients API centralisés
src/domains/locality/enrichment/     # Pipeline d'enrichissement
  pipeline.ts                        # Orchestrateur principal
  ensure.ts                          # Guard fire-and-forget
  mappers.ts                         # API data → LocalityDataFields
  types.ts                           # EnrichLocalityResult
src/domains/locality/resolver.ts     # Résolution hiérarchique + dataSources
src/domains/locality/repository.ts   # getLatestSourcesBatch()
src/components/locality/LocalityDataView.tsx  # UI avec badges source
```
