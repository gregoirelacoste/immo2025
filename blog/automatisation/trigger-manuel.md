# Trigger manuel — Interface admin blog

Specification technique de l'interface d'administration du blog tiili.fr, permettant la generation manuelle d'articles et le monitoring de la pipeline automatisee.

---

## 1. Interface admin blog — Page `/admin/blog`

### 1.1 Navigation depuis l'admin existant

Le lien vers `/admin/blog` est ajoute dans la page `/admin` existante, a cote des liens "Equipements" et "Config visite" :

```tsx
// src/app/admin/page.tsx — ajout dans le bloc <div className="mb-6 flex gap-3 flex-wrap">
<a
  href="/admin/blog"
  className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center gap-2"
>
  <span>Blog</span>
  <span className="text-gray-400">-></span>
</a>
```

### 1.2 Page server component

```tsx
// src/app/admin/blog/page.tsx

import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-actions";
import { getArticleDashboard } from "@/domains/blog/actions";
import { getAllLocalities } from "@/domains/locality/repository";
import Navbar from "@/components/Navbar";
import AdminBlogDashboard from "@/components/admin/blog/AdminBlogDashboard";

export default async function AdminBlogPage() {
  const { userId, isAdmin: admin } = await getAuthContext();
  if (!userId) redirect("/login");
  if (!admin) redirect("/dashboard");

  const [dashboard, localities] = await Promise.all([
    getArticleDashboard(),
    getAllLocalities(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <a href="/admin" className="text-gray-400 hover:text-gray-600">Admin</a>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
          <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">Admin</span>
        </div>
        <AdminBlogDashboard dashboard={dashboard} localities={localities} />
      </main>
    </div>
  );
}
```

### 1.3 Maquette generale de la page

```
┌─────────────────────────────────────────────────────────────────────┐
│  Admin / Blog                                              [Admin] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ │
│  │  Articles    │ │  Publies    │ │  Cout API   │ │  Derniere    │ │
│  │  cette sem.  │ │  ce mois    │ │  ce mois    │ │  exec. cron  │ │
│  │     12       │ │     38      │ │   2.40 EUR  │ │  il y a 4h   │ │
│  │  +3 vs sem-1 │ │  obj: 45    │ │  bud: 15EUR │ │  OK (2 art.) │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────┘ │
│                                                                     │
│  ┌───────────────────────────────┐  ┌────────────────────────────┐ │
│  │  Couverture villes            │  │  Erreurs recentes          │ │
│  │  ████████████░░░░  52/80      │  │  - 14/03 guide-ville Pau:  │ │
│  │  Guides publies / villes DB   │  │    Gemini timeout           │ │
│  │  Prochaines: Pau, Perpignan   │  │  - 12/03 actu Toulouse:    │ │
│  │                               │  │    Validation echouee (3e) │ │
│  └───────────────────────────────┘  └────────────────────────────┘ │
│                                                                     │
│  [ Generer un article ]                              Onglets:       │
│                                                                     │
│  ┌──────────┬──────────┬──────────┐                                │
│  │ Articles │ En revue │ Cron log │                                │
│  └──┬───────┴──────────┴──────────┘                                │
│     │                                                               │
│  ┌──┴──────────────────────────────────────────────────────────────┐│
│  │  Filtres: [Type v] [Statut v] [Ville ___] [Date du/au]        ││
│  │                                                                 ││
│  │  Slug               │ Type        │ Statut  │ Date    │ Donnees││
│  │  ──────────────────────────────────────────────────────────────-││
│  │  investir-lyon-2026 │ guide-ville │ publie  │ 15/03  │ 22 ch. ││
│  │  taux-mars-2026     │ financement │ draft   │ 14/03  │ 0 ch.  ││
│  │  lyon-vs-bordeaux   │ comparatif  │ erreur  │ 14/03  │ —      ││
│  │  investir-nantes... │ guide-ville │ publie  │ 13/03  │ 18 ch. ││
│  │                                                                 ││
│  │  [< 1 2 3 ... 12 >]                                            ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.4 Maquette du bouton "Generer un article" (modale)

```
┌─────────────────────────────────────────────────────┐
│  Generer un article                            [X]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Type d'article *                                   │
│  ┌─────────────────────────────────────────────┐    │
│  │ Guide ville                             [v] │    │
│  └─────────────────────────────────────────────┘    │
│  (8 types : guide-ville, guide-quartier,            │
│   actu-marche, comparatif, conseil,                 │
│   fiscalite, financement, etude-de-cas)             │
│                                                     │
│  Ville / Sujet *                                    │
│  ┌─────────────────────────────────────────────┐    │
│  │ Lyon                                   [x]  │    │
│  └─────────────────────────────────────────────┘    │
│  (autocomplete depuis localities DB)                │
│                                                     │
│  Quartier (si guide-quartier)                       │
│  ┌─────────────────────────────────────────────┐    │
│  │ La Part-Dieu                                │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Sources externes (optionnel)                       │
│  ┌─────────────────────────────────────────────┐    │
│  │ https://...                                 │    │
│  │ https://...                                 │    │
│  │ + Ajouter une URL                           │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Sujet libre (optionnel)                            │
│  ┌─────────────────────────────────────────────┐    │
│  │ Taux immobilier mars 2026 : baisse...       │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Mode de publication                                │
│  ( ) Publier directement                            │
│  (o) Brouillon pour relecture                       │
│                                                     │
│  ┌──────────────────────────┐                       │
│  │   Generer l'article      │                       │
│  └──────────────────────────┘                       │
│  Quota : 3/5 generations cette heure                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 2. Workflow de generation manuelle

### 2.1 Stepper visuel — 4 etapes

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  (1)            (2)              (3)              (4)               │
│  [=]───────────[=]──────────────[=]──────────────[ ]               │
│  Collecte      Generation       Validation       Publication       │
│  donnees       article          donnees          finale             │
│  OK 2.1s       En cours...      —                —                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Etape 1 — Collecte donnees** :
- Chargement des donnees existantes pour la ville (`resolveLocalityData`)
- Chargement du contexte marche (`getMarketData`)
- Si sources externes fournies : scraping des URLs
- Duree typique : 1-3 secondes

**Etape 2 — Generation article** :
- Appel Gemini (double output : article + extracted_data)
- Parsing de la reponse
- Duree typique : 10-30 secondes

**Etape 3 — Validation donnees** :
- Validation structurelle (bornes)
- Coherence interne
- Comparaison avec donnees existantes
- Affichage du resultat de validation a l'admin
- Duree typique : 1-2 secondes

**Etape 4 — Publication** :
- Selon le mode choisi : publication directe ou sauvegarde en brouillon
- Injection des donnees validees dans `locality_data`
- Revalidation ISR des pages impactees
- Duree typique : 1-3 secondes

### 2.2 Maquette de l'ecran de generation en cours

