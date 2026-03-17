# News Fetcher — Design technique

> Version 1.0 — 17 mars 2026
> Composant de collecte de donnees en amont de la generation d'articles par Gemini 2.5 Flash.
> Stack : Node.js 22, TypeScript, Next.js 16, SQLite/Turso.

---

## Table des matieres

1. [Vue d'ensemble](#1-vue-densemble)
2. [Sources de donnees detaillees](#2-sources-de-donnees-detaillees)
3. [Architecture du News Fetcher](#3-architecture-du-news-fetcher)
4. [Collecteur par type d'article](#4-collecteur-par-type-darticle)
5. [Selection automatique du sujet](#5-selection-automatique-du-sujet)
6. [Format de sortie](#6-format-de-sortie)
7. [Tests et fiabilite](#7-tests-et-fiabilite)

---

## 1. Vue d'ensemble

### Role dans la pipeline

Gemini 2.5 Flash ne peut pas naviguer sur le web. Le News Fetcher est le composant qui **collecte, agrege et formate** toutes les donnees necessaires avant de les passer en contexte au LLM.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  PIPELINE DE PUBLICATION — Etape 2 : COLLECTE DONNEES                     │
│                                                                            │
│  ┌──────────────┐     ┌─────────────────────┐     ┌────────────────────┐  │
│  │  Selecteur   │     │    NEWS FETCHER      │     │   Generateur       │  │
│  │  de sujet    │────>│                      │────>│   d'article        │  │
│  │ (categorie,  │     │  ┌──────────────┐   │     │   (Gemini 2.5)     │  │
│  │  ville, etc.)│     │  │ DVF Fetcher   │   │     │                    │  │
│  └──────────────┘     │  │ INSEE Fetcher │   │     │  Input :           │  │
│                       │  │ Georisques    │   │     │  - NewsContext JSON │  │
│  Input :              │  │ ADEME Fetcher │   │     │  - System prompt    │  │
│  - ArticleCategory    │  │ RSS Fetcher   │   │     │  - Template article │  │
│  - city slug / topic  │  │ Geo Fetcher   │   │     │                    │  │
│                       │  │ Locality DB   │   │     │  Output :           │  │
│                       │  │ BdF Fetcher   │   │     │  - article_html     │  │
│                       │  └──────────────┘   │     │  - extracted_data   │  │
│                       │                      │     └────────────────────┘  │
│                       │  Output :            │                             │
│                       │  NewsContext JSON     │                             │
│                       │  (~4K-15K tokens)    │                             │
│                       └─────────────────────┘                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### Ce qu'il collecte

| Categorie | Donnees | Source |
|-----------|---------|--------|
| Prix immobilier | Transactions, prix/m2, tendances | DVF Open Data |
| Socio-economie | Population, revenus, emploi, demographie | INSEE Donnees Locales |
| Risques | Naturels, SEVESO, radon, sismicite, argiles | Georisques |
| Energetique | DPE, repartition par classe | ADEME Open Data |
| Actualites | Titres, resumes, dates | Google News RSS + flux specialises |
| Geographie | Code INSEE, coordonnees, departement | geo.api.gouv.fr |
| Donnees internes | LocalityDataFields existants en DB | SQLite/Turso |
| Taux de credit | Taux moyen habitat, tendances | Banque de France Webstat |

### Format de sortie

Un objet JSON `NewsContext` type, passe dans le prompt utilisateur de Gemini. Taille cible : **4 000 a 15 000 tokens** selon le type d'article.

---

## 2. Sources de donnees detaillees

### 2.a — DVF Open Data (Demandes de Valeurs Foncieres)

**Description** : Transactions immobilieres reelles enregistrees par la DGFiP. Source la plus fiable pour les prix de vente.

**Points d'acces** :

| Methode | URL | Format | Auth |
|---------|-----|--------|------|
| Micro-API cquest | `https://api.cquest.org/dvf` | JSON | Aucune, gratuit |
| API donnees foncieres (CEREMA) | `https://apidf-preprod.cerema.fr/dvf_opendata/mutations/` | JSON | Cle API gratuite (inscription CEREMA) |
| Fichiers CSV bruts | `https://files.data.gouv.fr/geo-dvf/latest/csv/` | CSV | Aucune |
| DVF geolocalise | `https://www.data.gouv.fr/datasets/demandes-de-valeurs-foncieres-geolocalisees` | CSV/GeoJSON | Aucune |

**Rate limits** :
- Micro-API cquest : pas de limite documentee, rester raisonnable (~1 req/s)
- API CEREMA : 100 req/min (apres inscription)
- Fichiers CSV : pas de limite (telechargement unique)

**Parametres de la micro-API cquest** :

| Parametre | Description | Exemple |
|-----------|-------------|---------|
| `code_commune` | Code INSEE (5 chiffres) | `69123` (Lyon) |
| `code_postal` | Code postal | `69001` |
| `section` | Section cadastrale | `AB` |
| `nature_mutation` | Type de transaction | `Vente` |
| `type_local` | Type de bien | `Appartement`, `Maison` |

**Exemple de reponse JSON** :

```json
{
  "resultats": [
    {
      "id_mutation": "2024-1234",
      "date_mutation": "2024-06-15",
      "nature_mutation": "Vente",
      "valeur_fonciere": 185000,
      "code_postal": "69001",
      "code_commune": "69123",
      "nom_commune": "Lyon",
      "type_local": "Appartement",
      "surface_reelle_bati": 45,
      "nombre_pieces_principales": 2,
      "surface_terrain": 0,
      "longitude": 4.8357,
      "latitude": 45.7676
    }
  ],
  "nb_resultats": 1
}
```

**Mapping vers LocalityDataFields** :

| DVF | LocalityDataFields | Calcul |
|-----|-------------------|--------|
| `valeur_fonciere` / `surface_reelle_bati` | `avg_purchase_price_per_m2` | Moyenne des ventes |
| Median des prix/m2 | `median_purchase_price_per_m2` | Mediane statistique |
| Count par `code_commune` | `transaction_count` | Count simple |
| Ventes `type_local=Appartement` + `nombre_pieces=1` | `avg_price_studio_per_m2` | Moyenne filtree |
| Ventes `type_local=Appartement` + `nombre_pieces` 2-3 | `avg_price_small_apt_per_m2` | Moyenne filtree |
| Ventes `type_local=Appartement` + `nombre_pieces` >= 4 | `avg_price_large_apt_per_m2` | Moyenne filtree |
| Ventes `type_local=Maison` | `avg_price_house_per_m2` | Moyenne filtree |
| Comparaison N vs N-1 | `price_trend_1y_pct` | Variation en % |
| Comparaison N vs N-5 | `price_trend_5y_pct` | Variation en % |
| Min/max des prix/m2 (apres exclusion outliers) | `price_per_m2_min`, `price_per_m2_max` | P5/P95 |

**Code TypeScript** :

```typescript
// src/domains/blog/fetchers/dvf-fetcher.ts

interface DvfMutation {
  id_mutation: string;
  date_mutation: string;
  nature_mutation: string;
  valeur_fonciere: number;
  code_postal: string;
  code_commune: string;
  nom_commune: string;
  type_local: string;
  surface_reelle_bati: number;
  nombre_pieces_principales: number;
  longitude: number;
  latitude: number;
}

interface DvfApiResponse {
  resultats: DvfMutation[];
  nb_resultats: number;
}

interface DvfCityData {
  avgPricePerM2: number | null;
  medianPricePerM2: number | null;
  transactionCount: number;
  avgPriceStudioPerM2: number | null;
  avgPriceSmallAptPerM2: number | null;
  avgPriceLargeAptPerM2: number | null;
  avgPriceHousePerM2: number | null;
  priceTrend1yPct: number | null;
  pricePerM2Min: number | null;
  pricePerM2Max: number | null;
  lastMutationDate: string | null;
  topTransactions: DvfMutation[];
}

const DVF_API_BASE = "https://api.cquest.org/dvf";

export async function fetchDvfData(
  codeInsee: string,
  options?: { nature?: string; anneeMin?: number }
): Promise<DvfCityData> {
  const nature = options?.nature ?? "Vente";
  const url = new URL(DVF_API_BASE);
  url.searchParams.set("code_commune", codeInsee);
  url.searchParams.set("nature_mutation", nature);

  const response = await fetch(url.toString(), {
    headers: { "User-Agent": "tiili.fr/news-fetcher/1.0" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`DVF API ${response.status}: ${response.statusText}`);
  }

  const data: DvfApiResponse = await response.json();
  const mutations = data.resultats.filter(
    (m) => m.surface_reelle_bati > 0 && m.valeur_fonciere > 0
  );

  // Filtrer par annee si demande
  const anneeMin = options?.anneeMin ?? new Date().getFullYear() - 2;
  const filtered = mutations.filter(
    (m) => new Date(m.date_mutation).getFullYear() >= anneeMin
  );

  if (filtered.length === 0) {
    return {
      avgPricePerM2: null,
      medianPricePerM2: null,
      transactionCount: 0,
      avgPriceStudioPerM2: null,
      avgPriceSmallAptPerM2: null,
      avgPriceLargeAptPerM2: null,
      avgPriceHousePerM2: null,
      priceTrend1yPct: null,
      pricePerM2Min: null,
      pricePerM2Max: null,
      lastMutationDate: null,
      topTransactions: [],
    };
  }

  // Calculer prix/m2 pour chaque mutation
  const withPricePerM2 = filtered.map((m) => ({
    ...m,
    pricePerM2: m.valeur_fonciere / m.surface_reelle_bati,
  }));

  // Exclure outliers (P5-P95)
  const prices = withPricePerM2.map((m) => m.pricePerM2).sort((a, b) => a - b);
  const p5 = prices[Math.floor(prices.length * 0.05)];
  const p95 = prices[Math.floor(prices.length * 0.95)];
  const cleaned = withPricePerM2.filter(
    (m) => m.pricePerM2 >= p5 && m.pricePerM2 <= p95
  );

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
  const median = (arr: number[]) => {
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const allPrices = cleaned.map((m) => m.pricePerM2);
  const aptStudio = cleaned.filter(
    (m) => m.type_local === "Appartement" && m.nombre_pieces_principales === 1
  );
  const aptSmall = cleaned.filter(
    (m) =>
      m.type_local === "Appartement" &&
      m.nombre_pieces_principales >= 2 &&
      m.nombre_pieces_principales <= 3
  );
  const aptLarge = cleaned.filter(
    (m) => m.type_local === "Appartement" && m.nombre_pieces_principales >= 4
  );
  const houses = cleaned.filter((m) => m.type_local === "Maison");

  // Tendance 1 an : comparer les 12 derniers mois vs les 12 mois precedents
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(now.getFullYear() - 2);

  const recentPrices = cleaned
    .filter((m) => new Date(m.date_mutation) >= oneYearAgo)
    .map((m) => m.pricePerM2);
  const previousPrices = cleaned
    .filter((m) => {
      const d = new Date(m.date_mutation);
      return d >= twoYearsAgo && d < oneYearAgo;
    })
    .map((m) => m.pricePerM2);

  const avgRecent = avg(recentPrices);
  const avgPrevious = avg(previousPrices);
  const trend =
    avgRecent && avgPrevious
      ? Math.round(((avgRecent - avgPrevious) / avgPrevious) * 1000) / 10
      : null;

  return {
    avgPricePerM2: avg(allPrices) ? Math.round(avg(allPrices)!) : null,
    medianPricePerM2: median(allPrices) ? Math.round(median(allPrices)!) : null,
    transactionCount: filtered.length,
    avgPriceStudioPerM2: avg(aptStudio.map((m) => m.pricePerM2))
      ? Math.round(avg(aptStudio.map((m) => m.pricePerM2))!)
      : null,
    avgPriceSmallAptPerM2: avg(aptSmall.map((m) => m.pricePerM2))
      ? Math.round(avg(aptSmall.map((m) => m.pricePerM2))!)
      : null,
    avgPriceLargeAptPerM2: avg(aptLarge.map((m) => m.pricePerM2))
      ? Math.round(avg(aptLarge.map((m) => m.pricePerM2))!)
      : null,
    avgPriceHousePerM2: avg(houses.map((m) => m.pricePerM2))
      ? Math.round(avg(houses.map((m) => m.pricePerM2))!)
      : null,
    priceTrend1yPct: trend,
    pricePerM2Min: p5 ? Math.round(p5) : null,
    pricePerM2Max: p95 ? Math.round(p95) : null,
    lastMutationDate: filtered.sort(
      (a, b) => new Date(b.date_mutation).getTime() - new Date(a.date_mutation).getTime()
    )[0]?.date_mutation ?? null,
    topTransactions: filtered.slice(0, 5),
  };
}
```

---

### 2.b — API INSEE (Donnees Locales)

**Description** : Donnees de recensement, revenus, emploi par commune. Source officielle pour les indicateurs socio-economiques.

**Points d'acces** :

| API | URL de base | Format | Auth |
|-----|------------|--------|------|
| Donnees Locales | `https://api.insee.fr/donnees-locales/V0.1` | JSON | OAuth2 Bearer token |
| Metadonnees | `https://api.insee.fr/metadonnees/V1` | JSON | OAuth2 Bearer token |

**Authentification** :
1. Creer un compte sur `https://api.insee.fr/catalogue/`
2. Creer une application pour obtenir `consumer_key` et `consumer_secret`
3. Generer un Bearer token : `POST https://api.insee.fr/token` (Basic auth avec key:secret, `grant_type=client_credentials`)
4. Le token est valide 7 jours

**Rate limits** : 30 requetes/minute

**Structure d'appel** :

```
GET https://api.insee.fr/donnees-locales/V0.1/donnees/geo-{source}@{croisement}/{codegeo}
Authorization: Bearer {token}
Accept: application/json
```

**Sources et croisements utiles** :

| Donnee | Source | Croisement | Description |
|--------|--------|------------|-------------|
| Population | `GEO2021RP2020` | `POPLEG-POPLEG` | Population legale |
| Logements | `GEO2021RP2020` | `LOG-T1` | Logements par categorie |
| Revenus | `GEO2021FILOSOFI2020` | `REVDISP-MEDDISP` | Revenu median |
| Emploi | `GEO2021RP2020` | `ACT-T1` | Population active |
| Age | `GEO2021RP2020` | `POP-T3` | Population par age |
| Menages | `GEO2021RP2020` | `FAM-T1` | Taille des menages |

**Exemple de reponse JSON** (simplifie) :

```json
{
  "Cellule": [
    {
      "Zone": { "codgeo": "69123", "libgeo": "Lyon" },
      "Mesure": { "code": "POP_T", "libelle": "Population" },
      "Modalite": { "code": "ENS", "libelle": "Ensemble" },
      "ValeurCellule": "522250",
      "Millesime": "2020"
    }
  ]
}
```

**Mapping vers LocalityDataFields** :

| INSEE | LocalityDataFields | Croisement source |
|-------|-------------------|-------------------|
| Population totale | `population` | `POPLEG-POPLEG` |
| Variation population | `population_growth_pct` | Comparaison N / N-5 |
| Revenu median par UC | `median_income` | `REVDISP-MEDDISP` |
| Taux pauvrete | `poverty_rate` | `REVDISP-PAUVRETE` |
| Taux chomage | `unemployment_rate` | `ACT-T1` (calcul) |
| Logements vacants % | `vacant_housing_pct` | `LOG-T1` |
| Part proprietaires | `owner_occupier_pct` | `LOG-T7` |
| Nb logements | `housing_stock_count` | `LOG-T1` |
| Taille menage | `household_size_avg` | `FAM-T1` |
| Part etudiants | `student_population_pct` | `POP-T3` (15-24 ans) |
| Part seniors | `senior_population_pct` | `POP-T3` (65+) |
| Emplois total | `total_jobs` | `ACT-T4` |

**Code TypeScript** :

```typescript
// src/domains/blog/fetchers/insee-fetcher.ts

interface InseeTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface InseeCellule {
  Zone: { codgeo: string; libgeo: string };
  Mesure: { code: string; libelle: string };
  Modalite: { code: string; libelle: string };
  ValeurCellule: string;
  Millesime: string;
}

interface InseeDonneesResponse {
  Cellule: InseeCellule[];
}

interface InseeCityData {
  population: number | null;
  medianIncome: number | null;
  povertyRate: number | null;
  unemploymentRate: number | null;
  vacantHousingPct: number | null;
  ownerOccupierPct: number | null;
  housingStockCount: number | null;
  householdSizeAvg: number | null;
  studentPopulationPct: number | null;
  seniorPopulationPct: number | null;
  totalJobs: number | null;
  millesime: string | null;
}

const INSEE_API_BASE = "https://api.insee.fr/donnees-locales/V0.1";
const INSEE_TOKEN_URL = "https://api.insee.fr/token";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getInseeToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const key = process.env.INSEE_CONSUMER_KEY;
  const secret = process.env.INSEE_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("Missing INSEE_CONSUMER_KEY or INSEE_CONSUMER_SECRET");

  const credentials = Buffer.from(`${key}:${secret}`).toString("base64");
  const response = await fetch(INSEE_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error(`INSEE token error: ${response.status}`);
  const data: InseeTokenResponse = await response.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

async function fetchInseeCroisement(
  source: string,
  croisement: string,
  codeGeo: string
): Promise<InseeCellule[]> {
  const token = await getInseeToken();
  const url = `${INSEE_API_BASE}/donnees/geo-${source}@${croisement}/COM-${codeGeo}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    if (response.status === 404) return []; // Pas de donnees pour cette commune
    throw new Error(`INSEE API ${response.status}: ${url}`);
  }

  const data: InseeDonneesResponse = await response.json();
  return data.Cellule ?? [];
}

function extractValue(cells: InseeCellule[], mesureCode: string, modaliteCode?: string): number | null {
  const cell = cells.find(
    (c) =>
      c.Mesure.code === mesureCode &&
      (!modaliteCode || c.Modalite.code === modaliteCode)
  );
  if (!cell) return null;
  const v = parseFloat(cell.ValeurCellule);
  return isNaN(v) ? null : v;
}

export async function fetchInseeData(codeInsee: string): Promise<InseeCityData> {
  // Lancer les requetes en parallele (respecte les 30 req/min)
  const [popCells, logCells, revCells, actCells, ageCells] = await Promise.allSettled([
    fetchInseeCroisement("GEO2021RP2020", "POPLEG-POPLEG", codeInsee),
    fetchInseeCroisement("GEO2021RP2020", "LOG-T1", codeInsee),
    fetchInseeCroisement("GEO2021FILOSOFI2020", "REVDISP-MEDDISP", codeInsee),
    fetchInseeCroisement("GEO2021RP2020", "ACT-T1", codeInsee),
    fetchInseeCroisement("GEO2021RP2020", "POP-T3", codeInsee),
  ]);

  const safeValue = <T>(result: PromiseSettledResult<T>): T | null =>
    result.status === "fulfilled" ? result.value : null;

  const pop = safeValue(popCells) ?? [];
  const log = safeValue(logCells) ?? [];
  const rev = safeValue(revCells) ?? [];
  const act = safeValue(actCells) ?? [];
  const age = safeValue(ageCells) ?? [];

  // Population totale
  const population = extractValue(pop, "POP_T", "ENS");

  // Logements
  const totalLogements = extractValue(log, "LOG_T1", "ENS");
  const logVacants = extractValue(log, "LOG_T1", "3"); // Modalite 3 = logements vacants
  const logProp = extractValue(log, "LOG_T7", "10"); // Proprietaires

  // Revenus
  const medianIncome = extractValue(rev, "MED", "ENS");
  const povertyRate = extractValue(rev, "TP60", "ENS");

  // Emploi
  const actifs = extractValue(act, "ACT_T1", "11"); // Actifs occupes
  const chomeurs = extractValue(act, "ACT_T1", "12"); // Chomeurs
  const totalJobs = extractValue(act, "ACT_T4", "ENS");

  const unemploymentRate =
    actifs != null && chomeurs != null && (actifs + chomeurs) > 0
      ? Math.round((chomeurs / (actifs + chomeurs)) * 1000) / 10
      : null;

  // Millesime (annee de reference des donnees)
  const millesime = pop[0]?.Millesime ?? null;

  return {
    population,
    medianIncome,
    povertyRate,
    unemploymentRate,
    vacantHousingPct:
      totalLogements && logVacants
        ? Math.round((logVacants / totalLogements) * 1000) / 10
        : null,
    ownerOccupierPct:
      totalLogements && logProp
        ? Math.round((logProp / totalLogements) * 1000) / 10
        : null,
    housingStockCount: totalLogements,
    householdSizeAvg: null, // Necessite le croisement FAM-T1
    studentPopulationPct: null, // Calcul a partir de POP-T3 (tranche 15-24)
    seniorPopulationPct: null, // Calcul a partir de POP-T3 (tranche 65+)
    totalJobs,
    millesime,
  };
}
```

**Variables d'environnement requises** :
```env
INSEE_CONSUMER_KEY=votre_consumer_key
INSEE_CONSUMER_SECRET=votre_consumer_secret
```

---

### 2.c — API Georisques

**Description** : Risques naturels et technologiques par commune. Donnees officielles du BRGM/MTES.

**Points d'acces** :

| Endpoint | URL | Description |
|----------|-----|-------------|
| Risques GASPAR | `https://georisques.gouv.fr/api/v1/gaspar/risques` | Risques identifies par commune |
| Catastrophes naturelles | `https://georisques.gouv.fr/api/v1/gaspar/catnat` | Arretes CatNat |
| ICPE (SEVESO) | `https://georisques.gouv.fr/api/v1/installations_classees` | Installations classees |
| Radon | `https://georisques.gouv.fr/api/v1/radon` | Potentiel radon par commune |
| Zonage sismique | `https://georisques.gouv.fr/api/v1/zonage_sismique` | Zone sismique |
| Retrait-gonflement argiles | `https://georisques.gouv.fr/api/v1/mvt` | Mouvements de terrain |
| PPR (Plans de prevention) | `https://georisques.gouv.fr/api/v1/gaspar/ppr` | Plans de prevention des risques |

**Authentification** :
- API v1 : **aucun token requis**, acces libre
- API v2 : token Cerbere optionnel (pour des quotas superieurs)

**Rate limits** : non documente explicitement ; rester sous 60 req/min

**Parametres communs** :

| Parametre | Description | Exemple |
|-----------|-------------|---------|
| `code_insee` | Code INSEE commune | `69123` |
| `rayon` | Rayon en metres (pour recherche par coordonnees) | `1000` |
| `latitude` / `longitude` | Coordonnees GPS | `45.7676` / `4.8357` |
| `page` / `page_size` | Pagination | `1` / `10` |

**Exemples de reponse JSON** :

Risques GASPAR :
```json
{
  "data": [
    {
      "code_national_risque": "14",
      "libelle_risque_long": "Inondation - Par une crue a debordement lent de cours d'eau",
      "num_risque": "14",
      "code_insee": "69123"
    },
    {
      "code_national_risque": "18",
      "libelle_risque_long": "Seisme",
      "num_risque": "18",
      "code_insee": "69123"
    }
  ],
  "next": null,
  "count": 2
}
```

Radon :
```json
{
  "data": [
    {
      "code_insee": "69123",
      "classe_potentiel": 1,
      "libelle_classe": "Potentiel radon de categorie 1 (faible)"
    }
  ]
}
```

**Mapping vers LocalityDataFields** :

| Georisques | LocalityDataFields | Logique |
|-----------|-------------------|---------|
| Liste risques GASPAR | `natural_risks` | Array `{ type, level }` |
| Synthese severite | `risk_level` | `"faible"` / `"moyen"` / `"eleve"` |
| Risque inondation (codes 13-16) | `flood_risk_level` | Presence + PPR = `"eleve"` |
| Zone sismique | `seismic_zone` | Valeur 1-5 directe |
| ICPE SEVESO | `industrial_risk` | `true` si au moins 1 site Seveso seuil haut |
| Classe radon | `radon_level` | Valeur 1-3 directe |
| Argiles (mvt terrain) | `clay_shrinkage_risk` | `"faible"` / `"moyen"` / `"fort"` |

**Code TypeScript** :

```typescript
// src/domains/blog/fetchers/georisques-fetcher.ts

interface GeorisquesRisque {
  code_national_risque: string;
  libelle_risque_long: string;
  num_risque: string;
  code_insee: string;
}

interface GeorisquesRadon {
  code_insee: string;
  classe_potentiel: number;
  libelle_classe: string;
}

interface GeorisquesSismique {
  code_zone: number;
  libelle_zone: string;
}

interface GeorisquesIcpe {
  nom_ets: string;
  code_insee: string;
  regime: string; // "Seveso seuil haut", "Seveso seuil bas", etc.
  statut_seveso: string;
}

interface GeorisquesCityData {
  naturalRisks: Array<{ type: string; level: string }>;
  riskLevel: "faible" | "moyen" | "eleve";
  floodRiskLevel: "nul" | "faible" | "moyen" | "eleve" | null;
  seismicZone: number | null;
  industrialRisk: boolean;
  radonLevel: number | null;
  clayShrinkageRisk: "faible" | "moyen" | "fort" | null;
  catnatCount: number;
}

const GEORISQUES_BASE = "https://georisques.gouv.fr/api/v1";

async function fetchGeorisquesEndpoint<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`${GEORISQUES_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const response = await fetch(url.toString(), {
    headers: { "User-Agent": "tiili.fr/news-fetcher/1.0" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Georisques ${response.status}: ${path}`);
  }

  const json = await response.json();
  return json.data ?? json.results ?? json ?? [];
}

// Codes GASPAR pour risques d'inondation
const FLOOD_RISK_CODES = new Set(["13", "14", "15", "16"]);

function computeRiskLevel(risks: GeorisquesRisque[], catnatCount: number): "faible" | "moyen" | "eleve" {
  if (risks.length >= 5 || catnatCount > 10) return "eleve";
  if (risks.length >= 2 || catnatCount > 3) return "moyen";
  return "faible";
}

export async function fetchGeorisquesData(codeInsee: string): Promise<GeorisquesCityData> {
  const [risques, radon, sismique, icpe, catnat] = await Promise.allSettled([
    fetchGeorisquesEndpoint<GeorisquesRisque>("/gaspar/risques", { code_insee: codeInsee }),
    fetchGeorisquesEndpoint<GeorisquesRadon>("/radon", { code_insee: codeInsee }),
    fetchGeorisquesEndpoint<GeorisquesSismique>("/zonage_sismique", { code_insee: codeInsee }),
    fetchGeorisquesEndpoint<GeorisquesIcpe>("/installations_classees", {
      code_insee: codeInsee,
      page_size: "50",
    }),
    fetchGeorisquesEndpoint<{ code_insee: string }>("/gaspar/catnat", { code_insee: codeInsee }),
  ]);

  const safeValue = <T>(r: PromiseSettledResult<T[]>): T[] =>
    r.status === "fulfilled" ? r.value : [];

  const risquesData = safeValue(risques);
  const radonData = safeValue(radon);
  const sismiqueData = safeValue(sismique);
  const icpeData = safeValue(icpe);
  const catnatData = safeValue(catnat);

  // Construire natural_risks
  const naturalRisks = risquesData.map((r) => ({
    type: r.libelle_risque_long,
    level: FLOOD_RISK_CODES.has(r.code_national_risque) ? "moyen" : "identifie",
  }));

  // Risque inondation
  const hasFloodRisk = risquesData.some((r) => FLOOD_RISK_CODES.has(r.code_national_risque));
  const floodRiskLevel = hasFloodRisk ? "moyen" : "nul";

  // SEVESO
  const sevesoSites = icpeData.filter(
    (i) => i.statut_seveso?.toLowerCase().includes("seuil haut") ||
           i.regime?.toLowerCase().includes("seveso")
  );

  return {
    naturalRisks,
    riskLevel: computeRiskLevel(risquesData, catnatData.length),
    floodRiskLevel: hasFloodRisk ? floodRiskLevel : null,
    seismicZone: (sismiqueData[0] as GeorisquesSismique)?.code_zone ?? null,
    industrialRisk: sevesoSites.length > 0,
    radonLevel: (radonData[0] as GeorisquesRadon)?.classe_potentiel ?? null,
    clayShrinkageRisk: null, // Necessite endpoint retrait-gonflement specifique
    catnatCount: catnatData.length,
  };
}
```

---

### 2.d — API ADEME (DPE Open Data)

**Description** : Diagnostics de performance energetique pour les logements existants. Permet de calculer la repartition DPE et la note moyenne par commune.

**Points d'acces** :

| Endpoint | URL | Format | Auth |
|----------|-----|--------|------|
| DPE existants (post-2021) | `https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines` | JSON | Aucune |
| DPE existants (pre-2021) | `https://data.ademe.fr/data-fair/api/v1/datasets/dpe-france/lines` | JSON | Aucune |
| Documentation OpenAPI | `https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/api-docs.json` | JSON | Aucune |

**Rate limits** : non documente, rester raisonnable (~30 req/min)

**Parametres de requete** :

| Parametre | Description | Exemple |
|-----------|-------------|---------|
| `qs` | Recherche textuelle | `Lyon` |
| `q_fields` | Champs de recherche | `Code_INSEE_(BAN)` |
| `q` | Filtre exact | `69123` |
| `size` | Nombre de resultats | `100` (max 10 000) |
| `select` | Champs a retourner | `Etiquette_DPE,Surface_habitable_logement` |
| `sort` | Tri | `Date_etablissement_DPE:-1` |

**Exemple de requete** :
```
GET https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines
  ?q=69123
  &q_fields=Code_INSEE_(BAN)
  &select=Etiquette_DPE,Etiquette_GES,Surface_habitable_logement,Date_etablissement_DPE
  &size=1000
  &sort=Date_etablissement_DPE:-1
```

**Exemple de reponse JSON** :

```json
{
  "total": 28456,
  "results": [
    {
      "Etiquette_DPE": "D",
      "Etiquette_GES": "C",
      "Surface_habitable_logement": 67.5,
      "Date_etablissement_DPE": "2024-03-15",
      "Code_INSEE_(BAN)": "69123"
    }
  ]
}
```

**Mapping vers LocalityDataFields** :

| ADEME | LocalityDataFields | Calcul |
|-------|-------------------|--------|
| Distribution `Etiquette_DPE` | `avg_dpe_rating` | Lettre avec le plus grand effectif ou mediane |
| Comptage par lettre A-G | `dpe_distribution` | `{ A: 5, B: 12, C: 25, D: 30, E: 18, F: 7, G: 3 }` en % |

**Code TypeScript** :

```typescript
// src/domains/blog/fetchers/ademe-fetcher.ts

interface AdemeDpeResult {
  Etiquette_DPE: string;
  Etiquette_GES: string;
  Surface_habitable_logement: number;
  Date_etablissement_DPE: string;
  "Code_INSEE_(BAN)": string;
}

interface AdemeResponse {
  total: number;
  results: AdemeDpeResult[];
}

interface AdemeCityData {
  avgDpeRating: string | null;        // "D"
  dpeDistribution: Record<string, number> | null;  // { A: 5.2, B: 12.1, ... }
  totalDpeCount: number;
  gesDistribution: Record<string, number> | null;
}

const ADEME_API_BASE = "https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines";
const DPE_LETTERS = ["A", "B", "C", "D", "E", "F", "G"];

export async function fetchAdemeData(codeInsee: string): Promise<AdemeCityData> {
  // Recuperer un echantillon large pour calculer la distribution
  const url = new URL(ADEME_API_BASE);
  url.searchParams.set("q", codeInsee);
  url.searchParams.set("q_fields", "Code_INSEE_(BAN)");
  url.searchParams.set("select", "Etiquette_DPE,Etiquette_GES");
  url.searchParams.set("size", "10000");
  url.searchParams.set("sort", "Date_etablissement_DPE:-1");

  const response = await fetch(url.toString(), {
    headers: { "User-Agent": "tiili.fr/news-fetcher/1.0" },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`ADEME API ${response.status}: ${response.statusText}`);
  }

  const data: AdemeResponse = await response.json();

  if (!data.results || data.results.length === 0) {
    return { avgDpeRating: null, dpeDistribution: null, totalDpeCount: 0, gesDistribution: null };
  }

  // Calculer la distribution DPE
  const dpeCounts: Record<string, number> = {};
  const gesCounts: Record<string, number> = {};
  for (const letter of DPE_LETTERS) {
    dpeCounts[letter] = 0;
    gesCounts[letter] = 0;
  }

  for (const result of data.results) {
    const dpe = result.Etiquette_DPE?.toUpperCase();
    const ges = result.Etiquette_GES?.toUpperCase();
    if (dpe && DPE_LETTERS.includes(dpe)) dpeCounts[dpe]++;
    if (ges && DPE_LETTERS.includes(ges)) gesCounts[ges]++;
  }

  const total = data.results.length;
  const dpeDistribution: Record<string, number> = {};
  const gesDistribution: Record<string, number> = {};
  for (const letter of DPE_LETTERS) {
    dpeDistribution[letter] = Math.round((dpeCounts[letter] / total) * 1000) / 10;
    gesDistribution[letter] = Math.round((gesCounts[letter] / total) * 1000) / 10;
  }

  // DPE moyen = lettre avec le plus d'effectif (mode)
  const avgDpeRating = Object.entries(dpeCounts).sort((a, b) => b[1] - a[1])[0][0];

  return {
    avgDpeRating,
    dpeDistribution,
    totalDpeCount: data.total,
    gesDistribution,
  };
}
```

---

### 2.e — Google News RSS

**Description** : Flux RSS des actualites Google News France, filtrable par requete. Permet de recuperer les titres et liens des actualites immobilieres recentes.

**URL de base** :
```
https://news.google.com/rss/search?q={query}&hl=fr&gl=FR&ceid=FR:fr
```

**Format** : XML RSS 2.0

**Authentification** : aucune, acces libre

**Rate limits** : non documente, rester sous 10 req/min

**Parametres** :

| Parametre | Description | Exemple |
|-----------|-------------|---------|
| `q` | Requete de recherche (URL-encoded) | `investissement+immobilier+Lyon` |
| `hl` | Langue | `fr` |
| `gl` | Pays | `FR` |
| `ceid` | Code edition | `FR:fr` |

**Exemples de requetes utiles** :

| Usage | Query |
|-------|-------|
| Actu immobilier ville | `immobilier+{ville}+{annee}` |
| Marche immobilier | `marche+immobilier+prix+France` |
| Taux credit | `taux+credit+immobilier+{annee}` |
| Fiscalite | `fiscalite+immobilier+LMNP+Pinel+{annee}` |
| Investissement | `investissement+locatif+{ville}` |

**Exemple de reponse XML** :

```xml
<rss version="2.0">
  <channel>
    <title>immobilier Lyon - Google Actualites</title>
    <item>
      <title>Les prix immobiliers a Lyon en hausse de 3% au T1 2026</title>
      <link>https://news.google.com/rss/articles/...</link>
      <pubDate>Mon, 15 Mar 2026 08:30:00 GMT</pubDate>
      <description>Les prix immobiliers a Lyon poursuivent...</description>
      <source url="https://www.capital.fr">Capital</source>
    </item>
  </channel>
</rss>
```

**Code TypeScript** :

```typescript
// src/domains/blog/fetchers/rss-fetcher.ts

interface RssArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  sourceUrl: string;
}

interface RssFetchResult {
  articles: RssArticle[];
  fetchedAt: string;
  query: string;
}

const GOOGLE_NEWS_RSS_BASE = "https://news.google.com/rss/search";

/**
 * Parse XML RSS simplifie sans dependance lourde.
 * Pour la prod, utiliser un parser XML complet (fast-xml-parser ou xml2js).
 */
function parseRssXml(xml: string): RssArticle[] {
  const articles: RssArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const extract = (tag: string): string => {
      const tagMatch = itemXml.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "s"));
      return tagMatch ? tagMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/s, "$1").trim() : "";
    };

    const sourceMatch = itemXml.match(/<source\s+url="([^"]*)">(.*?)<\/source>/);

    articles.push({
      title: extract("title"),
      link: extract("link"),
      pubDate: extract("pubDate"),
      description: extract("description"),
      source: sourceMatch?.[2] ?? "",
      sourceUrl: sourceMatch?.[1] ?? "",
    });
  }

  return articles;
}

export async function fetchGoogleNewsRss(
  query: string,
  maxResults: number = 10
): Promise<RssFetchResult> {
  const url = new URL(GOOGLE_NEWS_RSS_BASE);
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "fr");
  url.searchParams.set("gl", "FR");
  url.searchParams.set("ceid", "FR:fr");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "tiili.fr/news-fetcher/1.0",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Google News RSS ${response.status}`);
  }

  const xml = await response.text();
  const allArticles = parseRssXml(xml);

  // Filtrer les articles trop vieux (> 30 jours)
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = allArticles.filter(
    (a) => a.pubDate && new Date(a.pubDate).getTime() > thirtyDaysAgo
  );

  return {
    articles: recent.slice(0, maxResults),
    fetchedAt: new Date().toISOString(),
    query,
  };
}

/**
 * Collecter les actualites pour un contexte d'article donne.
 * Lance plusieurs requetes RSS en parallele.
 */
export async function fetchNewsForCity(
  cityName: string,
  options?: { includeNational?: boolean; maxPerQuery?: number }
): Promise<RssArticle[]> {
  const year = new Date().getFullYear();
  const maxPer = options?.maxPerQuery ?? 5;

  const queries = [
    `immobilier+${cityName}+${year}`,
    `investissement+locatif+${cityName}`,
    `prix+immobilier+${cityName}`,
  ];

  if (options?.includeNational) {
    queries.push(`marche+immobilier+France+${year}`);
    queries.push(`taux+credit+immobilier+${year}`);
  }

  const results = await Promise.allSettled(
    queries.map((q) => fetchGoogleNewsRss(q, maxPer))
  );

  // Fusionner et dedupliquer par titre
  const seen = new Set<string>();
  const merged: RssArticle[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const article of result.value.articles) {
        if (!seen.has(article.title)) {
          seen.add(article.title);
          merged.push(article);
        }
      }
    }
  }

  // Trier par date decroissante
  return merged.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );
}
```

---

### 2.f — Flux RSS immobilier specialises

**Description** : Flux RSS des principaux medias immobiliers francais pour veille sectorielle et detection d'actualites.

**URLs des flux** :

| Source | URL RSS | Statut | Fiabilite |
|--------|---------|--------|-----------|
| Capital Immobilier | `https://www.capital.fr/immobilier/feed` | Actif | Haute |
| Les Echos Patrimoine Immo | `https://www.lesechos.fr/patrimoine/immobilier/rss.xml` | Actif | Haute |
| Le Figaro Immobilier | `https://immobilier.lefigaro.fr/rss/articles.xml` | Actif | Haute |
| PAP Actualites | `https://www.pap.fr/rss/actu.xml` | A verifier | Moyenne |
| Le Monde Immobilier | `https://www.lemonde.fr/immobilier/rss_full.xml` | Actif | Haute |
| BFM Immo | `https://www.bfmtv.com/immobilier.rss` | Actif | Moyenne |
| MySweetImmo | `https://www.mysweetimmo.com/feed/` | Actif | Moyenne |
| Immobilier 2.0 (pro) | `https://immo2.pro/feed/` | Actif | Haute |

**Note importante** : Les flux RSS des portails d'annonces (SeLoger, Leboncoin) ne fournissent generalement **pas de RSS public** pour les actualites. On utilise Google News RSS comme fallback pour capter leurs contenus editoriaux.

**Format** : XML RSS 2.0 ou Atom standard

**Authentification** : aucune

**Detection de mots-cles pour actualites urgentes** :

```typescript
// Mots-cles a scorer dans les titres RSS
const URGENT_KEYWORDS: Record<string, number> = {
  // Taux et credit
  "taux directeur": 0.9,
  "BCE": 0.9,
  "taux de credit": 0.8,
  "taux immobilier": 0.8,
  "baisse des taux": 0.85,
  "hausse des taux": 0.85,

  // Legislation
  "loi de finances": 0.9,
  "reforme": 0.8,
  "Pinel": 0.7,
  "LMNP": 0.7,
  "dispositif": 0.6,

  // Marche
  "prix immobilier": 0.6,
  "baisse des prix": 0.75,
  "hausse des prix": 0.75,
  "transactions": 0.5,
  "DVF": 0.7,
  "notaires de France": 0.7,

  // Crise / evenement
  "bulle immobiliere": 0.85,
  "krach": 0.9,
  "record": 0.7,
  "historique": 0.6,
};
```

**Code TypeScript** :

```typescript
// src/domains/blog/fetchers/immo-rss-fetcher.ts

const IMMO_RSS_FEEDS = [
  { name: "Capital", url: "https://www.capital.fr/immobilier/feed", priority: 1 },
  { name: "Les Echos", url: "https://www.lesechos.fr/patrimoine/immobilier/rss.xml", priority: 1 },
  { name: "Le Figaro Immo", url: "https://immobilier.lefigaro.fr/rss/articles.xml", priority: 1 },
  { name: "Le Monde Immo", url: "https://www.lemonde.fr/immobilier/rss_full.xml", priority: 2 },
  { name: "BFM Immo", url: "https://www.bfmtv.com/immobilier.rss", priority: 2 },
  { name: "MySweetImmo", url: "https://www.mysweetimmo.com/feed/", priority: 3 },
] as const;

interface ImmmoRssResult {
  articles: RssArticle[];
  urgentSignals: Array<{ title: string; score: number; source: string; keywords: string[] }>;
}

export async function fetchImmoRssFeeds(maxPerFeed: number = 5): Promise<ImmmoRssResult> {
  const results = await Promise.allSettled(
    IMMO_RSS_FEEDS.map(async (feed) => {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "tiili.fr/news-fetcher/1.0" },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) throw new Error(`${feed.name} RSS ${res.status}`);
      const xml = await res.text();
      return { name: feed.name, articles: parseRssXml(xml).slice(0, maxPerFeed) };
    })
  );

  const articles: RssArticle[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      articles.push(...result.value.articles);
    }
  }

  // Detecter les signaux urgents
  const urgentSignals: ImmmoRssResult["urgentSignals"] = [];
  for (const article of articles) {
    const titleLower = article.title.toLowerCase();
    const matched: string[] = [];
    let maxScore = 0;

    for (const [keyword, score] of Object.entries(URGENT_KEYWORDS)) {
      if (titleLower.includes(keyword.toLowerCase())) {
        matched.push(keyword);
        maxScore = Math.max(maxScore, score);
      }
    }

    if (matched.length > 0 && maxScore >= 0.7) {
      urgentSignals.push({
        title: article.title,
        score: maxScore,
        source: article.source,
        keywords: matched,
      });
    }
  }

  return {
    articles: articles.sort(
      (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    ),
    urgentSignals: urgentSignals.sort((a, b) => b.score - a.score),
  };
}
```

---

### 2.g — API geo.api.gouv.fr

**Description** : Referentiel geographique officiel francais. Indispensable pour resoudre codes INSEE, coordonnees, et hierarchie administrative.

**URL de base** : `https://geo.api.gouv.fr`

**Authentification** : aucune, acces libre

**Rate limits** : non documente, acces genereux

**Endpoints utiles** :

| Endpoint | URL | Description |
|----------|-----|-------------|
| Par code INSEE | `GET /communes/{code}` | Commune par code INSEE |
| Par code postal | `GET /communes?codePostal={cp}` | Commune(s) par CP |
| Par nom | `GET /communes?nom={nom}&boost=population&limit=5` | Recherche par nom |
| Par coordonnees | `GET /communes?lat={lat}&lon={lon}` | Commune la plus proche |
| Departement | `GET /departements/{code}` | Departement par code |
| Communes du dept | `GET /departements/{code}/communes` | Toutes les communes |

**Parametres communs** :

| Parametre | Description | Exemple |
|-----------|-------------|---------|
| `fields` | Champs a inclure | `nom,code,codesPostaux,population,centre,departement,region` |
| `format` | Format de sortie | `json` (defaut) ou `geojson` |
| `boost` | Booster le tri | `population` (les plus peuplees en premier) |
| `limit` | Nombre max de resultats | `5` |

**Exemple de reponse JSON** :

```json
{
  "nom": "Lyon",
  "code": "69123",
  "codesPostaux": ["69001", "69002", "69003", "69004", "69005", "69006", "69007", "69008", "69009"],
  "population": 522250,
  "departement": {
    "code": "69",
    "nom": "Rhone"
  },
  "region": {
    "code": "84",
    "nom": "Auvergne-Rhone-Alpes"
  },
  "centre": {
    "type": "Point",
    "coordinates": [4.8357, 45.7676]
  }
}
```

**Code TypeScript** :

```typescript
// src/domains/blog/fetchers/geo-fetcher.ts

interface GeoCommune {
  nom: string;
  code: string;
  codesPostaux: string[];
  population: number;
  departement: { code: string; nom: string };
  region: { code: string; nom: string };
  centre: { type: string; coordinates: [number, number] };
}

const GEO_API_BASE = "https://geo.api.gouv.fr";
const GEO_FIELDS = "nom,code,codesPostaux,population,departement,region,centre";

/**
 * Resoudre une commune par son code INSEE.
 * Point d'entree principal pour le News Fetcher.
 */
export async function fetchCommuneByCode(codeInsee: string): Promise<GeoCommune | null> {
  const url = `${GEO_API_BASE}/communes/${codeInsee}?fields=${GEO_FIELDS}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) return null;
  return response.json();
}

/**
 * Rechercher une commune par nom.
 */
export async function searchCommuneByName(nom: string, limit: number = 5): Promise<GeoCommune[]> {
  const url = new URL(`${GEO_API_BASE}/communes`);
  url.searchParams.set("nom", nom);
  url.searchParams.set("fields", GEO_FIELDS);
  url.searchParams.set("boost", "population");
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) return [];
  return response.json();
}

