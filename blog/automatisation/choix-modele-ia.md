# Choix du modele IA pour le pipeline blog automatise

> Recherche effectuee le 17 mars 2026. Prix et specifications issus de la documentation officielle Google et de sources tierces verifiees.

---

## 0. Ce que Gemini fait vs ce que notre code fait

### Flux complet du pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PIPELINE BLOG AUTOMATISE — VUE D'ENSEMBLE           │
└─────────────────────────────────────────────────────────────────────────┘

  ETAPE 1 : COLLECTE (notre code)          ETAPE 2 : REDACTION (Gemini)
  ─────────────────────────────────         ────────────────────────────
  ┌──────────────┐                          ┌─────────────────────────┐
  │ News Fetcher │──┐                       │                         │
  │  (RSS, APIs) │  │                       │  Gemini recoit :        │
  └──────────────┘  │                       │  - Donnees marche (JSON)│
  ┌──────────────┐  │   ┌──────────────┐    │  - Actualites (texte)   │
  │ DVF API /    │──┼──>│  Assemblage  │───>│  - Template / consignes │
  │ Market Data  │  │   │  du contexte │    │  - Contraintes SEO      │
  └──────────────┘  │   └──────────────┘    │                         │
  ┌──────────────┐  │                       │  Gemini produit :       │
  │ DB localites │──┘                       │  - Article (Markdown)   │
  │ (loyers, DVF)│                          │  - Meta SEO (JSON)      │
  └──────────────┘                          │  - Donnees struct (JSON)│
                                            └────────────┬────────────┘
                                                         │
                                                         v
                                            ETAPE 3 : PUBLICATION (notre code)
                                            ────────────────────────────────
                                            ┌─────────────────────────┐
                                            │ Validation du contenu   │
                                            │ (longueur, format, liens│
                                            │  internes, schema.org)  │
                                            ├─────────────────────────┤
                                            │ Injection en base /     │
                                            │ ecriture fichier MDX    │
                                            ├─────────────────────────┤
                                            │ Regeneration ISR        │
                                            │ (Next.js revalidate)    │
                                            ├─────────────────────────┤
                                            │ Publication reseaux     │
                                            │ sociaux (optionnel)     │
                                            └─────────────────────────┘
