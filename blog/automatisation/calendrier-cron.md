# Calendrier Cron & Pipeline de Publication Automatisee — tiili.fr

> Specification technique pour la publication automatisee de ~45 articles/mois via pipeline IA (Gemini).
> Stack : Next.js 16, Vercel, SQLite/Turso, GitHub Actions.

---

## 1. Calendrier automatise detaille

### 1.1 — Planning semaine type avec horaires

Chaque jour a un **slot principal** (article long, 2500+ mots) et un **slot secondaire** optionnel (article court, 800-1500 mots). Les horaires sont en UTC+1 (heure de Paris).

| Jour | Slot principal (06h00) | Slot secondaire (12h00) | Total |
|------|------------------------|-------------------------|-------|
| **Lundi** | Guide ville | Actu marche | 2 |
| **Mardi** | Conseil investissement | Actu marche | 2 |
| **Mercredi** | Guide ville | Guide quartier | 2 |
| **Jeudi** | Analyse comparative | Actu marche | 2 |
| **Vendredi** | Guide ville | Guide quartier | 2 |
| **Samedi** | Etude de cas / Fiscalite / Financement (rotation) | — | 1 |
| **Dimanche** | — (pas de publication) | — | 0 |
| **Total semaine** | | | **~11** |
| **Total mois** | | | **~44-48** |

**Pourquoi ces horaires ?**
- **06h00** : article principal indexe par Google avant le pic de trafic matinal. Les cadres/investisseurs consultent entre 7h30 et 9h00 (cf. horaires LinkedIn/X).
- **12h00** : article secondaire aligne sur la pause dejeuner, second pic de consultation.
- **Samedi** : un seul article, rotation entre etude de cas (S1, S3), fiscalite (S2) et financement (S4).

### 1.2 — Algorithme de selection du type d'article

```typescript
// Logique de selection du type d'article pour un jour donne

interface ArticleSlot {
  dayOfWeek: number; // 1=lundi ... 7=dimanche
  slotType: 'primary' | 'secondary';
}

const WEEKLY_SCHEDULE: Record<string, { primary: ArticleCategory; secondary?: ArticleCategory }> = {
  '1': { primary: 'guide-ville',            secondary: 'actu-marche' },
  '2': { primary: 'conseil',                secondary: 'actu-marche' },
  '3': { primary: 'guide-ville',            secondary: 'guide-quartier' },
  '4': { primary: 'analyse',                secondary: 'actu-marche' },
  '5': { primary: 'guide-ville',            secondary: 'guide-quartier' },
  '6': { primary: 'rotation-samedi',        secondary: undefined },
  '7': { primary: undefined,                secondary: undefined }, // dimanche = repos
};

// Rotation du samedi sur un cycle de 4 semaines
function getSaturdayCategory(weekOfMonth: number): ArticleCategory {
  const rotation: ArticleCategory[] = [
    'etude-de-cas',   // S1
    'fiscalite',      // S2
    'etude-de-cas',   // S3
    'financement',    // S4
  ];
  return rotation[(weekOfMonth - 1) % 4];
}

// Override saisonnalite : certains mois forcent des types specifiques
function applySeasonalOverride(
  category: ArticleCategory,
  month: number,
  dayOfMonth: number
): ArticleCategory {
  // Janvier : forcer "Top villes ou investir" en semaine 1
  if (month === 1 && dayOfMonth <= 7 && category === 'analyse') {
    return 'analyse'; // sujet force : "Meilleures villes ou investir en [annee]"
  }
  // Avril-Mai : booster fiscalite (declarations)
  if ((month === 4 || month === 5) && category === 'conseil') {
    return 'fiscalite'; // remplacer certains conseils par fiscalite
  }
  // Juin + Septembre : booster guides villes etudiantes
  if ((month === 6 || month === 9) && category === 'guide-ville') {
    return 'guide-ville'; // sujet force : ville etudiante
  }
  return category;
}
```

### 1.3 — Algorithme de selection du sujet / ville

La selection du sujet suit un systeme de scoring multi-criteres.

```typescript
interface SubjectCandidate {
  type: 'city' | 'topic' | 'comparison';
  identifier: string;          // slug ville ou identifiant sujet
  score: number;               // score composite calcule
}

interface ScoringWeights {
  dataFreshness: number;       // 0.30 — donnees anciennes = priorite haute
  dataCompleteness: number;    // 0.25 — lacunes dans locality_data
  searchVolume: number;        // 0.15 — volume de recherche estime
  seasonalRelevance: number;   // 0.15 — pertinence saisonniere
  lastPublished: number;       // 0.10 — anciennete derniere publication
  newsRelevance: number;       // 0.05 — actualite (RSS, DVF recentes)
}

function scoreCity(city: CityCandidate, weights: ScoringWeights): number {
  let score = 0;

  // 1. Fraicheur des donnees (30%)
  // Plus les donnees sont anciennes, plus le score est eleve
  const daysSinceLastData = daysBetween(city.lastDataUpdate, now());
  score += weights.dataFreshness * Math.min(daysSinceLastData / 90, 1); // plateau a 90 jours

  // 2. Completude des donnees (25%)
  // Nombre de champs P0 manquants dans locality_data
  const totalP0Fields = 45;
  const filledFields = countNonNullFields(city.localityData, P0_FIELDS);
  score += weights.dataCompleteness * (1 - filledFields / totalP0Fields);

  // 3. Volume de recherche (15%)
  // Estimation basee sur la population et le ratio historique
  const normalizedVolume = city.estimatedSearchVolume / MAX_SEARCH_VOLUME;
  score += weights.searchVolume * normalizedVolume;

  // 4. Pertinence saisonniere (15%)
  score += weights.seasonalRelevance * getSeasonalScore(city, currentMonth());

  // 5. Anciennete derniere publication (10%)
  const daysSinceLastArticle = daysBetween(city.lastArticleDate, now());
  score += weights.lastPublished * Math.min(daysSinceLastArticle / 60, 1);

  // 6. Actualite (5%)
  score += weights.newsRelevance * (city.hasRecentNews ? 1 : 0);

  return score;
}

function getSeasonalScore(city: CityCandidate, month: number): number {
  const scores: Record<string, number[]> = {
    // Tags de la ville → score par mois (jan=0 ... dec=11)
    'ville-etudiante':  [0.3, 0.3, 0.3, 0.3, 0.5, 0.8, 0.5, 0.5, 1.0, 0.5, 0.3, 0.3],
    'ville-littorale':  [0.3, 0.3, 0.3, 0.5, 0.7, 1.0, 1.0, 1.0, 0.5, 0.3, 0.3, 0.3],
    'grande-ville':     [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.5, 0.5, 0.7, 0.7, 0.7, 0.7],
    'ville-montagne':   [0.8, 0.8, 0.5, 0.3, 0.3, 0.5, 0.8, 0.8, 0.3, 0.3, 0.5, 0.8],
  };
  for (const tag of city.tags) {
    if (scores[tag]) return scores[tag][month];
  }
  return 0.5; // score neutre par defaut
}

// Selection finale : top candidate apres scoring
async function selectSubject(
  category: ArticleCategory,
  forceCity?: string,
  forceTopic?: string
): Promise<SubjectCandidate> {
  // Override manuel
  if (forceCity) return { type: 'city', identifier: forceCity, score: 999 };
  if (forceTopic) return { type: 'topic', identifier: forceTopic, score: 999 };

  // Recuperer les candidats selon la categorie
  const candidates = await getCandidatesForCategory(category);

  // Scorer et trier
  const scored = candidates
    .map(c => ({ ...c, score: scoreCity(c, DEFAULT_WEIGHTS) }))
    .sort((a, b) => b.score - a.score);

  // Eviter les repetitions : exclure les villes publiees dans les 7 derniers jours
  const recentSlugs = await getRecentArticleSlugs(7);
  const filtered = scored.filter(c => !recentSlugs.includes(c.identifier));

  return filtered[0] || scored[0]; // fallback si tout est recent
}
```

### 1.4 — Gestion articles de fond vs articles d'actualite

```
┌──────────────────────────────────────────────────────────┐
│                    DECISION TREE                          │
│                                                          │
│  Est-ce qu'il y a une actu marche majeure aujourd'hui ?  │
│  (DVF trimestriel, annonce BCE, reforme fiscale...)      │
│       │                                                  │
│       ├── OUI → Article actu urgent                      │
│       │         - Remplace le slot secondaire du jour    │
│       │         - Si tres majeur : remplace aussi le     │
│       │           slot principal (guide ville reporte)   │
│       │         - Flag : priority = 'breaking'           │
│       │                                                  │
│       └── NON → Planning standard                        │
│             │                                            │
│             ├── Slot principal = article de fond          │
│             │   (guide ville, conseil, analyse)           │
│             │   - Generation longue (~90s)                │
│             │   - Validation donnees stricte              │
│             │   - Extraction locality_data complete       │
│             │                                            │
│             └── Slot secondaire = article court           │
│                 (actu marche, guide quartier)             │
│                 - Generation rapide (~45s)                │
│                 - Validation donnees allegee              │
│                 - Extraction donnees partielle            │
└──────────────────────────────────────────────────────────┘
```

**Detection d'actualite urgente** :

```typescript
interface NewsSignal {
  source: string;       // 'rss' | 'dvf-api' | 'manual'
  title: string;
  relevanceScore: number; // 0-1
  detectedAt: Date;
}

async function checkBreakingNews(): Promise<NewsSignal | null> {
  const signals = await Promise.all([
    checkRSSFeeds([
      'https://www.capital.fr/immobilier/rss',
      'https://www.lesechos.fr/patrimoine/immobilier/rss',
      'https://www.pap.fr/rss',
    ]),
    checkDVFNewRelease(),      // nouvelle publication DVF trimestrielle
    checkBanqueDeFranceTaux(), // mise a jour taux directeurs
  ]);

  const urgent = signals
    .flat()
    .filter(s => s.relevanceScore > 0.8)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  return urgent[0] || null;
}
```

