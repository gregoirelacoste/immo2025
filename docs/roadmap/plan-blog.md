# Plan : Blog SEO/GEO automatisé + Pipeline d'enrichissement données

## Vision

**Pipeline bidirectionnelle 100% automatisée :**
1. **Sortie (SEO)** → Articles éditoriaux publiés quotidiennement sur un blog immobilier investissement
2. **Entrée (Data)** → Données structurées extraites par l'IA pour enrichir `locality_data` et alimenter l'app

Le blog n'est pas juste du marketing — c'est un **moteur de recherche IA** qui produit du contenu éditorial ET des données exploitables.

**Business model à terme :** Sponsoring / affiliation (assurances, courtiers, outils)

---

## Décision technique : Next.js SSG dans le monorepo

**Pourquoi Next.js static routes (pas HTML pur séparé) :**
1. Le middleware n'impose pas d'auth — routes publiques OK nativement
2. `generateStaticParams` + ISR = HTML statique CDN, zéro JS côté client
3. JSON-LD, OG tags, `sitemap.ts`, `robots.ts` = API natives Next.js
4. Même Tailwind, même domaine, même déploiement
5. Données localités/marché déjà côté serveur, réutilisables directement
6. `callGemini()` fonctionne dans le contexte Next.js build-time

**Résultat : pages < 20 Ko, même perf qu'un HTML pur, sans pipeline séparé.**

---

## Architecture

```
src/app/
  blog/                              # Route groupe publique
    layout.tsx                       # Layout minimal SEO (pas d'auth, pas de PWA chrome)
    page.tsx                         # Index blog : liste paginée des articles
    [slug]/
      page.tsx                       # Article individuel (SSG/ISR)
  guide/                             # Pages villes statiques
    layout.tsx
    page.tsx                         # Index guides : classement villes
    [city]/
      page.tsx                       # Guide investissement ville (SSG)
  robots.ts                          # robots.txt
  sitemap.ts                         # Sitemap XML dynamique

src/domains/blog/                    # Nouveau module domaine
  types.ts                           # Article, NewsSource, ArticleCategory
  news-fetcher.ts                    # Agrégation actus immo (RSS, APIs, web)
  article-generator.ts              # Génération article + données via Gemini
  article-repository.ts             # CRUD articles dans SQLite
  internal-linker.ts                # Maillage interne automatique
  social-publisher.ts               # Publication réseaux sociaux

src/domains/seo/                     # Module SEO partagé
  json-ld.ts                        # Générateurs JSON-LD
  city-guide-builder.ts             # Assemblage données villes pour guides
  sitemap-builder.ts                # Collecte URLs publiques

scripts/
  publish-daily.ts                   # Script cron : recherche → article → données → publication
```

---

## Phase 1 : Fondations SEO + Guides Villes (semaine 1)

**Objectif :** Base SEO + pages villes data-driven. Zéro IA, zéro risque Google.

### 1.1 — Infrastructure SEO de base
- `src/app/robots.ts` — Allow crawlers, référence sitemap
- `src/app/sitemap.ts` — Sitemap XML dynamique (guides + futurs articles)
- Layout public minimal : Tailwind, branding léger, navigation blog/guides/app

### 1.2 — Guides d'investissement par ville
- Route `/guide/[city]` — SSG via `generateStaticParams` (1 page par ville en DB)
- Contenu basé sur `LocalityDataFields` existantes + DVF :
  - Prix moyen/médian au m²
  - Loyers moyens (nu + meublé)
  - Rendement brut estimé
  - Airbnb : prix nuit + occupation
  - Vacance locative
  - Socio-éco : population, revenus, chômage
  - Infra : écoles, transports, université
  - Risques naturels
  - Simulation type : "T2 de 50m² à [Ville]"
- JSON-LD `@type: Article` + `@type: Place`
- OG tags dynamiques
- CTA vers l'app : "Simulez votre investissement à [Ville]"

### 1.3 — Index `/guide`
- Classement villes par rendement brut estimé
- Tableau avec métriques clés (prix, loyer, rendement, population)
- Filtres : région, tranche de prix, rendement

---

## Phase 2 : Pipeline automatisé quotidien (semaine 2-3)

**Objectif :** 1 article/jour = 1 contenu SEO + données structurées pour l'app.

