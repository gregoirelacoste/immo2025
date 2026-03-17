# Plan : Blog SEO/GEO automatisé pour Immo2025

## Vision

Pipeline 100% automatisé : **recherche actu → rédaction IA → publication quotidienne** sur un blog immobilier investissement, colé à l'app tiili, pour attirer des utilisateurs via SEO et GEO.

---

## Décision technique : Next.js SSG dans le monorepo (pas HTML pur séparé)

**Pourquoi pas un projet HTML séparé :**
- Pipeline de build séparé, infrastructure cron, déploiement distinct à maintenir
- CSS/styles dupliqués
- Pas de lien natif entre le blog et l'app (pas de `<Link>` prefetching)
- Gemini fonctionne déjà dans le contexte Next.js

**Pourquoi Next.js static routes dans l'app existante :**
1. Le middleware n'impose pas d'auth — les routes publiques marchent nativement
2. `generateStaticParams` + ISR (`revalidate = 86400`) = HTML statique servi par CDN, zéro JS
3. JSON-LD, OG tags, `sitemap.ts`, `robots.ts` sont des API natives Next.js
4. Même Tailwind, même domaine, même déploiement
5. Les données localités/marché (~60 villes, DVF, loyers) sont déjà côté serveur

**Résultat : pages statiques ultra-légères (< 20 Ko), même performance qu'un fichier HTML pur, mais sans la complexité d'un pipeline séparé.**

---

## Architecture

```
src/app/
  blog/                              # Route groupe publique
    layout.tsx                       # Layout minimal (pas d'auth, pas de PWA chrome)
    page.tsx                         # Index blog : liste des articles
    [slug]/
      page.tsx                       # Article individuel (SSG)
  guide/                             # Pages villes statiques (Phase 1)
    layout.tsx
    page.tsx                         # Index guides villes
    [city]/
      page.tsx                       # Guide investissement par ville
  robots.ts                          # robots.txt
  sitemap.ts                         # Sitemap XML dynamique

src/domains/blog/                    # Nouveau module domaine
  types.ts                           # Article, BlogMeta, NewsSource
  news-fetcher.ts                    # Recherche d'actus immobilières (RSS, APIs)
  article-generator.ts              # Génération article via Gemini
  article-repository.ts             # CRUD articles dans SQLite
  internal-linker.ts                # Maillage interne automatique
  social-publisher.ts               # Publication réseaux sociaux (Phase 3)

src/domains/seo/                     # Module SEO partagé
  json-ld.ts                        # Générateurs JSON-LD (Article, LocalBusiness, etc.)
  city-guide-builder.ts             # Assemblage données villes
  sitemap-builder.ts                # Collecte URLs publiques
```

---

## Phase 1 : Fondations SEO + Guides Villes (semaine 1)

**Objectif :** Poser la base SEO et publier ~60 pages de guides d'investissement par ville, 100% data-driven (pas d'IA nécessaire).