---

## 2. Architecture cron

### 2.1 — Option A : GitHub Actions (cron schedule)

```yaml
# .github/workflows/publish-daily.yml
name: Daily Blog Publication

on:
  schedule:
    # Slot principal : tous les jours sauf dimanche, 05h00 UTC (06h00 Paris)
    - cron: '0 5 * * 1-6'
    # Slot secondaire : lundi-vendredi, 11h00 UTC (12h00 Paris)
    - cron: '0 11 * * 1-5'
  workflow_dispatch:
    inputs:
      type:
        description: 'Forcer un type d article'
        required: false
        type: choice
        options: ['', 'guide-ville', 'guide-quartier', 'actu-marche', 'analyse', 'conseil', 'fiscalite', 'financement', 'etude-de-cas']
      city:
        description: 'Forcer une ville (slug)'
        required: false
        type: string
      dry_run:
        description: 'Mode dry-run (pas de publication)'
        required: false
        type: boolean
        default: false
      skip_social:
        description: 'Ne pas publier sur les reseaux sociaux'
        required: false
        type: boolean
        default: false
      catchup:
        description: 'Mode rattrapage (publier les articles manques)'
        required: false
        type: boolean
        default: false
```

**Avantages** :
- Gratuit (2 000 min/mois sur les repos publics, 3 000 min/mois sur les prives)
- `workflow_dispatch` permet le declenchement manuel avec parametres
- Logs complets et persistants (90 jours)
- Secrets management integre (GEMINI_API_KEY, TURSO_*, DISCORD_WEBHOOK_URL)
- Matrice de retry native
- Integration naturelle avec le repo Git (commits, PRs)
- Possibilite de runner self-hosted si besoin de plus de puissance

**Inconvenients** :
- Precision cron : +/- 5-15 minutes (GitHub ne garantit pas l'heure exacte)
- Cold start Node.js a chaque execution (~10-15s)
- Pas de connexion directe a l'environnement Vercel
- Timeout max : 6 heures (largement suffisant)
- Pas de dashboard temps reel integre

---

### 2.2 — Option B : Vercel Cron Jobs

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/publish-primary",
      "schedule": "0 5 * * 1-6"
    },
    {
      "path": "/api/cron/publish-secondary",
      "schedule": "0 11 * * 1-5"
    }
  ]
}
```

```typescript
// src/app/api/cron/publish-primary/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Verifier le secret cron Vercel
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Lancer la pipeline
  const result = await publishArticle({ slot: 'primary' });
  return NextResponse.json(result);
}
```

**Avantages** :
- Acces direct a l'environnement Vercel (env vars, DB Turso, meme runtime)
- Pas de cold start supplementaire si la fonction est deja warm
- Revalidation ISR directe via `revalidatePath()` / `revalidateTag()`
- Dashboard Vercel integre (logs, metriques)
- Meme stack partout (pas de contexte d'execution different)

**Inconvenients** :
- **Timeout : 60s sur le plan Hobby, 300s sur Pro** — tres court pour une pipeline IA complete (generation article ~30-60s + validation ~10s + injection ~5s + social ~15s = ~60-90s total)
- Pas de `workflow_dispatch` equivalent (pas de parametres manuels faciles)
- Pas de mode dry-run natif
- Cron limits : 2 crons sur Hobby, 40 sur Pro
- Pas de retry automatique sophistique
- Si le build est en cours, le cron peut echouer
- Logs ephemeres (durée limitee selon le plan)

---

### 2.3 — Option C : Hybride (GitHub Actions + Vercel)

```
┌─────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE HYBRIDE                       │
│                                                              │
│  GitHub Actions (orchestrateur)                              │
│  ├── Cron schedule (5h + 11h UTC)                            │
│  ├── workflow_dispatch (mode manuel)                          │
│  ├── Selection sujet + collecte donnees                      │
│  ├── Generation article (Gemini API, ~60-90s)                │
│  ├── Validation donnees                                      │
│  └── Appel API Vercel pour publication                       │
│       │                                                      │
│       ▼                                                      │
│  Vercel API Route (executeur leger)                          │
│  ├── POST /api/blog/publish                                  │
│  │   ├── Insert article en DB (Turso)                        │
│  │   ├── revalidatePath('/blog')                             │
│  │   ├── revalidatePath('/guide/[city]')                     │
│  │   └── Return { success, articleId, slug }                 │
│  │                                                           │
│  ├── POST /api/blog/inject-data                              │
│  │   ├── Merge extracted_data → locality_data                │
│  │   ├── revalidatePath('/guide/[city]')                     │
│  │   └── Return { injected, fieldsUpdated }                  │
│  │                                                           │
│  └── POST /api/cron/health                                   │
│      └── Return { status, lastPublication, dbStatus }        │
│                                                              │
│  GitHub Actions (post-publication)                            │
│  ├── Publication sociale (Buffer/Typefully API)              │
│  ├── Notification Discord                                    │
│  └── Mise a jour metriques                                   │
└─────────────────────────────────────────────────────────────┘
```

**Quand utiliser quoi** :

| Tache | GitHub Actions | Vercel API |
|-------|---------------|------------|
| Cron scheduling | X | |
| Selection sujet | X | |
| Collecte donnees (DVF, RSS) | X | |
| Generation Gemini (long) | X | |
| Validation donnees | X | |
| Insert DB + revalidation ISR | | X |
| Injection locality_data | | X |
| Publication sociale | X | |
| Notifications | X | |
| Mode dry-run | X | |
| Mode rattrapage | X | |
| Declenchement manuel | X (workflow_dispatch) | |
| Health check | | X |

---

### 2.4 — Recommandation finale

**Option C (Hybride) est recommandee.** Voici pourquoi :

1. **Pas de contrainte de timeout** : la generation Gemini peut prendre 30-90s. GitHub Actions permet jusqu'a 6h par job. Vercel Hobby limite a 60s par route, ce qui est trop juste.

2. **Separation des responsabilites** : GitHub Actions orchestre la logique metier lourde (IA, validation, social). Vercel ne fait que ce qu'il fait le mieux : servir le contenu et revalider le cache ISR.

3. **Operabilite** : `workflow_dispatch` offre un mode manuel parametrable (--type, --city, --dry-run, --catchup) impossible a reproduire proprement avec Vercel Cron.

4. **Cout** : tout tient dans les limites gratuites de GitHub Actions (< 30 min/jour) et de Vercel Hobby.

5. **Resilience** : si Vercel est down, les articles sont generes et stockes cote GitHub. La publication effective peut etre rejouee. Si GitHub Actions est down, le `workflow_dispatch` permet un rattrapage manuel.

---

### 2.5 — Configuration complete prete a l'emploi

#### Workflow GitHub Actions

```yaml
# .github/workflows/publish-daily.yml
name: Daily Blog Publication

on:
  schedule:
    # Slot principal : tous les jours sauf dimanche, 05h00 UTC (06h00 Paris)
    - cron: '0 5 * * 1-6'
    # Slot secondaire : lundi-vendredi, 11h00 UTC (12h00 Paris)
    - cron: '0 11 * * 1-5'
  workflow_dispatch:
    inputs:
      type:
        description: 'Forcer un type d article (vide = automatique)'
        required: false
        type: choice
        options:
          - ''
          - 'guide-ville'
          - 'guide-quartier'
          - 'actu-marche'
          - 'analyse'
          - 'conseil'
          - 'fiscalite'
          - 'financement'
          - 'etude-de-cas'
      city:
        description: 'Forcer une ville (slug, ex: lyon)'
        required: false
        type: string
      dry_run:
        description: 'Dry-run : generer sans publier'
        required: false
        type: boolean
        default: false
      skip_social:
        description: 'Ne pas publier sur les reseaux sociaux'
        required: false
        type: boolean
        default: false
      catchup:
        description: 'Mode rattrapage : publier les articles manques'
        required: false
        type: boolean
        default: false

env:
  NODE_VERSION: '22'

jobs:
  publish:
    name: Generate & Publish Article
    runs-on: ubuntu-latest
    timeout-minutes: 15
    # Ne pas executer les deux crons en parallele
    concurrency:
      group: blog-publication
      cancel-in-progress: false

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Determine slot type
        id: slot
        run: |
          HOUR=$(date -u +%H)
          if [ "$HOUR" -lt 8 ]; then
            echo "slot=primary" >> $GITHUB_OUTPUT
          else
            echo "slot=secondary" >> $GITHUB_OUTPUT
          fi

      - name: Run publication pipeline
        id: pipeline
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
          TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
          VERCEL_PUBLISH_URL: ${{ secrets.VERCEL_PUBLISH_URL }}
          VERCEL_API_SECRET: ${{ secrets.VERCEL_API_SECRET }}
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
          BUFFER_ACCESS_TOKEN: ${{ secrets.BUFFER_ACCESS_TOKEN }}
          TYPEFULLY_API_KEY: ${{ secrets.TYPEFULLY_API_KEY }}
        run: |
          npx tsx scripts/publish-daily.ts \
            --slot ${{ steps.slot.outputs.slot }} \
            ${{ github.event.inputs.type && format('--type {0}', github.event.inputs.type) || '' }} \
            ${{ github.event.inputs.city && format('--city {0}', github.event.inputs.city) || '' }} \
            ${{ github.event.inputs.dry_run == 'true' && '--dry-run' || '' }} \
            ${{ github.event.inputs.skip_social == 'true' && '--skip-social' || '' }} \
            ${{ github.event.inputs.catchup == 'true' && '--catchup' || '' }}

      - name: Upload article artifact (dry-run)
        if: github.event.inputs.dry_run == 'true'
        uses: actions/upload-artifact@v4
        with:
          name: generated-article-${{ github.run_id }}
          path: /tmp/tiili-dry-run-output/
          retention-days: 7

      - name: Notify on failure
        if: failure()
        env:
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
        run: |
          curl -s -H "Content-Type: application/json" \
            -X POST "$DISCORD_WEBHOOK_URL" \
            -d '{
              "embeds": [{
                "title": "Publication echouee",
                "description": "Le pipeline de publication a echoue pour le slot `${{ steps.slot.outputs.slot }}`.\n\n[Voir les logs](https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }})",
                "color": 15548997,
                "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
              }]
            }'

  # Job de rattrapage : verifie si des articles ont ete manques
  catchup-check:
    name: Check for missed publications
    runs-on: ubuntu-latest
    # Seulement sur le cron de 5h UTC (pas sur workflow_dispatch)
    if: github.event_name == 'schedule' && contains(github.event.schedule, '0 5')
    needs: publish
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Check missed articles
        env:
          TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
          TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
        run: npx tsx scripts/check-missed-publications.ts