### 2.1 — Nouvelle table `blog_articles`
```sql
CREATE TABLE blog_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,              -- HTML article
  excerpt TEXT,
  meta_description TEXT,
  json_ld TEXT,                       -- JSON-LD sérialisé
  source_urls TEXT,                   -- JSON array sources
  category TEXT NOT NULL,             -- 'guide_ville' | 'actu_marche' | 'conseil_investissement' | 'fiscalite' | 'financement'
  locality_id TEXT,                   -- FK vers localities (si article lié à une ville)
  tags TEXT,                          -- JSON array
  extracted_data TEXT,                -- JSON: données structurées extraites pour l'app
  data_injected BOOLEAN DEFAULT 0,   -- flag: données injectées dans locality_data ?
  status TEXT DEFAULT 'draft',        -- draft | published | archived
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 2.2 — Catégories d'articles et données extraites

| Catégorie | Contenu éditorial | Données extraites pour l'app |
|-----------|-------------------|------------------------------|
| `guide_ville` | Guide investissement complet d'une ville/quartier | `LocalityDataFields` enrichi (prix par type de bien, POI, tendances) |
| `actu_marche` | Analyse d'une actualité marché avec angle investisseur | Tendances prix, taux, prévisions |
| `conseil_investissement` | Article thématique (rendement, défiscalisation, LMNP...) | — |
| `fiscalite` | Décryptage fiscal (PLF, impôts, niches) | Taux/seuils fiscaux à jour |
| `financement` | Taux d'intérêt, assurances, courtiers | Taux actuels, comparatifs assurances/banques |

### 2.3 — Extension de `LocalityDataFields`

Nouveaux champs à ajouter pour les données extraites par l'IA :

```typescript
// Prix segmentés par type de bien
avg_price_studio_per_m2?: number | null;       // Studio/T1
avg_price_small_apt_per_m2?: number | null;    // T2-T3
avg_price_large_apt_per_m2?: number | null;    // T4+
avg_price_house_per_m2?: number | null;        // Maison

// Loyers segmentés
avg_rent_studio_per_m2?: number | null;
avg_rent_small_apt_per_m2?: number | null;
avg_rent_large_apt_per_m2?: number | null;
avg_rent_house_per_m2?: number | null;

// Points d'intérêt
poi_summary?: string | null;                   // Résumé textuel des atouts
main_employers?: string[] | null;              // Employeurs principaux
transport_details?: string | null;             // Détail transports (lignes, gares)
neighborhood_vibe?: string | null;             // Ambiance quartier

// Tendances
price_trend_1y_pct?: number | null;            // Évolution prix sur 1 an
rent_trend_1y_pct?: number | null;             // Évolution loyers sur 1 an
market_tension?: "tendu" | "équilibré" | "détendu" | null;
```

### 2.4 — News Fetcher (`news-fetcher.ts`)
Sources d'actualités :
- Flux RSS : SeLoger, PAP, Le Figaro Immo, Les Echos Immo, Capital Immo
- Google News RSS (query "immobilier investissement locatif")
- DVF API : dernières transactions significatives
- INSEE : publications statistiques récentes
- Données internes : villes avec locality_data obsolètes ou incomplètes

Sélection par pertinence (mots-clés investissement, fiscalité, marché, villes).

Output : `{ title, url, summary, date, city?, category }[]`

### 2.5 — Article Generator (`article-generator.ts`)

**Double output** — le prompt Gemini demande explicitement :

```
Tu es un rédacteur expert en investissement immobilier locatif en France.

À partir des sources suivantes, produis :

1. UN ARTICLE éditorial (HTML) :
   - Titre accrocheur, angle investisseur
   - Données chiffrées intégrées naturellement dans le texte
   - Maillage : liens vers [liste des guides villes existants]
   - CTA : "Simulez cet investissement sur tiili.io"
   - Longueur : 800-1500 mots
   - Ton : expert accessible, pas commercial

2. UN BLOC DE DONNÉES STRUCTURÉES (JSON) :
   - Si l'article concerne une ville/quartier : extraire les LocalityDataFields
   - Si l'article concerne les taux/assurances : extraire les données financières
   - Format : { locality_data?: LocalityDataFields, financial_data?: {...} }