```
┌─────────────────────────────────────────────────────────────────────┐
│  Generation en cours — Guide ville Lyon                            │
│                                                                     │
│  (1)──────(2)──────(3)──────(4)                                    │
│   OK      En cours  —       —                                      │
│                                                                     │
│  ┌───────────────────────────────────┐                              │
│  │  Etape 2 : Generation article     │                              │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░        │                              │
│  │  Appel Gemini en cours...         │                              │
│  │  Temps ecoule : 12s               │                              │
│  └───────────────────────────────────┘                              │
│                                                                     │
│  Log :                                                              │
│  [OK] Donnees existantes chargees (14 champs)                      │
│  [OK] Contexte marche charge (DVF T4 2025)                         │
│  [..] Appel Gemini 2.5 Flash-Lite...                               │
│                                                                     │
│  [ Annuler ]                                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Maquette de previsualisation article + donnees

Apres generation (etape 3) — l'admin voit l'article et les donnees cote a cote :

```
┌─────────────────────────────────────────────────────────────────────┐
│  Resultat — Guide ville Lyon                                       │
│                                                                     │
│  (1)──────(2)──────(3)──────(4)                                    │
│   OK       OK     En cours   —                                     │
│                                                                     │
│  ┌──────────────────────────┐ ┌──────────────────────────────────┐ │
│  │  Onglets:                │ │  Donnees extraites               │ │
│  │  [Article] [Markdown]    │ │                                  │ │
│  │                          │ │  Validation: OK (2 warnings)     │ │
│  │  ┌──────────────────┐   │ │                                  │ │
│  │  │ Investir a Lyon  │   │ │  Lyon (69123)                    │ │
│  │  │ en 2026 : rende- │   │ │  ─────────────────────           │ │
│  │  │ ments, quartiers │   │ │  avg_purchase_price:  4 850 EUR  │ │
│  │  │ et donnees cles  │   │ │  avg_rent_per_m2:     14.5 EUR   │ │
│  │  │                  │   │ │  vacancy_rate:        3.2%       │ │
│  │  │ ## Le marche ... │   │ │  population:          522 250    │ │
│  │  │ Prix moyen :     │   │ │  ...                             │ │
│  │  │ 4 850 EUR/m2     │   │ │                                  │ │
│  │  │ ...              │   │ │  [!] avg_price_studio: 5200      │ │
│  │  │                  │   │ │      Ecart 7% vs existant (4860) │ │
│  │  │                  │   │ │                                  │ │
│  │  │                  │   │ │  [Editer les donnees]            │ │
│  │  └──────────────────┘   │ │                                  │ │
│  │                          │ │  Confiance Gemini: 82/100       │ │
│  │  [Editer l'article]     │ │  Sources: DVF T3 2025, INSEE    │ │
│  └──────────────────────────┘ └──────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ [ Publier ]  [ Brouillon ]  [ Regenerer ]  [ Annuler ]      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.4 Editeur d'article

L'admin peut cliquer "Editer l'article" pour modifier le Markdown avant publication. L'editeur est un simple `<textarea>` avec previsualisation en split-view :

```
┌─────────────────────────────────────────────────────────────────────┐
│  Editer l'article — Guide ville Lyon                               │
│                                                                     │
│  ┌──────────────────────────┐ ┌──────────────────────────────────┐ │
│  │  Markdown                │ │  Previsualisation                │ │
│  │                          │ │                                  │ │
│  │  # Investir a Lyon en    │ │  Investir a Lyon en 2026 :       │ │
│  │  2026 : rendements,      │ │  rendements, quartiers et        │ │
│  │  quartiers et donnees    │ │  donnees cles                    │ │
│  │  cles                    │ │                                  │ │
│  │                          │ │  Le marche immobilier a Lyon     │ │
│  │  > Derniere mise a jour  │ │                                  │ │
│  │  : 15 mars 2026.         │ │  Derniere mise a jour : 15 mars  │ │
│  │                          │ │  2026.                           │ │
│  │  ## Le marche immobilier │ │                                  │ │
│  │  a Lyon                  │ │  Prix moyen au m2 : 4 850 EUR   │ │
│  │                          │ │  (source DVF T3 2025)            │ │
│  │  - Prix moyen au m2 :   │ │  ...                             │ │
│  │    4 850 EUR             │ │                                  │ │
│  │  ...                     │ │                                  │ │
│  └──────────────────────────┘ └──────────────────────────────────┘ │
│                                                                     │
│  [ Sauvegarder les modifications ]  [ Annuler l'edition ]          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.5 Editeur de donnees extraites

L'admin peut editer les donnees JSON avant injection. L'interface presente les donnees sous forme de formulaire editable, pas de JSON brut :

```
┌─────────────────────────────────────────────────────────────────────┐
│  Editer les donnees extraites — Lyon (69123)                       │
│                                                                     │
│  Champ                        Valeur       Statut                  │
│  ──────────────────────────────────────────────────────             │
│  avg_purchase_price_per_m2    [  4850  ]   OK                      │
│  median_purchase_price_per_m2 [  4620  ]   OK                      │
│  transaction_count            [ 12400  ]   OK                      │
│  avg_rent_per_m2              [  14.5  ]   OK                      │
│  avg_rent_furnished_per_m2    [  18.2  ]   OK                      │
│  vacancy_rate                 [   3.2  ]   OK                      │
│  avg_airbnb_night_price       [    95  ]   OK                      │
│  avg_airbnb_occupancy_rate    [    72  ]   OK                      │
│  population                   [522250  ]   OK                      │
│  avg_price_studio_per_m2      [  5200  ]   [!] +7% vs existant    │
│  ...                                                                │
│                                                                     │
│  [x] Injecter les donnees validees (18 champs)                     │
│  [ ] Ne pas injecter (article uniquement)                          │
│                                                                     │
│  [ Sauvegarder ]  [ Reinitialiser ]                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Server Actions

### 3.1 Fichier d'actions — `src/domains/blog/actions.ts`

Toutes les actions sont protegees par `requireAdmin()`, coherent avec le pattern existant dans `src/domains/admin/actions.ts`.

```typescript
// src/domains/blog/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-actions";
import type { BlogArticleCategory } from "@/domains/blog/types";

// ─── Types ───────────────────────────────────────────────

type ArticleStatus = "generating" | "draft" | "published" | "error" | "archived";

interface GenerateArticleInput {
  type: BlogArticleCategory;
  localityId?: string;         // ID de la localite (depuis autocomplete)
  cityName?: string;           // Fallback si pas de localite en DB
  quartier?: string;           // Pour guide-quartier
  subject?: string;            // Sujet libre (conseil, fiscalite, financement...)
  sourceUrls?: string[];       // URLs externes a analyser
  mode: "publish" | "draft";   // Publication directe ou brouillon
}

interface GenerateArticleResult {
  success: boolean;
  articleId?: string;
  error?: string;
  step?: "collect" | "generate" | "validate" | "publish";
}

interface ArticleDashboard {
  stats: {
    articlesThisWeek: number;
    articlesThisWeekDelta: number;       // vs semaine precedente
    publishedThisMonth: number;
    publishedThisMonthTarget: number;    // objectif mensuel (45)
    apiCostThisMonth: number;            // en EUR
    apiCostBudget: number;               // budget mensuel en EUR
    lastCronRun: string | null;          // ISO datetime
    lastCronStatus: "ok" | "error" | null;
    lastCronArticleCount: number;
  };
  coverage: {
    totalLocalitiesInDb: number;
    localitiesWithGuide: number;
    nextUncoveredLocalities: string[];   // noms des 5 prochaines a couvrir
  };
  recentErrors: Array<{
    date: string;
    articleType: string;
    subject: string;
    error: string;
  }>;
  recentArticles: Array<{
    id: string;
    slug: string;
    type: BlogArticleCategory;
    status: ArticleStatus;
    createdAt: string;
    publishedAt: string | null;
    dataFieldsCount: number;
    localityName: string | null;
  }>;
}

// ─── Fonction pipeline unique (cron + admin) ─────────────

/**
 * Fonction pipeline unique utilisee par le cron ET par le trigger admin.
 * Pas de duplication : le cron et l'admin passent par cette meme fonction.
 */
async function generateAndPublish(options: {
  type: BlogArticleCategory;
  localityId?: string;
  cityName?: string;
  quartier?: string;
  subject?: string;
  sourceUrls?: string[];
  mode: "publish" | "draft";
  triggeredBy: "cron" | "admin";
  adminUserId?: string;
}): Promise<{ articleId: string; slug: string; dataFieldsInjected: number }> {
  // Etape 1 — Collecte donnees
  const context = await collectArticleContext({
    type: options.type,
    localityId: options.localityId,
    cityName: options.cityName,
    quartier: options.quartier,
    sourceUrls: options.sourceUrls,
  });

  // Etape 2 — Generation Gemini (double output)
  const { articleMarkdown, extractedData } = await callGeminiDualOutput({
    type: options.type,
    subject: options.subject,
    context,
  });

  // Etape 3 — Validation donnees
  const validation = await validateExtractedData(extractedData, context);

  // Etape 4 — Persistence
  const articleId = await persistArticle({
    markdown: articleMarkdown,
    extractedData,
    validation,
    type: options.type,
    status: options.mode === "publish" && validation.valid ? "published" : "draft",
    triggeredBy: options.triggeredBy,
    adminUserId: options.adminUserId,
  });

  // Etape 5 — Injection donnees (si mode publish et validation OK)
  let dataFieldsInjected = 0;
  if (options.mode === "publish" && validation.valid) {
    const result = await injectArticleDataInternal(articleId);
    dataFieldsInjected = result.fieldsInjected;
  }

  // Etape 6 — Revalidation ISR
  if (options.mode === "publish") {
    revalidatePath("/blog");
    if (options.localityId) {
      revalidatePath(`/guide/${context.citySlug}`);
    }
  }

  return { articleId, slug: context.slug, dataFieldsInjected };
}

// ─── Actions exposees ────────────────────────────────────

/**
 * Genere un article manuellement depuis l'interface admin.
 * Utilise la meme pipeline que le cron via generateAndPublish().
 */
export async function generateArticle(
  input: GenerateArticleInput
): Promise<GenerateArticleResult> {
  try {
    const adminUserId = await requireAdmin();

    // Rate limit : max 5 generations manuelles par heure
    const recentCount = await countRecentGenerations(adminUserId, 60); // 60 minutes
    if (recentCount >= 5) {
      return {
        success: false,
        error: "Limite atteinte : 5 generations par heure maximum.",
        step: "collect",
      };
    }

    // Log d'audit
    await logAdminAction({
      userId: adminUserId,
      action: "generate_article",
      details: JSON.stringify(input),
    });

    const result = await generateAndPublish({
      ...input,
      triggeredBy: "admin",
      adminUserId,
    });

    revalidatePath("/admin/blog");
    return { success: true, articleId: result.articleId };
  } catch (e) {
    const error = e as Error;
    return {
      success: false,
      error: error.message,
      step: detectFailedStep(error),
    };
  }
}

/**
 * Publie un article en brouillon.
 * Change le statut draft -> published et injecte les donnees extraites.
 */
export async function publishArticle(
  articleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUserId = await requireAdmin();

    await logAdminAction({
      userId: adminUserId,
      action: "publish_article",
      details: JSON.stringify({ articleId }),
    });

    // Changer le statut
    await updateArticleStatus(articleId, "published");

    // Injecter les donnees extraites
    await injectArticleDataInternal(articleId);

    // Ecrire le fichier .mdx dans le dossier blog
    await writeArticleMdx(articleId);

    // Revalidation ISR
    const article = await getArticleById(articleId);
    revalidatePath("/blog");
    revalidatePath(`/blog/${article.slug}`);
    if (article.localitySlug) {
      revalidatePath(`/guide/${article.localitySlug}`);
    }
    revalidatePath("/admin/blog");

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Depublie un article : published -> draft.
 * Les donnees injectees ne sont PAS supprimees (snapshot deja cree).
 */
export async function unpublishArticle(
  articleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUserId = await requireAdmin();

    await logAdminAction({
      userId: adminUserId,
      action: "unpublish_article",
      details: JSON.stringify({ articleId }),
    });

    await updateArticleStatus(articleId, "draft");

    // Retirer le fichier .mdx (ou le marquer comme draft dans le frontmatter)
    await markMdxAsDraft(articleId);

    revalidatePath("/blog");
    revalidatePath("/admin/blog");

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Regenere un article existant : relance la pipeline complete.
 * Conserve le meme articleId mais remplace le contenu et les donnees.
 */
export async function regenerateArticle(
  articleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUserId = await requireAdmin();

    // Rate limit
    const recentCount = await countRecentGenerations(adminUserId, 60);
    if (recentCount >= 5) {
      return { success: false, error: "Limite atteinte : 5 generations par heure maximum." };
    }

    await logAdminAction({
      userId: adminUserId,
      action: "regenerate_article",
      details: JSON.stringify({ articleId }),
    });

    // Charger l'article existant pour recuperer les parametres
    const existing = await getArticleById(articleId);

    // Relancer la pipeline avec les memes parametres
    const result = await generateAndPublish({
      type: existing.type,
      localityId: existing.localityId || undefined,
      cityName: existing.cityName || undefined,
      quartier: existing.quartier || undefined,
      subject: existing.subject || undefined,
      sourceUrls: existing.sourceUrls || undefined,
      mode: "draft", // toujours en brouillon apres regeneration
      triggeredBy: "admin",
      adminUserId,
    });

    // Mettre a jour l'article existant avec le nouveau contenu
    await replaceArticleContent(articleId, result.articleId);

    revalidatePath("/admin/blog");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Force l'injection des donnees extraites d'un article.
 * Utile si l'injection initiale a echoue ou si les donnees ont ete editees.
 */
export async function injectArticleData(
  articleId: string
): Promise<{ success: boolean; fieldsInjected?: number; error?: string }> {
  try {
    const adminUserId = await requireAdmin();

    await logAdminAction({
      userId: adminUserId,
      action: "inject_article_data",
      details: JSON.stringify({ articleId }),
    });

    const result = await injectArticleDataInternal(articleId);

    revalidatePath("/admin/blog");
    return { success: true, fieldsInjected: result.fieldsInjected };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Met a jour le contenu Markdown d'un article (apres edition manuelle).
 */
export async function updateArticleContent(
  articleId: string,
  markdown: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUserId = await requireAdmin();

    await logAdminAction({
      userId: adminUserId,
      action: "update_article_content",
      details: JSON.stringify({ articleId, markdownLength: markdown.length }),
    });

    await updateArticleMarkdown(articleId, markdown);

    revalidatePath("/admin/blog");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Met a jour les donnees extraites d'un article (apres edition manuelle).
 */
export async function updateArticleExtractedData(
  articleId: string,
  data: string // JSON stringifie
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUserId = await requireAdmin();

    await logAdminAction({
      userId: adminUserId,
      action: "update_article_data",
      details: JSON.stringify({ articleId }),
    });

    // Revalidation des donnees editees
    const parsed = JSON.parse(data);
    const validation = await validateExtractedData(parsed, null);

    await updateArticleData(articleId, data, JSON.stringify(validation));

    revalidatePath("/admin/blog");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Supprime un article (soft delete : statut -> archived).
 */
export async function deleteArticle(
  articleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUserId = await requireAdmin();

    await logAdminAction({
      userId: adminUserId,
      action: "delete_article",
      details: JSON.stringify({ articleId }),
    });

    await updateArticleStatus(articleId, "archived");

    revalidatePath("/admin/blog");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Recupere les stats du dashboard blog.
 */
export async function getArticleDashboard(): Promise<ArticleDashboard> {
  await requireAdmin();

  const [
    stats,
    coverage,
    recentErrors,
    recentArticles,
  ] = await Promise.all([
    getArticleStats(),
    getCoverageStats(),
    getRecentErrors(5),
    getRecentArticles(20),
  ]);

  return { stats, coverage, recentErrors, recentArticles };
}

/**
 * Recupere la liste paginee et filtree des articles.
 */
export async function getArticleList(filters: {
  type?: BlogArticleCategory;
  status?: ArticleStatus;
  localityId?: string;
  search?: string;
  page?: number;
  perPage?: number;
}): Promise<{
  articles: ArticleDashboard["recentArticles"];
  total: number;
  page: number;
  totalPages: number;
}> {
  await requireAdmin();
  return queryArticles(filters);
}
```

### 3.2 Fonctions internes (non exportees)

Ces fonctions sont utilisees par les actions ci-dessus mais ne sont pas exposees directement. Elles seront implementees dans des fichiers dedies du domaine `blog/`.

```typescript
// src/domains/blog/pipeline.ts — fonctions internes de la pipeline

/**
 * Collecte le contexte necessaire a la generation d'un article.
 * Utilisee par generateAndPublish() a l'etape 1.
 */
async function collectArticleContext(params: {
  type: BlogArticleCategory;
  localityId?: string;
  cityName?: string;
  quartier?: string;
  sourceUrls?: string[];
}): Promise<ArticleContext> {
  const context: ArticleContext = {
    slug: "",
    citySlug: "",
    existingData: null,
    marketData: null,
    scrapedSources: [],
  };

  // Charger les donnees localite si applicable
  if (params.localityId) {
    const { resolveLocalityData } = await import("@/domains/locality/resolver");
    context.existingData = await resolveLocalityData(params.localityId);

    const { getMarketData } = await import("@/domains/market/service");
    context.marketData = await getMarketData(params.localityId);
  }

  // Scraper les sources externes si fournies
  if (params.sourceUrls?.length) {
    for (const url of params.sourceUrls.slice(0, 3)) { // max 3 URLs
      try {
        const content = await fetchAndCleanUrl(url);
        context.scrapedSources.push({ url, content });
      } catch {
        // Source inaccessible — on continue sans
      }
    }
  }

  // Generer le slug
  context.slug = generateArticleSlug(params.type, params.cityName, params.quartier);
  context.citySlug = params.cityName
    ? slugify(params.cityName)
    : "";

  return context;
}

/**
 * Appel Gemini avec double output (article + donnees).
 * Reutilise le prompt defini dans pipeline-data-article-app.md.
 */
async function callGeminiDualOutput(params: {
  type: BlogArticleCategory;
  subject?: string;
  context: ArticleContext;
}): Promise<{ articleMarkdown: string; extractedData: BlogExtractedData }> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const prompt = buildArticlePrompt(params.type, params.subject, params.context);
  const result = await model.generateContent(prompt);
  const raw = result.response.text();

  return parseGeminiDualOutput(raw);
}

/**
 * Valide les donnees extraites (bornes + coherence + comparaison existant).
 * Implementation conforme a pipeline-data-article-app.md section 3.
 */
async function validateExtractedData(
  data: BlogExtractedData,
  context: ArticleContext | null
): Promise<ValidationResult> {
  // Appel des 3 etapes de validation definies dans le pipeline doc
  // 1. Bornes realistes
  // 2. Coherence interne
  // 3. Comparaison avec donnees existantes
  // Retourne { valid, errors, warnings }
}

/**
 * Injection interne des donnees d'un article dans locality_data.
 * Reutilise la logique de src/domains/blog/injector.ts (pipeline doc section 4).
 */
async function injectArticleDataInternal(
  articleId: string
): Promise<{ fieldsInjected: number; fieldsSkipped: number }> {
  // 1. Charger l'article et ses donnees extraites
  // 2. Pour chaque localite dans extractedData.localities :
  //    - Resoudre la localite via findLocalityByCity()
  //    - Merge field-by-field avec protection admin
  //    - Creer le snapshot via createLocalityData()
  // 3. Logger dans blog_data_audit
  // 4. Trigger re-enrichissement des proprietes impactees
}

// ─── Rate limiting ───────────────────────────────────────

async function countRecentGenerations(userId: string, windowMinutes: number): Promise<number> {
  // SELECT COUNT(*) FROM blog_audit_log
  // WHERE user_id = ? AND action = 'generate_article'
  // AND created_at > datetime('now', '-' || windowMinutes || ' minutes')
}

// ─── Audit logging ───────────────────────────────────────

async function logAdminAction(params: {
  userId: string;
  action: string;
  details: string;
}): Promise<void> {
  // INSERT INTO blog_audit_log (id, user_id, action, details, created_at)
  // VALUES (uuid(), ?, ?, ?, datetime('now'))
}
```

### 3.3 Point d'entree pour le cron

Le cron utilise la meme pipeline via une fonction wrapper qui ne passe pas par les Server Actions (pas de contexte HTTP) :

```typescript
// src/domains/blog/cron.ts — point d'entree pour le cron job

import { generateAndPublish } from "./pipeline";

/**
 * Fonction appelee par le cron job (ex: Vercel Cron, GitHub Actions).
 * Selectionne les prochains articles a generer selon le calendrier editorial
 * et appelle generateAndPublish() pour chacun.
 */
export async function runBlogCron(): Promise<{
  generated: number;
  errors: string[];
}> {
  const queue = await getNextArticlesToGenerate();
  const errors: string[] = [];
  let generated = 0;

  for (const item of queue) {
    try {
      await generateAndPublish({
        type: item.type,
        localityId: item.localityId,
        cityName: item.cityName,
        mode: "publish",           // le cron publie directement
        triggeredBy: "cron",
      });
      generated++;
    } catch (e) {
      errors.push(`${item.type}/${item.cityName}: ${(e as Error).message}`);
    }
  }

  return { generated, errors };
}

/**
 * Determine les prochains articles a generer selon :
 * - Le planning type semaine (strategie-editoriale.md section 3.2)
 * - La couverture actuelle (quelles villes n'ont pas encore de guide)
 * - La saisonnalite (strategie-editoriale.md section 3.4)
 */
async function getNextArticlesToGenerate(): Promise<Array<{
  type: BlogArticleCategory;
  localityId?: string;
  cityName?: string;
}>> {
  // Logique de planification — voir calendrier-cron.md (a creer)
}
```

---

## 4. Composants React

### 4.1 `AdminBlogDashboard.tsx` — composant principal

```tsx
// src/components/admin/blog/AdminBlogDashboard.tsx
"use client";

import { useState } from "react";
import type { Locality } from "@/domains/locality/types";
import ArticleGeneratorForm from "./ArticleGeneratorForm";
import ArticleList from "./ArticleList";
import DataPreview from "./DataPreview";
import ArticlePreview from "./ArticlePreview";
import PublishStepper from "./PublishStepper";

// Types mirrors de ArticleDashboard (server)
interface DashboardStats {
  articlesThisWeek: number;
  articlesThisWeekDelta: number;
  publishedThisMonth: number;
  publishedThisMonthTarget: number;
  apiCostThisMonth: number;
  apiCostBudget: number;
  lastCronRun: string | null;
  lastCronStatus: "ok" | "error" | null;
  lastCronArticleCount: number;
}

interface CoverageStats {
  totalLocalitiesInDb: number;
  localitiesWithGuide: number;
  nextUncoveredLocalities: string[];
}

interface RecentError {
  date: string;
  articleType: string;
  subject: string;
  error: string;
}

interface ArticleSummary {
  id: string;
  slug: string;
  type: string;
  status: string;
  createdAt: string;
  publishedAt: string | null;
  dataFieldsCount: number;
  localityName: string | null;
}

interface Dashboard {
  stats: DashboardStats;
  coverage: CoverageStats;
  recentErrors: RecentError[];
  recentArticles: ArticleSummary[];
}

interface Props {
  dashboard: Dashboard;
  localities: Locality[];
}

type View = "list" | "generating" | "preview" | "editing";

export default function AdminBlogDashboard({ dashboard, localities }: Props) {
  const [view, setView] = useState<View>("list");
  const [showGenerator, setShowGenerator] = useState(false);
  const [activeTab, setActiveTab] = useState<"articles" | "review" | "cron">("articles");
  const [generatingArticle, setGeneratingArticle] = useState<{
    id: string;
    step: number;
    logs: string[];
  } | null>(null);

  const { stats, coverage, recentErrors, recentArticles } = dashboard;

  return (
    <div className="space-y-6">
      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Articles cette semaine"
          value={stats.articlesThisWeek}
          delta={stats.articlesThisWeekDelta}
          deltaLabel="vs sem. prec."
        />
        <StatCard
          label="Publies ce mois"
          value={stats.publishedThisMonth}
          target={stats.publishedThisMonthTarget}
          targetLabel={`obj: ${stats.publishedThisMonthTarget}`}
        />
        <StatCard
          label="Cout API ce mois"
          value={`${stats.apiCostThisMonth.toFixed(2)} EUR`}
          target={stats.apiCostBudget}
          targetLabel={`bud: ${stats.apiCostBudget} EUR`}
        />
        <StatCard
          label="Dernier cron"
          value={stats.lastCronRun ? formatRelativeDate(stats.lastCronRun) : "Jamais"}
          status={stats.lastCronStatus}
          statusLabel={
            stats.lastCronStatus === "ok"
              ? `OK (${stats.lastCronArticleCount} art.)`
              : stats.lastCronStatus === "error"
              ? "Erreur"
              : ""
          }
        />
      </div>

      {/* ─── Coverage + Errors ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Couverture villes</h3>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 bg-gray-100 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all"
                style={{
                  width: `${(coverage.localitiesWithGuide / coverage.totalLocalitiesInDb) * 100}%`,
                }}
              />
            </div>
            <span className="text-sm font-medium text-gray-600">
              {coverage.localitiesWithGuide}/{coverage.totalLocalitiesInDb}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Prochaines : {coverage.nextUncoveredLocalities.join(", ")}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Erreurs recentes</h3>
          {recentErrors.length === 0 ? (
            <p className="text-xs text-gray-400">Aucune erreur recente</p>
          ) : (
            <ul className="space-y-1">
              {recentErrors.map((err, i) => (
                <li key={i} className="text-xs text-red-600">
                  <span className="text-gray-400">{err.date}</span>{" "}
                  {err.articleType} {err.subject}: {err.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ─── Action Button ─── */}
      <div>
        <button
          onClick={() => setShowGenerator(true)}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          Generer un article
        </button>
      </div>

      {/* ─── Generator Modal ─── */}
      {showGenerator && (
        <ArticleGeneratorForm
          localities={localities}
          onClose={() => setShowGenerator(false)}
          onGenerated={(articleId) => {
            setShowGenerator(false);
            setView("preview");
            // Charger l'article genere pour previsualisation
          }}
        />
      )}

      {/* ─── Stepper (pendant la generation) ─── */}
      {view === "generating" && generatingArticle && (
        <PublishStepper
          currentStep={generatingArticle.step}
          logs={generatingArticle.logs}
          onCancel={() => setView("list")}
        />
      )}

      {/* ─── Tabs + Article List ─── */}
      <div>
        <div className="flex border-b border-gray-200">
          {(["articles", "review", "cron"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "articles" ? "Articles" : tab === "review" ? "En revue" : "Cron log"}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {activeTab === "articles" && (
            <ArticleList
              articles={recentArticles}
              onPublish={(id) => publishArticle(id)}
              onEdit={(id) => { /* navigation vers preview/edit */ }}
              onRegenerate={(id) => regenerateArticle(id)}
              onDelete={(id) => deleteArticle(id)}
            />
          )}
          {activeTab === "review" && (
            <ArticleList
              articles={recentArticles.filter((a) => a.status === "draft")}
              onPublish={(id) => publishArticle(id)}
              onEdit={(id) => {}}
              onRegenerate={(id) => regenerateArticle(id)}
              onDelete={(id) => deleteArticle(id)}
            />
          )}
          {activeTab === "cron" && (
            <CronLogView />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sous-composants utilitaires ─────────────────────────

function StatCard({ label, value, delta, deltaLabel, target, targetLabel, status, statusLabel }: {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  target?: number;
  targetLabel?: string;
  status?: "ok" | "error" | null;
  statusLabel?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {delta !== undefined && (
        <p className={`text-xs mt-1 ${delta >= 0 ? "text-green-600" : "text-red-600"}`}>
          {delta >= 0 ? "+" : ""}{delta} {deltaLabel}
        </p>
      )}
      {targetLabel && (
        <p className="text-xs text-gray-400 mt-1">{targetLabel}</p>
      )}
      {statusLabel && (
        <p className={`text-xs mt-1 ${status === "ok" ? "text-green-600" : "text-red-600"}`}>
          {statusLabel}
        </p>
      )}
    </div>
  );
}

function CronLogView() {
  // Affiche les logs des executions cron recentes
  return <div className="text-sm text-gray-500">Logs du cron (a implementer)</div>;
}

function formatRelativeDate(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "il y a moins d'1h";
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}
```

### 4.2 `ArticleGeneratorForm.tsx` — formulaire de generation

```tsx
// src/components/admin/blog/ArticleGeneratorForm.tsx
"use client";

import { useState, useTransition } from "react";
import type { Locality } from "@/domains/locality/types";
import { generateArticle } from "@/domains/blog/actions";

const ARTICLE_TYPES = [
  { value: "guide-ville", label: "Guide ville", needsCity: true },
  { value: "guide-quartier", label: "Guide quartier", needsCity: true },
  { value: "actu-marche", label: "Actualite marche", needsCity: false },
  { value: "analyse", label: "Analyse comparative", needsCity: false },
  { value: "conseil", label: "Conseil investissement", needsCity: false },
  { value: "fiscalite", label: "Fiscalite & dispositifs", needsCity: false },
  { value: "financement", label: "Financement", needsCity: false },
  { value: "etude-de-cas", label: "Etude de cas", needsCity: true },
] as const;

interface Props {
  localities: Locality[];
  onClose: () => void;
  onGenerated: (articleId: string) => void;
}

export default function ArticleGeneratorForm({ localities, onClose, onGenerated }: Props) {
  const [type, setType] = useState<string>("guide-ville");
  const [localityId, setLocalityId] = useState<string>("");
  const [localitySearch, setLocalitySearch] = useState("");
  const [quartier, setQuartier] = useState("");
  const [subject, setSubject] = useState("");
  const [sourceUrls, setSourceUrls] = useState<string[]>([""]);
  const [mode, setMode] = useState<"publish" | "draft">("draft");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedType = ARTICLE_TYPES.find((t) => t.value === type);
  const showCityField = selectedType?.needsCity ?? false;
  const showQuartierField = type === "guide-quartier";

  // Filtrage localites pour autocomplete
  const filteredLocalities = localitySearch.length >= 2
    ? localities
        .filter((l) =>
          l.name.toLowerCase().includes(localitySearch.toLowerCase()) &&
          l.type === "commune"
        )
        .slice(0, 10)
    : [];

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await generateArticle({
        type: type as any,
        localityId: localityId || undefined,
        cityName: localitySearch || undefined,
        quartier: quartier || undefined,
        subject: subject || undefined,
        sourceUrls: sourceUrls.filter((u) => u.trim()),
        mode,
      });

      if (result.success && result.articleId) {
        onGenerated(result.articleId);
      } else {
        setError(result.error || "Erreur inconnue");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Generer un article</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            X
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Type d'article */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type d'article *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {ARTICLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Ville (autocomplete) */}
          {showCityField && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ville *
              </label>
              <input
                type="text"
                value={localitySearch}
                onChange={(e) => {
                  setLocalitySearch(e.target.value);
                  setLocalityId("");
                }}
                placeholder="Rechercher une ville..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              {filteredLocalities.length > 0 && !localityId && (
                <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                  {filteredLocalities.map((loc) => (
                    <li
                      key={loc.id}
                      onClick={() => {
                        setLocalityId(loc.id);
                        setLocalitySearch(loc.name);
                      }}
                      className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                    >
                      {loc.name}
                      {loc.postal_codes && (
                        <span className="text-gray-400 ml-1">({loc.postal_codes})</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Quartier */}
          {showQuartierField && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quartier *
              </label>
              <input
                type="text"
                value={quartier}
                onChange={(e) => setQuartier(e.target.value)}
                placeholder="Ex: La Part-Dieu"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          )}

          {/* Sujet libre */}
          {!showCityField && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sujet *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Taux immobilier mars 2026 : etat des lieux"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          )}

          {/* Sources externes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sources externes (optionnel)
            </label>
            {sourceUrls.map((url, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    const next = [...sourceUrls];
                    next[i] = e.target.value;
                    setSourceUrls(next);
                  }}
                  placeholder="https://..."
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                {sourceUrls.length > 1 && (
                  <button
                    onClick={() => setSourceUrls(sourceUrls.filter((_, j) => j !== i))}
                    className="text-gray-400 hover:text-red-500 text-sm"
                  >
                    X
                  </button>
                )}
              </div>
            ))}
            {sourceUrls.length < 3 && (
              <button
                onClick={() => setSourceUrls([...sourceUrls, ""])}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                + Ajouter une URL
              </button>
            )}
          </div>

          {/* Mode de publication */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mode de publication
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mode"
                  value="draft"
                  checked={mode === "draft"}
                  onChange={() => setMode("draft")}
                />
                Brouillon pour relecture
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mode"
                  value="publish"
                  checked={mode === "publish"}
                  onChange={() => setMode("publish")}
                />
                Publier directement
              </label>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Quota : {/* recentCount */}/5 generations cette heure
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Generation en cours..." : "Generer l'article"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 4.3 `ArticlePreview.tsx` — previsualisation

```tsx
// src/components/admin/blog/ArticlePreview.tsx
"use client";

import { useState, useTransition } from "react";
import {
  publishArticle,
  unpublishArticle,
  regenerateArticle,
  updateArticleContent,
  deleteArticle,
} from "@/domains/blog/actions";

interface ArticleData {
  id: string;
  slug: string;
  type: string;
  status: string;
  markdown: string;
  extractedData: string;      // JSON stringifie
  validationResult: string;   // JSON stringifie
  createdAt: string;
  localityName: string | null;
}

interface Props {
  article: ArticleData;
  onBack: () => void;
}

export default function ArticlePreview({ article, onBack }: Props) {
  const [tab, setTab] = useState<"rendered" | "markdown">("rendered");
  const [isEditing, setIsEditing] = useState(false);
  const [editedMarkdown, setEditedMarkdown] = useState(article.markdown);
  const [isPending, startTransition] = useTransition();
  const [confirmPublish, setConfirmPublish] = useState(false);

  function handlePublish() {
    if (!confirmPublish) {
      setConfirmPublish(true);
      return;
    }
    startTransition(async () => {
      await publishArticle(article.id);
      setConfirmPublish(false);
    });
  }

  function handleSaveEdit() {
    startTransition(async () => {
      await updateArticleContent(article.id, editedMarkdown);
      setIsEditing(false);
    });
  }

  function handleRegenerate() {
    startTransition(async () => {
      await regenerateArticle(article.id);
    });
  }

  function handleDelete() {
    if (!confirm("Supprimer cet article ?")) return;
    startTransition(async () => {
      await deleteArticle(article.id);
      onBack();
    });
  }

  const validation = JSON.parse(article.validationResult || "{}");
  const warningCount = validation.warnings?.length ?? 0;
  const errorCount = validation.errors?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
            Retour
          </button>
          <h2 className="text-lg font-semibold text-gray-900">{article.slug}</h2>
          <StatusBadge status={article.status} />
        </div>
      </div>

      {/* Layout 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Colonne principale : article */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          {/* Onglets Article / Markdown */}
          <div className="flex border-b border-gray-100 px-4">
            <button
              onClick={() => setTab("rendered")}
              className={`px-3 py-2 text-sm font-medium border-b-2 ${
                tab === "rendered" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500"
              }`}
            >
              Article
            </button>
            <button
              onClick={() => setTab("markdown")}
              className={`px-3 py-2 text-sm font-medium border-b-2 ${
                tab === "markdown" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500"
              }`}
            >
              Markdown
            </button>
          </div>

          <div className="p-4">
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editedMarkdown}
                  onChange={(e) => setEditedMarkdown(e.target.value)}
                  className="w-full h-96 font-mono text-sm border border-gray-300 rounded-lg p-3 resize-y"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                  >
                    Sauvegarder
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedMarkdown(article.markdown);
                    }}
                    className="px-4 py-2 text-gray-600 text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : tab === "rendered" ? (
              <div className="prose prose-sm max-w-none">
                {/* Rendu Markdown simplifie — utiliser remark/rehype ou un simple dangerouslySetInnerHTML */}
                <MarkdownRenderer content={article.markdown} />
              </div>
            ) : (
              <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap overflow-auto max-h-96">
                {article.markdown}
              </pre>
            )}
          </div>

          {!isEditing && (
            <div className="px-4 pb-4">
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Editer l'article
              </button>
            </div>
          )}
        </div>

        {/* Colonne laterale : donnees extraites */}
        <div className="space-y-4">
          <DataPreview
            extractedData={article.extractedData}
            validationResult={article.validationResult}
            articleId={article.id}
          />
        </div>
      </div>

      {/* Barre d'actions */}
      <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4">
        {article.status === "draft" && (
          <button
            onClick={handlePublish}
            disabled={isPending || errorCount > 0}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              confirmPublish
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            } disabled:opacity-50`}
          >
            {confirmPublish ? "Confirmer la publication" : "Publier"}
          </button>
        )}
        {article.status === "published" && (
          <button
            onClick={() => startTransition(() => unpublishArticle(article.id))}
            disabled={isPending}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Depublier
          </button>
        )}
        <button
          onClick={handleRegenerate}
          disabled={isPending}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          Regenerer
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="px-4 py-2 text-sm text-red-600 hover:text-red-800 ml-auto"
        >
          Supprimer
        </button>
        {confirmPublish && (
          <button
            onClick={() => setConfirmPublish(false)}
            className="text-sm text-gray-500"
          >
            Annuler
          </button>
        )}
      </div>

      {/* Warnings de validation */}
      {warningCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm font-medium text-yellow-800 mb-1">
            {warningCount} avertissement{warningCount > 1 ? "s" : ""} de validation
          </p>
          <ul className="text-xs text-yellow-700 space-y-1">
            {validation.warnings?.map((w: any, i: number) => (
              <li key={i}>
                [{w.severity}] {w.field} — {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    published: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
    generating: "bg-blue-100 text-blue-700",
    archived: "bg-gray-100 text-gray-400",
  };
  const labels: Record<string, string> = {
    draft: "Brouillon",
    published: "Publie",
    error: "Erreur",
    generating: "En cours",
    archived: "Archive",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}

function MarkdownRenderer({ content }: { content: string }) {
  // Rendu simplifie — en production, utiliser remark/rehype ou next-mdx-remote
  // Pour le prototype admin, un rendu basique suffit
  return <div className="whitespace-pre-wrap text-sm text-gray-700">{content}</div>;
}
```

### 4.4 `ArticleList.tsx` — liste avec filtres

```tsx
// src/components/admin/blog/ArticleList.tsx
"use client";

import { useState, useTransition } from "react";

interface ArticleSummary {
  id: string;
  slug: string;
  type: string;
  status: string;
  createdAt: string;
  publishedAt: string | null;
  dataFieldsCount: number;
  localityName: string | null;
}

interface Props {
  articles: ArticleSummary[];
  onPublish: (id: string) => void;
  onEdit: (id: string) => void;
  onRegenerate: (id: string) => void;
  onDelete: (id: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  "guide-ville": "Guide ville",
  "guide-quartier": "Guide quartier",
  "actu-marche": "Actu marche",
  "analyse": "Comparatif",
  "conseil": "Conseil",
  "fiscalite": "Fiscalite",
  "financement": "Financement",
  "etude-de-cas": "Etude de cas",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  published: "Publie",
  error: "Erreur",
  generating: "En cours",
  archived: "Archive",
};

export default function ArticleList({ articles, onPublish, onEdit, onRegenerate, onDelete }: Props) {
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = articles.filter((a) => {
    if (filterType && a.type !== filterType) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (search && !a.slug.includes(search.toLowerCase()) && !a.localityName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="draft">Brouillon</option>
          <option value="published">Publie</option>
          <option value="error">Erreur</option>
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm flex-1 min-w-48"
        />
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-4 py-3 font-medium text-gray-500">Slug</th>
              <th className="px-4 py-3 font-medium text-gray-500">Type</th>
              <th className="px-4 py-3 font-medium text-gray-500">Statut</th>
              <th className="px-4 py-3 font-medium text-gray-500">Date</th>
              <th className="px-4 py-3 font-medium text-gray-500">Donnees</th>
              <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((article) => (
              <tr key={article.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <button
                    onClick={() => onEdit(article.id)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {article.slug}
                  </button>
                  {article.localityName && (
                    <span className="text-gray-400 text-xs ml-1">({article.localityName})</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {TYPE_LABELS[article.type] || article.type}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={article.status} />
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(article.createdAt).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {article.dataFieldsCount > 0
                    ? `${article.dataFieldsCount} ch.`
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {article.status === "draft" && (
                      <button
                        onClick={() => startTransition(() => onPublish(article.id))}
                        className="text-xs text-green-600 hover:text-green-800 px-2 py-1"
                        disabled={isPending}
                      >
                        Publier
                      </button>
                    )}
                    <button
                      onClick={() => startTransition(() => onRegenerate(article.id))}
                      className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1"
                      disabled={isPending}
                    >
                      Regen.
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Supprimer ?")) {
                          startTransition(() => onDelete(article.id));
                        }
                      }}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                      disabled={isPending}
                    >
                      Suppr.
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Aucun article trouvee
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    published: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
    generating: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status] || "bg-gray-100 text-gray-700"}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
```

### 4.5 `DataPreview.tsx` — previsualisation donnees JSON

```tsx
// src/components/admin/blog/DataPreview.tsx
"use client";

import { useState, useTransition } from "react";
import { updateArticleExtractedData, injectArticleData } from "@/domains/blog/actions";

interface Props {
  extractedData: string;       // JSON stringifie de BlogExtractedData
  validationResult: string;    // JSON stringifie de ValidationResult
  articleId: string;
}

export default function DataPreview({ extractedData, validationResult, articleId }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const data = JSON.parse(extractedData || "{}");
  const validation = JSON.parse(validationResult || "{}");

  const localities = data.localities || [];
  const warningsMap: Record<string, string> = {};
  for (const w of validation.warnings || []) {
    warningsMap[w.field] = `[${w.severity}] ${w.message}`;
  }

  const [editedValues, setEditedValues] = useState<Record<string, Record<string, number | string>>>({});

  function handleValueChange(localityIndex: number, field: string, value: string) {
    const key = `loc_${localityIndex}`;
    setEditedValues((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [field]: value },
    }));
  }

  function handleSave() {
    startTransition(async () => {
      // Merge edited values back into extracted data
      const updated = { ...data };
      for (const [key, fields] of Object.entries(editedValues)) {
        const idx = parseInt(key.replace("loc_", ""));
        for (const [field, value] of Object.entries(fields)) {
          const numVal = parseFloat(value as string);
          if (!isNaN(numVal)) {
            updated.localities[idx].data[field] = numVal;
          }
        }
      }
      await updateArticleExtractedData(articleId, JSON.stringify(updated));
      setIsEditing(false);
    });
  }

  function handleForceInject() {
    if (!confirm("Injecter les donnees dans la base locality_data ?")) return;
    startTransition(async () => {
      const result = await injectArticleData(articleId);
      if (result.success) {
        alert(`${result.fieldsInjected} champs injectes.`);
      } else {
        alert(`Erreur : ${result.error}`);
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Donnees extraites</h3>
        <div className="flex items-center gap-2">
          {validation.valid ? (
            <span className="text-xs text-green-600 font-medium">Validation OK</span>
          ) : (
            <span className="text-xs text-red-600 font-medium">
              {(validation.errors?.length || 0)} erreur(s)
            </span>
          )}
          {(validation.warnings?.length || 0) > 0 && (
            <span className="text-xs text-yellow-600">
              ({validation.warnings.length} avert.)
            </span>
          )}
        </div>
      </div>

      {/* Confiance Gemini */}
      {data.meta && (
        <div className="text-xs text-gray-500">
          Confiance : {data.meta.confidenceScore}/100 | Sources : {data.meta.dataSources?.join(", ")}
        </div>
      )}

      {/* Donnees par localite */}
      {localities.map((loc: any, locIdx: number) => (
        <div key={locIdx} className="border-t border-gray-100 pt-3">
          <p className="text-sm font-medium text-gray-800 mb-2">
            {loc.cityName}
            {loc.codeInsee && <span className="text-gray-400 ml-1">({loc.codeInsee})</span>}
          </p>

          <div className="space-y-1">
            {Object.entries(loc.data || {}).map(([field, value]) => {
              const warning = warningsMap[field];
              const editKey = `loc_${locIdx}`;
              const editedValue = editedValues[editKey]?.[field];

              return (
                <div key={field} className="flex items-center text-xs gap-2">
                  <span className="text-gray-500 w-48 truncate font-mono">{field}</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedValue ?? String(value)}
                      onChange={(e) => handleValueChange(locIdx, field, e.target.value)}
                      className="flex-1 border border-gray-200 rounded px-2 py-0.5 text-xs font-mono"
                    />
                  ) : (
                    <span className="flex-1 font-mono text-gray-900">
                      {typeof value === "number" ? value.toLocaleString("fr-FR") : String(value)}
                    </span>
                  )}
                  {warning && (
                    <span className="text-yellow-600 text-xs" title={warning}>
                      [!]
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg"
            >
              Sauvegarder
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditedValues({});
              }}
              className="text-xs text-gray-500 px-3 py-1.5"
            >
              Annuler
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-blue-600 hover:text-blue-800 px-3 py-1.5"
            >
              Editer les donnees
            </button>
            <button
              onClick={handleForceInject}
              disabled={isPending}
              className="text-xs text-green-600 hover:text-green-800 px-3 py-1.5"
            >
              Injecter dans la base
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

### 4.6 `PublishStepper.tsx` — stepper de publication

```tsx
// src/components/admin/blog/PublishStepper.tsx
"use client";

const STEPS = [
  { id: 1, label: "Collecte donnees", description: "Chargement du contexte et des sources" },
  { id: 2, label: "Generation", description: "Appel Gemini (article + donnees)" },
  { id: 3, label: "Validation", description: "Verification des donnees extraites" },
  { id: 4, label: "Publication", description: "Sauvegarde et injection" },
] as const;

interface Props {
  currentStep: number;       // 1-4
  logs: string[];
  elapsedSeconds?: number;
  onCancel: () => void;
}

export default function PublishStepper({ currentStep, logs, elapsedSeconds, onCancel }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Stepper horizontal */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.id < currentStep
                    ? "bg-green-500 text-white"
                    : step.id === currentStep
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {step.id < currentStep ? "OK" : step.id}
              </div>
              <p className="text-xs mt-1 text-gray-600 text-center">{step.label}</p>
              <p className="text-xs text-gray-400 text-center">{step.description}</p>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  step.id < currentStep ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Etape en cours */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-gray-700">
            Etape {currentStep} : {STEPS[currentStep - 1]?.label}
          </span>
          {elapsedSeconds !== undefined && (
            <span className="text-xs text-gray-400">{elapsedSeconds}s</span>
          )}
        </div>

        {/* Barre de progression indeterminee */}
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full animate-pulse w-2/3" />
        </div>
      </div>

      {/* Logs */}
      <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto mb-4">
        {logs.map((log, i) => (
          <p key={i} className="text-xs font-mono text-gray-600">
            {log}
          </p>
        ))}
        {logs.length === 0 && (
          <p className="text-xs text-gray-400">En attente...</p>
        )}
      </div>

      {/* Annuler */}
      <button
        onClick={onCancel}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Annuler
      </button>
    </div>
  );
}
```

---

## 5. Securite et garde-fous

### 5.1 Authentification admin

L'app utilise deja NextAuth.js avec un systeme de roles. L'acces admin est controle par :

- **`getAuthContext()`** dans `src/lib/auth-actions.ts` — retourne `{ userId, isAdmin }` depuis la session JWT
- **`requireAdmin()`** dans `src/lib/auth-actions.ts` — leve une erreur si l'utilisateur n'est pas admin
- **Pattern existant** (cf. `src/app/admin/page.tsx` L9-11) :
  ```tsx
  const { userId, isAdmin: admin } = await getAuthContext();
  if (!userId) redirect("/login");
  if (!admin) redirect("/dashboard");
  ```
- **Toutes les Server Actions** appellent `requireAdmin()` en premiere instruction (pattern identique a `src/domains/admin/actions.ts`)

Le role est stocke dans la table `users` et expose via le callback JWT de NextAuth. Pas besoin de middleware supplementaire.

### 5.2 Rate limiting

```typescript
// Max 5 generations manuelles par heure et par admin
const RATE_LIMIT = {
  maxGenerations: 5,
  windowMinutes: 60,
};