```

#### Workflow de monitoring hebdomadaire

```yaml
# .github/workflows/blog-monitor.yml
name: Weekly Blog Monitor

on:
  schedule:
    # Dimanche 20h00 UTC (21h00 Paris)
    - cron: '0 20 * * 0'
  workflow_dispatch:

jobs:
  monitor:
    name: Blog Health Report
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate weekly report
        env:
          TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
          TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
        run: npx tsx scripts/blog-weekly-report.ts
```

#### Routes API Vercel (executeur leger)

```typescript
// src/app/api/blog/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  // Auth
  const secret = request.headers.get('x-api-secret');
  if (secret !== process.env.VERCEL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  // { article, extractedData, category, slug, citySlug? }

  // 1. Insert article en DB
  const articleId = await insertBlogArticle(body);

  // 2. Revalidation ISR
  revalidatePath('/blog');
  revalidatePath(`/blog/${body.slug}`);
  if (body.category === 'guide-ville' && body.citySlug) {
    revalidatePath(`/guide/${body.citySlug}`);
  }
  revalidatePath('/guide'); // index des guides
  revalidatePath('/sitemap.xml');

  return NextResponse.json({
    success: true,
    articleId,
    slug: body.slug,
    publishedAt: new Date().toISOString(),
  });
}

export const runtime = 'nodejs';
export const maxDuration = 30; // secondes
```

```typescript
// src/app/api/blog/inject-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-api-secret');
  if (secret !== process.env.VERCEL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { articleId, extractedData, citySlug } = await request.json();

  // Validation + merge locality_data (cf. pipeline-data-article-app.md)
  const result = await injectLocalityData(articleId, extractedData, citySlug);

  if (result.injected) {
    revalidatePath(`/guide/${citySlug}`);
    revalidatePath('/guide');
  }

  return NextResponse.json(result);
}

export const runtime = 'nodejs';
export const maxDuration = 15;
```

---

## 3. Pipeline de publication automatique

### 3.1 — Flux etape par etape

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ETAPE 1 — SELECTION SUJET                                     [~2s]   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ 1. Determiner la categorie du jour (planning semaine)          │    │
│  │ 2. Verifier les actualites urgentes (RSS, DVF, BCE)            │    │
│  │ 3. Scorer les candidats (fraicheur, lacunes, saisonnalite)     │    │
│  │ 4. Selectionner le sujet avec le score le plus eleve           │    │
│  │ 5. Verifier qu'il n'est pas en doublon recent                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  Erreur possible : pas de candidat valide                              │
│  → Action : notifier + publier un article de la queue de rattrapage    │
│                                                                        │
│  ETAPE 2 — COLLECTE DONNEES                                   [~5s]   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ 1. Charger locality_data existante pour la ville cible         │    │
│  │ 2. Appeler DVF API pour les dernieres transactions             │    │
│  │ 3. Charger les articles recents sur cette ville (contexte)     │    │
│  │ 4. Recuperer les actualites pertinentes (RSS filtre)           │    │
│  │ 5. Construire le contexte pour le prompt Gemini                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  Erreur possible : API DVF indisponible                                │
│  → Action : utiliser les donnees en cache + flag quality = 'degraded'  │
│                                                                        │
│  ETAPE 3 — GENERATION ARTICLE (Gemini)                       [~30-90s] │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ 1. Construire le prompt (categorie + sujet + donnees + charte) │    │
│  │ 2. Appeler Gemini 2.5 Flash                                    │    │
│  │ 3. Parser la reponse : article_markdown + extracted_data       │    │
│  │ 4. Generer le slug, meta_description, json_ld                  │    │
│  │ 5. Generer les tags et le maillage interne                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  Erreur possible : Gemini timeout / rate limit / reponse invalide      │
│  → Action : retry x2 (backoff 10s, 30s), puis skip + notifier         │
│                                                                        │
│  ETAPE 4 — VALIDATION                                          [~5s]   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ 1. Validation structurelle (champs requis, longueur, format)   │    │
│  │ 2. Validation bornes realistes (prix 500-15000 EUR/m2, etc.)   │    │
│  │ 3. Comparaison avec donnees existantes (delta > 30% = suspect) │    │
│  │ 4. Verification maillage interne (liens valides)               │    │
│  │ 5. Score de confiance global (0-100)                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  Erreur possible : score confiance < 60                                │
│  → Action : placer en queue humaine + notifier + publier un backup     │
│                                                                        │
│  ETAPE 5 — PUBLICATION                                         [~3s]   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ 1. Appeler POST /api/blog/publish sur Vercel                   │    │
│  │ 2. Verifier la reponse (articleId, slug)                       │    │
│  │ 3. Confirmer l'accessibilite de l'URL publique                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  Erreur possible : Vercel API 5xx                                      │
│  → Action : retry x3 (backoff 5s, 15s, 45s), puis sauver localement   │
│                                                                        │
│  ETAPE 6 — INJECTION DONNEES                                  [~3s]   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ 1. Appeler POST /api/blog/inject-data sur Vercel               │    │
│  │ 2. Merge extracted_data dans locality_data                     │    │
│  │ 3. Revalidation ISR du guide ville associe                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  Erreur possible : conflit de merge (donnees manuelles vs IA)          │
│  → Action : garder les donnees manuelles, logguer le conflit           │
│                                                                        │
│  ETAPE 7 — PUBLICATION SOCIALE                                [~10s]   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ 1. Generer les posts multi-plateformes (Gemini, prompt social) │    │
│  │ 2. Programmer LinkedIn + X via Buffer/Typefully API            │    │
│  │ 3. Programmer Instagram (texte carrousel, a designer)          │    │
│  │ 4. Cross-post Threads (adapte depuis X)                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  Erreur possible : API sociale rate limit / auth failure               │
│  → Action : retry x1, puis skip social + notifier (non bloquant)      │
│                                                                        │
│  ETAPE 8 — NOTIFICATION & LOGS                                 [~1s]   │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ 1. Envoyer notification Discord (succes / succes partiel)      │    │
│  │ 2. Logguer dans blog_publication_log (DB)                      │    │
│  │ 3. Mettre a jour les metriques (tokens, cout, duree)           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.2 — Timeout et retry strategy

| Etape | Timeout | Retries | Backoff | Fallback |
|-------|---------|---------|---------|----------|
| Selection sujet | 10s | 0 | — | Utiliser le premier candidat de la queue |
| Collecte donnees | 30s | 2 | 5s, 15s | Donnees en cache + flag degraded |
| Generation Gemini | 120s | 2 | 10s, 30s | Skip + notifier + queue rattrapage |
| Validation | 10s | 0 | — | Publication avec flag `needs_review` |
| Publication Vercel | 30s | 3 | 5s, 15s, 45s | Sauvegarde locale + retry au prochain cron |
| Injection donnees | 15s | 2 | 5s, 15s | Skip injection, article publie sans data |
| Publication sociale | 30s | 1 | 10s | Skip social (non bloquant) |
| Notification | 10s | 1 | 5s | Log stderr (non bloquant) |

```typescript
// Utilitaire de retry generique
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    backoffMs: number[];
    timeout: number;
    label: string;
  }
): Promise<T> {
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${options.timeout}ms`)), options.timeout)
        ),
      ]);
      return result;
    } catch (error) {
      const isLastAttempt = attempt === options.maxRetries;
      if (isLastAttempt) {
        logger.error(`[${options.label}] Echec apres ${attempt + 1} tentatives`, error);
        throw error;
      }
      const delay = options.backoffMs[attempt] || options.backoffMs.at(-1)!;
      logger.warn(`[${options.label}] Tentative ${attempt + 1} echouee, retry dans ${delay}ms`);
      await sleep(delay);
    }
  }
  throw new Error('Unreachable');
}
```

### 3.3 — Gestion d'erreur par etape

```typescript
enum PipelineStage {
  SUBJECT_SELECTION = 'subject_selection',
  DATA_COLLECTION = 'data_collection',
  ARTICLE_GENERATION = 'article_generation',
  VALIDATION = 'validation',
  PUBLICATION = 'publication',
  DATA_INJECTION = 'data_injection',
  SOCIAL_PUBLICATION = 'social_publication',
  NOTIFICATION = 'notification',
}

interface PipelineError {
  stage: PipelineStage;
  error: Error;
  recoverable: boolean;
  action: 'retry' | 'skip' | 'fallback' | 'abort';
}

// Matrice de gestion d'erreur
const ERROR_HANDLING: Record<PipelineStage, {
  critical: boolean;        // Si true, stoppe le pipeline
  notifyOnFailure: boolean;
  fallbackAction: string;
}> = {
  [PipelineStage.SUBJECT_SELECTION]: {
    critical: true,
    notifyOnFailure: true,
    fallbackAction: 'Utiliser le premier sujet de la queue de rattrapage',
  },
  [PipelineStage.DATA_COLLECTION]: {
    critical: false, // on peut generer avec des donnees partielles
    notifyOnFailure: true,
    fallbackAction: 'Utiliser donnees en cache, flagguer quality=degraded',
  },
  [PipelineStage.ARTICLE_GENERATION]: {
    critical: true,
    notifyOnFailure: true,
    fallbackAction: 'Abort pipeline, notifier, ajouter a la queue rattrapage',
  },
  [PipelineStage.VALIDATION]: {
    critical: false, // on peut publier avec needs_review
    notifyOnFailure: true,
    fallbackAction: 'Publier avec status=needs_review, notifier pour relecture',
  },
  [PipelineStage.PUBLICATION]: {
    critical: true,
    notifyOnFailure: true,
    fallbackAction: 'Sauver en local, retry au prochain cron',
  },
  [PipelineStage.DATA_INJECTION]: {
    critical: false,
    notifyOnFailure: false,
    fallbackAction: 'Skip injection, article publie sans enrichissement data',
  },
  [PipelineStage.SOCIAL_PUBLICATION]: {
    critical: false,
    notifyOnFailure: false,
    fallbackAction: 'Skip social, publication manuelle possible',
  },
  [PipelineStage.NOTIFICATION]: {
    critical: false,
    notifyOnFailure: false,
    fallbackAction: 'Log stderr',
  },
};
```

### 3.4 — Logs et monitoring

```typescript
// Table de logs en DB
// CREATE TABLE blog_publication_log (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   run_id TEXT NOT NULL,              -- identifiant unique du run
//   slot TEXT NOT NULL,                -- 'primary' | 'secondary'
//   stage TEXT NOT NULL,               -- PipelineStage
//   status TEXT NOT NULL,              -- 'success' | 'warning' | 'error' | 'skipped'
//   category TEXT,                     -- categorie d'article
//   subject TEXT,                      -- sujet / ville
//   article_id INTEGER,               -- FK vers blog_articles si publie
//   duration_ms INTEGER,              -- duree de l'etape
//   tokens_input INTEGER,             -- tokens Gemini input
//   tokens_output INTEGER,            -- tokens Gemini output
//   error_message TEXT,               -- message d'erreur si applicable
//   metadata TEXT,                    -- JSON additionnel
//   created_at TEXT DEFAULT (datetime('now'))
// );

interface PublicationLog {
  runId: string;
  slot: 'primary' | 'secondary';
  stage: PipelineStage;
  status: 'success' | 'warning' | 'error' | 'skipped';
  category?: string;
  subject?: string;
  articleId?: number;
  durationMs: number;
  tokensInput?: number;
  tokensOutput?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}
```

### 3.5 — Notifications Discord

```typescript
interface DiscordEmbed {
  title: string;
  description: string;
  color: number;       // vert=5763719, orange=16760576, rouge=15548997
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp: string;
  footer?: { text: string };
}

// Notification de succes
async function notifySuccess(result: PipelineResult): Promise<void> {
  const embed: DiscordEmbed = {
    title: `Article publie : ${result.article.title}`,
    description: `Categorie : \`${result.category}\`\nVille : ${result.city || '—'}\nSlug : \`${result.slug}\``,
    color: 5763719, // vert
    fields: [
      { name: 'Duree totale', value: `${result.totalDurationMs}ms`, inline: true },
      { name: 'Tokens Gemini', value: `${result.tokensInput + result.tokensOutput}`, inline: true },
      { name: 'Cout estime', value: `${result.estimatedCost.toFixed(4)} EUR`, inline: true },
      { name: 'Donnees injectees', value: result.dataInjected ? `${result.fieldsUpdated} champs` : 'Non', inline: true },
      { name: 'Social', value: result.socialPublished ? 'Programme' : 'Saute', inline: true },
      { name: 'Score confiance', value: `${result.confidenceScore}/100`, inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: `Run ${result.runId} | Slot ${result.slot}` },
  };

  await sendDiscordWebhook(embed);
}

