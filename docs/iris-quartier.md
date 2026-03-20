# Données quartier IRIS

## Vue d'ensemble

L'application enrichit les biens immobiliers avec des données socio-économiques au niveau **quartier (IRIS)** lorsque les coordonnées GPS du bien sont disponibles. Les zones IRIS sont des découpages infra-communaux définis par l'INSEE (~2000 habitants chacune), disponibles pour les communes de plus de 5000 habitants.

Quand les données IRIS ne sont pas disponibles (petite commune, géocodage imprécis), le système **se rabat automatiquement sur les données communales** grâce au mécanisme de fallback hiérarchique existant.

## Architecture

```
Coordonnées GPS du bien
        │
        ▼
┌──────────────────────┐
│  geo-client.ts       │
│  fetchIrisFromCoords │  → api-adresse.data.gouv.fr (reverse geocode)
│                      │  → geo.api.gouv.fr/communes/{code}/iris
└──────────┬───────────┘
           │ IrisResolution { irisCode, irisName, communeCode }
           ▼
┌──────────────────────┐
│  ensure.ts           │
│  ensureIrisQuartier  │  → Crée la localité type:"quartier" avec parent_id → commune
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  pipeline.ts         │
│  enrichIrisQuartier  │  → INSEE Melodi GEO=IRIS-{code} (Filosofi + logement)
│                      │     Fallback GEO=COM-{code} si IRIS vide
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  resolver.ts         │  Fallback champ par champ :
│  resolveLocalityData │  quartier → ville → département → région
│                      │  Chaque champ tracé via fieldSources
└──────────────────────┘
```

## APIs utilisées

| API | Usage | Granularité |
|-----|-------|------------|
| `api-adresse.data.gouv.fr/reverse` | Géocodage inverse → code commune | Adresse |
| `geo.api.gouv.fr/communes/{code}/iris` | Liste des zones IRIS d'une commune | Commune → IRIS |
| `api.insee.fr/melodi` DS_FILOSOFI_CC | Revenu médian, taux de pauvreté | IRIS |
| `api.insee.fr/melodi` DS_RP_LOGEMENT_PRINC | Logements vacants, propriétaires | IRIS |
| `api.insee.fr/melodi` DS_POPULATIONS_REFERENCE | Population | Commune uniquement |
| `api.insee.fr/melodi` DS_RP_EMPLOI_LR_PRINC | Emploi, chômage | Commune uniquement |

## Fichiers modifiés

### Infrastructure (data sources)

- **`src/infrastructure/data-sources/types.ts`** — Ajout `IrisResolution`, `dataLevel` et `irisCode` sur `InseeCityData`
- **`src/infrastructure/data-sources/geo-client.ts`** — Ajout `fetchIrisFromCoordinates(lat, lon)`
- **`src/infrastructure/data-sources/insee-client.ts`** — Ajout `fetchInseeDataWithIris(codeInsee, irisCode)` avec fallback IRIS → commune
- **`src/infrastructure/data-sources/index.ts`** — Export des nouvelles fonctions et types

### Domaine locality

- **`src/domains/locality/repository.ts`** — Ajout `findLocalityByCode(code, type?)` pour chercher par code IRIS
- **`src/domains/locality/resolver.ts`** — Paramètre optionnel `irisCode` ; résolution depuis le quartier IRIS avec fallback
- **`src/domains/locality/enrichment/ensure.ts`** — Paramètre `coordinates` ; auto-création du quartier IRIS
- **`src/domains/locality/enrichment/pipeline.ts`** — Branche `enrichIrisQuartier` : enrichissement léger INSEE-only pour les quartiers IRIS
- **`src/domains/locality/actions.ts`** — `fetchLocalityFields` expose `fieldSources` (localityName + localityType par champ)

### Domaine enrich

- **`src/domains/enrich/service.ts`** — Pipeline restructuré en 3 phases (geocode → IRIS → socio) ; `buildSocioDataFromLocality` IRIS-aware
- **`src/domains/enrich/scoring.ts`** — `scorePopulation` adapté : score neutre pour les populations IRIS (pas proxy de demande locative)

### Frontend

- **`src/components/locality/LocalityDataView.tsx`** — Prop `fieldSources`, composant `DataLevelBadge` (vert = Quartier, ambre = fallback Dpt./Rég.)
- **`src/components/property/detail/LocaliteTab.tsx`** — Passage de `fieldSources` à `LocalityDataView`
- **`src/app/guide/[city]/page.tsx`** — Passage de `fieldSources` à `LocalityDataView`

### Base de données

- **`src/infrastructure/database/client.ts`** — Schema v9 : `UNIQUE INDEX idx_localities_code_type ON localities(code, type) WHERE code != ''`

## Fallback hiérarchique

Le système utilise le mécanisme existant de fallback champ-par-champ :

```
quartier IRIS (median_income, poverty_rate, vacant_housing_pct, owner_occupier_pct)
    ↓ champs manquants
ville / commune (DVF, loyers, risques, DPE, éducation, santé, taxes)
    ↓ champs manquants
département (données agrégées)
    ↓ champs manquants
région / pays
```

Chaque champ enregistre sa provenance dans `fieldSources` :
- `localityType: "quartier"` → donnée IRIS
- `localityType: "ville"` → donnée commune (défaut)
- `localityType: "departement"` → fallback département

## Affichage frontend

Les badges de niveau apparaissent à côté des badges source (DVF, INSEE...) :

- **Badge vert "Quartier"** — donnée au niveau du quartier IRIS
- **Badge ambre "Dpt." / "Rég."** — donnée en fallback depuis un niveau parent
- **Pas de badge** — donnée au niveau commune (cas par défaut)

Un bandeau vert en haut de `LocalityDataView` indique quand des données quartier sont disponibles.

## Limitations et edge cases

### Communes sans IRIS (~95% des communes)
Les zones IRIS n'existent que pour les communes >= 5000 habitants. Pour les petites communes, le système fonctionne comme avant (données communales uniquement).

### Paris / Lyon / Marseille
Ces villes ont des codes INSEE par arrondissement (75101-75120, 69001-69009, 13201-13216). Le géocodage inverse retourne le code arrondissement, et les IRIS sont indexés par arrondissement. Le système gère ce cas via le géocodage qui résout l'arrondissement avant la recherche IRIS.

### Données partiellement IRIS
Certains champs (revenu, pauvreté, logement) sont disponibles au niveau IRIS, d'autres (population, emploi) uniquement au niveau commune. Le résultat est un mix cohérent grâce au fallback champ-par-champ. Le `dataLevel` sur `SocioEconomicData` est `"iris"` quand au moins les revenus viennent du niveau IRIS.

### Scoring d'investissement
Le `scorePopulation` est adapté pour ne pas pénaliser les données IRIS (population quartier ~2000 au lieu de population ville). Quand `dataLevel === "iris"`, le score population est neutre plutôt que basé sur un seuil absolu.

### Rate limiting
L'API Melodi INSEE est limitée à 30 requêtes/minute. L'enrichissement IRIS ajoute 2 appels Melodi (Filosofi + logement en IRIS) en plus des 4 appels commune. En cas de limit, les appels échouent silencieusement et le fallback commune prend le relais.

### Doublons IRIS
Une contrainte `UNIQUE(code, type)` sur la table `localities` empêche la création de doublons IRIS lors d'enrichissements concurrents. En cas de violation, le code re-fetch la localité existante.