/**
 * Rechercher une commune par code postal.
 */
export async function searchCommuneByPostalCode(codePostal: string): Promise<GeoCommune[]> {
  const url = new URL(`${GEO_API_BASE}/communes`);
  url.searchParams.set("codePostal", codePostal);
  url.searchParams.set("fields", GEO_FIELDS);

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) return [];
  return response.json();
}
```

---

### 2.h — Donnees localites internes (SQLite/Turso)

**Description** : La base `locality_data` existante contient deja des `LocalityDataFields` pour de nombreuses communes, avec un systeme de resolution hierarchique (commune -> departement -> region -> pays). C'est la source la plus riche et la plus rapide.

**Acces** : direct via les fonctions du repository existant (`src/domains/locality/repository.ts`).

**Donnees disponibles** : tous les champs de `LocalityDataFields` (cf. `src/domains/locality/types.ts`), soit jusqu'a 103 champs par localite.

**Code TypeScript** :

```typescript
// src/domains/blog/fetchers/locality-db-fetcher.ts

import { resolveLocalityData } from "@/domains/locality/resolver";
import { findLocalityByCity, getLocalityChildren } from "@/domains/locality/repository";
import { LocalityDataFields, ResolvedLocalityData } from "@/domains/locality/types";

interface LocalityDbResult {
  resolved: ResolvedLocalityData | null;
  children: Array<{
    name: string;
    code: string;
    type: string;
    fields: LocalityDataFields | null;
  }>;
  dataCompleteness: {
    total: number;
    filled: number;
    pct: number;
    missingP0: string[];
  };
}