```

### Tableau de responsabilites

| Gemini FAIT | Gemini ne fait PAS | Implication technique |
|-------------|--------------------|-----------------------|
| Rediger un article a partir du contexte fourni | Naviguer sur le web / visiter des URLs | Notre code doit fetcher les sources (RSS, APIs, HTML) et fournir le texte brut a Gemini |
| Produire du JSON structure (meta SEO, donnees) | Appeler des APIs externes (DVF, INSEE, etc.) | Toute collecte de donnees passe par nos fetchers Node.js avant l'appel Gemini |
| Respecter un template / des consignes editoriales | Faire de la veille automatique | Le cron / scheduler qui declenche le pipeline est dans notre code (GitHub Actions, Vercel Cron) |
| Adapter le ton et le style au contexte | Verifier ses propres sources en temps reel | Notre code doit valider les chiffres cles apres generation (coherence prix, rendements) |
| Generer des liens internes sur demande (si on lui fournit la liste) | Connaitre l'etat actuel du blog (articles existants, maillage) | Notre code passe la liste des articles existants et les regles de maillage interne |
| Structurer le contenu (H2, H3, listes, tableaux) | Publier, deployer, notifier | La publication, ISR et partage social sont entierement geres par notre code |
| Produire du Markdown / MDX valide | Generer des images ou des graphiques | Les visuels sont generes separement (charts statiques, OG images) par notre code |

### Principe cle

**Gemini est un generateur de texte pur.** Il ne navigue pas sur le web, ne peut pas appeler d'API, ne fait pas de veille, et ne connait pas l'etat actuel de notre site. Tout ce qu'il sait vient du contexte qu'on lui injecte dans le prompt. Notre code est responsable de :

1. **Collecter** les donnees fraiches (APIs, RSS, DB)
2. **Assembler** le contexte optimal pour chaque article
3. **Valider** le contenu genere (format, coherence, longueur)
4. **Publier** et distribuer l'article final

---

## 1. Comparatif des modeles Gemini disponibles (mars 2026)

### Modeles stables (GA)

| Modele | Model ID | Prix input (/1M tokens) | Prix output (/1M tokens) | Contexte input | Max output | Free tier |
|--------|----------|------------------------|--------------------------|----------------|------------|-----------|
| Gemini 2.5 Flash-Lite | `gemini-2.5-flash-lite` | $0.10 | $0.40 | 1M tokens | 65 535 tokens | Oui |
| Gemini 2.5 Flash | `gemini-2.5-flash` | $0.30 | $2.50 | 1M tokens | 65 535 tokens | Oui |
| Gemini 2.5 Pro | `gemini-2.5-pro` | $1.25 (<=200K) / $2.50 (>200K) | $10.00 (<=200K) / $15.00 (>200K) | 2M tokens | ~65 536 tokens | Oui |

### Modeles en preview (Gemini 3)

| Modele | Model ID | Prix input (/1M tokens) | Prix output (/1M tokens) | Contexte input | Max output | Free tier |
|--------|----------|------------------------|--------------------------|----------------|------------|-----------|
| Gemini 3.1 Flash-Lite | `gemini-3.1-flash-lite-preview` | $0.25 | $1.50 | 1M tokens | 65 536 tokens | Oui |
| Gemini 3 Flash | `gemini-3-flash-preview` | $0.50 | $3.00 | 1M tokens | 65 536 tokens | Oui |
| Gemini 3.1 Pro | `gemini-3.1-pro-preview` | $2.00 (<=200K) / $4.00 (>200K) | $12.00 (<=200K) / $18.00 (>200K) | 1M tokens | 65 536 tokens | Non |

### Qualite de redaction par modele

| Modele | Redaction longue (1500-4000 mots) | Qualite francais | Suivi consignes SEO | Rapport qualite/prix |
|--------|----------------------------------|-------------------|---------------------|----------------------|
| 2.5 Flash-Lite | Correcte, peut manquer de nuance | Bon, parfois generique | Basique | Excellent |
| 2.5 Flash | Bonne, equilibree | Tres bon | Bon | Tres bon |
| 2.5 Pro | Excellente, nuancee, emotionnelle | Excellent, subtil | Excellent | Correct |
| 3 Flash (preview) | Tres bonne, rivale les Pro | Tres bon | Tres bon | Bon |
| 3.1 Pro (preview) | Excellente | Excellent | Excellent | Moyen |

**Note sur le francais :** Tous les modeles Gemini 2.5+ produisent du francais de bonne qualite. Gemini 2.5 Pro est repute pour sa "prose violette" -- textes plus riches en nuance et en profondeur emotionnelle. Les modeles Flash sont plus directs et factuels, ce qui convient bien au contenu SEO informatif.

---

## 2. Recommandation par type de contenu

### Articles piliers (guides 3000-4000 mots, 2-3/semaine)

**Modele recommande : Gemini 2.5 Flash**

- Meilleur rapport qualite/prix pour la redaction longue
- Contexte 1M suffisant pour injecter donnees marche + template + consignes SEO
- 65K tokens output = ~45 000 mots theoriques (largement suffisant)
- Cout par article : ~$0.02-0.04

Pourquoi pas Pro : le surcout x8 sur l'output ne se justifie pas pour du contenu SEO factuel. Le Flash produit du contenu informatif de qualite suffisante pour le blog immo.

### Articles actualites / courts (800-1500 mots, 3-4/semaine)

**Modele recommande : Gemini 2.5 Flash-Lite**

- Le plus economique ($0.10/$0.40)
- Suffisant pour des articles courts et factuels
- Deja utilise dans le projet pour le scraping -- infrastructure en place
- Cout par article : ~$0.005-0.01

### Extraction de donnees structurees (JSON marche immobilier)

**Modele recommande : Gemini 2.5 Flash-Lite**

- Tache de structuration, pas de redaction
- Fonctionne tres bien en mode `responseMimeType: "application/json"`
- Deja prouve dans le scraping du projet (`src/infrastructure/ai/gemini.ts`)
- Cout negligeable : ~$0.001-0.003 par extraction

### Articles premium / piliers strategiques (occasionnels)

**Modele recommande : Gemini 2.5 Pro**

- Pour les 2-3 articles/mois qui necessitent une qualite editoriale superieure
- Guides approfondis type "Investir a Lyon : analyse complete 2026"
- Cout par article : ~$0.15-0.30

---

## 3. Estimation de couts mensuels

### Hypotheses de calcul

- 1 article/jour en moyenne = ~30 articles/mois
- Repartition : 12 articles piliers (3000 mots) + 14 articles courts (1200 mots) + 4 articles premium (4000 mots)
- 1 mot francais ~ 1.3 token en moyenne
- Chaque appel inclut un prompt systeme + donnees contextuelles (~2000-4000 tokens input)

### Calcul detaille

#### Articles piliers (12/mois) -- Gemini 2.5 Flash

| Composante | Tokens | Prix unitaire | Total |
|------------|--------|--------------|-------|
| Input (prompt + donnees) | ~4 000 tokens x 12 | $0.30/1M | $0.014 |
| Output (~3 900 tokens x 12) | ~46 800 tokens | $2.50/1M | $0.117 |
| **Sous-total** | | | **$0.13** |

#### Articles courts (14/mois) -- Gemini 2.5 Flash-Lite

| Composante | Tokens | Prix unitaire | Total |
|------------|--------|--------------|-------|
| Input (prompt + donnees) | ~3 000 tokens x 14 | $0.10/1M | $0.004 |
| Output (~1 560 tokens x 14) | ~21 840 tokens | $0.40/1M | $0.009 |
| **Sous-total** | | | **$0.01** |

#### Articles premium (4/mois) -- Gemini 2.5 Pro

| Composante | Tokens | Prix unitaire | Total |
|------------|--------|--------------|-------|
| Input (prompt + donnees) | ~5 000 tokens x 4 | $1.25/1M | $0.025 |
| Output (~5 200 tokens x 4) | ~20 800 tokens | $10.00/1M | $0.208 |
| **Sous-total** | | | **$0.23** |

#### Extraction donnees JSON (30/mois) -- Gemini 2.5 Flash-Lite

| Composante | Tokens | Prix unitaire | Total |
|------------|--------|--------------|-------|
| Input (donnees brutes) | ~2 000 tokens x 30 | $0.10/1M | $0.006 |
| Output (JSON structure) | ~500 tokens x 30 | $0.40/1M | $0.006 |
| **Sous-total** | | | **$0.01** |

### Total mensuel estime

| Poste | Cout |
|-------|------|
| Articles piliers (Flash) | $0.13 |
| Articles courts (Flash-Lite) | $0.01 |
| Articles premium (Pro) | $0.23 |
| Extraction donnees (Flash-Lite) | $0.01 |
| **TOTAL mensuel** | **~$0.38** |
| **TOTAL annuel** | **~$4.56** |

**Le cout est negligeable.** Meme en doublant le volume (2 articles/jour) et en ajoutant des retries, on reste sous $1/mois. Le free tier suffirait pour ce volume.

### Verification free tier

Avec 30 articles/mois :
- Flash : 12 requetes/mois << 250 RPD (free tier)
- Flash-Lite : 44 requetes/mois << 1 000 RPD (free tier)
- Pro : 4 requetes/mois << 100 RPD (free tier)

**Conclusion : le free tier est largement suffisant pour 1-2 articles/jour.** Pas besoin de passer en payant sauf si on ajoute des usages intensifs (batch processing, re-generation massive).

---

## 4. Configuration API recommandee

### Pour la redaction d'articles (Flash / Pro)

```typescript
const BLOG_ARTICLE_CONFIG: GeminiConfig = {
  maxOutputTokens: 8192,    // ~5500 mots, suffisant pour articles longs
  temperature: 0.7,          // Equilibre creativite/coherence
  responseMimeType: undefined // Texte libre (markdown)
};
```

**Parametres detailles :**

| Parametre | Valeur | Justification |
|-----------|--------|---------------|
| `temperature` | 0.7 | Assez creatif pour eviter le contenu generique, assez controle pour rester factuel. Pour les articles de donnees/chiffres, baisser a 0.3-0.4. |
| `maxOutputTokens` | 8192 | Couvre 4000+ mots. Augmenter a 16384 pour les guides piliers tres longs. |
| `topP` | 0.95 (defaut) | Pas besoin de modifier. |
| `topK` | 40 (defaut) | Pas besoin de modifier. |

### Pour l'extraction de donnees JSON

```typescript
const DATA_EXTRACTION_CONFIG: GeminiConfig = {
  maxOutputTokens: 2048,
  temperature: 0.1,           // Quasi-deterministe pour les donnees
  responseMimeType: "application/json"
};
```

### Pour les meta-donnees SEO (title, description, slug)

```typescript
const SEO_META_CONFIG: GeminiConfig = {
  maxOutputTokens: 512,
  temperature: 0.5,
  responseMimeType: "application/json"
};
```

### Conseil : thinking budget

Les modeles 2.5 supportent un "thinking budget" (tokens de reflexion interne). Pour la redaction d'articles, on peut activer un budget modere :

```typescript
// Dans le body de la requete, ajouter :
thinkingConfig: {
  thinkingBudget: 1024  // Laisse le modele planifier la structure de l'article
}
```

Les thinking tokens sont gratuits sur Flash et Flash-Lite. Sur Pro, ils sont factures au prix output. Pour la redaction de blog, un budget de 1024-2048 thinking tokens ameliore la structure sans exploser les couts.

---

## 5. Strategie de fallback

### Hierarchie de fallback

```
Principal : Gemini 2.5 Flash
    |
    v (si erreur 429/500/503)