### 1.1 — Infrastructure SEO de base
- `src/app/robots.ts` — Allow all crawlers, sitemap URL
- `src/app/sitemap.ts` — Génère sitemap XML dynamique (guides + futurs articles)
- Layout minimal pour les pages publiques (pas d'auth, Tailwind minimal, branding léger)

### 1.2 — Guides d'investissement par ville
- Route `/guide/[city]` — Une page par ville dans la base localités
- Contenu 100% basé sur les données réelles :
  - Prix moyen au m² (DVF)
  - Loyers moyens (observatoire)
  - Rendement brut estimé
  - Prix Airbnb moyen + taux d'occupation
  - Taux de vacance locative
  - Données socio-économiques
  - Simulation type : "investir dans un T2 de 50m² à Lyon"
- JSON-LD `@type: Article` + `@type: Place`
- OG tags avec titre/description dynamiques
- Zero IA = zéro risque de pénalité Google

### 1.3 — Page index `/guide`
- Liste des villes triées par rendement, avec aperçu des métriques clés
- Liens internes vers chaque guide

---

## Phase 2 : Pipeline blog automatisé (semaine 2-3)

**Objectif :** 1 article/jour, 100% automatisé.

### 2.1 — Table `blog_articles` dans SQLite
```sql
CREATE TABLE blog_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,          -- HTML de l'article
  excerpt TEXT,
  meta_description TEXT,
  json_ld TEXT,                   -- JSON-LD sérialisé
  source_urls TEXT,               -- JSON array des sources d'actu
  city TEXT,                      -- ville liée (si pertinent)
  tags TEXT,                      -- JSON array
  status TEXT DEFAULT 'draft',    -- draft | published | archived
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 2.2 — News Fetcher (`news-fetcher.ts`)
- Agrège les actus immobilières depuis :
  - Flux RSS : SeLoger, PAP, Bien'ici, Le Figaro Immo, Les Echos Immo
  - Google News API (query "immobilier investissement locatif")
  - DVF API pour les dernières transactions
- Sélectionne les sujets pertinents (investissement, fiscalité, marché, villes)
- Output : `{ title, url, summary, date, city? }[]`

### 2.3 — Article Generator (`article-generator.ts`)
- Input : actu du jour + données marché de la ville concernée
- Prompt Gemini structuré :
  1. **Angle investisseur** : chaque article doit inclure un conseil actionnable
  2. **Données réelles** : injecter les chiffres DVF/loyers dans le texte
  3. **CTA naturel** : mentionner la simulation possible sur tiili
  4. **Maillage** : inclure 1-2 liens vers guides villes existants
  5. **JSON-LD** : générer le bloc structuré
- Output : `{ title, slug, content (HTML), meta_description, json_ld, tags }`
- **Anti content-farm** : le prompt insiste sur les données factuelles locales — ce n'est pas du contenu générique, c'est du contenu enrichi par des données propriétaires

### 2.4 — Script de publication (`scripts/publish-daily-article.ts`)
- Appelé par cron (GitHub Actions scheduled workflow, ou Vercel Cron)
- Flow :
  1. `newsFetcher.fetchLatest()` → sujets du jour
  2. `articleGenerator.generate(news, marketData)` → article complet
  3. `articleRepository.save(article)` → insert en base
  4. Trigger ISR revalidation (`revalidatePath('/blog')`)
  5. Log de succès/échec
- Retry avec backoff si Gemini échoue

### 2.5 — Routes blog
- `/blog` — Liste paginée des articles (derniers en premier)
- `/blog/[slug]` — Article complet avec JSON-LD, OG tags
- ISR avec `revalidate = 3600` (1h) pour que les nouveaux articles apparaissent

---

## Phase 3 : Réseaux sociaux (semaine 4+)

- `social-publisher.ts` — Après publication d'un article :
  - Génère un résumé court (280 chars pour X/Twitter)
  - Génère un post LinkedIn plus long
  - Publie via APIs respectives
- Intégrable dans le même cron que la publication article

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
| `src/domains/blog/types.ts` | Créer | 2 |
| `src/domains/blog/news-fetcher.ts` | Créer | 2 |
| `src/domains/blog/article-generator.ts` | Créer | 2 |
| `src/domains/blog/article-repository.ts` | Créer | 2 |
| `src/domains/blog/internal-linker.ts` | Créer | 2 |
| `src/app/blog/layout.tsx` | Créer | 2 |
| `src/app/blog/page.tsx` | Créer | 2 |
| `src/app/blog/[slug]/page.tsx` | Créer | 2 |
| `scripts/publish-daily-article.ts` | Créer | 2 |
| `src/infrastructure/database/client.ts` | Modifier (migration) | 2 |
| `src/domains/blog/social-publisher.ts` | Créer | 3 |

---

## Risques et mitigations

| Risque | Mitigation |
|--------|-----------|
| Pénalité Google "content farm" | Phase 1 = données réelles uniquement. Phase 2 = IA enrichit des données factuelles, pas du contenu vide |
| Coût API Gemini | Flash-Lite à ~0.001$/article, ~30$/mois pour 1 article/jour |
| Sources RSS indisponibles | Fallback : utiliser les données marché internes pour générer du contenu thématique sans actu externe |
| Qualité du contenu IA | Validation post-génération : longueur min, présence de données chiffrées, cohérence |
| SEO lent à décoller | Les guides villes (Phase 1) créent un socle de contenu immédiat ; le blog quotidien construit l'autorité progressivement |
