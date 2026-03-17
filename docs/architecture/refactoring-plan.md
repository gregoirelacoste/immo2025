# Plan de Refactoring — Architecture DDD + Composants Atomiques

## Problèmes actuels

| Fichier | Problème |
|---|---|
| `src/lib/db.ts` (354 lignes) | 3 domaines métiers mélangés + init DB + migrations |
| `src/lib/actions.ts` (357 lignes) | Actions de 3 domaines mélangées, logique prefill dupliquée |
| `src/components/PropertyForm.tsx` (611 lignes) | Formulaire + scraping + calculs live + helpers inline |
| `src/components/PropertyDetail.tsx` (526 lignes) | Détail + market data + rescrape + galerie photos |
| `src/lib/scraping/ai-*.ts` | Appel Gemini (`fetch` + clé API) dupliqué 3 fois |
| `src/types/` | Types déconnectés de leurs domaines |

---

## Cible : Structure DDD

```
src/
├── domains/                          # Logique métier par contexte délimité
│   ├── property/
│   │   ├── types.ts                  # ← src/types/property.ts
│   │   ├── calculations.ts           # ← src/lib/calculations.ts
│   │   ├── formatters.ts             # formatCurrency, formatPercent (extrait de calculations.ts)
│   │   ├── repository.ts             # Requêtes DB property (extrait de db.ts)
│   │   ├── actions.ts                # saveProperty, removeProperty, rescrapeProperty
│   │   └── prefill.ts                # buildPrefillFromScrape/Market (logique dupliquée centralisée)
│   │
│   ├── market/
│   │   ├── types.ts                  # Interface MarketData
│   │   ├── rent-reference.ts         # Table statique ~60 villes (extrait de market-data.ts)
│   │   ├── dvf-client.ts             # API DVF + geo.api.gouv.fr
│   │   ├── service.ts                # getMarketData() orchestration
│   │   └── actions.ts                # fetchMarketDataForCity server action
│   │
│   ├── scraping/
│   │   ├── types.ts                  # ← src/types/scraping.ts
│   │   ├── repository.ts             # Requêtes DB manifests (extrait de db.ts)
│   │   ├── actions.ts                # scrapeAndSaveProperty, extractAndUpdateFromText
│   │   ├── pipeline/                 # Mécanique de scraping (sans IA)
│   │   │   ├── orchestrator.ts
│   │   │   ├── fetcher.ts
│   │   │   ├── direct-scraper.ts
│   │   │   ├── html-cleaner.ts
│   │   │   ├── normalizers.ts
│   │   │   └── constants.ts
│   │   └── ai/                       # Préoccupations IA isolées
│   │       ├── client.ts             # Façade Gemini (NEW : élimine la duplication)
│   │       ├── generator.ts          # ← ai-generator.ts (sans le fetch inline)
│   │       ├── validator.ts          # ← ai-validator.ts (sans le fetch inline)
│   │       └── text-extractor.ts     # ← text-extractor.ts (sans le fetch inline)
│   │
│   └── auth/
│       ├── types.ts                  # ← src/types/user.ts
│       ├── config.ts                 # ← src/lib/auth.ts
│       ├── repository.ts             # Requêtes DB users (extrait de db.ts)
│       └── actions.ts                # ← src/lib/auth-actions.ts
│
├── infrastructure/                   # Clients des systèmes externes
│   ├── database/
│   │   ├── client.ts                 # getDb(), getClient(), migrations (extrait de db.ts)
│   │   └── row-mapper.ts             # rowAs<T> générique
│   └── ai/
│       └── gemini.ts                 # callGemini() — wrapper HTTP unique (NEW)
│
├── components/
│   ├── ui/                           # Atomes — zéro logique métier
│   │   ├── Button.tsx                # variant primary|secondary|danger|ghost, loading
│   │   ├── Input.tsx                 # label, hint, error
│   │   ├── NumberInput.tsx           # ← numInput() factory × 14 dans PropertyForm
│   │   ├── Textarea.tsx
│   │   ├── Select.tsx
│   │   ├── Badge.tsx                 # variant private|public
│   │   ├── Card.tsx                  # wrapper bg-white rounded-xl shadow-sm
│   │   ├── StatCard.tsx              # ← statCard() closure × 12 dans PropertyDetail
│   │   ├── Alert.tsx                 # variant error|warning|success|info
│   │   ├── Spinner.tsx               # ← SVG animate-spin dupliqué × 4
│   │   └── SectionHeading.tsx
│   │
│   ├── layout/
│   │   ├── Navbar.tsx                # ← src/components/Navbar.tsx
│   │   └── Providers.tsx
│   │
│   ├── property/
│   │   ├── form/                     # PropertyForm décomposé
│   │   │   ├── PropertyForm.tsx      # Orchestrateur ~120 lignes (était 611)
│   │   │   ├── ScrapeImportSection.tsx
│   │   │   ├── PropertyInfoSection.tsx
│   │   │   ├── LoanSection.tsx
│   │   │   ├── FeesSection.tsx
│   │   │   ├── ClassicRentalSection.tsx
│   │   │   ├── AirbnbSection.tsx
│   │   │   ├── ResultsSummarySection.tsx
│   │   │   └── useLoanAutoCalc.ts    # Hook : recalcul loan_amount
│   │   │
│   │   ├── detail/                   # PropertyDetail décomposé
│   │   │   ├── PropertyDetail.tsx    # Orchestrateur ~50 lignes (était 526)
│   │   │   ├── PropertyHeader.tsx
│   │   │   ├── PropertyGallery.tsx
│   │   │   ├── PropertyInfoPanel.tsx
│   │   │   ├── FinancingPanel.tsx
│   │   │   ├── ClassicYieldPanel.tsx
│   │   │   ├── AirbnbYieldPanel.tsx
│   │   │   ├── MarketDataPanel.tsx
│   │   │   ├── RescrapePanel.tsx     # Possède son propre état (rescrape + paste)
│   │   │   └── useMarketData.ts      # Hook : fetch market data au mount
│   │   │
│   │   └── dashboard/               # DashboardClient décomposé
│   │       ├── DashboardClient.tsx   # Orchestrateur ~60 lignes (était 357)
│   │       ├── PropertyCard.tsx      # Vue mobile (une propriété)
│   │       ├── PropertyTable.tsx     # Tableau desktop
│   │       ├── PropertyTableRow.tsx
│   │       └── SortBar.tsx
│   │
│   └── auth/
│       ├── LoginForm.tsx
│       └── RegisterForm.tsx
│
├── app/                              # Routes inchangées
└── types/
    └── next-auth.d.ts               # Augmentation globale NextAuth
```