// Champs P0 critiques — leur absence degrade la qualite de l'article
const P0_FIELDS: (keyof LocalityDataFields)[] = [
  "avg_purchase_price_per_m2",
  "median_purchase_price_per_m2",
  "transaction_count",
  "avg_rent_per_m2",
  "vacancy_rate",
  "population",
  "median_income",
  "unemployment_rate",
  "risk_level",
  "natural_risks",
];

export async function fetchLocalityDbData(
  cityName: string,
  postalCode?: string,
  codeInsee?: string
): Promise<LocalityDbResult> {
  // 1. Resoudre les donnees avec fallback hierarchique
  const resolved = await resolveLocalityData(cityName, postalCode, codeInsee);

  // 2. Recuperer les sous-localites (quartiers) si c'est une ville
  let children: LocalityDbResult["children"] = [];
  if (resolved?.locality) {
    const childLocalities = await getLocalityChildren(resolved.locality.id);
    children = await Promise.all(
      childLocalities.map(async (child) => {
        const childResolved = await resolveLocalityData(child.name, undefined, child.code);
        return {
          name: child.name,
          code: child.code,
          type: child.type,
          fields: childResolved?.fields ?? null,
        };
      })
    );
  }

  // 3. Calculer la completude des donnees
  const fields = resolved?.fields ?? {};
  const allKeys = Object.keys(fields) as (keyof LocalityDataFields)[];
  const filled = allKeys.filter((k) => fields[k] !== undefined && fields[k] !== null);
  const missingP0 = P0_FIELDS.filter(
    (k) => fields[k] === undefined || fields[k] === null
  );

  return {
    resolved,
    children,
    dataCompleteness: {
      total: P0_FIELDS.length,
      filled: P0_FIELDS.length - missingP0.length,
      pct: Math.round(((P0_FIELDS.length - missingP0.length) / P0_FIELDS.length) * 100),
      missingP0,
    },
  };
}
```

---

### 2.i — Banque de France (Webstat API)

**Description** : Taux de credit immobilier et indicateurs financiers. Donne les taux moyens des prets a l'habitat pour les articles financement.

**Points d'acces** :

| API | URL de base | Format | Auth |
|-----|------------|--------|------|
| Webstat API v2 | `https://webstat.banque-france.fr/api/explore/v2.1` | JSON | Cle API gratuite |
| Webstat API v1 (legacy) | `https://webstat.banque-france.fr/api/v1` | JSON/SDMX | Cle API gratuite |

