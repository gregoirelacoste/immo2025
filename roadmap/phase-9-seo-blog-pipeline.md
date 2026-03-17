# Phase 9 — Blog SEO/GEO automatisé + Pipeline d'enrichissement données

## Objectif

Créer une pipeline 100% automatisée qui produit quotidiennement :
1. **Un article éditorial** optimisé SEO/GEO sur l'immobilier d'investissement
2. **Des données structurées** injectées dans `locality_data` pour enrichir l'app

Le blog sert de canal d'acquisition utilisateurs (SEO + réseaux sociaux) ET de moteur de recherche IA qui alimente la base de données localités.

**Business model à terme :** sponsoring / affiliation (assurances, courtiers, outils).

---

## Décision technique

### Next.js SSG dans le monorepo (pas HTML pur séparé)

| Critère | HTML pur séparé | Next.js SSG (choisi) |
|---------|----------------|---------------------|
| Performance | ~15 Ko HTML | ~15 Ko HTML (identique via SSG) |
| Pipeline de build | Cron + FTP/Git séparé | Intégré au build existant |
| Styles | CSS dupliqué | Même Tailwind |
| Lien blog→app | Lien externe | `<Link>` natif avec prefetching |
| SEO natif | Manuel (sitemap, robots) | API Next.js (`sitemap.ts`, `robots.ts`, metadata) |
| JSON-LD | Manuel | API metadata native |
| Données localités | Fetch API ou dupliquer | Appel direct des fonctions serveur |
| Auth middleware | N/A | Permissif — routes publiques OK nativement |
| Déploiement | Séparé | Même Vercel, même domaine |

**Résultat :** Pages statiques CDN < 20 Ko, zéro JS client, même performance qu'un fichier HTML pur.

---

## Architecture

```
src/app/
  blog/                              # Route groupe publique (pas d'auth)
    layout.tsx                       # Layout minimal SEO : branding léger, nav blog/guides/app
    page.tsx                         # Index blog : liste paginée des articles
    [slug]/
      page.tsx                       # Article individuel (SSG/ISR)
  guide/                             # Pages villes statiques
    layout.tsx
    page.tsx                         # Index : classement villes par rendement
    [city]/
      page.tsx                       # Guide investissement ville (SSG)
  robots.ts                          # robots.txt (allow all, ref sitemap)
  sitemap.ts                         # Sitemap XML dynamique (guides + articles)

src/domains/blog/                    # Nouveau module domaine
  types.ts                           # Article, NewsSource, ArticleCategory
  news-fetcher.ts                    # Agrégation actus immo (RSS, APIs, web)
  article-generator.ts              # Génération article + données via Gemini
  article-repository.ts             # CRUD articles dans SQLite
  data-injector.ts                  # Injection données extraites → locality_data
  internal-linker.ts                # Maillage interne automatique
  social-publisher.ts               # Publication réseaux sociaux

src/domains/seo/                     # Module SEO partagé
  json-ld.ts                        # Générateurs JSON-LD (Article, Place, LocalBusiness)
  city-guide-builder.ts             # Assemblage données villes pour guides
  sitemap-builder.ts                # Collecte URLs publiques

scripts/
  publish-daily.ts                   # Script cron quotidien
```

---

## Sous-phase 9.1 — Fondations SEO + Guides Villes

**Objectif :** Base SEO + pages data-driven par ville. Zéro IA, zéro risque pénalité Google.

### 9.1.1 Infrastructure SEO de base

**Fichiers à créer :**
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `src/domains/seo/sitemap-builder.ts`

**Tâches :**
- [ ] `robots.ts` — Allow all crawlers, référence sitemap URL
- [ ] `sitemap.ts` — Génère sitemap XML dynamique (guides + futurs articles)
- [ ] `sitemap-builder.ts` — Collecte toutes les URLs publiques (guides, articles, index)

### 9.1.2 Layout public minimal

**Fichiers à créer :**
- `src/app/guide/layout.tsx`
- `src/app/blog/layout.tsx` (préparation Phase 9.2)

