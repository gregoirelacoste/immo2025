# tiili — Pitch complet

> **Simulateur d'investissement locatif intelligent pour le marché français.**
> Scraping IA, données marché propriétaires, modélisation financière complète — dans une PWA mobile-first.

---

## Le problème

Investir dans l'immobilier locatif en France est un parcours semé d'obstacles :

1. **Collecte de données fastidieuse** — L'investisseur copie manuellement les chiffres depuis SeLoger, LeBonCoin, PAP dans un tableur Excel. Chaque annonce demande 10-15 minutes de saisie.

2. **Calculs financiers complexes et souvent faux** — Rendement brut, net, net-net, cashflow, fiscalité LMNP réel vs micro-BIC, amortissements, plus-value à la revente... La plupart des investisseurs se trompent ou simplifient à l'excès.

3. **Manque de contexte marché** — Quel est le prix médian au m² dans ce quartier ? Le loyer est-il réaliste ? La ville est-elle en zone tendue ? Risques naturels ? Éligibilité Pinel/Denormandie ? Ces données existent mais sont dispersées sur 10+ sites institutionnels.

4. **Pas de vision terrain intégrée** — Les outils financiers ignorent la visite physique. Or, un rendement à 8% ne vaut rien si la copropriété est dégradée ou si le quartier est en déclin.

5. **Outils existants trop simplistes** — Les simulateurs gratuits calculent un rendement brut. Les outils pros sont chers, rigides, et pensés pour les agents immobiliers, pas pour les investisseurs particuliers.

---

## La solution : tiili

**tiili** est un simulateur d'investissement locatif complet qui transforme une URL d'annonce en analyse financière détaillée — en quelques secondes.

### Le flux utilisateur

```
1. L'utilisateur partage une URL depuis LeBonCoin/SeLoger
         ↓
2. tiili scrape automatiquement l'annonce (prix, surface, ville, photos)
         ↓
3. Les données marché sont enrichies (prix DVF, loyers observatoire, données socio-économiques)
         ↓
4. Le moteur de calcul produit rendements, cashflow, impact fiscal, score d'investissement
         ↓
5. L'utilisateur ajuste les paramètres, compare des scénarios, planifie sa visite
         ↓
6. Après visite : photos géolocalisées, checklist 30+ points, note terrain → score final
```

---

## Fonctionnalites cles

### 1. Scraping intelligent multi-couche

Un pipeline d'extraction en 5 étapes qui s'adapte à chaque site :

| Étape | Méthode | Détail |
|-------|---------|--------|
| 1 | JSON-LD | Extraction des données structurées SEO embarquées dans la page |
| 2 | Manifeste CSS | Sélecteurs CSS mis en cache par domaine (réutilisés automatiquement) |
| 3 | IA générative | Gemini 2.5 Flash-Lite génère de nouveaux sélecteurs si le manifeste échoue |
| 4 | Validation | Vérification locale + contrôle de cohérence IA |
| 5 | Retry enrichi | Jusqu'à 3 tentatives avec prompts améliorés |
| Fallback | Collage texte | L'utilisateur colle le texte de l'annonce → extraction IA (feature premium) |

**Résultat :** 40+ champs extraits automatiquement — prix, surface, adresse, type de bien, description, photos, équipements.

**Transparence :** Chaque champ pré-rempli affiche sa source ("Scraping IA", "Observatoire des loyers", "DVF"). L'utilisateur voit d'où vient chaque donnée et peut la corriger.

### 2. Moteur de calcul financier complet

Calculs 100% client-side pour une réactivité instantanée (mise à jour en temps réel à chaque frappe).

**Financement :**
- Mensualité de prêt (amortissement standard avec capitalisation mensuelle)
- Assurance emprunteur, frais de dossier
- Coût total du crédit sur la durée
- Frais de notaire auto-calculés (7.5% ancien / 2.5% neuf) ou saisis manuellement
- Capital restant dû à N années (simulation de sortie)