// Notification d'erreur
async function notifyError(stage: PipelineStage, error: Error, context: object): Promise<void> {
  const embed: DiscordEmbed = {
    title: `Erreur pipeline : ${stage}`,
    description: `\`\`\`${error.message}\`\`\``,
    color: 15548997, // rouge
    fields: [
      { name: 'Etape', value: stage, inline: true },
      { name: 'Action', value: ERROR_HANDLING[stage].fallbackAction, inline: false },
    ],
    timestamp: new Date().toISOString(),
  };

  await sendDiscordWebhook(embed);
}

// Alerte 0 article en 24h (appellee par le monitoring)
async function notifyNoPublication(): Promise<void> {
  const embed: DiscordEmbed = {
    title: 'ALERTE : 0 article publie en 24h',
    description: 'Aucun article n\'a ete publie dans les dernieres 24h. Verifier les logs GitHub Actions et l\'etat de la DB.',
    color: 15548997,
    fields: [
      { name: 'Action requise', value: 'Lancer le workflow manuellement avec `catchup: true`', inline: false },
    ],
    timestamp: new Date().toISOString(),
  };

  await sendDiscordWebhook(embed);
}

async function sendDiscordWebhook(embed: DiscordEmbed): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}
```

---

## 4. Script orchestrateur

### 4.1 — Pseudocode complet de `scripts/publish-daily.ts`

```typescript
#!/usr/bin/env tsx

// scripts/publish-daily.ts
// Orchestrateur principal de la pipeline de publication quotidienne.
// Usage :
//   npx tsx scripts/publish-daily.ts --slot primary
//   npx tsx scripts/publish-daily.ts --slot primary --type guide-ville --city lyon
//   npx tsx scripts/publish-daily.ts --slot primary --dry-run
//   npx tsx scripts/publish-daily.ts --catchup

import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';

// ─── TYPES ───────────────────────────────────────────────────

interface CLIArgs {
  slot: 'primary' | 'secondary';
  type?: ArticleCategory;
  city?: string;
  dryRun: boolean;
  skipSocial: boolean;
  catchup: boolean;
}

interface PipelineResult {
  runId: string;
  slot: string;
  success: boolean;
  article?: {
    id: number;
    title: string;
    slug: string;
    category: string;
    city?: string;
    wordCount: number;
  };
  dataInjected: boolean;
  fieldsUpdated: number;
  socialPublished: boolean;
  confidenceScore: number;
  tokensInput: number;
  tokensOutput: number;
  estimatedCost: number;
  totalDurationMs: number;
  errors: PipelineError[];
}

// ─── ARGUMENT PARSING ────────────────────────────────────────

function parseCLI(): CLIArgs {
  const { values } = parseArgs({
    options: {
      slot:        { type: 'string', default: 'primary' },
      type:        { type: 'string' },
      city:        { type: 'string' },
      'dry-run':   { type: 'boolean', default: false },
      'skip-social': { type: 'boolean', default: false },
      catchup:     { type: 'boolean', default: false },
    },
    strict: true,
  });

  return {
    slot: values.slot as 'primary' | 'secondary',
    type: values.type as ArticleCategory | undefined,
    city: values.city,
    dryRun: values['dry-run'] ?? false,
    skipSocial: values['skip-social'] ?? false,
    catchup: values.catchup ?? false,
  };
}

// ─── MAIN ────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseCLI();
  const runId = randomUUID().slice(0, 8);
  const startTime = Date.now();

  console.log(`[${runId}] Pipeline demarree — slot=${args.slot}, dryRun=${args.dryRun}`);

  // ─── MODE RATTRAPAGE ───
  if (args.catchup) {
    await runCatchup(runId, args);
    return;
  }

  // ─── PIPELINE STANDARD ───
  const result = await runPipeline(runId, args);

  // ─── RESUME FINAL ───
  const duration = Date.now() - startTime;
  console.log(`[${runId}] Pipeline terminee en ${duration}ms`);
  console.log(`[${runId}] Succes: ${result.success}`);
  if (result.article) {
    console.log(`[${runId}] Article: ${result.article.title} (${result.article.slug})`);
  }
  if (result.errors.length > 0) {
    console.log(`[${runId}] Erreurs: ${result.errors.map(e => e.stage).join(', ')}`);
  }

  // Exit code non-zero si echec critique
  if (!result.success) {
    process.exit(1);
  }
}

// ─── PIPELINE STANDARD ──────────────────────────────────────