**Design "Reader-First" :**
- Fond blanc, texte gris très foncé
- Typographie large (18px+) pour lisibilité mobile
- Zéro popup, zéro bruit visuel
- Navigation : Blog | Guides | Simuler (lien vers l'app)
- Branding tiili discret dans le header

**Tâches :**
- [ ] Layout partagé blog/guide : HTML sémantique, Tailwind minimal
- [ ] Header : logo tiili + nav (Blog, Guides, "Simuler →")
- [ ] Footer : mentions légales, liens internes, CTA app
- [ ] Pas d'auth, pas de PWA chrome (service worker, bottom nav)

### 9.1.3 Guides d'investissement par ville

**Fichiers à créer :**
- `src/app/guide/page.tsx`
- `src/app/guide/[city]/page.tsx`
- `src/domains/seo/city-guide-builder.ts`
- `src/domains/seo/json-ld.ts`

**Route `/guide/[city]`** — SSG via `generateStaticParams` (1 page par ville en DB).

**Contenu basé sur `LocalityDataFields` + DVF :**

| Section | Données | Source |
|---------|---------|--------|
| Prix immobilier | Moy/médian au m², nb transactions | `avg_purchase_price_per_m2`, DVF |
| Marché locatif | Loyer nu, meublé, vacance | `avg_rent_per_m2`, `vacancy_rate` |
| Rendement estimé | Brut calculé (loyer×12 / prix) | Calcul depuis les 2 sources |
| Airbnb | Prix nuit, taux occupation | `avg_airbnb_night_price`, `avg_airbnb_occupancy_rate` |
| Socio-économique | Population, revenus, chômage | `population`, `median_income`, `unemployment_rate` |
| Infrastructure | Écoles, transports, université | `school_count`, `public_transport_score` |
| Risques | Niveau, risques naturels | `risk_level`, `natural_risks` |
| Simulation type | "Investir dans un T2 de 50m² à [Ville]" | Calcul avec `calculateAll()` |

**SEO par page :**
- `<title>` : "Investir à Lyon : prix, loyers et rendement locatif 2026"
- `<meta description>` : dynamique avec prix/m² et rendement
- JSON-LD `@type: Article` + `@type: Place` + `@type: FAQPage`
- OG tags dynamiques (titre, description, image générée?)
- CTA : "Simulez votre investissement à [Ville] sur tiili →"

**Tâches :**
- [ ] `city-guide-builder.ts` — assemble `LocalityDataFields` + DVF + calculs pour une ville
- [ ] `json-ld.ts` — générateur JSON-LD (Article, Place, FAQ)
- [ ] `/guide/[city]/page.tsx` — template server component avec `generateStaticParams` + `generateMetadata`
- [ ] `/guide/page.tsx` — index : tableau trié par rendement, filtrable par région/prix
- [ ] Maillage interne : chaque guide lie vers 3-5 villes proches/similaires

---

## Sous-phase 9.2 — Pipeline blog automatisé quotidien

**Objectif :** 1 article/jour, 100% automatisé, avec extraction de données pour l'app.

### 9.2.1 Table `blog_articles`

**Fichier à modifier :**
- `src/infrastructure/database/client.ts` — nouvelle migration

```sql
CREATE TABLE IF NOT EXISTS blog_articles (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,              -- HTML de l'article
  excerpt TEXT,
  meta_description TEXT,
  json_ld TEXT,                       -- JSON-LD sérialisé
  source_urls TEXT,                   -- JSON array des sources utilisées
  category TEXT NOT NULL,             -- guide_ville | actu_marche | conseil_investissement | fiscalite | financement
  locality_id TEXT,                   -- FK optionnel vers localities
  tags TEXT,                          -- JSON array
  extracted_data TEXT,                -- JSON: données structurées extraites pour l'app
  data_injected INTEGER DEFAULT 0,   -- flag: données injectées dans locality_data ?
  status TEXT DEFAULT 'draft',        -- draft | published | archived
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_blog_articles_slug ON blog_articles(slug);
CREATE INDEX idx_blog_articles_status ON blog_articles(status, published_at DESC);
CREATE INDEX idx_blog_articles_category ON blog_articles(category);
CREATE INDEX idx_blog_articles_locality ON blog_articles(locality_id);
```

### 9.2.2 Catégories d'articles

| Catégorie | Contenu éditorial | Données extraites pour l'app |
|-----------|-------------------|------------------------------|
| `guide_ville` | Guide investissement complet d'une ville/quartier | `LocalityDataFields` enrichi |
| `actu_marche` | Analyse d'une actualité marché avec angle investisseur | Tendances prix, taux, prévisions |
| `conseil_investissement` | Article thématique (rendement, LMNP, défiscalisation...) | — |
| `fiscalite` | Décryptage fiscal (PLF, impôts, niches) | Taux/seuils fiscaux à jour |
| `financement` | Taux d'intérêt, assurances, courtiers | Taux actuels, comparatifs |

### 9.2.3 Extension de `LocalityDataFields`

**Fichier à modifier :**
- `src/domains/locality/types.ts`

Nouveaux champs pour les données extraites par l'IA :

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
poi_summary?: string | null;                   // Résumé textuel des atouts de la ville
main_employers?: string[] | null;              // Employeurs principaux de la zone
transport_details?: string | null;             // Détail transports (lignes, gares, temps vers métropole)
neighborhood_vibe?: string | null;             // Ambiance / profil de la ville

// Tendances marché
price_trend_1y_pct?: number | null;            // Évolution prix sur 1 an (%)
rent_trend_1y_pct?: number | null;             // Évolution loyers sur 1 an (%)
market_tension?: "tendu" | "équilibré" | "détendu" | null;
```

**Tâches :**
- [ ] Ajouter les nouveaux champs à `LocalityDataFields`
- [ ] Ajouter les clés dans `LOCALITY_DATA_FIELD_KEYS`
- [ ] Mettre à jour le resolver pour supporter ces champs (fallback parent)
- [ ] Mettre à jour l'admin panel si nécessaire

### 9.2.4 News Fetcher

**Fichier à créer :**
- `src/domains/blog/news-fetcher.ts`

**Sources d'actualités :**
- Flux RSS : SeLoger, PAP, Le Figaro Immo, Les Echos Immo, Capital Immo
- Google News RSS (`query "immobilier investissement locatif"`)
- DVF API : dernières transactions significatives par ville
- INSEE : publications statistiques récentes
- **Source interne** : villes avec `locality_data` obsolètes ou incomplètes → sujet de guide ville

**Sélection :** mots-clés investissement, fiscalité, marché, villes ciblées.

**Output :**
```typescript
interface NewsItem {
  title: string;
  url: string;
  summary: string;
  date: string;
  city?: string;
  suggestedCategory: ArticleCategory;
}
```

**Tâches :**
- [ ] Parser RSS (SeLoger, PAP, Figaro Immo, Echos, Capital)
- [ ] Parser Google News RSS avec filtres pertinents
- [ ] Identifier les villes avec données incomplètes → proposer comme sujet guide
- [ ] Scorer la pertinence des sujets (investissement > actu générale)
- [ ] Dédupliquer par similarité de titre

### 9.2.5 Article Generator (double output)

**Fichier à créer :**
- `src/domains/blog/article-generator.ts`

Le prompt Gemini demande **deux outputs** dans chaque appel :

```
Tu es un rédacteur expert en investissement immobilier locatif en France.

À partir des sources suivantes, produis :

1. UN ARTICLE éditorial (HTML) :
   - Titre accrocheur, angle investisseur
   - Données chiffrées intégrées naturellement
   - Maillage : liens vers [liste guides villes existants]
   - CTA : "Simulez cet investissement sur tiili.fr"
   - 800-1500 mots, ton expert accessible
   - HTML sémantique : <h2>, <h3>, <p>, <ul>, <table>, <blockquote>

2. UN BLOC DE DONNÉES STRUCTURÉES (JSON) :
   - Si article ville/quartier : extraire les LocalityDataFields
     (prix segmentés par type, loyers, POI, tendances, infra...)
   - Si article taux/assurances : extraire données financières
   - Format : { locality_data?: Partial<LocalityDataFields>, financial_data?: {...} }

Réponds en JSON :
{
  article: { title, slug, content, excerpt, meta_description, tags },
  extracted_data: { locality_data?: ..., financial_data?: ... }
}
```

**Tâches :**
- [ ] Prompt system structuré avec exemples de format attendu
- [ ] Injection du contexte : données existantes de la ville, articles récents, guides publiés
- [ ] Validation post-génération : longueur min 800 mots, présence données chiffrées, HTML valide
- [ ] Génération du JSON-LD `@type: Article` automatique
- [ ] Retry avec feedback d'erreur si validation échoue (max 3 tentatives)

### 9.2.6 Data Injector

**Fichier à créer :**
- `src/domains/blog/data-injector.ts`

Après génération de l'article, injecte les données dans `locality_data` :

```
1. Lire extracted_data.locality_data du blog_article
2. Identifier la locality_id (via city name → resolveLocality)
3. Charger le snapshot locality_data actuel
4. Merger : nouvelles données complètent les existantes (ne jamais écraser les données manuelles)
5. Créer un nouveau snapshot :
   - valid_from = date du jour
   - created_by = "blog-ai-research"
6. Flag blog_articles.data_injected = 1
```

**Règles de merge :**
- Si un champ existe déjà avec `created_by != "blog-ai-research"` → ne pas écraser (donnée manuelle prioritaire)
- Si un champ existe avec `created_by = "blog-ai-research"` → mettre à jour si la nouvelle valeur est plus récente
- Si un champ est vide → injecter la donnée IA

**Tâches :**
- [ ] Résolution ville → `locality_id`
- [ ] Merge intelligent avec priorité aux données manuelles
- [ ] Création snapshot `locality_data` avec traçabilité `created_by`
- [ ] Validation : bornes réalistes (prix 500-25000€/m², loyer 5-50€/m², etc.)
- [ ] Log détaillé des injections pour audit

### 9.2.7 Script Cron quotidien

**Fichier à créer :**
- `scripts/publish-daily.ts`
- `.github/workflows/daily-article.yml`

**Flow :**
```
1. newsFetcher.fetchLatest()            → sujets du jour
2. Sélectionner sujet + catégorie       → choix éditorial (scoring pertinence)
3. Charger contexte                     → LocalityDataFields si ville, articles récents
4. articleGenerator.generate()          → article HTML + extracted_data
5. articleRepository.save()             → insert en base (status = 'published')
6. dataInjector.inject()               → enrichir locality_data si applicable
7. revalidatePath('/blog')             → mise à jour ISR blog
8. revalidatePath('/guide/[city]')     → guide ville mis à jour si nouvelles données
9. Log succès                           → monitoring
```

**Déclenchement :** GitHub Actions cron `0 6 * * *` (6h chaque matin) ou Vercel Cron.

**Tâches :**
- [ ] Script TypeScript exécutable standalone (`tsx scripts/publish-daily.ts`)
- [ ] GitHub Actions workflow avec cron schedule
- [ ] Retry Gemini avec backoff exponentiel (max 3)
- [ ] Fallback si aucune actu : choisir une ville avec données incomplètes → guide_ville
- [ ] Monitoring : log JSON pour tracking (articles publiés, données injectées, erreurs)

### 9.2.8 Routes blog

**Fichiers à créer :**
- `src/app/blog/page.tsx`
- `src/app/blog/[slug]/page.tsx`
- `src/domains/blog/article-repository.ts`

**`/blog`** — Index paginé :
- Liste articles par date (derniers en premier)
- Filtrable par catégorie (chips)
- Card : titre, extrait, date, catégorie, ville liée
- ISR `revalidate = 3600` (1h)

**`/blog/[slug]`** — Article complet :
- HTML sémantique de l'article
- JSON-LD `@type: Article`
- OG tags dynamiques
- Sidebar : guides villes liés, articles similaires
- CTA bas de page : "Simulez sur tiili →"
- ISR `revalidate = 3600`

**Tâches :**
- [ ] `article-repository.ts` — CRUD (getAll, getBySlug, save, updateStatus)
- [ ] `/blog/page.tsx` — index paginé avec `generateMetadata`
- [ ] `/blog/[slug]/page.tsx` — article avec `generateMetadata` + `generateStaticParams`
- [ ] Pagination côté serveur (10 articles/page)
- [ ] Fil d'Ariane : Blog > [Catégorie] > [Article]

---

## Sous-phase 9.3 — Réseaux sociaux + Affiliation

### 9.3.1 Publication sociale automatique

**Fichier à créer :**
- `src/domains/blog/social-publisher.ts`

Après chaque article publié :
- Résumé X/Twitter (280 chars) — accroche + lien
- Post LinkedIn long format — résumé structuré + données clés + lien
- Publication via APIs respectives (X API v2, LinkedIn Marketing API)

**Tâches :**
- [ ] Prompt Gemini pour générer les posts sociaux depuis l'article
- [ ] Client X/Twitter API v2 (post tweet)
- [ ] Client LinkedIn Marketing API (post article)
- [ ] Intégré dans le cron après publication article
- [ ] Gestion des tokens OAuth (stockage sécurisé)

### 9.3.2 Module affiliation

**Fichiers à créer :**
- `src/domains/affiliation/types.ts`
- `src/domains/affiliation/repository.ts`

**Table `partners` :**
```sql
CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,           -- assurance | courtier | outil | banque
  description TEXT,
  url TEXT NOT NULL,
  affiliate_url TEXT,               -- lien avec tracking affilié
  logo_url TEXT,
  commission_type TEXT,             -- cpc | cpl | cpa | rev_share
  commission_value REAL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
```

**Intégration dans les articles :**
- Les articles `financement` incluent des comparatifs avec liens affiliés
- L'Article Generator reçoit la liste des partenaires actifs en contexte
- Les recommandations sont naturelles (pas de placement forcé)

**Données financières pour l'app :**
Les articles `financement` alimentent une base "taux actuels" :
- Taux d'intérêt par durée (10, 15, 20, 25 ans)
- Taux assurance emprunteur moyens
- Suggestions dans le formulaire de création de bien (auto-fill du taux)

**Tâches :**
- [ ] Table `partners` + migration
- [ ] Admin : CRUD partenaires
- [ ] Injection contexte partenaires dans le prompt Article Generator
- [ ] Dashboard tracking clics affiliés
- [ ] Extraction taux d'intérêt → proposition auto dans le formulaire bien

---

## Boucle vertueuse

```
Article quotidien (Gemini)
    │
    ├── Sortie 1 : Article HTML → /blog/[slug] (SEO)
    │                                    │
    │                             Trafic organique + GEO
    │                                    │
    │                             Découverte app tiili
    │                                    │
    │                             Nouveaux utilisateurs
    │
    ├── Sortie 2 : extracted_data → locality_data DB
    │                                    │
    │                             Guides villes enrichis (ISR auto)
    │                                    │
    │                             Meilleur SEO (contenu plus riche)
    │                                    │
    │                             Plus de trafic
    │
    └── Sortie 3 : Posts sociaux → X + LinkedIn
                                         │
                                  Trafic direct + notoriété
                                         │
                                  Utilisateurs app + abonnés
```

---

## Risques et mitigations

| Risque | Mitigation |
|--------|-----------|
| Pénalité Google "content farm" | Phase 9.1 = données réelles uniquement. Phase 9.2 = IA enrichit des données factuelles DVF/INSEE, contenu unique par ville |
| Coût API Gemini | Flash-Lite ~0.001€/article, < 1€/mois pour 1 article/jour |
| Sources RSS indisponibles | Fallback : villes avec données incomplètes = sujet de guide automatique |
| Qualité données extraites | Validation avant injection : bornes réalistes, cohérence avec historique, `created_by` pour audit |
| Données IA incorrectes dans l'app | `created_by = "blog-ai-research"` filtre les données IA ; données manuelles jamais écrasées |
| SEO lent à décoller | Guides villes = socle immédiat (~60 pages) ; blog quotidien construit l'autorité |
| APIs sociales (rate limits, tokens) | Queue de publication avec retry ; tokens OAuth refresh automatique |
| Contenu IA détecté | Ton éditorial expert + données chiffrées locales = difficile à distinguer du rédactionnel humain |

---

## Dépendances

| Dépendance | Impact |
|-----------|--------|
| Données `locality_data` existantes | Phase 9.1 plus riche si villes déjà peuplées |
| `GEMINI_API_KEY` configurée | Requis pour Phase 9.2+ |
| Vercel Cron ou GitHub Actions | Requis pour automatisation quotidienne |
| APIs sociales (X, LinkedIn) | Requis pour Phase 9.3.1 |
| Partenaires affiliés | Requis pour Phase 9.3.2 (business model) |
