# Pipeline Data : Article → App

Spécification technique du flux de données bidirectionnel entre le blog et l'application tiili.io.

---

## 1. Vue d'ensemble du flux

### Schéma global

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GÉNÉRATION D'ARTICLE                            │
│                                                                        │
│  Prompt Gemini (catégorie + ville/sujet)                               │
│       │                                                                │
│       ▼                                                                │
│  Double output :                                                       │
│    ├── article_markdown : string   (contenu éditorial)                 │
│    └── extracted_data : BlogExtractedData (données structurées JSON)   │
└────────────┬───────────────────────────────────┬───────────────────────┘
             │                                   │
             ▼                                   ▼
┌────────────────────────┐         ┌──────────────────────────────────┐
│   Fichier .mdx (blog)  │         │  PIPELINE DE VALIDATION          │
│   publié via ISR        │         │                                  │
└────────────────────────┘         │  1. Validation structurelle      │
                                   │  2. Bornes réalistes             │
                                   │  3. Comparaison données existantes│
                                   │  4. Workflow humain si suspect   │
                                   └──────────────┬───────────────────┘
                                                  │
                                                  ▼
                                   ┌──────────────────────────────────┐
                                   │  INJECTION locality_data         │
                                   │                                  │
                                   │  createLocalityData({            │
                                   │    locality_id,                  │
                                   │    valid_from,                   │
                                   │    data: LocalityDataFields,     │
                                   │    created_by: "blog-ai"         │
                                   │  })                              │
                                   └──────────────┬───────────────────┘
                                                  │
                                   ┌──────────────┴───────────────────┐
                                   │                                  │
                                   ▼                                  ▼
                    ┌──────────────────────┐       ┌────────────────────────┐
                    │  resolveLocalityData │       │  Revalidation ISR      │
                    │  → getMarketData()   │       │  guides villes         │
                    │  → enrichissement    │       │  (pages /ville/[slug]) │
                    └──────────┬───────────┘       └────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Impact app :        │
                    │  - Simulations       │
                    │  - Score investissem.│
                    │  - Données marché    │
                    └──────────────────────┘
```

### Composants existants réutilisés

| Composant | Fichier | Usage dans le pipeline |
|-----------|---------|----------------------|
| `LocalityDataFields` | `src/domains/locality/types.ts` | Format cible des données extraites |
| `createLocalityData()` | `src/domains/locality/repository.ts` | Insertion du snapshot en DB |
| `findLocalityByCity()` | `src/domains/locality/repository.ts` | Résolution de la localité cible |
| `resolveLocalityData()` | `src/domains/locality/resolver.ts` | Lecture avec fallback hiérarchique |
| `getLatestLocalityData()` | `src/domains/locality/repository.ts` | Comparaison avec données existantes |
| `getMarketData()` | `src/domains/market/service.ts` | Impact sur les données marché des propriétés |
| `runEnrichmentPipeline()` | `src/domains/enrich/service.ts` | Re-calcul enrichissement post-injection |
| `calculateAll()` | `src/lib/calculations.ts` | Recalcul rendement/cashflow |
| `computeInvestmentScore()` | `src/domains/enrich/scoring.ts` | Recalcul score investissement |

### Nouveaux composants a creer

| Composant | Fichier prevu | Role |
|-----------|---------------|------|
| `BlogDataExtractor` | `src/domains/blog/extractor.ts` | Prompt Gemini double output + parsing |
| `BlogDataValidator` | `src/domains/blog/validator.ts` | Validation bornes + coherence |
| `BlogDataInjector` | `src/domains/blog/injector.ts` | Merge + creation snapshot `locality_data` |
| `BlogDataAudit` | `src/domains/blog/audit.ts` | Tracabilite article → donnees |
| `GlobalDataStore` | `src/domains/reference/global-data.ts` | Donnees non-localite (taux, dispositifs) |
| Types blog | `src/domains/blog/types.ts` | Interfaces d'echange |

---

## 2. Extraction de donnees depuis un article

### Prompt Gemini : double output

Le prompt demande a Gemini de produire **deux outputs distincts dans une seule reponse** : le contenu editorial et les donnees structurees.

```
Systeme :
Tu es un redacteur expert en investissement locatif en France.
Tu produis TOUJOURS deux sections dans ta reponse :
1. ARTICLE : le contenu editorial complet en Markdown
2. DATA : un bloc JSON strictement conforme au schema BlogExtractedData

Le JSON doit contenir UNIQUEMENT des donnees factuelles verifiables
presentes ou inferees du contenu de l'article. Ne jamais inventer
de chiffres non mentionnes dans l'article.

---

Utilisateur :
Categorie : {category}
Sujet : {subject}
Ville cible : {city} (INSEE: {codeInsee}, CP: {postalCode})
Date de reference : {referenceDate}
Donnees existantes (contexte) : {existingDataSummary}

Redige un article de ~1500 mots et extrais toutes les donnees
structurees pertinentes.
```

Le parsing de la reponse s'appuie sur des delimiteurs :

```typescript
// src/domains/blog/extractor.ts

interface GeminiDualOutput {
  articleMarkdown: string;
  extractedData: BlogExtractedData;
}