**Authentification** :
1. Creer un compte sur `https://webstat.banque-france.fr`
2. Obtenir une cle API dans l'espace personnel
3. Passer la cle en parametre `apikey=` ou header `Authorization: Apikey {key}`

**Series utiles** :

| Serie | Identifiant | Description |
|-------|-------------|-------------|
| Taux credit habitat (tous) | `MIR1.M.FR.B.A22.A.R.A.2254U6.EUR.N` | Taux moyen prets habitat, toutes durees |
| Taux credit habitat 15-25 ans | `MIR1.M.FR.B.A22.F.R.A.2254U6.EUR.N` | Taux moyen prets > 10 ans |
| Production credit habitat | `MIR1.M.FR.B.A22.A.V.A.2254U6.EUR.N` | Volume mensuel prets habitat |
| Taux usure | — | Taux d'usure (publie au JO, pas dans Webstat) |

**Exemple de requete API v2** :

```
GET https://webstat.banque-france.fr/api/explore/v2.1/catalog/datasets/mir1/records
  ?where=series_key='MIR1.M.FR.B.A22.A.R.A.2254U6.EUR.N'
  &order_by=time_period DESC
  &limit=12
  &apikey={BDF_API_KEY}
```

**Exemple de reponse JSON** (v2) :

```json
{
  "total_count": 240,
  "results": [
    {
      "series_key": "MIR1.M.FR.B.A22.A.R.A.2254U6.EUR.N",
      "time_period": "2026-01",
      "obs_value": 3.15,
      "obs_status": "A",
      "title_fr": "Credits nouveaux a l'habitat des particuliers, taux d'interet annuel"
    }
  ]
}
```

**Mapping vers le contexte article** :

| BdF | Usage dans NewsContext | Champ |
|-----|----------------------|-------|
| `obs_value` dernier mois | Taux actuel | `currentRate` |
| Delta M-3 | Tendance trimestrielle | `rateTrend3m` |
| Delta M-12 | Tendance annuelle | `rateTrend12m` |
| Historique 12 mois | Graphique textuel | `rateHistory` |

**Code TypeScript** :

