# Plan Blog SEO/GEO — Éditorial villes françaises

## Vision

Un blog immobilier investissement qui sert deux objectifs :
1. **Acquisition SEO/GEO** — pages optimisées pour Google Search + AI Overviews (Gemini, ChatGPT, Perplexity)
2. **Alimentation data** — chaque article enrichit `locality_data` avec des données structurées

**Priorité immédiate** : éditorial autour des villes françaises (guides investissement).

---

## Principes SEO/GEO

### SEO classique
- **1 page = 1 intent** : `/guide/lyon` = "investir à Lyon"
- **Données chiffrées uniques** : DVF + localités = contenu que personne d'autre n'a
- **Maillage interne** : chaque guide lie vers les guides des villes voisines + articles blog liés
- **Fraîcheur** : ISR + articles quotidiens signalent une source vivante
- **JSON-LD** : `Article`, `Place`, `FAQPage` pour les rich snippets

### GEO (Generative Engine Optimization)
- **Données structurées dans le texte** : les IA extraient mieux les chiffres contextualisés
- **Format FAQ** : section questions/réponses en bas de chaque guide (les LLMs adorent)
- **Citations sourcées** : "Selon les données DVF 2024..." = meilleure attribution par les IA
- **Phrases assertives** : "Le rendement brut moyen à Lyon est de 5.2%" > formulations vagues
- **Mise à jour datée** : "Données mars 2025" = signal de fraîcheur pour les IA

---

## Phase 1 : Guides villes statiques (fondations)

**Objectif** : 50+ pages villes data-driven, zéro IA dans le contenu, données 100% factuelles.

### 1.1 — Route `/guide/[city]`

Structure type d'un guide ville :

```
# Investir à [Ville] : guide complet [Année]

## Le marché immobilier à [Ville]
- Prix moyen au m² : X €
- Prix par type de bien (studio, T2-T3, T4+, maison)
- Évolution sur 1 an : +X%
- Nombre de transactions : X
- Délai moyen de vente : X jours

## Le marché locatif
- Loyer moyen nu : X €/m²
- Loyer meublé : X €/m²
- Taux de vacance : X%
- Tension locative : tendu/équilibré/détendu
- Zone encadrement des loyers : oui/non

## Rendement estimé
- Rendement brut moyen : X%
- Simulation type : T2 de 45m² acheté X€, loué X€/mois
- Comparaison avec la moyenne nationale

## Airbnb & location courte durée
- Prix moyen nuitée : X€
- Taux d'occupation : X%
- Réglementation locale
- Revenu mensuel estimé

## Qualité de vie
- Population : X habitants
- Croissance démographique : +X%
- Revenu médian : X€
- Taux de chômage : X%
- Qualité de l'air, espaces verts
- Sécurité

## Transports & accessibilité
- Score transports en commun
- Gare TGV : oui/non
- Temps de trajet vers la métropole la plus proche
- Aéroport

## Éducation & services
- Écoles, collèges, lycées
- Universités / grandes écoles
- Offre de santé

## Fiscalité & dispositifs
- Taux taxe foncière : X%
- Éligible Pinel : oui/non
- Éligible Denormandie : oui/non
- Zone ZRR : oui/non

## Risques
- Inondation, sismique, industriel
- Radon, pollution sols
- Retrait-gonflement argiles

## Projets urbains
- Grands projets en cours (transports, ZAC, rénovation urbaine)
- Impact attendu sur les prix

## FAQ
- "Est-ce rentable d'investir à [Ville] ?"
- "Quel quartier choisir pour investir à [Ville] ?"
- "Quel type de bien privilégier à [Ville] ?"
- "Faut-il investir en meublé ou en nu à [Ville] ?"

## CTA
→ Simulez votre investissement à [Ville] sur tiili.io
```

### 1.2 — Route `/guide` (index)