function parseGeminiDualOutput(raw: string): GeminiDualOutput {
  // Gemini repond avec :
  // ## ARTICLE
  // ... contenu markdown ...
  // ## DATA
  // ```json
  // { ... }
  // ```
  const dataMatch = raw.match(/## DATA\s*```json\s*([\s\S]*?)```/);
  const articleMatch = raw.match(/## ARTICLE\s*([\s\S]*?)(?=## DATA)/);

  if (!dataMatch || !articleMatch) {
    throw new BlogExtractionError("Format de reponse Gemini invalide");
  }

  const extractedData = JSON.parse(dataMatch[1]) as BlogExtractedData;
  const articleMarkdown = articleMatch[1].trim();

  return { articleMarkdown, extractedData };
}
```

### Format JSON : `BlogExtractedData`

```typescript
// src/domains/blog/types.ts

import { LocalityDataFields } from "@/domains/locality/types";

/** Categorie d'article, determine le type de donnees attendues */
type BlogArticleCategory =
  | "guide-ville"         // guide complet d'investissement pour une ville
  | "actu-marche"         // actualite prix/loyers/tendances
  | "fiscalite"           // dispositifs fiscaux, taux, lois
  | "transport-urbanisme" // projets transport, amenagement urbain
  | "qualite-vie"         // classements, donnees environnementales
  | "airbnb-saisonnier"   // donnees location courte duree
  | "comparatif-villes";  // comparaison entre plusieurs villes

/** Donnees extraites d'un article */
interface BlogExtractedData {
  /** Metadonnees d'extraction */
  meta: {
    articleSlug: string;
    category: BlogArticleCategory;
    referenceDate: string;          // YYYY-MM-DD — date de validite des donnees
    confidenceScore: number;        // 0-100, auto-evalue par Gemini
    dataSources: string[];          // ex: ["DVF 2025", "INSEE RP 2022"]
  };

  /** Donnees rattachees a une ou plusieurs localites */
  localities: BlogLocalityExtract[];

  /** Donnees globales (non rattachees a une localite) */
  global?: BlogGlobalExtract;
}

/** Donnees extraites pour une localite specifique */
interface BlogLocalityExtract {
  /** Identification de la localite */
  cityName: string;
  postalCode?: string;
  codeInsee?: string;
  localityType: "ville" | "quartier" | "departement" | "region";

  /** Sous-ensemble de LocalityDataFields — seuls les champs mentionnes dans l'article */
  data: Partial<LocalityDataFields>;

  /** Champs etendus (cibles ~90 champs, cf locality-data-cible.md) */
  extendedData?: Partial<ExtendedLocalityDataFields>;
}

/** Champs etendus pas encore dans LocalityDataFields, stockes en JSON */
interface ExtendedLocalityDataFields {
  // Prix segmentes
  avg_price_studio_per_m2?: number;
  avg_price_small_apt_per_m2?: number;
  avg_price_house_per_m2?: number;
  price_trend_1y_pct?: number;
  price_trend_5y_pct?: number;

  // Loyers segmentes
  avg_rent_studio_per_m2?: number;
  avg_rent_small_apt_per_m2?: number;
  market_tension?: "tendu" | "equilibre" | "detendu";
  rent_control_zone?: boolean;

  // Qualite de vie
  safety_score?: number;
  healthcare_density?: number;
  sunshine_hours_year?: number;

  // Transports
  tgv_station?: boolean;
  commute_to_nearest_metropole_min?: number;

  // Fiscalite
  pinel_eligible?: boolean;
  denormandie_eligible?: boolean;
  zrr?: boolean;

  // Urbanisme
  major_urban_projects?: string[];
  investment_opportunity_summary?: string;

  // ... tous les champs de locality-data-cible.md
}

/** Donnees globales (taux d'interet, dispositifs fiscaux nationaux) */
interface BlogGlobalExtract {
  interestRates?: {
    avg_rate_15y?: number;
    avg_rate_20y?: number;
    avg_rate_25y?: number;
    source?: string;
    date?: string;
  };
  fiscalDevices?: Array<{
    name: string;           // ex: "Pinel", "Denormandie", "Loc'Avantages"
    status: "actif" | "modifie" | "supprime";
    details?: string;
    effectiveDate?: string;
  }>;
  nationalTrends?: {
    avgPriceTrend1yPct?: number;
    avgRentTrend1yPct?: number;
    constructionPermitsTrend?: string;
  };
}
```

### Mapping categorie → donnees attendues

| Categorie | Champs `LocalityDataFields` | Champs etendus | Donnees globales |
|-----------|----------------------------|----------------|------------------|
| `guide-ville` | Tous (prix, loyers, charges, Airbnb, socio-eco, infra, risques) | Prix/loyers segmentes, qualite de vie, transports, fiscalite locale, urbanisme | — |
| `actu-marche` | `avg_purchase_price_per_m2`, `median_purchase_price_per_m2`, `transaction_count`, `avg_rent_per_m2`, `vacancy_rate` | `price_trend_1y_pct`, `market_tension` | `nationalTrends` |
| `fiscalite` | `avg_property_tax_per_m2` | `pinel_eligible`, `denormandie_eligible`, `zrr` | `fiscalDevices`, `interestRates` |
| `transport-urbanisme` | `public_transport_score` | `tgv_station`, `commute_to_nearest_metropole_min`, `major_urban_projects` | — |
| `qualite-vie` | `population`, `population_growth_pct`, `median_income`, `unemployment_rate`, `school_count` | `safety_score`, `healthcare_density`, `sunshine_hours_year` | — |
| `airbnb-saisonnier` | `avg_airbnb_night_price`, `avg_airbnb_occupancy_rate` | `airbnb_listing_count`, `airbnb_regulation`, `airbnb_avg_revenue_monthly` | — |
| `comparatif-villes` | Sous-ensemble prix + loyers pour chaque ville comparee | `market_tension`, `price_trend_1y_pct` pour chaque ville | — |

### Exemple complet : article "guide ville Lyon"

Reponse Gemini (extrait du bloc `## DATA`) :

```json
{
  "meta": {
    "articleSlug": "investir-lyon-guide-2025",
    "category": "guide-ville",
    "referenceDate": "2025-03-01",
    "confidenceScore": 82,
    "dataSources": ["DVF T3 2024", "Observatoire Clameur 2024", "INSEE RP 2021", "AirDNA mars 2025"]
  },
  "localities": [
    {
      "cityName": "Lyon",
      "codeInsee": "69123",
      "postalCode": "69001",
      "localityType": "ville",
      "data": {
        "avg_purchase_price_per_m2": 4850,
        "median_purchase_price_per_m2": 4620,
        "transaction_count": 12400,
        "avg_rent_per_m2": 14.5,
        "avg_rent_furnished_per_m2": 18.2,
        "vacancy_rate": 3.2,
        "avg_condo_charges_per_m2": 2.8,
        "avg_property_tax_per_m2": 1.1,
        "avg_airbnb_night_price": 95,
        "avg_airbnb_occupancy_rate": 72,
        "population": 522250,
        "population_growth_pct": 0.8,
        "median_income": 24500,
        "unemployment_rate": 7.1,
        "school_count": 485,
        "university_nearby": true,
        "public_transport_score": 9,
        "risk_level": "moyen",
        "natural_risks": [
          { "type": "Inondation", "level": "Moyen" },
          { "type": "Seisme", "level": "Faible" }
        ]
      },
      "extendedData": {
        "avg_price_studio_per_m2": 5200,
        "avg_price_small_apt_per_m2": 4700,
        "avg_price_house_per_m2": 4100,
        "price_trend_1y_pct": -2.1,
        "price_trend_5y_pct": 12.5,
        "avg_rent_studio_per_m2": 17.8,
        "avg_rent_small_apt_per_m2": 14.2,
        "market_tension": "tendu",
        "rent_control_zone": true,
        "safety_score": 6,
        "healthcare_density": 8.2,
        "sunshine_hours_year": 2010,
        "tgv_station": true,
        "commute_to_nearest_metropole_min": 0,
        "pinel_eligible": true,
        "denormandie_eligible": false,
        "major_urban_projects": [
          "Part-Dieu 2030 — restructuration du quartier d'affaires",
          "Presqu'ile pietonne — extension zone ZFE",
          "Metro E Alaï-Bellecour — mise en service 2030"
        ],
        "investment_opportunity_summary": "Marche tendu avec des prix en legere correction (-2.1% sur 1 an), offrant une fenetre d'entree. Le rendement brut moyen se situe autour de 3-4% en location classique, davantage en meuble etudiant (quartiers Guillotiere, Jean Mace). L'arrivee du metro E et la restructuration Part-Dieu sont des catalyseurs de valorisation a moyen terme."
      }
    },
    {
      "cityName": "Villeurbanne",
      "codeInsee": "69266",
      "postalCode": "69100",
      "localityType": "ville",
      "data": {
        "avg_purchase_price_per_m2": 3650,
        "median_purchase_price_per_m2": 3480,
        "avg_rent_per_m2": 13.2,
        "avg_rent_furnished_per_m2": 16.5,
        "vacancy_rate": 3.8,
        "population": 155420,
        "university_nearby": true
      },
      "extendedData": {
        "price_trend_1y_pct": -1.5,
        "market_tension": "tendu",
        "rent_control_zone": true,
        "investment_opportunity_summary": "Alternative moins chere a Lyon avec un campus universitaire (La Doua) generant une demande locative etudiante forte. Rendements bruts superieurs a Lyon de ~1 point."
      }
    }
  ],
  "global": null
}
```

---

## 3. Validation avant injection

### Regles de validation structurelle

```typescript
// src/domains/blog/validator.ts

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  locality: string;
  message: string;
  value: unknown;
}

interface ValidationWarning {
  field: string;
  locality: string;
  message: string;
  severity: "low" | "medium" | "high";
}
```

#### Etape 1 : bornes realistes

Chaque champ `LocalityDataFields` a des bornes min/max calibrees sur le marche francais :

```typescript
const FIELD_BOUNDS: Record<string, { min: number; max: number; unit: string }> = {
  avg_purchase_price_per_m2:    { min: 500,   max: 25000, unit: "EUR/m2" },
  median_purchase_price_per_m2: { min: 500,   max: 25000, unit: "EUR/m2" },
  transaction_count:            { min: 1,     max: 100000, unit: "transactions" },
  avg_rent_per_m2:              { min: 3,     max: 50,    unit: "EUR/m2/mois" },
  avg_rent_furnished_per_m2:    { min: 5,     max: 70,    unit: "EUR/m2/mois" },
  vacancy_rate:                 { min: 0,     max: 30,    unit: "%" },
  avg_condo_charges_per_m2:     { min: 0.5,   max: 10,    unit: "EUR/m2/mois" },
  avg_property_tax_per_m2:      { min: 0.2,   max: 5,     unit: "EUR/m2/mois" },
  avg_airbnb_night_price:       { min: 20,    max: 500,   unit: "EUR/nuit" },
  avg_airbnb_occupancy_rate:    { min: 10,    max: 98,    unit: "%" },
  population:                   { min: 100,   max: 3000000, unit: "habitants" },
  population_growth_pct:        { min: -5,    max: 10,    unit: "%" },
  median_income:                { min: 10000, max: 80000, unit: "EUR/an" },
  poverty_rate:                 { min: 2,     max: 60,    unit: "%" },
  unemployment_rate:            { min: 2,     max: 30,    unit: "%" },
  school_count:                 { min: 1,     max: 2000,  unit: "ecoles" },
  public_transport_score:       { min: 0,     max: 10,    unit: "score" },
};
```

Toute valeur hors bornes genere une `ValidationError` et bloque l'injection.

#### Etape 2 : coherence interne

Regles de coherence entre champs d'une meme localite :

```typescript
function validateCoherence(data: Partial<LocalityDataFields>): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Le loyer meuble doit etre > loyer nu
  if (data.avg_rent_per_m2 && data.avg_rent_furnished_per_m2) {
    if (data.avg_rent_furnished_per_m2 <= data.avg_rent_per_m2) {
      warnings.push({
        field: "avg_rent_furnished_per_m2",
        locality: "",
        message: "Loyer meuble <= loyer nu",
        severity: "high",
      });
    }
  }

  // Le prix median ne devrait pas s'ecarter de >30% du prix moyen
  if (data.avg_purchase_price_per_m2 && data.median_purchase_price_per_m2) {
    const ratio = data.median_purchase_price_per_m2 / data.avg_purchase_price_per_m2;
    if (ratio < 0.7 || ratio > 1.3) {
      warnings.push({
        field: "median_purchase_price_per_m2",
        locality: "",
        message: `Ecart median/moyen de ${Math.round((1 - ratio) * 100)}%`,
        severity: "medium",
      });
    }
  }

  // Taux de vacance > 15% est suspect
  if (data.vacancy_rate && data.vacancy_rate > 15) {
    warnings.push({
      field: "vacancy_rate",
      locality: "",
      message: "Taux de vacance anormalement eleve",
      severity: "medium",
    });
  }

  return warnings;
}
```

#### Etape 3 : comparaison avec donnees existantes

```typescript
async function validateAgainstExisting(
  localityId: string,
  newData: Partial<LocalityDataFields>
): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = [];

  // Charger le snapshot actuel via getLatestLocalityData()
  const existing = await getLatestLocalityData(localityId);
  if (!existing) return warnings; // pas de donnees existantes, tout est acceptable

  const existingFields: LocalityDataFields = JSON.parse(existing.data);
  const DRIFT_THRESHOLD = 0.20; // alerte si ecart > 20%

  for (const [key, newValue] of Object.entries(newData)) {
    if (newValue == null || typeof newValue !== "number") continue;
    const oldValue = existingFields[key as keyof LocalityDataFields];
    if (oldValue == null || typeof oldValue !== "number") continue;

    const drift = Math.abs(newValue - oldValue) / oldValue;
    if (drift > DRIFT_THRESHOLD) {
      warnings.push({
        field: key,
        locality: localityId,
        message: `Ecart de ${Math.round(drift * 100)}% vs donnees existantes (${oldValue} → ${newValue})`,
        severity: drift > 0.40 ? "high" : "medium",
      });
    }
  }

  return warnings;
}
```

#### Etape 4 : workflow humain si donnees suspectes

```
Résultat validation
       │
       ├── 0 errors, 0 warnings high → injection automatique ✓
       │
       ├── 0 errors, warnings medium → injection + notification admin
       │
       ├── 0 errors, ≥1 warning high → file d'attente review
       │   Admin confirme/corrige → injection
       │   Admin rejette → données ignorées
       │
       └── ≥1 error → rejet automatique, log pour debug
```

Le statut de chaque extraction est persiste :

```typescript
type BlogDataStatus = "auto-injected" | "pending-review" | "approved" | "rejected" | "error";

interface BlogDataAuditEntry {
  id: string;
  articleSlug: string;
  localityId: string;
  status: BlogDataStatus;
  extractedData: string;        // JSON des donnees extraites
  validationErrors: string;     // JSON des erreurs
  validationWarnings: string;   // JSON des warnings
  reviewedBy: string | null;    // null = auto, "admin" = review manuelle
  snapshotId: string | null;    // ID du locality_data cree (si injecte)
  created_at: string;
  reviewed_at: string | null;
}
```

### Gestion des conflits : donnees IA vs donnees manuelles

Regle fondamentale : **les donnees saisies manuellement par un admin ne sont jamais ecrasees par le blog-IA**.

La strategie repose sur le champ `created_by` de `locality_data` :

| `created_by` | Priorite | Peut etre ecrase par blog-IA ? |
|--------------|----------|-------------------------------|
| `"admin"` | Haute | Non — jamais |
| `"blog-ai"` | Normale | Oui — par un blog-ai plus recent |
| `"api-dvf"` | Normale | Oui — si donnees blog plus recentes |
| `"import"` | Basse | Oui |
| `""` (vide) | Basse | Oui |

Implementation dans l'injector :

```typescript
async function shouldInject(
  localityId: string,
  fieldKey: keyof LocalityDataFields,
  newValue: unknown
): Promise<{ inject: boolean; reason: string }> {
  const existing = await getLatestLocalityData(localityId);
  if (!existing) return { inject: true, reason: "no-existing-data" };

  // Donnees manuelles = intouchable
  if (existing.created_by === "admin") {
    const existingFields: LocalityDataFields = JSON.parse(existing.data);
    if (existingFields[fieldKey] != null) {
      return { inject: false, reason: "manual-data-protected" };
    }
  }

  return { inject: true, reason: "ok" };
}
```

---

## 4. Injection dans `locality_data`

### Creation de snapshot

L'injection utilise directement `createLocalityData()` du repository existant (`src/domains/locality/repository.ts` L218-232) :

```typescript
// src/domains/blog/injector.ts

import { findLocalityByCity, createLocalityData, getLatestLocalityData } from "@/domains/locality/repository";
import { LocalityDataFields, LOCALITY_DATA_FIELD_KEYS } from "@/domains/locality/types";

interface InjectionResult {
  localityId: string;
  snapshotId: string;
  fieldsInjected: string[];
  fieldsSkipped: Array<{ field: string; reason: string }>;
}

async function injectLocalityData(
  extract: BlogLocalityExtract,
  meta: BlogExtractedData["meta"]
): Promise<InjectionResult> {
  // 1. Resoudre la localite cible
  const locality = await findLocalityByCity(
    extract.cityName,
    extract.postalCode,
    extract.codeInsee
  );
  if (!locality) {
    throw new BlogInjectionError(`Localite introuvable : ${extract.cityName}`);
  }

  // 2. Charger le snapshot existant pour merge
  const existing = await getLatestLocalityData(locality.id);
  const existingFields: LocalityDataFields = existing
    ? JSON.parse(existing.data)
    : {};

  // 3. Merge field-by-field avec protection des donnees manuelles
  const mergedFields: LocalityDataFields = { ...existingFields };
  const fieldsInjected: string[] = [];
  const fieldsSkipped: Array<{ field: string; reason: string }> = [];

  for (const key of LOCALITY_DATA_FIELD_KEYS) {
    const newValue = extract.data[key];
    if (newValue === undefined || newValue === null) continue;

    const decision = await shouldInject(locality.id, key, newValue);
    if (decision.inject) {
      (mergedFields as Record<string, unknown>)[key] = newValue;
      fieldsInjected.push(key);
    } else {
      fieldsSkipped.push({ field: key, reason: decision.reason });
    }
  }

  // 4. Clore le snapshot precedent (blog-ai uniquement)
  if (existing && existing.created_by === "blog-ai" && !existing.valid_to) {
    // On ferme l'ancien snapshot en mettant valid_to = veille du nouveau
    const yesterday = new Date(meta.referenceDate);
    yesterday.setDate(yesterday.getDate() - 1);
    // Note : necessite un updateLocalityData() a ajouter au repository
  }

  // 5. Creer le nouveau snapshot
  const snapshotId = await createLocalityData({
    locality_id: locality.id,
    valid_from: meta.referenceDate,
    valid_to: null,
    data: JSON.stringify(mergedFields),
    created_by: "blog-ai",
  });

  return {
    localityId: locality.id,
    snapshotId,
    fieldsInjected,
    fieldsSkipped,
  };
}
```

### Strategie de merge detaillee

```
Snapshot existant (created_by = "admin", valid_from = "2025-01-01")
  ├── avg_purchase_price_per_m2: 4500   ← PROTEGE (admin)
  ├── avg_rent_per_m2: 13.5             ← PROTEGE (admin)
  ├── population: 520000                ← PROTEGE (admin)
  └── avg_airbnb_night_price: null      ← VIDE

Donnees blog-ai :
  ├── avg_purchase_price_per_m2: 4850   ← SKIP (admin protege)
  ├── avg_rent_per_m2: 14.5             ← SKIP (admin protege)
  ├── avg_airbnb_night_price: 95        ← INJECT (champ vide)
  └── vacancy_rate: 3.2                 ← INJECT (champ vide)

Resultat : nouveau snapshot blog-ai avec les champs vides combles
Le snapshot admin reste la reference pour les champs qu'il contient
→ resolveLocalityData() prend le snapshot le plus recent par champ
```

Le resolver existant (`src/domains/locality/resolver.ts` L59-72) fonctionne deja en field-by-field : il parcourt les snapshots et prend la premiere valeur non-null. L'injection blog-ai cree un snapshot a une date plus recente, donc ses champs sont pris en priorite **sauf** si un snapshot admin plus recent existe.

### Gestion `valid_from` / `valid_to`

| Scenario | `valid_from` | `valid_to` |
|----------|-------------|------------|
| Nouveau snapshot blog-ai, pas d'ancien | `referenceDate` de l'article | `null` (courant) |
| Nouveau snapshot blog-ai, ancien blog-ai existe | `referenceDate` | `null` ; ancien snapshot recoit `valid_to = referenceDate - 1j` |
| Snapshot admin existe | Le snapshot blog-ai coexiste ; le resolver prend le plus recent par champ | N/A |

Le query de `getLatestLocalityDataBatch()` (`src/domains/locality/repository.ts` L33-60) filtre deja par `valid_from <= date AND (valid_to IS NULL OR valid_to >= date)`, ce qui garantit que seuls les snapshots valides sont lus.

### Donnees non-localite : stockage global

Les donnees globales (taux d'interet, dispositifs fiscaux nationaux) ne sont pas rattachees a une localite. Deux options :

**Option retenue : table `reference_items` existante**

La table `reference_items` (`src/infrastructure/database/client.ts` L248-262) est deja un store generique :

```sql
CREATE TABLE IF NOT EXISTS reference_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,        -- "interest_rate", "fiscal_device", "national_trend"
  category TEXT DEFAULT '',
  label TEXT NOT NULL,
  ...
);
```

Les donnees globales du blog sont injectees comme `reference_items` avec :
- `type = "blog-global-rate"` pour les taux
- `type = "blog-global-fiscal"` pour les dispositifs
- `created_by` tracable sur une colonne a ajouter si necessaire

Alternativement, les donnees globales peuvent etre stockees dans un `locality_data` rattache a la localite "France" (type `pays`, depth 0), qui sert de racine de fallback pour toutes les localites.

---

## 5. Impact sur l'app

### Impact sur `resolveLocalityData()`

`resolveLocalityData()` (`src/domains/locality/resolver.ts`) fonctionne deja parfaitement avec les nouveaux snapshots blog-ai :

1. `findLocalityByCity(city, postalCode, codeInsee)` — resout la localite (inchange)
2. Remontee de la chaine `parent_id` — inchange
3. `getLatestLocalityDataBatch(chainIds)` — retourne le snapshot le plus recent pour chaque localite de la chaine, **y compris les snapshots blog-ai**
4. Merge field-by-field — les champs blog-ai remplissent les trous

**Impact concret** : une ville qui n'avait que `avg_purchase_price_per_m2` et `avg_rent_per_m2` se retrouve avec 20+ champs apres un article guide-ville. Le resolver les expose automatiquement.

### Impact sur `getMarketData()`

`getMarketData()` (`src/domains/market/service.ts`) lit directement depuis `resolveLocalityData()`. Les champs supplementaires remplis par le blog impactent :

```typescript
// Avant blog : null → Apres blog : valeur reelle
return {
  avgPurchasePricePerM2: f.avg_purchase_price_per_m2,  // ✓ plus precis
  medianPurchasePricePerM2: f.median_purchase_price_per_m2, // ✓ souvent null → rempli
  avgRentPerM2: f.avg_rent_per_m2,                      // ✓ plus precis
  avgCondoChargesPerM2: f.avg_condo_charges_per_m2,     // ✓ souvent null → rempli
  avgPropertyTaxPerM2: f.avg_property_tax_per_m2,       // ✓ souvent null → rempli
  vacancyRate: f.vacancy_rate,                           // ✓ souvent null → rempli
  avgAirbnbNightPrice: f.avg_airbnb_night_price,        // ✓ souvent null → rempli
  avgAirbnbOccupancyRate: f.avg_airbnb_occupancy_rate,  // ✓ souvent null → rempli
};
```

### Impact sur `estimateMonthlyRent()`

Avec `avg_rent_per_m2` et `avg_rent_furnished_per_m2` remplis via le blog, l'app peut estimer automatiquement le loyer d'un bien selon sa surface et son type (nu/meuble). Les champs etendus `avg_rent_studio_per_m2`, `avg_rent_small_apt_per_m2` permettront une estimation encore plus fine par segment.

### Impact sur les calculs de simulation

`calculateAll()` (`src/lib/calculations.ts` L75-216) utilise les donnees de la propriete, pas directement celles de la localite. Mais l'enrichissement (`runEnrichmentPipeline()`, `src/domains/enrich/service.ts`) injecte les donnees marche dans la propriete via `getMarketData()`. La chaine est :

```
Blog injecte locality_data
  → getMarketData() retourne des donnees plus completes
    → runEnrichmentPipeline() calcule un score plus precis
      → computeInvestmentScore() (src/domains/enrich/scoring.ts L60-86)
        → scorePriceVsMarket() utilise medianPurchasePricePerM2
           (avant : souvent null → score neutre 10/20 ;
            apres : valeur reelle → score reflete la realite)
```

Impact sur la simulation systeme : la baseline auto-generee integre `avg_rent_per_m2`, `avg_condo_charges_per_m2`, `avg_property_tax_per_m2` depuis la localite. Plus ces champs sont remplis, plus la simulation systeme est precis.

### Impact sur le pipeline d'enrichissement

`runEnrichmentPipeline()` (`src/domains/enrich/service.ts` L47-106) lance en parallele :
- `getMarketData()` — profite des nouvelles donnees
- `buildSocioDataFromLocality()` — profite des donnees socio-eco (L12-44)
- `computeInvestmentScore()` — score plus precis

**Re-enrichissement automatique** : apres injection de donnees blog pour une ville, les proprietes situees dans cette ville doivent etre re-enrichies. Ce trigger doit etre ajoute :

```typescript
// A la fin de injectLocalityData() :
async function triggerReenrichment(localityId: string): Promise<void> {
  // Trouver toutes les proprietes de cette localite
  // et relancer runEnrichmentPipeline() pour chacune
  // Peut etre fait en batch async (queue)
}
```

### Mise a jour automatique des guides villes (ISR)

Les pages `/ville/[slug]` utilisent ISR (Incremental Static Regeneration). Apres injection de nouvelles donnees :

```typescript
// Appel revalidation Next.js apres injection
import { revalidatePath } from "next/cache";

async function postInjectionRevalidation(citySlug: string): Promise<void> {
  // Revalider la page guide ville
  revalidatePath(`/ville/${citySlug}`);
  // Revalider le dashboard si les donnees marche ont change
  revalidatePath("/dashboard");
}
```

---

## 6. Audit et tracabilite

### Tracer quelle donnee vient de quel article

Chaque injection cree une entree `BlogDataAuditEntry` (section 3) avec :
- `articleSlug` : l'article source
- `localityId` : la localite impactee
- `snapshotId` : l'ID du `locality_data` cree
- `extractedData` : copie exacte du JSON extrait

Pour remonter a l'article depuis une donnee :

```typescript
// Requete : "d'ou vient le avg_rent_per_m2 de Lyon ?"
async function traceFieldOrigin(
  localityId: string,
  fieldKey: keyof LocalityDataFields
): Promise<{ source: string; articleSlug: string | null; date: string } | null> {
  const snapshot = await getLatestLocalityData(localityId);
  if (!snapshot) return null;

  if (snapshot.created_by === "blog-ai") {
    // Chercher l'audit entry correspondante
    const audit = await findAuditBySnapshotId(snapshot.id);
    return {
      source: "blog-ai",
      articleSlug: audit?.articleSlug ?? null,
      date: snapshot.valid_from,
    };
  }

  return {
    source: snapshot.created_by,
    articleSlug: null,
    date: snapshot.valid_from,
  };
}
```

Cela s'integre avec le `fieldSources` deja retourne par `resolveLocalityData()` (`src/domains/locality/types.ts` L110-115) : on sait deja quelle localite a fourni chaque champ, on y ajoute l'article source.

### Dashboard de suivi : couverture donnees par ville

```typescript
interface LocalityCoverageStats {
  localityId: string;
  localityName: string;
  totalFields: number;         // LOCALITY_DATA_FIELD_KEYS.length (actuellement 22)
  filledFields: number;        // nombre de champs non-null
  coveragePct: number;         // filledFields / totalFields * 100
  lastUpdated: string;         // date du snapshot le plus recent
  lastSource: string;          // created_by du snapshot le plus recent
  extendedFieldsCount: number; // nombre de champs etendus remplis
}

async function getLocalityCoverageReport(): Promise<LocalityCoverageStats[]> {
  const localities = await getAllLocalities();
  const stats: LocalityCoverageStats[] = [];

  // Batch-fetch toutes les donnees en une seule requete
  const allIds = localities.map(l => l.id);
  const dataMap = await getLatestLocalityDataBatch(allIds);

  for (const loc of localities) {
    const snapshot = dataMap.get(loc.id);
    const fields: LocalityDataFields = snapshot ? JSON.parse(snapshot.data) : {};

    const filledFields = LOCALITY_DATA_FIELD_KEYS.filter(
      key => fields[key] !== undefined && fields[key] !== null
    ).length;

    stats.push({
      localityId: loc.id,
      localityName: loc.name,
      totalFields: LOCALITY_DATA_FIELD_KEYS.length,
      filledFields,
      coveragePct: Math.round((filledFields / LOCALITY_DATA_FIELD_KEYS.length) * 100),
      lastUpdated: snapshot?.valid_from ?? "jamais",
      lastSource: snapshot?.created_by ?? "aucune",
      extendedFieldsCount: 0, // a calculer quand les champs etendus seront dans le type
    });
  }

  return stats.sort((a, b) => a.coveragePct - b.coveragePct);
}
```

Indicateurs cles du dashboard :
- **Couverture P0** : % des villes avec tous les champs critiques (prix, loyers, charges, vacance)
- **Couverture P1** : % des villes avec champs qualite de vie + economie
- **Fraicheur** : nombre de villes dont le dernier snapshot date de > 6 mois
- **Volumes** : nombre de snapshots blog-ai crees ce mois / cette semaine
- **Erreurs** : nombre d'extractions rejetees ou en attente de review

### Qualite des donnees : scoring de confiance

```typescript
interface DataQualityScore {
  localityId: string;
  overall: number;           // 0-100
  freshness: number;         // 0-25 — anciennete du snapshot
  coverage: number;          // 0-25 — completude des champs
  sourceReliability: number; // 0-25 — qualite de la source (admin > api > blog-ai)
  consistency: number;       // 0-25 — coherence interne (loyer meuble > nu, etc.)
}

function computeDataQuality(
  snapshot: LocalityData | undefined,
  fields: LocalityDataFields
): DataQualityScore {
  // Fraicheur : 25 si < 3 mois, 15 si < 6 mois, 5 si < 1 an, 0 sinon
  const freshness = computeFreshness(snapshot?.valid_from);

  // Couverture : proportionnel au nombre de champs remplis
  const filled = LOCALITY_DATA_FIELD_KEYS.filter(k => fields[k] != null).length;
  const coverage = Math.round((filled / LOCALITY_DATA_FIELD_KEYS.length) * 25);

  // Source : admin=25, api=20, blog-ai (confidence>80)=15, blog-ai (confidence<80)=10
  const sourceReliability = computeSourceScore(snapshot?.created_by);

  // Coherence : resultat du validateCoherence()
  const warnings = validateCoherence(fields);
  const consistency = warnings.length === 0 ? 25 : Math.max(0, 25 - warnings.length * 5);

  return {
    localityId: snapshot?.locality_id ?? "",
    overall: freshness + coverage + sourceReliability + consistency,
    freshness,
    coverage,
    sourceReliability,
    consistency,
  };
}
```

---

## 7. Schema technique

### Diagramme de sequence du pipeline complet

```
Cron/Admin            Gemini API        BlogExtractor      BlogValidator       BlogInjector        Repository           App
    │                     │                  │                   │                   │                  │                 │
    │  trigger(category,  │                  │                   │                   │                  │                 │
    │  city, slug)        │                  │                   │                   │                  │                 │
    │────────────────────>│                  │                   │                   │                  │                 │
    │                     │                  │                   │                   │                  │                 │
    │                     │  prompt dual     │                   │                   │                  │                 │
    │                     │  output          │                   │                   │                  │                 │
    │                     │<─────────────────│                   │                   │                  │                 │
    │                     │                  │                   │                   │                  │                 │
    │                     │  raw response    │                   │                   │                  │                 │
    │                     │─────────────────>│                   │                   │                  │                 │
    │                     │                  │                   │                   │                  │                 │
    │                     │                  │ parseGeminiDual   │                   │                  │                 │
    │                     │                  │ Output()          │                   │                  │                 │
    │                     │                  │──┐                │                   │                  │                 │
    │                     │                  │  │                │                   │                  │                 │
    │                     │                  │<─┘                │                   │                  │                 │
    │                     │                  │                   │                   │                  │                 │
    │                     │                  │  validate(data)   │                   │                  │                 │
    │                     │                  │──────────────────>│                   │                  │                 │
    │                     │                  │                   │                   │                  │                 │
    │                     │                  │                   │ getLatestLocality  │                  │                 │
    │                     │                  │                   │ Data()             │                  │                 │
    │                     │                  │                   │──────────────────────────────────────>│                 │
    │                     │                  │                   │                   │                  │                 │
    │                     │                  │                   │<─────────────────────────────────────│                 │
    │                     │                  │                   │                   │                  │                 │
    │                     │                  │                   │ validateBounds()   │                  │                 │
    │                     │                  │                   │ validateCoherence()│                  │                 │
    │                     │                  │                   │ validateAgainst    │                  │                 │
    │                     │                  │                   │ Existing()         │                  │                 │
    │                     │                  │                   │──┐                │                  │                 │
    │                     │                  │                   │  │                │                  │                 │
    │                     │                  │                   │<─┘                │                  │                 │
    │                     │                  │                   │                   │                  │                 │
    │                     │                  │  ValidationResult │                   │                  │                 │
    │                     │                  │<─────────────────│                   │                  │                 │
    │                     │                  │                   │                   │                  │                 │
    │                     │                  │                   │                   │                  │                 │
    │                     │                  │ [si valid]        │                   │                  │                 │
    │                     │                  │ inject(data)      │                   │                  │                 │
    │                     │                  │─────────────────────────────────────>│                  │                 │
    │                     │                  │                   │                   │                  │                 │
    │                     │                  │                   │                   │ findLocality     │                 │
    │                     │                  │                   │                   │ ByCity()         │                 │
    │                     │                  │                   │                   │─────────────────>│                 │
    │                     │                  │                   │                   │<────────────────│                 │
    │                     │                  │                   │                   │                  │                 │
    │                     │                  │                   │                   │ merge + create   │                 │
    │                     │                  │                   │                   │ LocalityData()   │                 │
    │                     │                  │                   │                   │─────────────────>│                 │
    │                     │                  │                   │                   │<────────────────│                 │
    │                     │                  │                   │                   │                  │                 │
    │                     │                  │                   │                   │ audit entry      │                 │
    │                     │                  │                   │                   │──┐               │                 │
    │                     │                  │                   │                   │  │               │                 │
    │                     │                  │                   │                   │<─┘               │                 │
    │                     │                  │                   │                   │                  │                 │
    │                     │                  │ InjectionResult   │                   │                  │                 │
    │                     │                  │<────────────────────────────────────│                  │                 │
    │                     │                  │                   │                   │                  │                 │
    │                     │                  │ [post-injection]  │                   │                  │                 │
    │                     │                  │ revalidatePath()  │                   │                  │                 │
    │                     │                  │ + reenrichment    │                   │                  │   revalidate    │
    │                     │                  │──────────────────────────────────────────────────────────────────────────>│
    │                     │                  │                   │                   │                  │                 │
    │  PipelineResult     │                  │                   │                   │                  │                 │
    │<───────────────────────────────────────│                   │                   │                  │                 │
    │                     │                  │                   │                   │                  │                 │
```

### Interfaces TypeScript pour les echanges

```typescript
// src/domains/blog/types.ts — interface complete

/** Entree du pipeline : ce qu'on passe pour declencher la generation */
interface BlogPipelineInput {
  category: BlogArticleCategory;
  subject: string;
  targetCity?: string;
  targetPostalCode?: string;
  targetCodeInsee?: string;
  referenceDate?: string;        // default: today
  dryRun?: boolean;              // valider sans injecter
}

/** Sortie du pipeline : resultat global */
interface BlogPipelineResult {
  success: boolean;
  articleSlug: string;
  articleMarkdown: string;

  // Resultats par localite
  injections: InjectionResult[];

  // Validation
  validation: ValidationResult;

  // Donnees globales (si presentes)
  globalDataInjected: boolean;

  // Metriques
  duration_ms: number;
  geminiTokensUsed: number;
}

/** Erreur typee du pipeline */
class BlogPipelineError extends Error {
  constructor(
    message: string,
    public step: "extraction" | "parsing" | "validation" | "injection" | "revalidation",
    public details?: unknown
  ) {
    super(message);
    this.name = "BlogPipelineError";
  }
}
```

### Gestion d'erreur a chaque etape

| Etape | Erreur possible | Traitement | Consequence |
|-------|-----------------|------------|-------------|
| **Appel Gemini** | Timeout, rate limit, erreur API | Retry x3 avec backoff exponentiel | Pipeline avorte, log erreur |
| **Parsing reponse** | Format invalide, JSON malformed | `BlogPipelineError("parsing")` | Article genere sans donnees, alerte admin |
| **Validation bornes** | Valeur hors bornes | `ValidationError` | Champ rejete, les autres passent |
| **Validation coherence** | Incoherence entre champs | `ValidationWarning` | Warning level decide si review ou auto |
| **Comparaison existant** | Ecart > 20% | `ValidationWarning(high)` | File d'attente review admin |
| **Resolution localite** | Ville introuvable en DB | `BlogInjectionError` | Skip cette localite, log pour creation future |
| **Injection DB** | Erreur SQLite, constraint violation | Rollback, `BlogPipelineError("injection")` | Aucune donnee injectee pour cette localite |
| **Revalidation ISR** | Erreur Next.js revalidate | Log warning, non bloquant | Page pas rafraichie, sera maj au prochain build |
| **Re-enrichissement** | Erreur dans `runEnrichmentPipeline()` | Log warning, non bloquant | Proprietes gardent anciennes donnees enrichies |

Strategie de rollback :

```typescript
async function runBlogPipeline(input: BlogPipelineInput): Promise<BlogPipelineResult> {
  const startTime = Date.now();
  const injections: InjectionResult[] = [];

  try {
    // 1. Generation
    const rawResponse = await callGeminiWithRetry(buildPrompt(input), { maxRetries: 3 });

    // 2. Parsing
    const { articleMarkdown, extractedData } = parseGeminiDualOutput(rawResponse);

    // 3. Validation globale
    const validation = await validateAll(extractedData);
    if (validation.errors.length > 0 && !input.dryRun) {
      // Log les erreurs mais tente d'injecter les localites valides
    }

    // 4. Injection par localite (isolee — une erreur ne bloque pas les autres)
    if (!input.dryRun) {
      for (const locExtract of extractedData.localities) {
        try {
          const result = await injectLocalityData(locExtract, extractedData.meta);
          injections.push(result);
        } catch (e) {
          console.error(`Injection failed for ${locExtract.cityName}:`, e);
          // Continue avec les autres localites
        }
      }

      // 5. Post-injection
      for (const inj of injections) {
        await postInjectionRevalidation(inj.localityId).catch(console.warn);
        await triggerReenrichment(inj.localityId).catch(console.warn);
      }
    }

    return {
      success: true,
      articleSlug: extractedData.meta.articleSlug,
      articleMarkdown,
      injections,
      validation,
      globalDataInjected: false, // TODO
      duration_ms: Date.now() - startTime,
      geminiTokensUsed: 0, // TODO: extraire des headers Gemini
    };
  } catch (e) {
    throw new BlogPipelineError(
      `Pipeline failed: ${e instanceof Error ? e.message : String(e)}`,
      e instanceof BlogPipelineError ? e.step : "extraction",
      e
    );
  }
}
```

---

## Annexe : checklist d'implementation

1. **Creer `src/domains/blog/types.ts`** — tous les types de cette spec
2. **Creer `src/domains/blog/extractor.ts`** — prompt builder + parser dual output
3. **Creer `src/domains/blog/validator.ts`** — bornes, coherence, comparaison existant
4. **Creer `src/domains/blog/injector.ts`** — merge + `createLocalityData()` + audit
5. **Creer `src/domains/blog/audit.ts`** — table `blog_data_audit` + CRUD
6. **Creer `src/domains/blog/pipeline.ts`** — orchestrateur `runBlogPipeline()`
7. **Ajouter `updateLocalityData()`** dans `src/domains/locality/repository.ts` — pour fermer `valid_to` des anciens snapshots
8. **Ajouter migration** dans `src/infrastructure/database/client.ts` — table `blog_data_audit`
9. **Etendre `LocalityDataFields`** dans `src/domains/locality/types.ts` — champs P0 cibles
10. **Dashboard admin** — page couverture + qualite + review queue
11. **Route API / Server Action** — `generateAndInjectArticle(input: BlogPipelineInput)`
12. **Trigger re-enrichissement** — apres injection, relancer `runEnrichmentPipeline()` pour les proprietes de la ville