Fallback 1 : Gemini 2.5 Flash-Lite (moins cher, plus rapide, rate limits plus genereux)
    |
    v (si erreur 429/500/503)
Fallback 2 : Gemini 3 Flash Preview (preview, peut etre instable)
    |
    v (si tous down)
Fallback 3 : File d'attente + retry apres delai
```

### Implementation recommandee

```typescript
const MODELS_PRIORITY = [
  { id: "gemini-2.5-flash", timeout: 60_000 },
  { id: "gemini-2.5-flash-lite", timeout: 45_000 },
  { id: "gemini-3-flash-preview", timeout: 60_000 },
] as const;

async function generateWithFallback(
  prompt: string,
  config: GeminiConfig
): Promise<string> {
  for (const model of MODELS_PRIORITY) {
    try {
      return await callGeminiWithModel(prompt, model.id, config, model.timeout);
    } catch (error) {
      const status = extractHttpStatus(error);
      if (status === 429 || status === 500 || status === 503) {
        console.warn(`${model.id} indisponible (${status}), essai suivant...`);
        continue;
      }
      throw error; // Erreur non-retryable (400, 401, etc.)
    }
  }
  throw new Error("Tous les modeles Gemini sont indisponibles");
}
```

### Gestion des rate limits (free tier)

| Modele | Free RPM | Free RPD | Strategie |
|--------|----------|----------|-----------|
| 2.5 Flash | 10 | 250 | Principal -- 1 article ne consomme qu'1-2 requetes |
| 2.5 Flash-Lite | 15 | 1 000 | Fallback ideal -- limits les plus genereux |
| 2.5 Pro | 5 | 100 | Reserve aux articles premium uniquement |
| 3 Flash (preview) | ~10 | ~250 | Fallback de secours, peut varier |

Pour un pipeline de 1-2 articles/jour, on consomme 2-6 requetes/jour au total (article + meta SEO + extraction donnees). C'est negligeable par rapport aux limites quotidiennes.

### Retry avec backoff exponentiel

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i); // 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unreachable");
}
```