Réponds en JSON : { article: { title, slug, content, excerpt, meta_description, tags }, extracted_data: {...} }
```

### 2.6 — Data Injection Pipeline

Après génération de l'article :
1. `extracted_data` sauvegardé dans `blog_articles.extracted_data`
2. Si `locality_id` identifié → créer un nouveau snapshot `locality_data` avec :
   - `valid_from` = date du jour
   - `created_by` = "blog-ai-research"
   - Merge avec données existantes (ne pas écraser les données manuelles)
3. Flag `data_injected = 1` une fois injecté
4. Les guides villes se mettent à jour automatiquement (ISR)

### 2.7 — Script cron (`scripts/publish-daily.ts`)

```
1. newsFetcher.fetchLatest()           → sujets du jour
2. Sélectionner le sujet + catégorie   → choix éditorial
3. Charger les données existantes      → contexte LocalityDataFields si ville
4. articleGenerator.generate()         → article + extracted_data
5. articleRepository.save()            → insert en base
6. dataInjector.inject()              → enrichir locality_data si applicable
7. revalidatePath('/blog')            → mise à jour ISR
8. revalidatePath('/guide/[city]')    → guide ville mis à jour si nouvelles données
```

Déclenché par : GitHub Actions scheduled workflow (cron `0 6 * * *` = 6h chaque matin) ou Vercel Cron.

### 2.8 — Routes blog
- `/blog` — Liste paginée, filtrable par catégorie
- `/blog/[slug]` — Article complet, JSON-LD, OG tags
- ISR `revalidate = 3600`

---

## Phase 3 : Réseaux sociaux + Affiliation (semaine 4+)

### 3.1 — Publication sociale automatique
Après chaque article :
- Résumé X/Twitter (280 chars)
- Post LinkedIn long format
- Publication via APIs respectives

### 3.2 — Module affiliation
- Nouvelle table `partners` (assurances, courtiers, outils)
- Articles "financement" incluent des comparatifs avec liens affiliés
- Dashboard admin pour gérer les partenaires et tracker les clics
- L'article Generator reçoit la liste des partenaires actifs en contexte

### 3.3 — Données financières pour l'app
Les articles "financement" alimentent une base de données :
- Taux d'intérêt actuels par durée (10, 15, 20, 25 ans)
- Taux d'assurance emprunteur moyens
- Barèmes courtiers
- Accessible depuis le formulaire de création de propriété (suggestions auto)

---

## Fichiers à créer/modifier

| Fichier | Action | Phase |
|---------|--------|-------|
| `src/app/robots.ts` | Créer | 1 |
| `src/app/sitemap.ts` | Créer | 1 |
| `src/app/guide/layout.tsx` | Créer | 1 |
| `src/app/guide/page.tsx` | Créer | 1 |
| `src/app/guide/[city]/page.tsx` | Créer | 1 |
| `src/domains/seo/json-ld.ts` | Créer | 1 |
| `src/domains/seo/city-guide-builder.ts` | Créer | 1 |
| `src/domains/seo/sitemap-builder.ts` | Créer | 1 |
| `src/domains/locality/types.ts` | Modifier (nouveaux champs) | 2 |
| `src/domains/blog/types.ts` | Créer | 2 |
| `src/domains/blog/news-fetcher.ts` | Créer | 2 |
| `src/domains/blog/article-generator.ts` | Créer | 2 |
| `src/domains/blog/article-repository.ts` | Créer | 2 |
| `src/domains/blog/data-injector.ts` | Créer | 2 |
| `src/domains/blog/internal-linker.ts` | Créer | 2 |
| `src/app/blog/layout.tsx` | Créer | 2 |
| `src/app/blog/page.tsx` | Créer | 2 |
| `src/app/blog/[slug]/page.tsx` | Créer | 2 |
| `scripts/publish-daily.ts` | Créer | 2 |
| `.github/workflows/daily-article.yml` | Créer | 2 |
| `src/infrastructure/database/client.ts` | Modifier (migration blog_articles) | 2 |
| `src/domains/blog/social-publisher.ts` | Créer | 3 |
| `src/domains/affiliation/types.ts` | Créer | 3 |
| `src/domains/affiliation/repository.ts` | Créer | 3 |

---

## Boucle vertueuse

```
Article quotidien
    ↓
Données extraites → locality_data enrichi
    ↓
Guides villes plus complets (ISR auto-update)
    ↓
Meilleur SEO (contenu plus riche)
    ↓
Plus de trafic → Plus d'utilisateurs app
    ↓
Plus de données d'usage → Meilleurs articles
```

---

## Risques et mitigations

| Risque | Mitigation |
|--------|-----------|
| Pénalité Google "content farm" | Données propriétaires (DVF, localités) injectées = contenu unique et factuel |
| Coût API Gemini | Flash-Lite ~0.001$/article, ~$1/mois pour 1 article/jour |
| Sources RSS indisponibles | Fallback : villes avec données incomplètes = sujet de recherche |
| Qualité données extraites | Validation avant injection : cohérence avec données existantes, bornes réalistes |
| Données IA incorrectes dans l'app | `created_by = "blog-ai-research"` permet de filtrer/auditer ; ne jamais écraser les données manuelles |
| SEO lent à décoller | Guides villes = socle immédiat ; blog quotidien construit l'autorité |