// Implémentation via comptage en DB (table blog_audit_log)
// Pas de redis necessaire — le volume est faible (admin uniquement)
```

Le rate limit s'applique uniquement aux actions `generateArticle` et `regenerateArticle` (celles qui appellent Gemini). Les actions de publication, edition, suppression ne sont pas limitees.

### 5.3 Confirmation avant publication

Deux niveaux de confirmation :

1. **Publication directe depuis le formulaire de generation** : le mode par defaut est "Brouillon", pas "Publier directement"
2. **Bouton "Publier" dans la preview** : double-clic requis (premier clic = "Confirmer la publication", deuxieme clic = publication effective)

### 5.4 Logs d'audit

Toutes les actions admin sont loguees dans `blog_audit_log` :

```sql
CREATE TABLE IF NOT EXISTS blog_audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  -- Actions tracees : generate_article, publish_article, unpublish_article,
  -- regenerate_article, inject_article_data, update_article_content,
  -- update_article_data, delete_article
  details TEXT DEFAULT '',     -- JSON avec les parametres de l'action
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_blog_audit_user ON blog_audit_log(user_id);
CREATE INDEX idx_blog_audit_action ON blog_audit_log(action, created_at);
```

### 5.5 Protection des donnees

- Les donnees saisies manuellement par un admin (`created_by = "admin"`) ne sont jamais ecrasees par l'injection blog-IA (cf. pipeline-data-article-app.md section 3)
- La suppression d'un article est un soft delete (statut `archived`), jamais une suppression physique
- Les snapshots `locality_data` crees par l'injection ne sont jamais supprimes, meme si l'article source est archive

---

## 6. Integration avec le cron

### 6.1 Principe : une seule pipeline

```
                          ┌──────────────────────┐
                          │  generateAndPublish() │
                          │  (src/domains/blog/   │
                          │   pipeline.ts)         │
                          └──────────┬─────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
          ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
          │ Cron job     │  │ Admin UI     │  │ API (futur)  │
          │ (schedule)   │  │ (bouton)     │  │ (webhook)    │
          └─────────────┘  └──────────────┘  └──────────────┘