---

## Phases de Migration

Chaque phase laisse l'app **buildable et fonctionnelle** avant de passer à la suivante.

### Phase 1 — Couche Infrastructure (DB client + client IA)

**Objectif :** Extraire l'init DB et les appels Gemini (dupliqués × 3) vers des fichiers dédiés.

1. Créer `src/infrastructure/database/client.ts` — `getClient()`, `getDb()`, migrations
2. Créer `src/infrastructure/database/row-mapper.ts` — `rowAs<T>`
3. Créer `src/infrastructure/ai/gemini.ts` — `callGemini(prompt, config)` : unique point d'appel HTTP vers Gemini, valide `GEMINI_API_KEY`, retourne le texte
4. Mettre à jour `src/lib/db.ts` pour importer depuis `@/infrastructure/database/client`
5. Mettre à jour `ai-generator.ts`, `ai-validator.ts`, `text-extractor.ts` pour appeler `callGemini`

**Gain immédiat :** La clé API Gemini est vérifiée une seule fois. Le pattern `fetch` identique n'existe plus qu'une fois.

---

### Phase 2 — Co-localisation des types

**Objectif :** Déplacer les interfaces près de leur domaine sans casser les imports existants.

1. Créer `src/domains/property/types.ts` — copie de `src/types/property.ts`
2. Créer `src/domains/scraping/types.ts` — copie de `src/types/scraping.ts`
3. Créer `src/domains/auth/types.ts` — copie de `src/types/user.ts`
4. Remplacer l'ancien contenu par des re-exports : `export * from "@/domains/property/types"`