```typescript
// src/domains/blog/fetchers/bdf-fetcher.ts

interface BdfRecord {
  series_key: string;
  time_period: string;  // "2026-01"
  obs_value: number;
  obs_status: string;
  title_fr: string;
}

interface BdfResponse {
  total_count: number;
  results: BdfRecord[];
}

interface BdfRateData {
  currentRate: number | null;
  currentPeriod: string | null;
  rateTrend3m: number | null;    // Variation en points sur 3 mois
  rateTrend12m: number | null;   // Variation en points sur 12 mois
  rateHistory: Array<{ period: string; rate: number }>;  // 12 derniers mois
  productionVolume: number | null;  // Volume mensuel prets habitat (millions EUR)
}

const BDF_API_BASE = "https://webstat.banque-france.fr/api/explore/v2.1/catalog/datasets";
const SERIES_TAUX_HABITAT = "MIR1.M.FR.B.A22.A.R.A.2254U6.EUR.N";

export async function fetchBdfRateData(): Promise<BdfRateData> {
  const apiKey = process.env.BDF_API_KEY;
  if (!apiKey) {
    console.warn("BDF_API_KEY manquante, skip Banque de France");
    return {
      currentRate: null, currentPeriod: null,
      rateTrend3m: null, rateTrend12m: null,
      rateHistory: [], productionVolume: null,
    };
  }

  const url = new URL(`${BDF_API_BASE}/mir1/records`);
  url.searchParams.set("where", `series_key='${SERIES_TAUX_HABITAT}'`);
  url.searchParams.set("order_by", "time_period DESC");
  url.searchParams.set("limit", "13"); // 12 mois + 1 pour le calcul de tendance
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString(), {
    headers: { "User-Agent": "tiili.fr/news-fetcher/1.0" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`BdF API ${response.status}: ${response.statusText}`);
  }

  const data: BdfResponse = await response.json();
  const records = data.results
    .filter((r) => r.obs_value != null && r.obs_status !== "L")
    .sort((a, b) => b.time_period.localeCompare(a.time_period));

  if (records.length === 0) {
    return {
      currentRate: null, currentPeriod: null,
      rateTrend3m: null, rateTrend12m: null,
      rateHistory: [], productionVolume: null,
    };
  }

  const current = records[0];
  const threeMonthsAgo = records[3]; // Index 3 = M-3
  const twelveMonthsAgo = records[12]; // Index 12 = M-12

  return {
    currentRate: current.obs_value,
    currentPeriod: current.time_period,
    rateTrend3m: threeMonthsAgo
      ? Math.round((current.obs_value - threeMonthsAgo.obs_value) * 100) / 100
      : null,
    rateTrend12m: twelveMonthsAgo
      ? Math.round((current.obs_value - twelveMonthsAgo.obs_value) * 100) / 100
      : null,
    rateHistory: records.slice(0, 12).reverse().map((r) => ({
      period: r.time_period,
      rate: r.obs_value,
    })),
    productionVolume: null, // Necessite une 2e requete avec une serie differente
  };
}
```

**Variables d'environnement requises** :
```env
BDF_API_KEY=votre_cle_api_webstat
```

---

## 3. Architecture du News Fetcher

### 3.1 — Interface TypeScript complete : NewsContext

```typescript
// src/domains/blog/fetchers/types.ts

import { LocalityDataFields, ResolvedLocalityData } from "@/domains/locality/types";

// ─── Sous-types par source ───

export interface DvfContext {
  avgPricePerM2: number | null;
  medianPricePerM2: number | null;
  transactionCount: number;
  avgPriceStudioPerM2: number | null;
  avgPriceSmallAptPerM2: number | null;
  avgPriceLargeAptPerM2: number | null;
  avgPriceHousePerM2: number | null;
  priceTrend1yPct: number | null;
  pricePerM2Min: number | null;
  pricePerM2Max: number | null;
  lastMutationDate: string | null;
}

export interface InseeContext {
  population: number | null;
  medianIncome: number | null;
  povertyRate: number | null;
  unemploymentRate: number | null;
  vacantHousingPct: number | null;
  ownerOccupierPct: number | null;
  housingStockCount: number | null;
  householdSizeAvg: number | null;
  studentPopulationPct: number | null;
  seniorPopulationPct: number | null;
  totalJobs: number | null;
  millesime: string | null;
}

export interface GeorisquesContext {
  naturalRisks: Array<{ type: string; level: string }>;
  riskLevel: "faible" | "moyen" | "eleve";
  floodRiskLevel: string | null;
  seismicZone: number | null;
  industrialRisk: boolean;
  radonLevel: number | null;
  clayShrinkageRisk: string | null;
  catnatCount: number;
}

export interface AdemeContext {
  avgDpeRating: string | null;
  dpeDistribution: Record<string, number> | null;
  totalDpeCount: number;
}

export interface NewsArticle {
  title: string;
  source: string;
  pubDate: string;
  description: string;
}

export interface RatesContext {
  currentRate: number | null;
  currentPeriod: string | null;
  rateTrend3m: number | null;
  rateTrend12m: number | null;
  rateHistory: Array<{ period: string; rate: number }>;
}

export interface CommuneContext {
  nom: string;
  codeInsee: string;
  codesPostaux: string[];
  population: number;
  departement: { code: string; nom: string };
  region: { code: string; nom: string };
  coordinates: { lat: number; lon: number };
}

export interface LocalityDbContext {
  fields: LocalityDataFields;
  fieldSources: ResolvedLocalityData["fieldSources"];
  dataCompleteness: {
    total: number;
    filled: number;
    pct: number;
    missingP0: string[];
  };
  quartiers: Array<{
    name: string;
    code: string;
    fields: LocalityDataFields | null;
  }>;
}

// ─── Contexte principal passe a Gemini ───

export interface NewsContext {
  /** Metadonnees de la requete */
  meta: {
    articleCategory: string;
    articleSlot: "primary" | "secondary";
    targetCity: string | null;
    targetTopic: string | null;
    fetchedAt: string;
    dataQuality: "full" | "degraded" | "minimal";
    errors: string[];  // Sources qui ont echoue
  };

  /** Geographie de la commune cible */
  commune: CommuneContext | null;

  /** Donnees localite internes (source la plus riche) */
  localityDb: LocalityDbContext | null;

  /** Donnees DVF (transactions immobilieres) */
  dvf: DvfContext | null;

  /** Donnees INSEE (socio-economie) */
  insee: InseeContext | null;

  /** Donnees Georisques (risques) */
  georisques: GeorisquesContext | null;

  /** Donnees ADEME (DPE) */
  ademe: AdemeContext | null;

  /** Actualites RSS pertinentes */
  news: {
    cityNews: NewsArticle[];
    nationalNews: NewsArticle[];
    urgentSignals: Array<{ title: string; score: number; source: string }>;
  };

  /** Taux de credit (Banque de France) */
  rates: RatesContext | null;

  /** Contexte editorial */
  editorial: {
    existingGuides: string[];          // Slugs des guides deja publies
    recentArticleSlugs: string[];      // 50 derniers articles publies
    existingInternalLinks: string[];   // URLs valides pour maillage interne
    competitorCities: string[];        // Villes de meme rang pour comparaison
  };
}
```

### 3.2 — Structure des sous-modules

```
src/domains/blog/
├── fetchers/
│   ├── types.ts                  # NewsContext, sous-types
│   ├── dvf-fetcher.ts            # DVF Open Data (cquest)
│   ├── insee-fetcher.ts          # INSEE Donnees Locales
│   ├── georisques-fetcher.ts     # Georisques API v1
│   ├── ademe-fetcher.ts          # ADEME DPE Open Data
│   ├── rss-fetcher.ts            # Google News RSS
│   ├── immo-rss-fetcher.ts       # Flux RSS specialises immobilier
│   ├── geo-fetcher.ts            # geo.api.gouv.fr
│   ├── locality-db-fetcher.ts    # Donnees internes SQLite/Turso
│   ├── bdf-fetcher.ts            # Banque de France Webstat
│   ├── cache.ts                  # Cache par source (SQLite)
│   └── index.ts                  # Orchestrateur : buildNewsContext()
├── subject-selector/
│   ├── scoring.ts                # Algorithme de scoring ville/sujet
│   └── index.ts                  # selectSubject()
├── generator/
│   └── index.ts                  # Appel Gemini avec NewsContext
└── publisher/
    └── index.ts                  # Publication Vercel + social
```

### 3.3 — Orchestrateur : collecte parallele avec Promise.allSettled

```typescript
// src/domains/blog/fetchers/index.ts

import { NewsContext, NewsArticle } from "./types";
import { fetchDvfData } from "./dvf-fetcher";
import { fetchInseeData } from "./insee-fetcher";
import { fetchGeorisquesData } from "./georisques-fetcher";
import { fetchAdemeData } from "./ademe-fetcher";
import { fetchNewsForCity } from "./rss-fetcher";
import { fetchImmoRssFeeds } from "./immo-rss-fetcher";
import { fetchCommuneByCode, searchCommuneByName } from "./geo-fetcher";
import { fetchLocalityDbData } from "./locality-db-fetcher";
import { fetchBdfRateData } from "./bdf-fetcher";
import { getCachedOrFetch } from "./cache";

interface BuildNewsContextOptions {
  articleCategory: string;
  articleSlot: "primary" | "secondary";
  cityName?: string;
  codeInsee?: string;
  postalCode?: string;
  topic?: string;
  skipSources?: string[];       // Sources a ignorer (ex: ["insee", "ademe"])
  maxNewsArticles?: number;
}

/**
 * Point d'entree principal du News Fetcher.
 * Collecte toutes les donnees en parallele et retourne un NewsContext.
 */
export async function buildNewsContext(
  options: BuildNewsContextOptions
): Promise<NewsContext> {
  const errors: string[] = [];
  const startTime = Date.now();

  // ─── Etape 1 : Resoudre le code INSEE ───
  let commune = null;
  let codeInsee = options.codeInsee ?? null;

  if (codeInsee) {
    commune = await fetchCommuneByCode(codeInsee).catch(() => null);
  } else if (options.cityName) {
    const results = await searchCommuneByName(options.cityName, 1).catch(() => []);
    if (results.length > 0) {
      commune = results[0];
      codeInsee = commune.code;
    }
  }

  if (!codeInsee && options.cityName) {
    // Fallback : chercher dans notre DB
    const { findLocalityByCity } = await import("@/domains/locality/repository");
    const locality = await findLocalityByCity(options.cityName, options.postalCode);
    if (locality) codeInsee = locality.code;
  }

  // ─── Etape 2 : Collecte parallele ───
  const skip = new Set(options.skipSources ?? []);
  const hasCityTarget = !!codeInsee;

  type FetchResult<T> = { source: string; data: T | null };

  async function safeFetch<T>(
    source: string,
    fn: () => Promise<T>,
    cacheKey?: string,
    cacheTtlMs?: number
  ): Promise<FetchResult<T>> {
    if (skip.has(source)) return { source, data: null };
    try {
      const data = cacheKey
        ? await getCachedOrFetch(cacheKey, fn, cacheTtlMs ?? 7 * 24 * 60 * 60 * 1000)
        : await fn();
      return { source, data };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`[${source}] ${msg}`);
      console.warn(`News Fetcher [${source}] failed:`, msg);
      return { source, data: null };
    }
  }

  const [
    localityDbResult,
    dvfResult,
    inseeResult,
    georisquesResult,
    ademeResult,
    cityNewsResult,
    immoRssResult,
    bdfResult,
  ] = await Promise.all([
    // Source interne — toujours la premiere
    hasCityTarget
      ? safeFetch("locality-db", () =>
          fetchLocalityDbData(options.cityName!, options.postalCode, codeInsee!)
        )
      : Promise.resolve({ source: "locality-db", data: null }),

    // DVF — cache 7 jours par commune
    hasCityTarget
      ? safeFetch(
          "dvf",
          () => fetchDvfData(codeInsee!),
          `dvf:${codeInsee}`,
          7 * 24 * 60 * 60 * 1000
        )
      : Promise.resolve({ source: "dvf", data: null }),

    // INSEE — cache 30 jours par commune
    hasCityTarget
      ? safeFetch(
          "insee",
          () => fetchInseeData(codeInsee!),
          `insee:${codeInsee}`,
          30 * 24 * 60 * 60 * 1000
        )
      : Promise.resolve({ source: "insee", data: null }),

    // Georisques — cache 90 jours par commune
    hasCityTarget
      ? safeFetch(
          "georisques",
          () => fetchGeorisquesData(codeInsee!),
          `georisques:${codeInsee}`,
          90 * 24 * 60 * 60 * 1000
        )
      : Promise.resolve({ source: "georisques", data: null }),

    // ADEME — cache 30 jours par commune
    hasCityTarget
      ? safeFetch(
          "ademe",
          () => fetchAdemeData(codeInsee!),
          `ademe:${codeInsee}`,
          30 * 24 * 60 * 60 * 1000
        )
      : Promise.resolve({ source: "ademe", data: null }),

    // Google News RSS — pas de cache (toujours frais)
    hasCityTarget
      ? safeFetch("google-news", () =>
          fetchNewsForCity(options.cityName!, {
            includeNational: true,
            maxPerQuery: 5,
          })
        )
      : Promise.resolve({ source: "google-news", data: null }),

    // Flux RSS immobilier — cache 1 heure
    safeFetch(
      "immo-rss",
      () => fetchImmoRssFeeds(5),
      "immo-rss:global",
      60 * 60 * 1000
    ),

    // Banque de France — cache 1 jour
    safeFetch(
      "bdf",
      () => fetchBdfRateData(),
      "bdf:rates",
      24 * 60 * 60 * 1000
    ),
  ]);

  // ─── Etape 3 : Assembler le NewsContext ───

  // Determiner la qualite des donnees
  const criticalSources = ["locality-db", "dvf"];
  const criticalMissing = criticalSources.filter((s) =>
    errors.some((e) => e.startsWith(`[${s}]`))
  );
  const dataQuality: NewsContext["meta"]["dataQuality"] =
    criticalMissing.length === 0 ? "full" :
    criticalMissing.length === 1 ? "degraded" : "minimal";

  // Separer news city vs national
  const cityNewsArticles = (cityNewsResult.data as NewsArticle[] | null) ?? [];
  const nationalNewsArticles = (immoRssResult.data as { articles: NewsArticle[]; urgentSignals: any[] } | null)?.articles ?? [];
  const urgentSignals = (immoRssResult.data as { articles: NewsArticle[]; urgentSignals: any[] } | null)?.urgentSignals ?? [];

  const context: NewsContext = {
    meta: {
      articleCategory: options.articleCategory,
      articleSlot: options.articleSlot,
      targetCity: options.cityName ?? null,
      targetTopic: options.topic ?? null,
      fetchedAt: new Date().toISOString(),
      dataQuality,
      errors,
    },
    commune: commune
      ? {
          nom: commune.nom,
          codeInsee: commune.code,
          codesPostaux: commune.codesPostaux,
          population: commune.population,
          departement: commune.departement,
          region: commune.region,
          coordinates: {
            lat: commune.centre.coordinates[1],
            lon: commune.centre.coordinates[0],
          },
        }
      : null,
    localityDb: localityDbResult.data
      ? {
          fields: localityDbResult.data.resolved?.fields ?? {},
          fieldSources: localityDbResult.data.resolved?.fieldSources ?? {},
          dataCompleteness: localityDbResult.data.dataCompleteness,
          quartiers: localityDbResult.data.children,
        }
      : null,
    dvf: dvfResult.data ?? null,
    insee: inseeResult.data ?? null,
    georisques: georisquesResult.data ?? null,
    ademe: ademeResult.data ?? null,
    news: {
      cityNews: cityNewsArticles.slice(0, 10),
      nationalNews: nationalNewsArticles.slice(0, 10),
      urgentSignals,
    },
    rates: bdfResult.data ?? null,
    editorial: {
      existingGuides: [],          // TODO: query DB blog_articles WHERE category='guide-ville'
      recentArticleSlugs: [],      // TODO: query DB blog_articles ORDER BY published_at DESC LIMIT 50
      existingInternalLinks: [],   // TODO: construire a partir des guides et articles existants
      competitorCities: [],        // TODO: villes du meme departement avec population similaire
    },
  };

  const elapsed = Date.now() - startTime;
  console.log(
    `News Fetcher: ${options.cityName ?? options.topic} — ` +
    `${dataQuality} quality, ${errors.length} errors, ${elapsed}ms`
  );

  return context;
}
```