---

## 6. Plan d'evolution

### Court terme (mars-juin 2026) : rester sur Gemini 2.5 Flash

- Modele stable, GA, bien documente
- Le projet utilise deja l'infra Gemini (`src/infrastructure/ai/gemini.ts`)
- Couts quasi-nuls avec le free tier
- Pas besoin de modele premium pour du contenu SEO immobilier

### Moyen terme (juillet-sept 2026) : evaluer Gemini 3 Flash quand stable

**Quand migrer :**
- Quand `gemini-3-flash` sort de preview et passe en GA (stable)
- Si les benchmarks montrent une amelioration notable sur la redaction en francais
- Le prix ($0.50/$3.00) reste raisonnable

**Comment migrer :**
- Changer simplement le model ID dans la config
- L'API Gemini est retro-compatible entre generations
- Tester sur 5-10 articles avant migration complete

### Long terme : quand passer a Pro ?

**Signaux pour upgrader :**
- Le blog genere du trafic significatif (>5000 visites/mois)
- Les articles longs necessitent plus de nuance et d'expertise editoriale
- On lance des contenus premium (guides PDF, newsletters)
- Le budget permet $5-10/mois d'API

**Signaux pour rester sur Flash :**
- Le contenu SEO factuel ne beneficie pas significativement de Pro
- Le rapport cout/qualite est deja suffisant
- L'audience ne distingue pas la difference de style