**Zéro modification** dans les autres fichiers grâce aux shims de re-export.

---

### Phase 3 — Découpage de db.ts en repositories

**Objectif :** Séparer les 3 domaines mélangés dans `db.ts`.

1. Créer `src/domains/auth/repository.ts` — `getUserByEmail`, `getUserById`, `createUser`, `upsertOAuthUser`
2. Créer `src/domains/property/repository.ts` — tout le CRUD property
3. Créer `src/domains/scraping/repository.ts` — manifest CRUD
4. Remplacer `src/lib/db.ts` par des re-exports des 3 repositories

**Dépend de :** Phase 1 (client DB doit exister)

---

### Phase 4 — Découpage de actions.ts par domaine

**Objectif :** Chaque domaine possède ses propres server actions. Éliminer la duplication de logique prefill.

1. Créer `src/domains/property/prefill.ts` — `buildPrefillFromScrape()`, `buildPrefillFromMarket()` (logique dupliquée entre `scrapeAndSaveProperty` et `extractAndUpdateFromText`)
2. Créer `src/domains/market/actions.ts` — `fetchMarketDataForCity`
3. Créer `src/domains/scraping/actions.ts` — `scrapeAndSaveProperty`, `extractAndUpdateFromText`
4. Créer `src/domains/property/actions.ts` — `saveProperty`, `removeProperty`, `rescrapeProperty`
5. Remplacer `src/lib/actions.ts` par des re-exports (avec `"use server"` en tête)

**Dépend de :** Phase 3

---

### Phase 5 — Réorganisation du scraping

**Objectif :** Séparer pipeline mécanique et concerns IA.

1. Déplacer les fichiers `src/lib/scraping/` → `src/domains/scraping/pipeline/` et `src/domains/scraping/ai/`
2. Créer `src/domains/scraping/ai/client.ts` — façade `callGeminiJson<T>()` avec JSON parsing, sanitize, defaults
3. `generator.ts`, `validator.ts`, `text-extractor.ts` deviennent du **pur prompt engineering** — plus aucun code HTTP
4. Laisser des stubs de re-export dans `src/lib/scraping/` temporairement

**Dépend de :** Phase 1, Phase 3

---

### Phase 6 — Découpage de market-data.ts

1. Créer `src/domains/market/rent-reference.ts` — table statique + `getReferenceRent()`
2. Créer `src/domains/market/dvf-client.ts` — appels API DVF
3. Créer `src/domains/market/service.ts` — orchestration `getMarketData()`
4. Remplacer `src/lib/market-data.ts` par des re-exports

**Indépendant** des phases 3–5, peut être fait en parallèle.

---

### Phase 7 — Atomes UI

**Objectif :** Créer `src/components/ui/` avant de décomposer les gros composants.

| Atome | Motivation |
|---|---|
| `Button.tsx` | 6 patterns boutons différents dans le code |
| `Spinner.tsx` | SVG `animate-spin` copié-collé × 4 |
| `Alert.tsx` | `bg-red-50 border border-red-200` × 5 |
| `StatCard.tsx` | `statCard()` closure × 12 dans `PropertyDetail` |
| `Card.tsx` | `bg-white rounded-xl shadow-sm border` × 13 |
| `NumberInput.tsx` | `numInput()` factory × 14 dans `PropertyForm` |
| `Input.tsx`, `Textarea.tsx`, `Select.tsx` | `inputClass`/`labelClass` inline partout |
| `Badge.tsx` | Badges privé/public dupliqués (dashboard + detail) |
| `SectionHeading.tsx` | `<h2>` styling incohérent |