async function runPipeline(runId: string, args: CLIArgs): Promise<PipelineResult> {
  const result: PipelineResult = {
    runId,
    slot: args.slot,
    success: false,
    dataInjected: false,
    fieldsUpdated: 0,
    socialPublished: false,
    confidenceScore: 0,
    tokensInput: 0,
    tokensOutput: 0,
    estimatedCost: 0,
    totalDurationMs: 0,
    errors: [],
  };

  try {
    // ─── ETAPE 1 : SELECTION SUJET ───
    console.log(`[${runId}] Etape 1/8 : Selection du sujet...`);
    const t1 = Date.now();

    const todaySchedule = getScheduleForToday(args.slot);
    const category = args.type || applySeasonalOverride(
      todaySchedule.category,
      new Date().getMonth() + 1,
      new Date().getDate()
    );

    // Verifier les actualites urgentes
    const breakingNews = await checkBreakingNews();
    const effectiveCategory = breakingNews && breakingNews.relevanceScore > 0.8
      ? 'actu-marche'
      : category;

    const subject = await selectSubject(effectiveCategory, args.city);

    await logStep(runId, args.slot, PipelineStage.SUBJECT_SELECTION, 'success', {
      category: effectiveCategory,
      subject: subject.identifier,
      durationMs: Date.now() - t1,
    });

    console.log(`[${runId}] → Categorie: ${effectiveCategory}, Sujet: ${subject.identifier}`);

    // ─── ETAPE 2 : COLLECTE DONNEES ───
    console.log(`[${runId}] Etape 2/8 : Collecte des donnees...`);
    const t2 = Date.now();

    let context: ArticleContext;
    try {
      context = await withRetry(
        () => collectDataForSubject(subject, effectiveCategory),
        { maxRetries: 2, backoffMs: [5000, 15000], timeout: 30000, label: 'data-collection' }
      );
    } catch (error) {
      // Fallback : donnees en cache
      console.warn(`[${runId}] Collecte degradee, utilisation du cache`);
      context = await getCachedContext(subject);
      context.quality = 'degraded';
      result.errors.push({
        stage: PipelineStage.DATA_COLLECTION,
        error: error as Error,
        recoverable: true,
        action: 'fallback',
      });
    }

    await logStep(runId, args.slot, PipelineStage.DATA_COLLECTION, 'success', {
      durationMs: Date.now() - t2,
      quality: context.quality,
    });

    // ─── ETAPE 3 : GENERATION ARTICLE ───
    console.log(`[${runId}] Etape 3/8 : Generation de l'article via Gemini...`);
    const t3 = Date.now();

    let generated: GeneratedArticle;
    try {
      generated = await withRetry(
        () => generateArticle(effectiveCategory, subject, context),
        { maxRetries: 2, backoffMs: [10000, 30000], timeout: 120000, label: 'gemini-generation' }
      );
    } catch (error) {
      // Echec critique : on ne peut pas publier sans article
      result.errors.push({
        stage: PipelineStage.ARTICLE_GENERATION,
        error: error as Error,
        recoverable: false,
        action: 'abort',
      });
      await logStep(runId, args.slot, PipelineStage.ARTICLE_GENERATION, 'error', {
        durationMs: Date.now() - t3,
        errorMessage: (error as Error).message,
      });
      await notifyError(PipelineStage.ARTICLE_GENERATION, error as Error, { runId, subject });
      // Ajouter a la queue de rattrapage
      await addToCatchupQueue(effectiveCategory, subject);
      return result;
    }

    result.tokensInput = generated.usage.inputTokens;
    result.tokensOutput = generated.usage.outputTokens;
    result.estimatedCost = calculateGeminiCost(generated.usage);

    await logStep(runId, args.slot, PipelineStage.ARTICLE_GENERATION, 'success', {
      durationMs: Date.now() - t3,
      tokensInput: generated.usage.inputTokens,
      tokensOutput: generated.usage.outputTokens,
      wordCount: generated.article.split(/\s+/).length,
    });

    console.log(`[${runId}] → ${generated.article.split(/\s+/).length} mots, ${result.tokensInput + result.tokensOutput} tokens`);

    // ─── ETAPE 4 : VALIDATION ───
    console.log(`[${runId}] Etape 4/8 : Validation...`);
    const t4 = Date.now();

    const validation = await validateArticle(generated, context, effectiveCategory);
    result.confidenceScore = validation.confidenceScore;

    if (validation.confidenceScore < 40) {
      // Score trop bas : abort
      console.error(`[${runId}] Score confiance trop bas : ${validation.confidenceScore}/100`);
      await addToHumanReviewQueue(generated, validation);
      await notifyError(PipelineStage.VALIDATION, new Error(`Confidence ${validation.confidenceScore}/100`), { runId });
      await logStep(runId, args.slot, PipelineStage.VALIDATION, 'error', {
        durationMs: Date.now() - t4,
        confidenceScore: validation.confidenceScore,
        issues: validation.issues,
      });
      return result;
    }

    const needsReview = validation.confidenceScore < 70;
    if (needsReview) {
      console.warn(`[${runId}] Score moyen (${validation.confidenceScore}/100), publication avec needs_review`);
    }

    await logStep(runId, args.slot, PipelineStage.VALIDATION, needsReview ? 'warning' : 'success', {
      durationMs: Date.now() - t4,
      confidenceScore: validation.confidenceScore,
      issues: validation.issues,
    });

    // ─── MODE DRY-RUN : on s'arrete ici ───
    if (args.dryRun) {
      console.log(`[${runId}] Mode dry-run : article genere mais non publie`);
      await saveDryRunOutput(generated, validation);
      result.success = true;
      result.article = {
        id: 0,
        title: generated.title,
        slug: generated.slug,
        category: effectiveCategory,
        city: subject.type === 'city' ? subject.identifier : undefined,
        wordCount: generated.article.split(/\s+/).length,
      };
      return result;
    }

    // ─── ETAPE 5 : PUBLICATION ───
    console.log(`[${runId}] Etape 5/8 : Publication sur Vercel...`);
    const t5 = Date.now();

    let publishResult: { articleId: number; slug: string };
    try {
      publishResult = await withRetry(
        () => publishToVercel(generated, effectiveCategory, needsReview ? 'needs_review' : 'published'),
        { maxRetries: 3, backoffMs: [5000, 15000, 45000], timeout: 30000, label: 'vercel-publish' }
      );
    } catch (error) {
      result.errors.push({
        stage: PipelineStage.PUBLICATION,
        error: error as Error,
        recoverable: true,
        action: 'retry',
      });
      await saveForLaterRetry(generated);
      await notifyError(PipelineStage.PUBLICATION, error as Error, { runId });
      await logStep(runId, args.slot, PipelineStage.PUBLICATION, 'error', {
        durationMs: Date.now() - t5,
        errorMessage: (error as Error).message,
      });
      return result;
    }

    result.article = {
      id: publishResult.articleId,
      title: generated.title,
      slug: publishResult.slug,
      category: effectiveCategory,
      city: subject.type === 'city' ? subject.identifier : undefined,
      wordCount: generated.article.split(/\s+/).length,
    };

    await logStep(runId, args.slot, PipelineStage.PUBLICATION, 'success', {
      durationMs: Date.now() - t5,
      articleId: publishResult.articleId,
    });

    console.log(`[${runId}] → Publie : /blog/${publishResult.slug}`);

    // ─── ETAPE 6 : INJECTION DONNEES ───
    if (generated.extractedData && subject.type === 'city') {
      console.log(`[${runId}] Etape 6/8 : Injection des donnees...`);
      const t6 = Date.now();

      try {
        const injection = await withRetry(
          () => injectDataToVercel(publishResult.articleId, generated.extractedData!, subject.identifier),
          { maxRetries: 2, backoffMs: [5000, 15000], timeout: 15000, label: 'data-injection' }
        );
        result.dataInjected = injection.injected;
        result.fieldsUpdated = injection.fieldsUpdated;

        await logStep(runId, args.slot, PipelineStage.DATA_INJECTION, 'success', {
          durationMs: Date.now() - t6,
          fieldsUpdated: injection.fieldsUpdated,
        });
      } catch (error) {
        result.errors.push({
          stage: PipelineStage.DATA_INJECTION,
          error: error as Error,
          recoverable: true,
          action: 'skip',
        });
        await logStep(runId, args.slot, PipelineStage.DATA_INJECTION, 'error', {
          durationMs: Date.now() - t6,
          errorMessage: (error as Error).message,
        });
      }
    } else {
      console.log(`[${runId}] Etape 6/8 : Pas de donnees a injecter (categorie non-locale)`);
      await logStep(runId, args.slot, PipelineStage.DATA_INJECTION, 'skipped', {});
    }

    // ─── ETAPE 7 : PUBLICATION SOCIALE ───
    if (!args.skipSocial) {
      console.log(`[${runId}] Etape 7/8 : Publication sociale...`);
      const t7 = Date.now();

      try {
        const socialResult = await withRetry(
          () => publishSocial(generated, publishResult.slug, effectiveCategory),
          { maxRetries: 1, backoffMs: [10000], timeout: 30000, label: 'social-publication' }
        );
        result.socialPublished = socialResult.published;

        await logStep(runId, args.slot, PipelineStage.SOCIAL_PUBLICATION, 'success', {
          durationMs: Date.now() - t7,
          platforms: socialResult.platforms,
        });
      } catch (error) {
        // Non bloquant
        result.errors.push({
          stage: PipelineStage.SOCIAL_PUBLICATION,
          error: error as Error,
          recoverable: true,
          action: 'skip',
        });
        await logStep(runId, args.slot, PipelineStage.SOCIAL_PUBLICATION, 'error', {
          durationMs: Date.now() - t7,
          errorMessage: (error as Error).message,
        });
      }
    } else {
      console.log(`[${runId}] Etape 7/8 : Publication sociale skippee (--skip-social)`);
      await logStep(runId, args.slot, PipelineStage.SOCIAL_PUBLICATION, 'skipped', {});
    }

    // ─── ETAPE 8 : NOTIFICATION ───
    console.log(`[${runId}] Etape 8/8 : Notification...`);

    result.success = true;
    result.totalDurationMs = Date.now() - Date.now(); // sera recalcule en fin de main()

    try {
      await notifySuccess(result);
    } catch {
      // Silently ignore notification failures
      console.warn(`[${runId}] Notification Discord echouee (non bloquant)`);
    }

    await logStep(runId, args.slot, PipelineStage.NOTIFICATION, 'success', {});

    return result;

  } catch (error) {
    // Erreur inattendue non capturee
    console.error(`[${runId}] Erreur inattendue :`, error);
    try {
      await notifyError(PipelineStage.NOTIFICATION, error as Error, { runId, unexpected: true });
    } catch {}
    return result;
  }
}

// ─── MODE RATTRAPAGE ─────────────────────────────────────────

async function runCatchup(runId: string, args: CLIArgs): Promise<void> {
  console.log(`[${runId}] Mode rattrapage active`);

  // 1. Determiner les articles manques
  const missed = await getMissedPublications();

  if (missed.length === 0) {
    console.log(`[${runId}] Aucun article manque. Tout est a jour.`);
    return;
  }

  console.log(`[${runId}] ${missed.length} articles manques detectes`);

  // 2. Limiter a 3 articles de rattrapage par execution (eviter les abus API)
  const toPublish = missed.slice(0, 3);

  for (const item of toPublish) {
    console.log(`[${runId}] Rattrapage : ${item.category} — ${item.subject}`);
    const subResult = await runPipeline(`${runId}-catchup`, {
      ...args,
      catchup: false, // eviter la recursion
      type: item.category,
      city: item.subject,
    });

    if (!subResult.success) {
      console.error(`[${runId}] Rattrapage echoue pour ${item.subject}`);
      // Continuer avec les autres
    }

    // Petite pause entre les articles pour ne pas saturer l'API Gemini
    await sleep(5000);
  }

  // 3. Notifier le bilan
  const successCount = toPublish.filter((_item, i) => i < toPublish.length).length;
  console.log(`[${runId}] Rattrapage termine : ${successCount}/${toPublish.length} articles publies`);
}