### 3.4 — Systeme de cache

Le cache evite de re-fetcher les memes donnees trop souvent. Il est stocke dans SQLite (meme base Turso).

```typescript
// src/domains/blog/fetchers/cache.ts

import { getDb } from "@/infrastructure/database/client";

/**
 * Table de cache a creer dans les migrations :
 *
 * CREATE TABLE IF NOT EXISTS news_fetcher_cache (
 *   cache_key TEXT PRIMARY KEY,
 *   data TEXT NOT NULL,
 *   fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
 *   expires_at TEXT NOT NULL
 * );
 */

export async function getCachedOrFetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttlMs: number
): Promise<T> {
  const db = await getDb();
  const now = new Date().toISOString();

  // 1. Verifier le cache
  const cached = await db.execute({
    sql: "SELECT data FROM news_fetcher_cache WHERE cache_key = ? AND expires_at > ?",
    args: [cacheKey, now],
  });

  if (cached.rows.length > 0) {
    try {
      return JSON.parse(cached.rows[0].data as string) as T;
    } catch {
      // Cache corrompu, on le supprime
      await db.execute({ sql: "DELETE FROM news_fetcher_cache WHERE cache_key = ?", args: [cacheKey] });
    }
  }

  // 2. Fetch et mettre en cache
  const data = await fetchFn();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  await db.execute({
    sql: `INSERT OR REPLACE INTO news_fetcher_cache (cache_key, data, fetched_at, expires_at)
          VALUES (?, ?, ?, ?)`,
    args: [cacheKey, JSON.stringify(data), now, expiresAt],
  });

  return data;
}

/**
 * Invalider le cache pour une commune (apres enrichissement par exemple).
 */
export async function invalidateCacheForCommune(codeInsee: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM news_fetcher_cache WHERE cache_key LIKE ?",
    args: [`%:${codeInsee}`],
  });
}

/**
 * Nettoyer les entrees expirees.
 * A appeler periodiquement (cron hebdomadaire).
 */
export async function cleanExpiredCache(): Promise<number> {
  const db = await getDb();
  const result = await db.execute({
    sql: "DELETE FROM news_fetcher_cache WHERE expires_at < datetime('now')",
    args: [],
  });
  return result.rowsAffected;
}
```

### 3.5 — Gestion d'erreur gracieuse

Principe fondamental : **une source en erreur ne bloque jamais la pipeline**. Le NewsContext est toujours produit, avec les champs disponibles.

```
┌─────────────────────────────────────────────────────────────┐
│  MATRICE DE DEGRADATION                                      │
│                                                              │
│  Source en erreur       │ Impact                │ Action     │
│  ──────────────────────┼──────────────────────┼─────────── │
│  locality-db (interne)  │ Critique (pas de     │ DVF+INSEE  │
│                         │ donnees de base)     │ compensent │
│  dvf                    │ Pas de prix frais    │ Donnees DB │
│  insee                  │ Pas de socio frais   │ Donnees DB │
│  georisques             │ Pas de risques frais │ Donnees DB │
│  ademe                  │ Pas de DPE           │ Ignorer    │
│  google-news            │ Pas d'actus locales  │ RSS global │
│  immo-rss               │ Pas d'actus national │ Ignorer    │
│  bdf                    │ Pas de taux          │ Ignorer    │
│  geo.api.gouv.fr        │ Pas de metadata geo  │ Donnees DB │
│                                                              │
│  Regle : si locality-db ET dvf echouent → dataQuality =     │
│  'minimal' → article genere avec warning + needs_review      │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Collecteur par type d'article

Chaque type d'article ne necessite pas les memes donnees. Voici le mapping detaille.

### 4.1 — guide_ville

L'article le plus riche en donnees. Toutes les sources sont sollicitees.

```typescript
async function collectForGuideVille(cityName: string, codeInsee: string): Promise<NewsContext> {
  return buildNewsContext({
    articleCategory: "guide-ville",
    articleSlot: "primary",
    cityName,
    codeInsee,
    // Toutes les sources actives par defaut
  });
}
```

| Source | Priorite | Champs utilises |
|--------|----------|-----------------|
| Locality DB | Critique | Tous les LocalityDataFields disponibles |
| DVF | Critique | Prix par type, tendances, transactions |
| INSEE | Haute | Population, revenus, emploi, logements |
| Georisques | Haute | Tous les risques |
| ADEME | Moyenne | DPE distribution |
| Google News | Moyenne | Actus ville (5-10 articles) |
| RSS Immo | Basse | Actus nationales pour contexte |
| BdF | Basse | Taux actuel pour simulation type |
| geo.api.gouv.fr | Haute | Metadata commune, departement, region |

**Estimation taille** : 8 000 - 15 000 tokens

---

### 4.2 — guide_quartier

Identique a guide_ville mais filtre sur un quartier. Necessite que le quartier existe comme sous-localite en DB.

```typescript
async function collectForGuideQuartier(
  cityName: string,
  quartierName: string,
  codeInsee: string
): Promise<NewsContext> {
  const context = await buildNewsContext({
    articleCategory: "guide-quartier",
    articleSlot: "secondary",
    cityName,
    codeInsee,
    skipSources: ["ademe"], // Pas de DPE a l'echelle quartier
  });

  // Enrichir avec les donnees du quartier specifique
  if (context.localityDb?.quartiers) {
    const quartier = context.localityDb.quartiers.find(
      (q) => q.name.toLowerCase() === quartierName.toLowerCase()
    );
    if (quartier) {
      // Ajouter les donnees quartier dans le contexte
      (context as any).quartierSpecific = quartier.fields;
    }
  }

  return context;
}
```

| Source | Priorite | Specifique quartier |
|--------|----------|---------------------|
| Locality DB | Critique | Donnees quartier + donnees ville pour comparaison |
| DVF | Haute | Filtrer par section cadastrale si possible |
| INSEE | Basse | Pas dispo a l'echelle quartier (on utilise ville) |
| Georisques | Moyenne | Risques identiques a la ville |
| Google News | Moyenne | Requete avec nom du quartier |

**Estimation taille** : 5 000 - 10 000 tokens

---

### 4.3 — actu_marche

Article court, centre sur les tendances recentes et les chiffres frais.

```typescript
async function collectForActuMarche(
  cityName?: string,
  codeInsee?: string
): Promise<NewsContext> {
  return buildNewsContext({
    articleCategory: "actu-marche",
    articleSlot: "secondary",
    cityName,
    codeInsee,
    skipSources: ["ademe", "georisques"], // Pas pertinent pour les actus marche
    maxNewsArticles: 15,
  });
}
```

| Source | Priorite | Champs utilises |
|--------|----------|-----------------|
| RSS Immo | Critique | Actualites nationales recentes |
| Google News | Critique | Actualites immobilieres |
| DVF | Haute | Tendances prix, volumes |
| BdF | Haute | Taux actuels et tendances |
| Locality DB | Moyenne | Donnees de base pour contextualisation |
| INSEE | Basse | Population/emploi pour contexte |

**Estimation taille** : 4 000 - 8 000 tokens

---

### 4.4 — analyse_comparative

Necessite les donnees de N villes (typiquement 2 a 10).

```typescript
async function collectForComparative(
  cities: Array<{ name: string; codeInsee: string }>
): Promise<NewsContext & { comparisons: NewsContext[] }> {
  // Collecter les donnees de chaque ville en parallele
  const cityContexts = await Promise.allSettled(
    cities.map((city) =>
      buildNewsContext({
        articleCategory: "analyse",
        articleSlot: "primary",
        cityName: city.name,
        codeInsee: city.codeInsee,
        skipSources: ["ademe", "georisques", "google-news", "immo-rss"],
      })
    )
  );

  // Le contexte principal est le premier de la liste
  const primaryContext = cityContexts[0]?.status === "fulfilled"
    ? cityContexts[0].value
    : await buildNewsContext({
        articleCategory: "analyse",
        articleSlot: "primary",
        topic: cities.map((c) => c.name).join(" vs "),
      });

  // Ajouter les contextes comparatifs
  const comparisons = cityContexts
    .filter((r): r is PromiseFulfilledResult<NewsContext> => r.status === "fulfilled")
    .map((r) => r.value);

  return { ...primaryContext, comparisons };
}
```

| Source | Priorite | Par ville |
|--------|----------|-----------|
| Locality DB | Critique | Tous les champs P0 pour chaque ville |
| DVF | Haute | Prix/m2, tendances pour comparaison |
| INSEE | Moyenne | Population, emploi, revenus |
| BdF | Basse | Taux (identique pour toutes les villes) |

**Estimation taille** : 6 000 - 12 000 tokens (selon nombre de villes)

---

### 4.5 — fiscalite

Articles de fond sur les dispositifs fiscaux. Moins de donnees numeriques, plus de contexte legal.

```typescript
async function collectForFiscalite(topic: string): Promise<NewsContext> {
  return buildNewsContext({
    articleCategory: "fiscalite",
    articleSlot: "primary",
    topic,
    skipSources: ["dvf", "ademe", "georisques", "insee"],
    maxNewsArticles: 10,
  });
}
```

| Source | Priorite | Champs utilises |
|--------|----------|-----------------|
| RSS Immo | Haute | Actualites fiscales (filtrer par mots-cles) |
| Google News | Haute | Requete "LMNP 2026" / "Pinel" / "deficit foncier" |
| Locality DB | Moyenne | Champs fiscaux : pinel_eligible, denormandie, zrr |
| BdF | Basse | Taux pour simulations |

**Note** : Pour les textes de loi, on passe les URLs BOFiP directement dans le contexte (pas de scraping) :
- `https://bofip.impots.gouv.fr/bofip/` (base documentaire fiscale)

**Estimation taille** : 3 000 - 6 000 tokens

---

### 4.6 — financement

Articles sur les taux, le credit, le montage financier.

```typescript
async function collectForFinancement(topic: string): Promise<NewsContext> {
  return buildNewsContext({
    articleCategory: "financement",
    articleSlot: "primary",
    topic,
    skipSources: ["dvf", "ademe", "georisques", "insee"],
    maxNewsArticles: 10,
  });
}
```

| Source | Priorite | Champs utilises |
|--------|----------|-----------------|
| BdF | Critique | Taux actuels, historique, tendances |
| RSS Immo | Haute | Actualites credit/taux |
| Google News | Haute | Requete "taux credit immobilier {mois} {annee}" |
| Locality DB | Basse | Donnees ville pour simulation type |

**Estimation taille** : 3 000 - 5 000 tokens

---

### 4.7 — conseil_investissement

Articles methodologiques. Peu de donnees fraiches, plus de donnees agregees.

```typescript
async function collectForConseil(topic: string): Promise<NewsContext> {
  return buildNewsContext({
    articleCategory: "conseil",
    articleSlot: "primary",
    topic,
    skipSources: ["georisques", "ademe"],
    maxNewsArticles: 5,
  });
}
```

| Source | Priorite | Champs utilises |
|--------|----------|-----------------|
| Locality DB | Moyenne | Stats agregees (moyennes nationales) |
| BdF | Moyenne | Taux pour exemples chiffres |
| RSS Immo | Basse | Contexte actualite |

**Estimation taille** : 2 000 - 4 000 tokens

---

### 4.8 — etude_de_cas

Simulation detaillee d'un investissement dans une ville specifique.

```typescript
async function collectForEtudeDeCas(
  cityName: string,
  codeInsee: string
): Promise<NewsContext> {
  return buildNewsContext({
    articleCategory: "etude-de-cas",
    articleSlot: "primary",
    cityName,
    codeInsee,
    // Toutes les sources actives
  });
}
```

| Source | Priorite | Champs utilises |
|--------|----------|-----------------|
| Locality DB | Critique | Tous les champs (prix, loyers, charges, taxe fonciere) |
| DVF | Critique | Prix pour trouver un bien type |
| INSEE | Haute | Contexte socio-economique |
| ADEME | Moyenne | DPE pour estimation charges energetiques |
| BdF | Haute | Taux pour calcul credit |
| Georisques | Moyenne | Risques pour section "points de vigilance" |