```

La fonction `generateAndPublish()` est le point d'entree unique. Elle accepte un parametre `triggeredBy` pour distinguer l'origine :

| Parametre | Cron | Admin |
|-----------|------|-------|
| `triggeredBy` | `"cron"` | `"admin"` |
| `adminUserId` | `undefined` | ID de l'admin |
| `mode` | `"publish"` (toujours) | `"draft"` ou `"publish"` (choix admin) |
| Rate limit | Non (controle par la planification) | Oui (5/heure) |
| Audit log | `action: "cron_generate"` | `action: "generate_article"` |

### 6.2 Le cron remplit la queue, l'admin peut forcer

Le cron (Vercel Cron ou GitHub Actions) appelle `runBlogCron()` qui :
1. Determine les articles a generer selon le planning editorial
2. Appelle `generateAndPublish()` pour chacun avec `triggeredBy: "cron"`
3. Publie directement (pas de brouillon)

L'admin peut :
1. Generer un article **hors queue** (n'importe quel type, n'importe quelle ville)
2. Forcer la generation d'un article qui est dans la queue mais pas encore traite
3. Regenerer un article deja publie par le cron

### 6.3 Pas de duplication de code

Toutes les etapes de la pipeline sont partagees :

| Etape | Fichier | Utilise par cron | Utilise par admin |
|-------|---------|-----------------|-------------------|
| Collecte contexte | `src/domains/blog/pipeline.ts` | Oui | Oui |
| Appel Gemini | `src/domains/blog/extractor.ts` | Oui | Oui |
| Validation | `src/domains/blog/validator.ts` | Oui | Oui |
| Injection donnees | `src/domains/blog/injector.ts` | Oui | Oui |
| Audit | `src/domains/blog/audit.ts` | Oui | Oui |
| Persistence article | `src/domains/blog/repository.ts` | Oui | Oui |

La seule difference est le point d'entree :
- **Cron** : `src/domains/blog/cron.ts` -> `generateAndPublish()`
- **Admin** : `src/domains/blog/actions.ts` -> `generateArticle()` -> `generateAndPublish()`

---

## 7. Schema de base de donnees

### Table `blog_articles`

```sql
CREATE TABLE IF NOT EXISTS blog_articles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,                  -- BlogArticleCategory
  status TEXT NOT NULL DEFAULT 'draft', -- generating | draft | published | error | archived
  title TEXT NOT NULL DEFAULT '',
  markdown TEXT NOT NULL DEFAULT '',
  extracted_data TEXT DEFAULT '',       -- JSON BlogExtractedData
  validation_result TEXT DEFAULT '',    -- JSON ValidationResult

  -- Parametres de generation
  locality_id TEXT,                    -- FK localities.id (nullable pour articles sans ville)
  city_name TEXT,
  locality_slug TEXT,
  quartier TEXT,
  subject TEXT,
  source_urls TEXT DEFAULT '[]',       -- JSON string[]

  -- Metadonnees
  triggered_by TEXT NOT NULL DEFAULT 'admin', -- "cron" | "admin"
  admin_user_id TEXT,                  -- FK users.id (null si cron)
  gemini_model TEXT,
  gemini_tokens_in INTEGER DEFAULT 0,
  gemini_tokens_out INTEGER DEFAULT 0,
  api_cost_eur REAL DEFAULT 0,

  -- Injection
  data_injected INTEGER DEFAULT 0,    -- boolean : donnees injectees dans locality_data ?
  data_fields_injected INTEGER DEFAULT 0,
  data_snapshot_ids TEXT DEFAULT '[]', -- JSON string[] des IDs locality_data crees

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT,

  FOREIGN KEY (locality_id) REFERENCES localities(id)
);