// Determiner les articles manques en comparant le planning theorique
// avec les publications reelles des N derniers jours
async function getMissedPublications(): Promise<Array<{ category: ArticleCategory; subject: string; date: string }>> {
  const lookbackDays = 7;
  const missed: Array<{ category: ArticleCategory; subject: string; date: string }> = [];

  for (let i = 1; i <= lookbackDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const dayOfWeek = date.getDay(); // 0=dimanche
    if (dayOfWeek === 0) continue; // dimanche = pas de publication

    // Verifier le slot principal
    const expectedPrimary = getScheduleForDate(date, 'primary');
    const publishedPrimary = await getPublishedArticlesForDate(date, 'primary');
    if (publishedPrimary.length === 0 && expectedPrimary) {
      missed.push({
        category: expectedPrimary.category,
        subject: await getNextSubjectForCategory(expectedPrimary.category),
        date: date.toISOString().slice(0, 10),
      });
    }

    // Verifier le slot secondaire (lundi-vendredi seulement)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const expectedSecondary = getScheduleForDate(date, 'secondary');
      const publishedSecondary = await getPublishedArticlesForDate(date, 'secondary');
      if (publishedSecondary.length === 0 && expectedSecondary) {
        missed.push({
          category: expectedSecondary.category,
          subject: await getNextSubjectForCategory(expectedSecondary.category),
          date: date.toISOString().slice(0, 10),
        });
      }
    }
  }

  return missed;
}

// ─── FONCTIONS AUXILIAIRES ───────────────────────────────────