**Rendements locatifs :**
- **Location classique** — Rendement brut, net (charges déduites), cashflow mensuel
- **Airbnb** — Prix/nuit × taux d'occupation, rendement net, cashflow
- Taux de vacance locative paramétrable
- Charges déductibles : copropriété, taxe foncière, PNO, entretien, GLI

**Fiscalité :**
- **Micro-BIC** — Abattement 50%, calcul simplifié
- **LMNP Réel** — Amortissements (bâtiment 30 ans hors 15% terrain, travaux 10 ans, mobilier 7 ans), déduction des intérêts, charges déductibles
- Économie d'impôt réel vs micro-BIC
- **Rendement net-net** après impôts selon TMI (30% par défaut)

**Simulation de revente :**
- Plus-value : IR 19% + prélèvements sociaux 17.2%
- Abattements progressifs (exonération totale IR à 22 ans, PS à 30 ans)
- ROI sur la durée de détention
- Profit net total (loyers perçus + remboursement dette - charges)

### 3. Données marché propriétaires

Chaque bien est contextualisé avec des données marché riches :

**Sources de données :**
- **DVF (Demandes de Valeurs Foncières)** — Prix réels de transaction (données ouvertes gouvernementales), prix médian au m², volume de transactions
- **Observatoire des Loyers** — Loyers moyens au m² (nu et meublé) pour ~60 villes, taux de vacance, tension locative
- **Base localités propriétaire** — ~90 champs par ville/quartier

**Données par localité :**

| Catégorie | Exemples de champs |
|-----------|-------------------|
| Socio-économique | Population, croissance, revenu médian, taux de chômage, taux de pauvreté |
| Infrastructure | Écoles, universités, transports en commun, santé |
| Risques | Inondation, sismique, industriel, radon, retrait-gonflement des argiles |
| Réglementaire | Éligibilité Pinel, zones Denormandie, ZRR, encadrement des loyers |
| Airbnb | Prix moyen/nuit, taux d'occupation moyen |

### 4. Score d'investissement

Un score sur 100 points avec pondération transparente :

- **Financier (70 pts)**
  - Rendement net : 0-25 pts (8%+ = max)
  - Cashflow mensuel : 0-25 pts (200€+/mois = max)
  - Prix vs marché : 0-20 pts (15% sous la médiane = max)
- **Terrain / Visite (30 pts)**
  - Note globale de visite : 0-30 pts (5/5 = max)

**Labels :** Faible (0-30) · Moyen (31-50) · Bon (51-70) · Excellent (71-100)

### 5. Multi-simulation / Scénarios

Chaque bien peut avoir plusieurs simulations nommées :

- Paramètres ajustables : prêt (montant, taux, durée, assurance), loyer, vacance, Airbnb (prix/nuit, occupation), travaux, charges, régime fiscal, taux de revalorisation, durée de détention
- Comparaison côte à côte sur la page détail
- Simulation active = celle affichée sur le dashboard

**Cas d'usage :** "Que se passe-t-il si je mets 30K de travaux et je passe en meublé Airbnb ?" vs "Location nue classique sans travaux"

### 6. Visite terrain et évaluation physique

- **Checklist 30+ points** : état général, structure, toiture, isolation, électricité, plomberie, parties communes, environnement...
- **Système de notation** : chaque point noté de 1 à 5 + commentaires texte
- **Photos géolocalisées** : capture caméra ou upload, métadonnées EXIF, reverse geocoding
- **Tags photos** : structure, intérieur, extérieur, équipements
- **Questions vendeur** + suivi des red flags
- **Note de visite** intégrée au score d'investissement (30% du score final)

### 7. PWA mobile-first + Share Target

- **Installable** sur mobile (iOS/Android) et desktop comme une app native
- **Share Target** : depuis LeBonCoin/SeLoger, cliquer "Partager" → l'annonce arrive directement dans tiili
- **Capacitor** : bridge natif pour caméra, géolocalisation, splash screen
- **Service Worker** : cache des assets statiques, mode offline partiel
- **UX mobile** : barre de navigation en bas, cibles tactiles 44px, safe areas, `inputMode` adapté