**Indépendant** de toutes les phases lib.

---

### Phase 8 — Décomposition de PropertyDetail

Sections extraites (chacune reçoit des props, pas d'état partagé sauf exceptions) :

- `useMarketData.ts` — hook pour le fetch au mount
- `PropertyHeader.tsx` — ville, adresse, date, actions edit/delete
- `PropertyGallery.tsx` — galerie horizontale
- `PropertyInfoPanel.tsx` — prix, surface, type, description
- `FinancingPanel.tsx` — grille de financement
- `ClassicYieldPanel.tsx` — 6 `<StatCard>` location classique
- `AirbnbYieldPanel.tsx` — 6 `<StatCard>` Airbnb
- `MarketDataPanel.tsx` — section marché DVF + loyers
- `RescrapePanel.tsx` — possède son propre état (rescrape + paste-texte)

**Résultat :** `PropertyDetail.tsx` tombe à ~50 lignes.

**Dépend de :** Phase 7

---

### Phase 9 — Décomposition de PropertyForm

**Principe :** Chaque section reçoit `form` (lecture seule) + `onChange(field, value)`. L'état reste dans l'orchestrateur.

- `useLoanAutoCalc.ts` — hook : `loanManuallySet` + recalcul automatique
- `ScrapeImportSection.tsx` — possède son état de scraping, callback `onScrapeError`
- `PropertyInfoSection.tsx`, `LoanSection.tsx`, `FeesSection.tsx` — sections contrôlées
- `ClassicRentalSection.tsx`, `AirbnbSection.tsx` — sections avec aperçu live
- `ResultsSummarySection.tsx` — pur affichage, reçoit uniquement `calcs`

**Résultat :** `PropertyForm.tsx` tombe à ~120 lignes.

**Dépend de :** Phase 7

---

### Phase 10 — Décomposition de DashboardClient

- `SortBar.tsx` — chips de tri mobile
- `PropertyCard.tsx` — carte mobile (une propriété)
- `PropertyTable.tsx` + `PropertyTableRow.tsx` — tableau desktop
- `DashboardClient.tsx` — ~60 lignes d'orchestration

**Dépend de :** Phase 7

---

### Phase 11 — Suppression des shims de re-export

Mise à jour de tous les imports dans `app/**/*.tsx` et `components/**/*.tsx` vers les chemins domaine directs. Suppression de `src/lib/db.ts`, `src/lib/actions.ts`, `src/lib/calculations.ts`, `src/lib/market-data.ts`, `src/lib/auth.ts`, `src/lib/auth-actions.ts`, `src/lib/scraping/`.

---

### Phase 12 — Co-localisation des composants auth (optionnel)

Déplacer `LoginForm.tsx`, `RegisterForm.tsx` → `src/components/auth/`.

---

## Résumé des gains

| Avant | Après |
|---|---|
| `PropertyForm.tsx` : 611 lignes | Orchestrateur ~120 lignes + 8 sections + 1 hook |
| `PropertyDetail.tsx` : 526 lignes | Orchestrateur ~50 lignes + 9 sections + 1 hook |
| `db.ts` : 3 domaines mélangés | 3 repositories isolés + 1 client infra |
| Appel Gemini dupliqué × 3 | 1 seul `callGemini()` dans infrastructure |
| Logique prefill dupliquée × 2 | 1 `prefill.ts` centralisé |
| `numInput()` factory locale × 14 | `<NumberInput>` réutilisable |
| `statCard()` closure locale × 12 | `<StatCard>` réutilisable |
| SVG spinner dupliqué × 4 | `<Spinner>` unique |
| Types dans `src/types/` | Co-localisés dans leurs domaines |