- Tableau de toutes les villes avec métriques clés
- Classement par rendement, prix, population
- Filtres : région, tranche de prix, rendement, tension
- Carte de France interactive (bonus)

### 1.3 — SEO technique

| Fichier | Contenu |
|---------|---------|
| `robots.ts` | Allow all, référence sitemap |
| `sitemap.ts` | Toutes les URLs guides + blog |
| JSON-LD | `Article` + `Place` + `FAQPage` par guide |
| OG tags | Titre, description, image dynamique |
| Canonical | URL propre sans paramètres |
| `hreflang` | `fr` (mono-langue pour l'instant) |

### 1.4 — Données initiales

Sources pour peupler les 50 premières villes sans IA :
1. **DVF open data** → prix, transactions, tendances
2. **INSEE** → population, revenus, chômage, démographie
3. **Géorisques API** → risques naturels
4. **ADEME** → DPE open data
5. **data.gouv.fr** → dispositifs fiscaux (Pinel, ZRR)
6. **Table de référence loyers** → déjà en base (~60 villes)

**Script d'import initial** : `scripts/import-initial-localities.ts`
- Appels API DVF + INSEE + Géorisques
- Parse et stocke en `locality_data` avec `created_by = "import-initial"`

---

## Phase 2 : Pipeline IA éditoriale

**Objectif** : 1 article/jour généré par IA, avec extraction de données structurées.

### 2.1 — Table `blog_articles`

```sql
CREATE TABLE blog_articles (
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
  extracted_data TEXT,           -- JSON structuré
  data_injected BOOLEAN DEFAULT 0,
  status TEXT DEFAULT 'draft',
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 2.2 — Catégories éditoriales

| Catégorie | Exemple de titre | Données extraites |
|-----------|------------------|-------------------|
| `guide_ville` | "Investir à Bordeaux en 2025 : rendements et quartiers" | LocalityDataFields complets |
| `guide_quartier` | "Les meilleurs quartiers pour investir à Lyon" | Données par quartier |
| `actu_marche` | "Les prix immobiliers en hausse de 3% au T1 2025" | Tendances prix/loyers |
| `analyse_ville` | "Nantes : la ville où les rendements dépassent 6%" | Comparaisons inter-villes |
| `fiscalite` | "Pinel prolongé en 2025 : les villes éligibles" | Dispositifs à jour |
| `financement` | "Taux immobiliers mars 2025 : la baisse se poursuit" | Taux actuels |
| `conseil` | "Studio ou T2 : quel bien pour un premier investissement ?" | — |

### 2.3 — News Fetcher

Sources d'entrée pour détecter les sujets du jour :
- RSS : SeLoger, PAP, Le Figaro Immo, Les Echos, Capital
- Google News RSS ("investissement immobilier locatif")
- DVF API : transactions récentes significatives
- Données internes : villes avec `locality_data` incomplet ou ancien

Sélection automatique du sujet le plus pertinent (mots-clés, fraîcheur, lacunes data).

### 2.4 — Article Generator (Gemini)

Double output :
1. **Article HTML** : 800-1500 mots, données chiffrées, maillage interne, FAQ, CTA
2. **Données structurées** : JSON conforme à `LocalityDataFields` étendu

Prompt optimisé GEO :
- Phrases assertives avec chiffres
- Sources citées
- Format structuré (H2/H3/listes)
- FAQ en bas d'article

### 2.5 — Data Injection

```
Article généré → extracted_data sauvegardé
  → Si locality_id identifié :
    → Créer snapshot locality_data (created_by = "blog-ai")
    → Merge avec existant (ne pas écraser données manuelles)
    → Flag data_injected = 1
  → Guides villes mis à jour automatiquement (ISR)
```

### 2.6 — Routes blog

- `/blog` — liste paginée, filtrable par catégorie/ville
- `/blog/[slug]` — article complet avec JSON-LD, OG, FAQ schema
- ISR `revalidate = 3600`

---

## Phase 3 : Contenu enrichi & maillage

### 3.1 — Maillage interne automatique

Chaque article insère des liens vers :
- Guides des villes mentionnées
- Articles précédents de la même catégorie
- Pages de l'app (simulation, dashboard)

### 3.2 — Contenu multimédia

- Images : graphiques prix/loyers générés (Chart.js → SVG)
- Tableaux comparatifs entre villes
- Mini-cartes positionnement géographique

### 3.3 — Pages thématiques

- `/guide/region/[region]` — agrégation des villes d'une région
- `/guide/top-rendement` — classement dynamique
- `/guide/petites-villes` — villes < 50K habitants
- `/guide/villes-etudiantes` — focus demande locative étudiante

---

## Phase 4 : Social & distribution

### 4.1 — Publication sociale

Après chaque article :
- Post X/Twitter (280 chars + lien)
- Post LinkedIn (résumé + données clés)
- Thread si article riche en données

### 4.2 — Newsletter

- Digest hebdo : meilleurs articles + tendances
- Alerte ville : nouvelles données pour les villes suivies

---

## Étapes de mise en oeuvre

### Sprint 1 — Fondations (semaine 1)

1. [ ] Créer `src/app/robots.ts` et `src/app/sitemap.ts`
2. [ ] Layout public pour `/guide` et `/blog` (Tailwind, nav, footer SEO)
3. [ ] Route `/guide/[city]/page.tsx` avec `generateStaticParams`
4. [ ] Template guide ville complet (toutes les sections)
5. [ ] JSON-LD (`Article` + `Place` + `FAQPage`)
6. [ ] OG tags dynamiques
7. [ ] Route `/guide/page.tsx` — index avec tableau + tri

### Sprint 2 — Données initiales (semaine 1-2)

8. [ ] Étendre `LocalityDataFields` avec les champs P0 (prix segmentés, tendances, fiscalité)
9. [ ] Script import DVF open data → `locality_data`
10. [ ] Script import INSEE (population, revenus, chômage)
11. [ ] Script import Géorisques
12. [ ] Peupler les 50 premières villes
13. [ ] Vérifier rendu guides villes avec données réelles

### Sprint 3 — Pipeline blog (semaine 2-3)

14. [ ] Migration DB : table `blog_articles`
15. [ ] `src/domains/blog/types.ts`
16. [ ] `src/domains/blog/news-fetcher.ts`
17. [ ] `src/domains/blog/article-generator.ts` (prompt Gemini)
18. [ ] `src/domains/blog/article-repository.ts`
19. [ ] `src/domains/blog/data-injector.ts`
20. [ ] Routes `/blog` et `/blog/[slug]`
21. [ ] Script cron `scripts/publish-daily.ts`
22. [ ] GitHub Actions workflow (cron 6h quotidien)

### Sprint 4 — Enrichissement (semaine 3-4)

23. [ ] Étendre `LocalityDataFields` avec champs P1 (qualité de vie, transports, éducation)
24. [ ] Maillage interne automatique
25. [ ] Pages thématiques (top rendement, régions, etc.)
26. [ ] Graphiques prix/loyers pour les guides
27. [ ] FAQ Schema markup sur tous les guides

### Sprint 5 — Distribution (semaine 4+)

28. [ ] Publication sociale automatique
29. [ ] Newsletter hebdo
30. [ ] Monitoring SEO (Search Console, positionnement)

---

## KPIs

| Métrique | Cible M+1 | Cible M+3 | Cible M+6 |
|----------|-----------|-----------|-----------|
| Pages guides villes | 50 | 100 | 200+ |
| Articles blog | 30 | 90 | 180 |
| Villes avec données complètes P0 | 50 | 80 | 150 |
| Pages indexées Google | 80 | 200 | 400+ |
| Trafic organique mensuel | 500 | 5 000 | 20 000 |
| Citations IA (Gemini/ChatGPT) | — | Premières | Régulières |