CREATE INDEX idx_blog_articles_status ON blog_articles(status);
CREATE INDEX idx_blog_articles_type ON blog_articles(type);
CREATE INDEX idx_blog_articles_locality ON blog_articles(locality_id);
CREATE INDEX idx_blog_articles_created ON blog_articles(created_at DESC);
CREATE UNIQUE INDEX idx_blog_articles_slug ON blog_articles(slug);
```

### Table `blog_audit_log`

```sql
CREATE TABLE IF NOT EXISTS blog_audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_blog_audit_user ON blog_audit_log(user_id, created_at);
CREATE INDEX idx_blog_audit_action ON blog_audit_log(action, created_at);
```

### Table `blog_data_audit` (tracabilite injection)

```sql
CREATE TABLE IF NOT EXISTS blog_data_audit (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  locality_id TEXT NOT NULL,
  status TEXT NOT NULL,                -- "auto-injected" | "pending-review" | "approved" | "rejected" | "error"
  extracted_data TEXT NOT NULL,        -- JSON des donnees extraites pour cette localite
  validation_errors TEXT DEFAULT '[]',
  validation_warnings TEXT DEFAULT '[]',
  reviewed_by TEXT,                    -- null = auto, user_id = review manuelle
  snapshot_id TEXT,                    -- ID du locality_data cree (si injecte)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,

  FOREIGN KEY (article_id) REFERENCES blog_articles(id),
  FOREIGN KEY (locality_id) REFERENCES localities(id)
);