### Scenario de montee en charge

| Volume | Modele recommande | Cout mensuel estime | Tier necessaire |
|--------|-------------------|--------------------|-----------------|
| 1 article/jour | 2.5 Flash | ~$0.40 | Free |
| 2 articles/jour | 2.5 Flash | ~$0.80 | Free |
| 5 articles/jour | 2.5 Flash | ~$2.00 | Free |
| 10 articles/jour | 2.5 Flash | ~$4.00 | Free (attention au RPD) |
| 20+ articles/jour | 2.5 Flash | ~$8.00 | Tier 1 recommande |

---

## 7. Integration dans le projet existant

Le projet dispose deja de l'infrastructure Gemini dans `src/infrastructure/ai/gemini.ts`. Pour le pipeline blog, il faudra :

1. **Ajouter un modele configurable** au lieu du modele hardcode actuel
2. **Creer un module** `src/domains/blog/ai/article-generator.ts` qui reutilise `callGemini`
3. **Separer les configs** par type de tache (redaction vs extraction vs SEO meta)

Le fait que `GEMINI_API_KEY` soit deja configure et que l'infra d'appel existe simplifie grandement l'integration.

---

## Sources

- [Gemini API Pricing -- Documentation officielle Google](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini API Models -- Documentation officielle Google](https://ai.google.dev/gemini-api/docs/models)
- [Gemini API Rate Limits -- Documentation officielle Google](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini 3 Developer Guide -- Google AI for Developers](https://ai.google.dev/gemini-api/docs/gemini-3)
- [Gemini 3.1 Flash-Lite -- Google Blog](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-flash-lite/)
- [Gemini 2.5 Flash -- Vertex AI Documentation](https://docs.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash)
- [Gemini 2.5 Flash-Lite -- Vertex AI Documentation](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-lite)
- [Gemini API Rate Limits Per Tier -- AI Free API](https://www.aifreeapi.com/en/posts/gemini-api-rate-limits-per-tier)
- [Gemini API Free Tier Rate Limits 2026 -- AI Free API](https://www.aifreeapi.com/en/posts/gemini-api-free-tier-rate-limits)
- [Gemini 2.5 Flash vs Pro Comparison -- DataStudios](https://www.datastudios.org/post/gemini-2-5-flash-and-pro-explained-differences-workflows-and-strategic-choices)
- [Vertex AI Pricing -- Google Cloud](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- [Gemini 3.1 Pro Preview -- OpenRouter](https://openrouter.ai/google/gemini-3.1-pro-preview)