**Estimation taille** : 8 000 - 12 000 tokens

---

### Resume : matrice sources x types

```
                   DVF  INSEE  Georisq  ADEME  RSS   BdF  Locality  Geo-API
guide_ville         ●     ●      ●       ●     ●     ○      ●        ●
guide_quartier      ●     ○      ○       ○     ●     ○      ●        ●
actu_marche         ●     ○      ○       ○     ●     ●      ○        ○
analyse_comp        ●     ●      ○       ○     ○     ○      ●        ●
fiscalite           ○     ○      ○       ○     ●     ○      ○        ○
financement         ○     ○      ○       ○     ●     ●      ○        ○
conseil_invest      ○     ○      ○       ○     ○     ○      ○        ○
etude_de_cas        ●     ●      ●       ●     ○     ●      ●        ●

● = critique/haute   ○ = basse/optionnelle   (vide) = non utilise
```

---

## 5. Selection automatique du sujet

### 5.1 — Algorithme de scoring pour choisir la ville

Le scoring repose sur les donnees deja presentes dans la base `locality_data`.

```typescript
// src/domains/blog/subject-selector/scoring.ts

import { getDb } from "@/infrastructure/database/client";

interface CityCandidate {
  localityId: string;
  name: string;
  codeInsee: string;
  population: number;
  lastDataUpdate: string | null;    // Date du dernier snapshot locality_data
  lastArticleDate: string | null;   // Date du dernier article publie sur cette ville
  fieldsFilled: number;             // Nombre de champs P0 remplis
  totalP0Fields: number;            // Nombre de champs P0 attendus
  tags: string[];                   // Tags : grande-ville, ville-etudiante, etc.
  hasRecentNews: boolean;           // Detecte via RSS
}

interface ScoringWeights {
  dataFreshness: number;       // 0.30
  dataCompleteness: number;    // 0.25
  populationRank: number;      // 0.15
  seasonalRelevance: number;   // 0.15
  lastPublished: number;       // 0.10
  newsRelevance: number;       // 0.05
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  dataFreshness: 0.30,
  dataCompleteness: 0.25,
  populationRank: 0.15,
  seasonalRelevance: 0.15,
  lastPublished: 0.10,
  newsRelevance: 0.05,
};

function daysBetween(dateStr: string | null, now: Date): number {
  if (!dateStr) return 365; // Tres ancien si pas de date
  return Math.floor((now.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export function scoreCity(city: CityCandidate, weights: ScoringWeights = DEFAULT_WEIGHTS): number {
  const now = new Date();
  let score = 0;

  // 1. Fraicheur des donnees (30%)
  // Plus les donnees sont anciennes, plus le score est eleve (= prioritaire)
  const daysSinceData = daysBetween(city.lastDataUpdate, now);
  score += weights.dataFreshness * Math.min(daysSinceData / 90, 1);

  // 2. Completude des donnees (25%)
  // Plus il manque de champs P0, plus le score est eleve
  const completeness = city.totalP0Fields > 0
    ? city.fieldsFilled / city.totalP0Fields
    : 0;
  score += weights.dataCompleteness * (1 - completeness);

  // 3. Population / volume de recherche (15%)
  // Normalise : 100K=0.3, 500K=0.7, 1M+=1.0
  const popNorm = Math.min(city.population / 1_000_000, 1);
  score += weights.populationRank * popNorm;

  // 4. Pertinence saisonniere (15%)
  const month = now.getMonth(); // 0-11
  score += weights.seasonalRelevance * getSeasonalScore(city.tags, month);

  // 5. Anciennete derniere publication (10%)
  const daysSinceArticle = daysBetween(city.lastArticleDate, now);
  score += weights.lastPublished * Math.min(daysSinceArticle / 60, 1);

  // 6. Actualite RSS (5%)
  score += weights.newsRelevance * (city.hasRecentNews ? 1 : 0);

  return Math.round(score * 1000) / 1000;
}

function getSeasonalScore(tags: string[], month: number): number {
  const seasonalScores: Record<string, number[]> = {
    "ville-etudiante":  [0.3, 0.3, 0.3, 0.3, 0.5, 0.8, 0.5, 0.5, 1.0, 0.5, 0.3, 0.3],
    "ville-littorale":  [0.3, 0.3, 0.3, 0.5, 0.7, 1.0, 1.0, 1.0, 0.5, 0.3, 0.3, 0.3],
    "grande-ville":     [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.5, 0.5, 0.7, 0.7, 0.7, 0.7],
    "ville-montagne":   [0.8, 0.8, 0.5, 0.3, 0.3, 0.5, 0.8, 0.8, 0.3, 0.3, 0.5, 0.8],
  };

  for (const tag of tags) {
    if (seasonalScores[tag]) return seasonalScores[tag][month];
  }
  return 0.5;
}
```

### 5.2 — Query pour trouver les villes avec les plus grosses lacunes

```typescript
/**
 * Requete SQL pour identifier les villes prioritaires pour la generation d'articles.
 * Classe par : donnees les plus anciennes ou les plus incompletes.
 */
export async function getCityCandidatesForArticle(
  limit: number = 20
): Promise<CityCandidate[]> {
  const db = await getDb();

  const result = await db.execute({
    sql: `
      SELECT
        l.id as locality_id,
        l.name,
        l.code as code_insee,
        ld.data,
        ld.valid_from as last_data_update,
        ld.created_at
      FROM localities l
      LEFT JOIN (
        SELECT locality_id, data, valid_from, created_at,
               ROW_NUMBER() OVER (PARTITION BY locality_id ORDER BY valid_from DESC) as rn
        FROM locality_data
      ) ld ON l.id = ld.locality_id AND ld.rn = 1
      WHERE l.type = 'ville'
      ORDER BY
        -- Priorite 1 : pas de donnees du tout
        CASE WHEN ld.data IS NULL THEN 0 ELSE 1 END,
        -- Priorite 2 : donnees les plus anciennes
        ld.valid_from ASC
      LIMIT ?
    `,
    args: [limit],
  });

  const P0_FIELDS = [
    "avg_purchase_price_per_m2", "median_purchase_price_per_m2", "transaction_count",
    "avg_rent_per_m2", "vacancy_rate", "population", "median_income",
    "unemployment_rate", "risk_level", "natural_risks",
  ];

  return result.rows.map((row) => {
    let fields: Record<string, unknown> = {};
    try {
      fields = row.data ? JSON.parse(row.data as string) : {};
    } catch {}

    const filledP0 = P0_FIELDS.filter(
      (k) => fields[k] !== undefined && fields[k] !== null
    ).length;

    const population = (fields.population as number) ?? 0;

    return {
      localityId: row.locality_id as string,
      name: row.name as string,
      codeInsee: row.code_insee as string,
      population,
      lastDataUpdate: row.last_data_update as string | null,
      lastArticleDate: null, // TODO: join avec blog_articles
      fieldsFilled: filledP0,
      totalP0Fields: P0_FIELDS.length,
      tags: inferCityTags(population),
      hasRecentNews: false, // Rempli par le RSS fetcher en aval
    };
  });
}

function inferCityTags(population: number): string[] {
  const tags: string[] = [];
  if (population >= 200_000) tags.push("grande-ville");
  else if (population >= 50_000) tags.push("ville-moyenne");
  else tags.push("petite-ville");
  return tags;
}
```

### 5.3 — Detection d'actualite urgente via RSS

```typescript
/**
 * Verifier si une actualite urgente doit preempter le planning.
 * Appele au debut de chaque execution cron.
 */
export async function checkForBreakingNews(): Promise<{
  hasBreaking: boolean;
  signal: { title: string; score: number; source: string } | null;
  suggestedCategory: string | null;
}> {
  const { fetchImmoRssFeeds } = await import("../fetchers/immo-rss-fetcher");
  const result = await fetchImmoRssFeeds(10);

  if (result.urgentSignals.length === 0) {
    return { hasBreaking: false, signal: null, suggestedCategory: null };
  }

  const top = result.urgentSignals[0];

  // Score >= 0.85 = actualite urgente, remplace le slot secondaire
  if (top.score >= 0.85) {
    // Determiner la categorie en fonction des mots-cles
    const titleLower = top.title.toLowerCase();
    let category = "actu-marche";
    if (top.keywords.some((k) => ["BCE", "taux directeur", "taux de credit"].includes(k))) {
      category = "financement";
    } else if (top.keywords.some((k) => ["loi de finances", "reforme", "Pinel", "LMNP"].includes(k))) {
      category = "fiscalite";
    }

    return { hasBreaking: true, signal: top, suggestedCategory: category };
  }

  return { hasBreaking: false, signal: null, suggestedCategory: null };
}
```

---

## 6. Format de sortie

### 6.1 — JSON complet passe a Gemini

Le `NewsContext` est serialise en JSON et injecte dans le message utilisateur du prompt Gemini, a l'interieur d'un bloc `<data_context>` :

```
Systeme prompt : [prompt systeme commun, cf. prompts-articles.md]

Message utilisateur :
  [prompt specifique au type d'article]

  <data_context>
  {JSON.stringify(newsContext, null, 0)}
  </data_context>

  Instructions : utilise EXCLUSIVEMENT les donnees ci-dessus.
  Ne fabrique aucun chiffre. Si une donnee manque, ecris "donnee non disponible".
```

### 6.2 — Estimation taille en tokens par type

La taille du contexte varie selon le type d'article et la richesse des donnees.

| Type | Taille JSON estimee | Tokens (~4 chars/token) | Budget Gemini (input) |
|------|--------------------|-----------------------|----------------------|
| guide_ville | 30-60 KB | 8 000 - 15 000 | OK (1M context) |
| guide_quartier | 20-40 KB | 5 000 - 10 000 | OK |
| actu_marche | 15-30 KB | 4 000 - 8 000 | OK |
| analyse_comparative (5 villes) | 40-80 KB | 10 000 - 20 000 | OK |
| fiscalite | 10-25 KB | 3 000 - 6 000 | OK |
| financement | 10-20 KB | 3 000 - 5 000 | OK |
| conseil_investissement | 8-15 KB | 2 000 - 4 000 | OK |
| etude_de_cas | 30-50 KB | 8 000 - 12 000 | OK |

**Total context input** (prompt systeme + prompt article + data) : **15 000 - 35 000 tokens** selon le type. Largement dans les limites de Gemini 2.5 Flash (1M tokens).

### 6.3 — Strategie de truncation

Si le contexte depasse 50 000 tokens (cas extreme : analyse comparative de 10+ villes), appliquer les regles suivantes dans l'ordre :

```typescript
function truncateNewsContext(context: NewsContext, maxTokens: number = 50_000): NewsContext {
  const estimateTokens = (obj: unknown): number =>
    Math.ceil(JSON.stringify(obj).length / 4);

  let current = estimateTokens(context);

  // Niveau 1 : Reduire les actualites RSS
  if (current > maxTokens) {
    context.news.cityNews = context.news.cityNews.slice(0, 5);
    context.news.nationalNews = context.news.nationalNews.slice(0, 5);
    current = estimateTokens(context);
  }

  // Niveau 2 : Supprimer les descriptions RSS (garder titre + source + date)
  if (current > maxTokens) {
    context.news.cityNews = context.news.cityNews.map((a) => ({
      ...a,
      description: "",
    }));
    context.news.nationalNews = context.news.nationalNews.map((a) => ({
      ...a,
      description: "",
    }));
    current = estimateTokens(context);
  }

  // Niveau 3 : Supprimer l'historique des taux (garder seulement le dernier)
  if (current > maxTokens && context.rates) {
    context.rates.rateHistory = context.rates.rateHistory.slice(-1);
    current = estimateTokens(context);
  }

  // Niveau 4 : Supprimer les donnees quartier sauf top 3
  if (current > maxTokens && context.localityDb?.quartiers) {
    context.localityDb.quartiers = context.localityDb.quartiers.slice(0, 3);
    current = estimateTokens(context);
  }

  // Niveau 5 : Supprimer ADEME si non critique
  if (current > maxTokens) {
    context.ademe = null;
    current = estimateTokens(context);
  }

  // Niveau 6 : Supprimer Georisques si non critique
  if (current > maxTokens) {
    context.georisques = null;
  }

  return context;
}
```

---

## 7. Tests et fiabilite

### 7.1 — Tests unitaires par fetcher

Chaque fetcher est testable independamment avec des donnees mockees.

```typescript
// __tests__/fetchers/dvf-fetcher.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchDvfData } from "@/domains/blog/fetchers/dvf-fetcher";

// Mock fetch globalement
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("DVF Fetcher", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("calcule correctement le prix moyen au m2", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        resultats: [
          {
            id_mutation: "1",
            date_mutation: "2025-06-15",
            nature_mutation: "Vente",
            valeur_fonciere: 200_000,
            surface_reelle_bati: 50,
            type_local: "Appartement",
            nombre_pieces_principales: 2,
            code_commune: "69123",
            code_postal: "69001",
            longitude: 4.83,
            latitude: 45.76,
          },
          {
            id_mutation: "2",
            date_mutation: "2025-07-20",
            nature_mutation: "Vente",
            valeur_fonciere: 180_000,
            surface_reelle_bati: 40,
            type_local: "Appartement",
            nombre_pieces_principales: 2,
            code_commune: "69123",
            code_postal: "69002",
            longitude: 4.84,
            latitude: 45.77,
          },
        ],
        nb_resultats: 2,
      }),
    });

    const result = await fetchDvfData("69123");

    expect(result.transactionCount).toBe(2);
    expect(result.avgPricePerM2).toBeGreaterThan(0);
    // (200000/50 + 180000/40) / 2 = (4000 + 4500) / 2 = 4250
    expect(result.avgPricePerM2).toBe(4250);
  });

  it("retourne null si aucune transaction", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ resultats: [], nb_resultats: 0 }),
    });

    const result = await fetchDvfData("99999");
    expect(result.transactionCount).toBe(0);
    expect(result.avgPricePerM2).toBeNull();
  });

  it("gere une erreur API gracieusement", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: "Internal Server Error" });

    await expect(fetchDvfData("69123")).rejects.toThrow("DVF API 500");
  });
});
```