### 8. Dashboard portfolio

- **Mobile** : vue en cartes avec KPIs condensés
- **Desktop** : tableau triable avec toutes les métriques
- Rendements, cashflow, score d'investissement par bien
- Comparaison avec les données marché
- Vue d'ensemble du portefeuille

---

## Stack technique

| Couche | Technologie |
|--------|------------|
| Framework | Next.js 16, App Router, React 19, TypeScript 5.9 |
| Styling | Tailwind CSS v4 (config en CSS, pas de fichier de config) |
| Base de données | SQLite via `@libsql/client` — dev local `file:data.db`, prod Turso |
| IA | Gemini 2.5 Flash-Lite (scraping + extraction texte) |
| Auth | NextAuth v5 (email/password, bcrypt) |
| Maps | Leaflet + react-leaflet |
| Mobile | PWA + Capacitor v7 (iOS/Android) |
| Hébergement | Vercel (frontend) + Turso (base de données serverless) |
| Geocoding | geo.api.gouv.fr (API gouvernementale) |

**Architecture :**
- Server Components pour le data fetching, Client Components pour l'interactivité
- Server Actions centralisées par domaine (`src/domains/*/actions.ts`)
- Calculs 100% client-side (réactivité instantanée, pas de round-trip serveur)
- Structure domain-driven : property, scraping, market, simulation, visit, photo, locality, auth...
- ~23 800 lignes de TypeScript

---

## Strategie d'acquisition : blog SEO/GEO

### Positionnement éditorial

- **Cible** : investisseurs locatifs français, 28-50 ans, CDI ou freelance, premier ou deuxième bien
- **Ton** : expert ami avec des données, pas commercial
- **Angle différenciant** : données propriétaires `locality_data` + calculs vérifiables dans le simulateur

### Volume de contenu

| Type | /mois | Longueur | Objectif |
|------|-------|----------|----------|
| Guide Ville | 14-16 | 2500-4000 mots | Pages de référence SEO par ville |
| Guide Quartier | 5-8 | 1500-2500 mots | Profondeur locale |
| Actu Marché | 10-12 | 800-1500 mots | Signal de fraîcheur |
| Analyse Comparative | 4 | 1500-2500 mots | Lyon vs Bordeaux, Top 10... |
| Conseil Investissement | 4 | 1500-3000 mots | Méthodologie, stratégie |
| Fiscalité & Dispositifs | 2 | 1500-2500 mots | LMNP, Pinel, Denormandie |
| Financement | 2-3 | 1000-2000 mots | Taux, assurance, montage |
| Étude de Cas | 2 | 1200-2000 mots | Showcase simulateur |
| **Total** | **~43-51** | | |

### Architecture URL

```
tiili.io/
  /guide/                           → hub guides villes
  /guide/lyon                       → guide ville
  /guide/paris/18e-arrondissement   → guide quartier
  /guide/region/ile-de-france       → guide régional
  /blog/                            → index articles
  /blog/categorie/actu-marche       → catégorie
  /blog/tag/lmnp                    → tag
  /blog/[slug]                      → article
  /glossaire/[terme]                → définitions long-tail
```

### Pipeline bidirectionnelle blog ↔ données

Les articles sont alimentés par les données `locality_data` (prix, loyers, démographie, risques, fiscalité). En retour, la recherche éditoriale enrichit la base de données des localités. Le blog et le produit se nourrissent mutuellement.

### Optimisation GEO (Generative Engine Optimization)

En plus du SEO classique, le contenu est structuré pour être cité par les IA génératives :
- Tableaux de données structurés
- Sections FAQ
- Résumés en bullet points
- JSON-LD (Article, FAQPage, Place)
- Formulations assertives avec données chiffrées

---

## Modele economique

### Freemium

**Gratuit :**
- Import d'annonces par URL (scraping IA)
- Calculs financiers complets (rendements, cashflow, fiscalité)
- Données marché de base (prix DVF, loyers observatoire)
- Score d'investissement
- Dashboard portfolio
- PWA installable + Share Target