CREATE INDEX idx_blog_data_audit_article ON blog_data_audit(article_id);
CREATE INDEX idx_blog_data_audit_status ON blog_data_audit(status);
```

---

## 8. Arborescence fichiers a creer

```
src/
  app/
    admin/
      blog/
        page.tsx                       # Page server component
  components/
    admin/
      blog/
        AdminBlogDashboard.tsx         # Dashboard principal
        ArticleGeneratorForm.tsx       # Modale de generation
        ArticlePreview.tsx             # Previsualisation article
        ArticleList.tsx                # Tableau d'articles avec filtres
        DataPreview.tsx                # Previsualisation donnees JSON
        PublishStepper.tsx             # Stepper de progression
  domains/
    blog/
      types.ts                         # BlogArticleCategory, BlogExtractedData, etc.
      actions.ts                       # Server Actions (generateArticle, publishArticle, etc.)
      pipeline.ts                      # generateAndPublish() + fonctions internes
      extractor.ts                     # Appel Gemini double output + parsing
      validator.ts                     # Validation bornes + coherence + comparaison
      injector.ts                      # Injection dans locality_data
      repository.ts                    # CRUD blog_articles en DB
      audit.ts                         # Logs d'audit + blog_data_audit
      cron.ts                          # Point d'entree cron
```

---

## 9. Ordre d'implementation recommande

| Phase | Fichiers | Estimation | Prerequis |
|-------|----------|-----------|-----------|
| **P0** | `types.ts`, `repository.ts`, migration DB | 0.5j | — |
| **P1** | `pipeline.ts`, `extractor.ts`, `validator.ts`, `injector.ts` | 1.5j | P0 |
| **P2** | `actions.ts`, `audit.ts` | 0.5j | P1 |
| **P3** | `page.tsx`, `AdminBlogDashboard.tsx`, `ArticleList.tsx` | 1j | P2 |
| **P4** | `ArticleGeneratorForm.tsx`, `PublishStepper.tsx` | 0.5j | P3 |
| **P5** | `ArticlePreview.tsx`, `DataPreview.tsx` | 0.5j | P3 |
| **P6** | `cron.ts` + configuration Vercel Cron | 0.5j | P1 |
| **Total** | | **~5j** | |

La phase P1 (pipeline) est la plus critique car elle est partagee entre cron et admin. Commencer par la, meme avec un UI minimal, permet de valider la generation d'articles rapidement.