async function publishToVercel(
  article: GeneratedArticle,
  category: ArticleCategory,
  status: 'published' | 'needs_review'
): Promise<{ articleId: number; slug: string }> {
  const response = await fetch(process.env.VERCEL_PUBLISH_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-secret': process.env.VERCEL_API_SECRET!,
    },
    body: JSON.stringify({
      article: article.article,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      metaDescription: article.metaDescription,
      jsonLd: article.jsonLd,
      category,
      tags: article.tags,
      extractedData: article.extractedData,
      citySlug: article.citySlug,
      status,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Vercel publish failed: ${response.status} ${body}`);
  }

  return response.json();
}

async function injectDataToVercel(
  articleId: number,
  extractedData: BlogExtractedData,
  citySlug: string
): Promise<{ injected: boolean; fieldsUpdated: number }> {
  const url = process.env.VERCEL_PUBLISH_URL!.replace('/publish', '/inject-data');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-secret': process.env.VERCEL_API_SECRET!,
    },
    body: JSON.stringify({ articleId, extractedData, citySlug }),
  });

  if (!response.ok) {
    throw new Error(`Vercel inject-data failed: ${response.status}`);
  }

  return response.json();
}

async function publishSocial(
  article: GeneratedArticle,
  slug: string,
  category: ArticleCategory
): Promise<{ published: boolean; platforms: string[] }> {
  // 1. Generer les posts multi-plateformes via Gemini
  const socialPosts = await generateSocialPosts(article, slug, category);

  const platforms: string[] = [];

  // 2. Programmer sur LinkedIn via Buffer API
  try {
    await bufferSchedule('linkedin', socialPosts.linkedin);
    platforms.push('linkedin');
  } catch (e) {
    console.warn('Buffer LinkedIn failed:', (e as Error).message);
  }

  // 3. Programmer sur X via Typefully API
  try {
    await typefullySchedule(socialPosts.twitter);
    platforms.push('twitter');
  } catch (e) {
    console.warn('Typefully X failed:', (e as Error).message);
  }

  // 4. Programmer sur Instagram (texte carousel pour Buffer)
  try {
    await bufferSchedule('instagram', socialPosts.instagram);
    platforms.push('instagram');
  } catch (e) {
    console.warn('Buffer Instagram failed:', (e as Error).message);
  }

  // 5. Cross-post Threads (adapte depuis Twitter)
  try {
    await threadsPublish(socialPosts.threads);
    platforms.push('threads');
  } catch (e) {
    console.warn('Threads failed:', (e as Error).message);
  }

  return { published: platforms.length > 0, platforms };
}

function calculateGeminiCost(usage: { inputTokens: number; outputTokens: number }): number {
  // Tarifs Gemini 2.5 Flash (mars 2026, prix approximatifs)
  const INPUT_PRICE_PER_1M = 0.075;   // USD par million de tokens input
  const OUTPUT_PRICE_PER_1M = 0.30;   // USD par million de tokens output
  const USD_TO_EUR = 0.92;

  const costUsd = (usage.inputTokens / 1_000_000) * INPUT_PRICE_PER_1M
                + (usage.outputTokens / 1_000_000) * OUTPUT_PRICE_PER_1M;

  return costUsd * USD_TO_EUR;
}

async function saveDryRunOutput(article: GeneratedArticle, validation: ValidationResult): Promise<void> {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const outputDir = '/tmp/tiili-dry-run-output';
  mkdirSync(outputDir, { recursive: true });

  writeFileSync(`${outputDir}/article.md`, article.article);
  writeFileSync(`${outputDir}/metadata.json`, JSON.stringify({
    title: article.title,
    slug: article.slug,
    category: article.category,
    tags: article.tags,
    metaDescription: article.metaDescription,
    validation: {
      confidenceScore: validation.confidenceScore,
      issues: validation.issues,
    },
  }, null, 2));

  if (article.extractedData) {
    writeFileSync(`${outputDir}/extracted-data.json`, JSON.stringify(article.extractedData, null, 2));
  }

  console.log(`Dry-run output saved to ${outputDir}/`);
}

// ─── ENTRYPOINT ──────────────────────────────────────────────

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

### 4.2 — Script de verification des publications manquees

```typescript
// scripts/check-missed-publications.ts
// Execute par GitHub Actions apres chaque publication principale.
// Verifie qu'au moins 1 article a ete publie dans les 24 dernieres heures.

async function main(): Promise<void> {
  const last24h = await getPublicationsLast24h();

  if (last24h.length === 0) {
    console.error('ALERTE : 0 article publie en 24h');
    await notifyNoPublication();
    process.exit(1);
  }

  // Verifier la coherence des donnees injectees
  for (const pub of last24h) {
    if (pub.dataInjected && pub.extractedData) {
      const issues = await checkDataCoherence(pub.extractedData, pub.citySlug);
      if (issues.length > 0) {
        console.warn(`Donnees suspectes pour ${pub.slug}:`, issues);
        await notifyDataCoherenceIssue(pub, issues);
      }
    }
  }

  console.log(`OK : ${last24h.length} article(s) publie(s) dans les 24 dernieres heures`);
}

main().catch(console.error);
```

---

## 5. Monitoring et alertes

### 5.1 — Dashboard de suivi

Le dashboard est accessible via une route admin protegee : `/admin/blog/dashboard`.

```typescript
// Donnees affichees dans le dashboard

interface BlogDashboardData {
  // Vue d'ensemble
  totalArticles: number;
  articlesThisWeek: number;
  articlesThisMonth: number;
  averageConfidenceScore: number;

  // Par categorie
  articlesByCategory: Record<ArticleCategory, {
    total: number;
    thisMonth: number;
    avgConfidence: number;
  }>;

  // Couverture villes
  citiesCovered: number;        // villes avec au moins 1 guide
  citiesWithCompleteData: number; // villes avec >80% champs P0 remplis
  citiesNeedingUpdate: number;    // villes avec donnees > 60 jours

  // Donnees injectees
  totalDataInjections: number;
  fieldsUpdatedThisMonth: number;
  injectionErrorsThisMonth: number;

  // Publication sociale
  socialPostsScheduled: number;
  socialPostsPublished: number;
  socialPostsFailed: number;

  // Sante pipeline
  successRate7d: number;        // % de runs reussis sur 7 jours
  avgDurationMs: number;
  lastPublicationAt: string;
  nextScheduledAt: string;

  // Couts API
  tokensThisMonth: { input: number; output: number };
  costThisMonthEur: number;
  costPerArticleEur: number;

  // Erreurs recentes
  recentErrors: Array<{
    runId: string;
    stage: PipelineStage;
    message: string;
    createdAt: string;
  }>;

  // Articles en attente de review
  pendingReview: Array<{
    id: number;
    title: string;
    confidenceScore: number;
    issues: string[];
    createdAt: string;
  }>;
}
```

```sql
-- Requetes SQL pour le dashboard

-- Articles publies cette semaine
SELECT COUNT(*) FROM blog_articles
WHERE status = 'published'
AND published_at >= datetime('now', '-7 days');

-- Taux de succes pipeline sur 7 jours
SELECT
  COUNT(CASE WHEN status = 'success' THEN 1 END) * 100.0 / COUNT(*) as success_rate
FROM blog_publication_log
WHERE stage = 'publication'
AND created_at >= datetime('now', '-7 days');

-- Cout API ce mois
SELECT
  SUM(tokens_input) as total_input,
  SUM(tokens_output) as total_output
FROM blog_publication_log
WHERE stage = 'article_generation'
AND status = 'success'
AND created_at >= datetime('now', 'start of month');

-- Villes necessitant une mise a jour (donnees > 60 jours)
SELECT l.city_name, MAX(ld.created_at) as last_update
FROM localities l
LEFT JOIN locality_data ld ON l.id = ld.locality_id
GROUP BY l.id
HAVING last_update < datetime('now', '-60 days')
OR last_update IS NULL
ORDER BY last_update ASC;

-- Articles en attente de review humaine
SELECT id, title, json_extract(metadata, '$.confidenceScore') as confidence,
       json_extract(metadata, '$.issues') as issues, created_at
FROM blog_articles
WHERE status = 'needs_review'
ORDER BY created_at ASC;

-- Erreurs recentes
SELECT run_id, stage, error_message, created_at
FROM blog_publication_log
WHERE status = 'error'
ORDER BY created_at DESC
LIMIT 20;
```

### 5.2 — Alertes automatiques

| Alerte | Condition | Canal | Severite |
|--------|-----------|-------|----------|
| 0 article en 24h | `COUNT(published_at > now - 24h) = 0` | Discord + Email | CRITIQUE |
| Echec generation Gemini | Stage `article_generation` status `error` | Discord | HAUTE |
| Echec publication Vercel | Stage `publication` status `error` apres 3 retries | Discord | HAUTE |
| Score confiance < 40 | `validation.confidenceScore < 40` | Discord | MOYENNE |
| Donnees incoherentes | Delta > 30% avec donnees existantes | Discord | MOYENNE |
| Taux succes < 70% sur 7j | `success_rate_7d < 0.70` | Discord + Email | HAUTE |
| Budget API depasse | `cost_this_month > budget_limit` | Discord + Email | HAUTE |
| File review > 10 articles | `COUNT(status = 'needs_review') > 10` | Discord | MOYENNE |

```typescript
// scripts/blog-weekly-report.ts
// Genere un rapport hebdomadaire et l'envoie sur Discord

async function generateWeeklyReport(): Promise<void> {
  const data = await getDashboardData();

  const embed = {
    title: `Rapport hebdo blog — Semaine du ${getWeekRange()}`,
    color: data.successRate7d >= 0.9 ? 5763719 : data.successRate7d >= 0.7 ? 16760576 : 15548997,
    fields: [
      {
        name: 'Articles publies',
        value: `${data.articlesThisWeek} cette semaine | ${data.articlesThisMonth} ce mois`,
        inline: false,
      },
      {
        name: 'Taux de succes pipeline',
        value: `${(data.successRate7d * 100).toFixed(1)}%`,
        inline: true,
      },
      {
        name: 'Score confiance moyen',
        value: `${data.averageConfidenceScore.toFixed(0)}/100`,
        inline: true,
      },
      {
        name: 'Duree moyenne pipeline',
        value: `${(data.avgDurationMs / 1000).toFixed(1)}s`,
        inline: true,
      },
      {
        name: 'Couverture villes',
        value: `${data.citiesCovered} villes | ${data.citiesWithCompleteData} completes | ${data.citiesNeedingUpdate} a mettre a jour`,
        inline: false,
      },
      {
        name: 'Donnees injectees',
        value: `${data.totalDataInjections} injections | ${data.fieldsUpdatedThisMonth} champs maj`,
        inline: false,
      },
      {
        name: 'Cout API Gemini',
        value: `${data.costThisMonthEur.toFixed(2)} EUR ce mois (${data.costPerArticleEur.toFixed(4)} EUR/article)`,
        inline: false,
      },
      {
        name: 'Repartition par categorie',
        value: Object.entries(data.articlesByCategory)
          .map(([cat, stats]) => `\`${cat}\`: ${stats.thisMonth}`)
          .join(' | '),
        inline: false,
      },
      {
        name: 'Social',
        value: `${data.socialPostsPublished} posts publies | ${data.socialPostsFailed} echecs`,
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
  };

  // Ajouter les alertes si necessaire
  if (data.pendingReview.length > 0) {
    embed.fields.push({
      name: `Articles en attente de review (${data.pendingReview.length})`,
      value: data.pendingReview.slice(0, 5).map(a =>
        `- **${a.title}** (score: ${a.confidenceScore})`
      ).join('\n'),
      inline: false,
    });
  }

  if (data.recentErrors.length > 0) {
    embed.fields.push({
      name: `Erreurs recentes (${data.recentErrors.length})`,
      value: data.recentErrors.slice(0, 5).map(e =>
        `- \`${e.stage}\`: ${e.message.slice(0, 80)}`
      ).join('\n'),
      inline: false,
    });
  }

  await sendDiscordWebhook(embed);
}
```

### 5.3 — Metriques de cout API

```typescript
// Estimation des couts mensuels avec ~45 articles/mois

interface MonthlyCostEstimate {
  // Generation articles (Gemini 2.5 Flash)
  articleGeneration: {
    articlesPerMonth: 45;
    avgInputTokens: 8_000;     // prompt + contexte
    avgOutputTokens: 6_000;    // article + extracted_data
    monthlyInputTokens: 360_000;
    monthlyOutputTokens: 270_000;
    costEur: number;           // ~0.10 EUR/mois
  };

  // Generation posts sociaux (Gemini 2.5 Flash)
  socialGeneration: {
    postsPerMonth: 45;
    avgInputTokens: 5_000;     // article source + prompt
    avgOutputTokens: 3_000;    // 6 formats de post
    monthlyInputTokens: 225_000;
    monthlyOutputTokens: 135_000;
    costEur: number;           // ~0.06 EUR/mois
  };

  // Total
  totalMonthlyTokens: number;  // ~990K tokens
  totalMonthlyCostEur: number; // ~0.16 EUR/mois
}

// Fonction de calcul du cout reel
function calculateMonthlyCost(logs: PublicationLog[]): {
  totalTokens: number;
  totalCostEur: number;
  perArticleCostEur: number;
} {
  const articleLogs = logs.filter(l =>
    l.stage === PipelineStage.ARTICLE_GENERATION && l.status === 'success'
  );

  const totalInput = articleLogs.reduce((sum, l) => sum + (l.tokensInput || 0), 0);
  const totalOutput = articleLogs.reduce((sum, l) => sum + (l.tokensOutput || 0), 0);

  const costEur = calculateGeminiCost({ inputTokens: totalInput, outputTokens: totalOutput });

  return {
    totalTokens: totalInput + totalOutput,
    totalCostEur: costEur,
    perArticleCostEur: articleLogs.length > 0 ? costEur / articleLogs.length : 0,
  };
}
```

---

## 6. Gestion de la file d'attente

### 6.1 — Systeme de priorisation des sujets

```
┌──────────────────────────────────────────────────────────────────┐
│                   FILE D'ATTENTE DES SUJETS                      │
│                                                                  │
│  Priorite 0 — URGENCE (traite immediatement)                    │
│  ├── Actualite majeure detectee (score RSS > 0.8)               │
│  ├── Nouvelle publication DVF trimestrielle                     │
│  └── Changement reglementaire (Pinel, LMNP, taux BCE)           │
│                                                                  │
│  Priorite 1 — RATTRAPAGE (traite avant le planning)             │
│  ├── Articles manques (cron echoue)                             │
│  ├── Articles regeneres apres correction                         │
│  └── Articles rejetes puis corriges de la queue humaine          │
│                                                                  │
│  Priorite 2 — PLANNING (traite selon le calendrier)             │
│  ├── Guide ville (scoring: lacunes + fraicheur + search volume) │
│  ├── Guide quartier (scoring: ville parente populaire)           │
│  ├── Actu marche (scoring: actualite + saisonnalite)            │
│  ├── Analyse comparative (scoring: recherche comparaison)        │
│  ├── Conseil (scoring: rotation sujet)                           │
│  ├── Fiscalite (scoring: saisonnalite fiscale)                  │
│  └── Financement / Etude de cas (scoring: rotation)              │
│                                                                  │
│  Priorite 3 — MISE A JOUR (traite en slot secondaire libre)     │
│  ├── Guides villes avec donnees > 90 jours                      │
│  ├── Guides avec score confiance initial < 70                    │
│  └── Articles actu depasses (nouvelles donnees disponibles)      │
└──────────────────────────────────────────────────────────────────┘
```

```sql
-- Table de file d'attente
CREATE TABLE blog_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,           -- slug ville, topic, ou identifiant
  priority INTEGER DEFAULT 2,     -- 0=urgence, 1=rattrapage, 2=planning, 3=maj
  score REAL DEFAULT 0,           -- score de priorite calcule
  reason TEXT,                    -- pourquoi cet item est en queue
  metadata TEXT,                  -- JSON (contexte additionnel)
  status TEXT DEFAULT 'pending',  -- 'pending' | 'processing' | 'done' | 'failed'
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TEXT DEFAULT (datetime('now')),
  scheduled_for TEXT,             -- date cible de publication (optionnel)
  processed_at TEXT
);

-- Index pour requetes frequentes
CREATE INDEX idx_queue_priority ON blog_queue(priority, score DESC);
CREATE INDEX idx_queue_status ON blog_queue(status, priority);
```

```typescript
// Ajouter un sujet a la queue
async function enqueueSubject(item: {
  category: ArticleCategory;
  subject: string;
  priority: 0 | 1 | 2 | 3;
  score?: number;
  reason: string;
  scheduledFor?: string;
}): Promise<void> {
  // Eviter les doublons
  const existing = await db.execute({
    sql: `SELECT id FROM blog_queue
          WHERE category = ? AND subject = ? AND status = 'pending'`,
    args: [item.category, item.subject],
  });

  if (existing.rows.length > 0) {
    // Mettre a jour la priorite si la nouvelle est plus haute
    await db.execute({
      sql: `UPDATE blog_queue SET priority = MIN(priority, ?), score = MAX(score, ?)
            WHERE id = ?`,
      args: [item.priority, item.score || 0, existing.rows[0].id],
    });
    return;
  }

  await db.execute({
    sql: `INSERT INTO blog_queue (category, subject, priority, score, reason, scheduled_for)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [item.category, item.subject, item.priority, item.score || 0, item.reason, item.scheduledFor || null],
  });
}

// Depiler le prochain sujet a traiter
async function dequeueNext(category?: ArticleCategory): Promise<QueueItem | null> {
  const whereCategory = category ? 'AND category = ?' : '';
  const args = category ? [category] : [];

  const result = await db.execute({
    sql: `SELECT * FROM blog_queue
          WHERE status = 'pending'
          AND attempts < max_attempts
          AND (scheduled_for IS NULL OR scheduled_for <= datetime('now'))
          ${whereCategory}
          ORDER BY priority ASC, score DESC
          LIMIT 1`,
    args,
  });

  if (result.rows.length === 0) return null;

  const item = result.rows[0];

  // Marquer comme "processing"
  await db.execute({
    sql: `UPDATE blog_queue SET status = 'processing', attempts = attempts + 1
          WHERE id = ?`,
    args: [item.id],
  });

  return item as QueueItem;
}
```

### 6.2 — Queue d'articles en attente de validation humaine

```sql
-- Les articles avec status = 'needs_review' forment la queue humaine
-- Le dashboard admin affiche cette queue avec des actions

-- Vue pour la queue de review
CREATE VIEW v_review_queue AS
SELECT
  ba.id,
  ba.title,
  ba.slug,
  ba.category,
  ba.locality_id,
  ba.status,
  json_extract(ba.extracted_data, '$.confidenceScore') as confidence_score,
  ba.created_at,
  -- Informations de la derniere tentative de publication
  (SELECT error_message FROM blog_publication_log
   WHERE article_id = ba.id AND stage = 'validation'
   ORDER BY created_at DESC LIMIT 1) as validation_issues
FROM blog_articles ba
WHERE ba.status = 'needs_review'
ORDER BY ba.created_at ASC;
```

**Actions disponibles dans l'admin** :

1. **Approuver** : `status = 'published'`, `published_at = now()`, revalider ISR
2. **Rejeter** : `status = 'rejected'`, raison enregistree, sujet remis en queue (priorite 1)
3. **Editer + Approuver** : modification manuelle puis publication
4. **Regenerer** : supprimer l'article, remettre le sujet en queue (priorite 1) avec des instructions supplementaires

```typescript
// Actions admin sur la queue de review
async function approveArticle(articleId: number): Promise<void> {
  await db.execute({
    sql: `UPDATE blog_articles
          SET status = 'published', published_at = datetime('now')
          WHERE id = ? AND status = 'needs_review'`,
    args: [articleId],
  });

  const article = await getArticleById(articleId);
  revalidatePath(`/blog/${article.slug}`);
  revalidatePath('/blog');

  // Declencher l'injection de donnees si applicable
  if (article.extracted_data && article.locality_id) {
    await injectLocalityData(articleId, JSON.parse(article.extracted_data), article.locality_id);
  }

  // Declencher la publication sociale
  await publishSocial(article, article.slug, article.category);
}

async function rejectArticle(articleId: number, reason: string): Promise<void> {
  const article = await getArticleById(articleId);

  await db.execute({
    sql: `UPDATE blog_articles SET status = 'rejected' WHERE id = ?`,
    args: [articleId],
  });

  // Remettre le sujet en queue avec priorite elevee
  await enqueueSubject({
    category: article.category,
    subject: article.locality_id || article.slug,
    priority: 1,
    reason: `Rejete: ${reason}. A regenerer avec corrections.`,
  });
}
```

### 6.3 — Republication et mise a jour d'articles existants

Les guides villes sont du contenu evergreen qui doit etre mis a jour regulierement.

```typescript
// Strategie de mise a jour des articles existants

interface UpdateStrategy {
  // Guides villes : mise a jour tous les 90 jours ou quand nouvelles donnees DVF
  guideVille: {
    maxAgeDays: 90;
    triggerOnNewDVF: true;
    triggerOnDataInjection: true;
    updateScope: 'full';      // regeneration complete
  };

  // Guides quartiers : mise a jour tous les 120 jours
  guideQuartier: {
    maxAgeDays: 120;
    triggerOnNewDVF: false;
    triggerOnDataInjection: true;
    updateScope: 'partial';   // mise a jour des chiffres uniquement
  };

  // Actus marche : jamais mis a jour (contenu date par nature)
  actuMarche: {
    maxAgeDays: Infinity;
    updateScope: 'never';
  };

  // Analyses comparatives : mise a jour tous les 180 jours
  analyse: {
    maxAgeDays: 180;
    updateScope: 'full';
  };

  // Conseil / Fiscalite : mise a jour annuelle ou sur changement reglementaire
  conseil: {
    maxAgeDays: 365;
    triggerOnRegChange: true;
    updateScope: 'partial';
  };
}

// Script de detection des articles a mettre a jour
// Execute hebdomadairement par le cron blog-monitor
async function detectStaleArticles(): Promise<void> {
  const staleGuides = await db.execute({
    sql: `SELECT id, slug, category, locality_id, published_at
          FROM blog_articles
          WHERE status = 'published'
          AND category IN ('guide-ville', 'guide-quartier')
          AND published_at < datetime('now', '-90 days')
          ORDER BY published_at ASC
          LIMIT 10`,
    args: [],
  });

  for (const article of staleGuides.rows) {
    await enqueueSubject({
      category: article.category as ArticleCategory,
      subject: (article.locality_id as string) || (article.slug as string),
      priority: 3, // basse priorite
      score: calculateStalenessScore(article.published_at as string),
      reason: `Mise a jour automatique : derniere publication le ${article.published_at}`,
    });
  }

  if (staleGuides.rows.length > 0) {
    console.log(`${staleGuides.rows.length} articles identifies pour mise a jour`);
  }
}

// Lors de la republication, on conserve le meme slug mais on met a jour le contenu
async function updateExistingArticle(
  existingId: number,
  newContent: GeneratedArticle
): Promise<void> {
  await db.execute({
    sql: `UPDATE blog_articles
          SET content = ?,
              title = ?,
              excerpt = ?,
              meta_description = ?,
              json_ld = ?,
              extracted_data = ?,
              tags = ?,
              status = 'published',
              published_at = datetime('now')
          WHERE id = ?`,
    args: [
      newContent.article,
      newContent.title,
      newContent.excerpt,
      newContent.metaDescription,
      JSON.stringify(newContent.jsonLd),
      JSON.stringify(newContent.extractedData),
      JSON.stringify(newContent.tags),
      existingId,
    ],
  });

  // Revalider ISR
  const article = await getArticleById(existingId);
  revalidatePath(`/blog/${article.slug}`);
  if (article.locality_id) {
    revalidatePath(`/guide/${article.locality_id}`);
  }
}
```

---

## Annexe A — Schemas de tables SQL complets

```sql
-- Table des articles (extension de la spec plan-blog-seo-geo.md)
CREATE TABLE IF NOT EXISTS blog_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  meta_description TEXT,
  json_ld TEXT,
  source_urls TEXT,              -- JSON array
  category TEXT NOT NULL,
  locality_id TEXT,
  tags TEXT,                     -- JSON array
  extracted_data TEXT,           -- JSON structure (BlogExtractedData)
  data_injected BOOLEAN DEFAULT 0,
  status TEXT DEFAULT 'draft',  -- 'draft' | 'published' | 'needs_review' | 'rejected'
  slot TEXT,                    -- 'primary' | 'secondary'
  confidence_score INTEGER,
  published_at TEXT,
  updated_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Table des logs de publication
CREATE TABLE IF NOT EXISTS blog_publication_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  slot TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  category TEXT,
  subject TEXT,
  article_id INTEGER,
  duration_ms INTEGER,
  tokens_input INTEGER,
  tokens_output INTEGER,
  error_message TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Table de file d'attente
CREATE TABLE IF NOT EXISTS blog_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  priority INTEGER DEFAULT 2,
  score REAL DEFAULT 0,
  reason TEXT,
  metadata TEXT,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TEXT DEFAULT (datetime('now')),
  scheduled_for TEXT,
  processed_at TEXT
);

-- Index
CREATE INDEX IF NOT EXISTS idx_articles_status ON blog_articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON blog_articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_locality ON blog_articles(locality_id);
CREATE INDEX IF NOT EXISTS idx_articles_published ON blog_articles(published_at);
CREATE INDEX IF NOT EXISTS idx_log_run ON blog_publication_log(run_id);
CREATE INDEX IF NOT EXISTS idx_log_stage ON blog_publication_log(stage, status);
CREATE INDEX IF NOT EXISTS idx_log_date ON blog_publication_log(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON blog_queue(priority, score DESC);
CREATE INDEX IF NOT EXISTS idx_queue_status ON blog_queue(status, priority);
```

---

## Annexe B — Variables d'environnement requises

| Variable | Usage | Ou la configurer |
|----------|-------|------------------|
| `GEMINI_API_KEY` | Generation articles + posts sociaux | GitHub Secrets + Vercel Env |
| `TURSO_DATABASE_URL` | Connexion DB production | GitHub Secrets + Vercel Env |
| `TURSO_AUTH_TOKEN` | Auth DB production | GitHub Secrets + Vercel Env |
| `VERCEL_PUBLISH_URL` | URL de l'API de publication | GitHub Secrets |
| `VERCEL_API_SECRET` | Secret partage GitHub ↔ Vercel | GitHub Secrets + Vercel Env |
| `DISCORD_WEBHOOK_URL` | Notifications Discord | GitHub Secrets |
| `BUFFER_ACCESS_TOKEN` | API Buffer (LinkedIn, Instagram) | GitHub Secrets |
| `TYPEFULLY_API_KEY` | API Typefully (X/Twitter) | GitHub Secrets |
| `CRON_SECRET` | Vercel Cron auth (si utilise) | Vercel Env |

---

## Annexe C — Checklist de mise en place

- [ ] Creer le webhook Discord dans le channel #blog-automation
- [ ] Configurer les GitHub Secrets (cf. Annexe B)
- [ ] Creer les routes API Vercel (`/api/blog/publish`, `/api/blog/inject-data`)
- [ ] Creer les tables SQL (cf. Annexe A)
- [ ] Implementer `scripts/publish-daily.ts`
- [ ] Implementer `scripts/check-missed-publications.ts`
- [ ] Implementer `scripts/blog-weekly-report.ts`
- [ ] Tester en mode `--dry-run` sur 5 categories differentes
- [ ] Tester le mode `--catchup`
- [ ] Activer le workflow GitHub Actions
- [ ] Verifier la premiere publication automatique
- [ ] Configurer Buffer (LinkedIn + Instagram)
- [ ] Configurer Typefully (X/Twitter)
- [ ] Creer la page admin `/admin/blog/dashboard`
- [ ] Planifier le peuplement initial de `blog_queue` (50 villes prioritaires)