### 7.2 — Mocks pour le dev local

Pour le developpement local sans connexion aux APIs externes, un mock complet :

```typescript
// src/domains/blog/fetchers/__mocks__/mock-data.ts

import { NewsContext } from "../types";

export const MOCK_NEWS_CONTEXT_LYON: NewsContext = {
  meta: {
    articleCategory: "guide-ville",
    articleSlot: "primary",
    targetCity: "Lyon",
    targetTopic: null,
    fetchedAt: "2026-03-17T08:00:00.000Z",
    dataQuality: "full",
    errors: [],
  },
  commune: {
    nom: "Lyon",
    codeInsee: "69123",
    codesPostaux: ["69001", "69002", "69003", "69004", "69005", "69006", "69007", "69008", "69009"],
    population: 522250,
    departement: { code: "69", nom: "Rhone" },
    region: { code: "84", nom: "Auvergne-Rhone-Alpes" },
    coordinates: { lat: 45.7676, lon: 4.8357 },
  },
  localityDb: {
    fields: {
      avg_purchase_price_per_m2: 4200,
      median_purchase_price_per_m2: 3950,
      transaction_count: 8500,
      avg_rent_per_m2: 14.5,
      avg_rent_furnished_per_m2: 18.2,
      vacancy_rate: 6.8,
      avg_condo_charges_per_m2: 2.5,
      avg_property_tax_per_m2: 1.8,
      avg_airbnb_night_price: 85,
      avg_airbnb_occupancy_rate: 72,
      population: 522250,
      population_growth_pct: 0.8,
      median_income: 24500,
      poverty_rate: 15.2,
      unemployment_rate: 8.1,
      school_count: 450,
      university_nearby: true,
      public_transport_score: 85,
      risk_level: "moyen",
      natural_risks: [
        { type: "Inondation", level: "moyen" },
        { type: "Seisme", level: "faible" },
      ],
    },
    fieldSources: {},
    dataCompleteness: { total: 10, filled: 10, pct: 100, missingP0: [] },
    quartiers: [
      { name: "La Part-Dieu", code: "69123-partdieu", fields: { avg_purchase_price_per_m2: 4500 } },
      { name: "Vieux Lyon", code: "69123-vieuxlyon", fields: { avg_purchase_price_per_m2: 5200 } },
    ],
  },
  dvf: {
    avgPricePerM2: 4200,
    medianPricePerM2: 3950,
    transactionCount: 8500,
    avgPriceStudioPerM2: 5100,
    avgPriceSmallAptPerM2: 4400,
    avgPriceLargeAptPerM2: 3800,
    avgPriceHousePerM2: 3200,
    priceTrend1yPct: 2.1,
    pricePerM2Min: 2200,
    pricePerM2Max: 7500,
    lastMutationDate: "2025-12-20",
  },
  insee: {
    population: 522250,
    medianIncome: 24500,
    povertyRate: 15.2,
    unemploymentRate: 8.1,
    vacantHousingPct: 9.2,
    ownerOccupierPct: 35.4,
    housingStockCount: 312000,
    householdSizeAvg: 1.9,
    studentPopulationPct: 14.5,
    seniorPopulationPct: 16.8,
    totalJobs: 380000,
    millesime: "2020",
  },
  georisques: {
    naturalRisks: [
      { type: "Inondation par crue a debordement lent", level: "moyen" },
      { type: "Seisme", level: "identifie" },
    ],
    riskLevel: "moyen",
    floodRiskLevel: "moyen",
    seismicZone: 2,
    industrialRisk: false,
    radonLevel: 1,
    clayShrinkageRisk: "faible",
    catnatCount: 12,
  },
  ademe: {
    avgDpeRating: "D",
    dpeDistribution: { A: 2.1, B: 8.5, C: 21.3, D: 32.7, E: 22.1, F: 9.8, G: 3.5 },
    totalDpeCount: 45000,
  },
  news: {
    cityNews: [
      {
        title: "Immobilier a Lyon : les prix se stabilisent au T1 2026",
        source: "Capital",
        pubDate: "2026-03-10T08:00:00Z",
        description: "Apres deux annees de hausse...",
      },
    ],
    nationalNews: [
      {
        title: "Taux de credit immobilier : nouvelle baisse en mars 2026",
        source: "Les Echos",
        pubDate: "2026-03-12T10:00:00Z",
        description: "Les taux moyens passent sous les 3%...",
      },
    ],
    urgentSignals: [],
  },
  rates: {
    currentRate: 2.95,
    currentPeriod: "2026-02",
    rateTrend3m: -0.15,
    rateTrend12m: -0.45,
    rateHistory: [
      { period: "2025-03", rate: 3.40 },
      { period: "2025-06", rate: 3.30 },
      { period: "2025-09", rate: 3.20 },
      { period: "2025-12", rate: 3.10 },
      { period: "2026-02", rate: 2.95 },
    ],
  },
  editorial: {
    existingGuides: ["bordeaux", "nantes", "toulouse"],
    recentArticleSlugs: ["taux-immobilier-mars-2026", "guide-bordeaux"],
    existingInternalLinks: ["/guide/bordeaux", "/guide/nantes", "/guide/toulouse"],
    competitorCities: ["Bordeaux", "Nantes", "Toulouse", "Marseille"],
  },
};
```

Pour activer les mocks en dev :

```typescript
// En dev local, utiliser les mocks si pas de cle API
export async function buildNewsContextSafe(
  options: BuildNewsContextOptions
): Promise<NewsContext> {
  if (process.env.USE_MOCK_DATA === "true") {
    const { MOCK_NEWS_CONTEXT_LYON } = await import("./__mocks__/mock-data");
    return MOCK_NEWS_CONTEXT_LYON;
  }
  return buildNewsContext(options);
}
```

### 7.3 — Monitoring et alertes

#### Table de logs

```sql
CREATE TABLE IF NOT EXISTS news_fetcher_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  run_id TEXT NOT NULL,               -- UUID du run pipeline
  source TEXT NOT NULL,               -- 'dvf', 'insee', 'georisques', etc.
  city_code TEXT,                     -- Code INSEE si applicable
  status TEXT NOT NULL,               -- 'success', 'error', 'cached', 'skipped'
  duration_ms INTEGER NOT NULL,
  error_message TEXT,
  response_size INTEGER,              -- Taille reponse en bytes
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nfl_source ON news_fetcher_logs(source);
CREATE INDEX IF NOT EXISTS idx_nfl_status ON news_fetcher_logs(status);
CREATE INDEX IF NOT EXISTS idx_nfl_created ON news_fetcher_logs(created_at);
```

#### Alertes Discord

```typescript
// src/domains/blog/fetchers/monitoring.ts

interface FetcherHealth {
  source: string;
  lastSuccess: string | null;
  lastError: string | null;
  errorRate24h: number;    // % d'erreurs sur les 24 dernieres heures
  avgDurationMs: number;
}

export async function checkFetcherHealth(): Promise<FetcherHealth[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `
      SELECT
        source,
        MAX(CASE WHEN status = 'success' THEN created_at END) as last_success,
        MAX(CASE WHEN status = 'error' THEN created_at END) as last_error,
        ROUND(
          100.0 * SUM(CASE WHEN status = 'error' AND created_at > datetime('now', '-1 day') THEN 1 ELSE 0 END) /
          NULLIF(SUM(CASE WHEN created_at > datetime('now', '-1 day') THEN 1 ELSE 0 END), 0),
          1
        ) as error_rate_24h,
        AVG(CASE WHEN status = 'success' THEN duration_ms END) as avg_duration_ms
      FROM news_fetcher_logs
      WHERE created_at > datetime('now', '-7 days')
      GROUP BY source
    `,
    args: [],
  });

  return result.rows.map((row) => ({
    source: row.source as string,
    lastSuccess: row.last_success as string | null,
    lastError: row.last_error as string | null,
    errorRate24h: (row.error_rate_24h as number) ?? 0,
    avgDurationMs: Math.round((row.avg_duration_ms as number) ?? 0),
  }));
}

/**
 * Envoyer une alerte Discord si un fetcher est en panne.
 * A appeler dans le monitoring hebdomadaire.
 */
export async function alertIfSourceDown(webhookUrl: string): Promise<void> {
  const health = await checkFetcherHealth();

  const problems = health.filter(
    (h) => h.errorRate24h > 50 || h.lastSuccess === null
  );

  if (problems.length === 0) return;

  const fields = problems.map((p) => ({
    name: p.source,
    value: [
      `Taux erreur 24h : ${p.errorRate24h}%`,
      `Dernier succes : ${p.lastSuccess ?? "jamais"}`,
      `Derniere erreur : ${p.lastError ?? "aucune"}`,
      `Duree moyenne : ${p.avgDurationMs}ms`,
    ].join("\n"),
    inline: true,
  }));

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: "News Fetcher — Sources en panne",
          description: `${problems.length} source(s) avec un taux d'erreur > 50%`,
          color: 15548997, // Rouge
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });
}
```

#### Script de test des sources (health check rapide)

```typescript
// scripts/test-fetchers.ts
// Usage : npx tsx scripts/test-fetchers.ts [source]

async function main() {
  const source = process.argv[2]; // optionnel : "dvf", "insee", etc.
  const codeInsee = process.argv[3] ?? "69123"; // Lyon par defaut

  const tests: Record<string, () => Promise<unknown>> = {
    "geo-api": async () => {
      const { fetchCommuneByCode } = await import("@/domains/blog/fetchers/geo-fetcher");
      return fetchCommuneByCode(codeInsee);
    },
    dvf: async () => {
      const { fetchDvfData } = await import("@/domains/blog/fetchers/dvf-fetcher");
      return fetchDvfData(codeInsee);
    },
    insee: async () => {
      const { fetchInseeData } = await import("@/domains/blog/fetchers/insee-fetcher");
      return fetchInseeData(codeInsee);
    },
    georisques: async () => {
      const { fetchGeorisquesData } = await import("@/domains/blog/fetchers/georisques-fetcher");
      return fetchGeorisquesData(codeInsee);
    },
    ademe: async () => {
      const { fetchAdemeData } = await import("@/domains/blog/fetchers/ademe-fetcher");
      return fetchAdemeData(codeInsee);
    },
    "google-news": async () => {
      const { fetchGoogleNewsRss } = await import("@/domains/blog/fetchers/rss-fetcher");
      return fetchGoogleNewsRss("immobilier Lyon", 3);
    },
    "immo-rss": async () => {
      const { fetchImmoRssFeeds } = await import("@/domains/blog/fetchers/immo-rss-fetcher");
      return fetchImmoRssFeeds(2);
    },
    bdf: async () => {
      const { fetchBdfRateData } = await import("@/domains/blog/fetchers/bdf-fetcher");
      return fetchBdfRateData();
    },
  };

  const toRun = source ? { [source]: tests[source] } : tests;

  for (const [name, testFn] of Object.entries(toRun)) {
    if (!testFn) {
      console.log(`  [?] ${name} — source inconnue`);
      continue;
    }
    const start = Date.now();
    try {
      const result = await testFn();
      const elapsed = Date.now() - start;
      const size = JSON.stringify(result).length;
      console.log(`  [OK] ${name} — ${elapsed}ms — ${size} bytes`);
    } catch (error) {
      const elapsed = Date.now() - start;
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`  [FAIL] ${name} — ${elapsed}ms — ${msg}`);
    }
  }
}

main();
```

**Usage** :
```bash
# Tester toutes les sources avec Lyon (69123)
npx tsx scripts/test-fetchers.ts

# Tester une source specifique
npx tsx scripts/test-fetchers.ts dvf 69123

# Tester avec une autre commune
npx tsx scripts/test-fetchers.ts georisques 33063  # Bordeaux
```

---

## Variables d'environnement requises

```env
# Obligatoires pour l'ensemble du News Fetcher
GEMINI_API_KEY=...                    # Generation articles (existant)
TURSO_DATABASE_URL=...                # Base de donnees (existant)
TURSO_AUTH_TOKEN=...                  # Auth Turso (existant)

# API INSEE (inscription gratuite sur api.insee.fr)
INSEE_CONSUMER_KEY=...
INSEE_CONSUMER_SECRET=...

# Banque de France (inscription gratuite sur webstat.banque-france.fr)
BDF_API_KEY=...

# Optionnels
USE_MOCK_DATA=false                   # Activer les mocks en dev local
DISCORD_WEBHOOK_URL=...              # Alertes monitoring (existant)
```

Les APIs suivantes ne necessitent **aucune cle** :
- DVF (micro-API cquest)
- Georisques (API v1)
- ADEME (data-fair)
- geo.api.gouv.fr
- Google News RSS
- Flux RSS immobilier