**Premium (prévu) :**
- Extraction par collage de texte (IA)
- Analytics portefeuille avancés (projections ROI dans le temps)
- Alertes marché (baisses de prix, opportunités par ville cible)
- Accès API (analyse en lot pour pros/agences)
- Rapports localité téléchargeables

### Tunnel de conversion

```
Contenu SEO/GEO (blog) → Trafic organique haute intention
         ↓
Import d'annonce gratuit (0 friction, pas de compte requis)
         ↓
Usage régulier du simulateur → création de compte
         ↓
Besoins avancés → conversion premium
```

---

## Avantages concurrentiels

| # | Avantage | Détail |
|---|----------|--------|
| 1 | **Scraping IA intégré** | Import automatique depuis n'importe quel site d'annonces. Les concurrents demandent une saisie manuelle ou des intégrations API coûteuses. |
| 2 | **Spécialisation marché français** | Pinel, LMNP, ZRR, encadrement des loyers, DVF, Observatoire des Loyers. Pas un outil générique adapté à la France. |
| 3 | **Base de données propriétaire** | ~90 champs par localité (prix, loyers, démographie, risques, réglementaire, Airbnb). Les concurrents utilisent des données basiques. |
| 4 | **Financier + Terrain** | Photos, checklists, notes de visite intégrées aux métriques financières. La plupart des outils sont purement financiers. |
| 5 | **Transparence des sources** | Chaque donnée pré-remplie affiche son origine. L'utilisateur comprend et fait confiance. |
| 6 | **PWA + Share Target** | Partager une annonce depuis le navigateur → formulaire pré-rempli. Zéro friction mobile. |
| 7 | **Simulation de sortie** | Plus-value, abattements, ROI sur durée de détention. La plupart des simulateurs s'arrêtent au rendement. |
| 8 | **Pas de compte requis** | Essai immédiat sans inscription. La propriété est créée même si le scraping échoue (URL préservée). |

---

## Concurrence

| Concurrent | Forces | Faiblesses vs tiili |
|-----------|--------|-------------------|
| **Rendement Locatif** | Communauté, contenu éducatif | Pas de scraping, données marché limitées, pas de visite terrain |
| **Horiz.io** | Interface pro, gestion locative | Payant dès le départ, pas de scraping IA, pas de PWA |
| **Masteos** | Clé en main (achat + gestion) | Modèle agence (cher), pas de simulateur autonome |
| **MeilleursAgents** | Estimation de prix, notoriété | Pas de simulateur d'investissement, modèle B2B agents |
| **Excel/Google Sheets** | Flexible, gratuit | Pas de scraping, pas de données marché, pas de mobile, erreurs fréquentes |

**Positionnement tiili :** l'outil le plus complet pour l'investisseur particulier qui veut prendre des décisions basées sur des données, sans payer un conseiller ou une agence clé-en-main.

---

## Metriques clés (mars 2026)

- **Codebase** : ~23 800 lignes TypeScript, architecture domain-driven
- **Version** : 1.2.0
- **Stade** : MVP fonctionnel, utilisable en production
- **Domaines couverts** : 12 (property, scraping, market, simulation, visit, photo, locality, auth, enrich, rental, collect, reference)
- **Champs par localité** : ~90
- **Villes couvertes (loyers)** : ~60
- **Points checklist visite** : 30+
- **Champs extraits par scraping** : 40+

---

## Vision

**Court terme (2026)** : consolider le MVP, lancer le blog SEO/GEO, atteindre les premiers utilisateurs organiques, valider le product-market fit.

**Moyen terme** : monétiser via le premium (collage texte, alertes, analytics), atteindre 10K utilisateurs actifs mensuels, couvrir 200+ villes dans la base de données.

**Long terme** : devenir la référence française de l'analyse d'investissement locatif pour particuliers — un "Bloomberg Terminal" accessible pour l'investisseur immobilier individuel.

---

*tiili — Investir avec des données, pas des intuitions.*
