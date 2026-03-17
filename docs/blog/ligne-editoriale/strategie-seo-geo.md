# Strategie SEO/GEO — Blog tiili.io

> Document de reference pour l'optimisation moteurs de recherche (SEO) et moteurs generatifs (GEO) du blog immobilier tiili.io.
> Derniere mise a jour : mars 2026.

---

## Table des matieres

1. [Architecture SEO](#1-architecture-seo)
2. [Optimisation on-page](#2-optimisation-on-page)
3. [Strategie GEO (AI Optimization)](#3-strategie-geo-ai-optimization)
4. [Strategie de liens](#4-strategie-de-liens)
5. [SEO technique Next.js](#5-seo-technique-nextjs)
6. [Metriques et suivi](#6-metriques-et-suivi)

---

## 1. Architecture SEO

### 1.1 Structure URL complete

```
tiili.io/
  |
  |-- /guide/                         # Index des guides (hub principal)
  |     |-- /guide/lyon               # Guide ville (slug = nom normalisé)
  |     |-- /guide/bordeaux
  |     |-- /guide/lyon/7e-arrondissement  # Guide quartier
  |     |
  |     |-- /guide/region/auvergne-rhone-alpes  # Hub regional
  |     |-- /guide/region/ile-de-france
  |     |
  |     |-- /guide/top-rendement      # Page thematique classement
  |     |-- /guide/villes-etudiantes  # Page thematique segment
  |     |-- /guide/petites-villes     # Page thematique segment
  |     |-- /guide/investir-en-2026   # Page thematique temporelle
  |
  |-- /blog/                          # Index du blog (liste paginee)
  |     |-- /blog/page/2              # Pagination
  |     |-- /blog/categorie/actu-marche  # Filtre par categorie
  |     |-- /blog/categorie/fiscalite
  |     |-- /blog/tag/pinel           # Filtre par tag
  |     |
  |     |-- /blog/prix-immobilier-lyon-2026  # Article individuel
  |     |-- /blog/meilleurs-quartiers-bordeaux
  |
  |-- /simulateur                     # CTA principal (= page dashboard/property)
  |-- /glossaire                      # Definitions termes immobilier (long tail)
  |     |-- /glossaire/rendement-brut
  |     |-- /glossaire/cash-flow
```

**Regles de nommage des URLs :**
- Slugs en minuscules, mots separes par des tirets
- Pas d'accents dans les URLs : `saint-etienne` pas `saint-étienne`
- Pas de dates dans les slugs des guides villes (contenu evergreen mis a jour)
- Dates optionnelles dans les slugs des articles blog quand lie a l'actualite

### 1.2 Arborescence des pages et relations parent/enfant

```
Niveau 0 : Pages hub
  /guide/                     (parent de toutes les pages guide)
  /blog/                      (parent de tous les articles)

Niveau 1 : Hubs regionaux + categories
  /guide/region/[region]      (parent des villes de la region)
  /blog/categorie/[cat]       (parent des articles de cette categorie)

Niveau 2 : Pages villes + articles
  /guide/[city]               (enfant de /guide/ ET de /guide/region/[region])
  /blog/[slug]                (enfant de /blog/ ET de /blog/categorie/[cat])

Niveau 3 : Pages quartiers
  /guide/[city]/[quartier]    (enfant de /guide/[city])
```

**Breadcrumbs (fil d'Ariane) obligatoires :**
```
Guide > Auvergne-Rhone-Alpes > Lyon > 7e arrondissement
Blog > Actualite marche > Les prix a Lyon en hausse de 3%
```

### 1.3 Siloing thematique (cocons semantiques)

Trois cocons principaux, chacun avec un hub central et des pages satellites :

#### Cocon 1 : Geographique (le plus important)

```
Hub : /guide/
  |
  |-- Cluster region : /guide/region/ile-de-france
  |     |-- /guide/paris
  |     |-- /guide/boulogne-billancourt
  |     |-- /guide/saint-denis
  |     |-- (articles blog lies) /blog/marche-immobilier-ile-de-france-2026
  |
  |-- Cluster region : /guide/region/auvergne-rhone-alpes
  |     |-- /guide/lyon
  |     |-- /guide/grenoble
  |     |-- /guide/saint-etienne
  |     |-- /guide/lyon/croix-rousse  (quartier)
```

**Regles de maillage intra-cocon :**
- Chaque guide ville lie vers sa page region parente
- Chaque page region lie vers toutes ses villes
- Chaque guide ville lie vers 3-5 villes voisines ou comparables
- Les articles blog mentionnant une ville lient vers le guide ville

#### Cocon 2 : Thematique investissement

```
Hub : /guide/top-rendement (ou /guide/investir-en-2026)
  |
  |-- /guide/villes-etudiantes
  |-- /guide/petites-villes
  |-- /blog/ou-investir-en-2026
  |-- /blog/meilleur-rendement-locatif-france
  |-- /glossaire/rendement-brut
  |-- /glossaire/cash-flow
```

#### Cocon 3 : Fiscal et reglementaire

```
Hub : /blog/categorie/fiscalite
  |
  |-- /blog/loi-pinel-2026-guide-complet
  |-- /blog/denormandie-villes-eligibles
  |-- /blog/lmnp-regime-fiscal-2026
  |-- /glossaire/pinel
  |-- /glossaire/lmnp
```

**Regle transversale :** chaque page doit avoir au minimum 3 liens internes entrants et 3 liens internes sortants. Les hubs doivent avoir 10+ liens entrants.

### 1.4 Pagination, canonicals, hreflang

#### Pagination (`/blog/page/[n]`)

```tsx
// src/app/blog/page/[page]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  const pageNum = parseInt(page);
  return {
    title: pageNum === 1
      ? "Blog immobilier investissement | tiili.io"
      : `Blog immobilier - Page ${pageNum} | tiili.io`,
    alternates: {
      canonical: pageNum === 1 ? "/blog" : `/blog/page/${pageNum}`,
    },
  };
}
```

- Page 1 : canonical vers `/blog` (pas `/blog/page/1`)
- Pages 2+ : canonical vers `/blog/page/N`
- Liens `prev`/`next` dans le `<head>` via `metadata.alternates`
- 20 articles par page maximum

#### Canonicals

| Situation | Canonical |
|-----------|-----------|
| `/guide/lyon` | `https://tiili.io/guide/lyon` |
| `/guide/lyon?tab=rendement` | `https://tiili.io/guide/lyon` (sans parametres) |
| `/blog/page/1` | `https://tiili.io/blog` |
| `/blog/categorie/actu-marche` | `https://tiili.io/blog/categorie/actu-marche` |

**Implementation :**
```tsx
// Dans chaque page.tsx
export async function generateMetadata(): Promise<Metadata> {
  return {
    alternates: {
      canonical: "https://tiili.io/guide/lyon",
    },
  };
}
```

#### Hreflang

Site monolingue francais pour l'instant. Preparer l'attribut pour extension future :

```tsx
// layout.tsx du blog
export const metadata: Metadata = {
  alternates: {
    languages: {
      "fr": "https://tiili.io",
      // Future : "en": "https://tiili.io/en"
    },
  },
};
```

`<html lang="fr">` est deja present dans le layout racine.

---

## 2. Optimisation on-page

### 2.1 Templates titre / meta description par type de page

#### Guide ville (`/guide/[city]`)

```
Titre : Investir a [Ville] en [Annee] : prix, rendement et guide complet | tiili
  - Longueur : 55-65 caracteres
  - Exemples :
    "Investir a Lyon en 2026 : prix, rendement et guide complet | tiili"
    "Investir a Bordeaux en 2026 : prix, rendement et guide complet | tiili"

Meta description : Faut-il investir a [Ville] ? Prix au m2 ([X] EUR), rendement brut ([Y]%), loyers, quartiers, fiscalite. Donnees [mois annee], simulation gratuite.
  - Longueur : 150-160 caracteres
  - Exemple :
    "Faut-il investir a Lyon ? Prix au m2 (4 200 EUR), rendement brut (5.1%), loyers, quartiers, fiscalite. Donnees mars 2026, simulation gratuite."
```

#### Page region (`/guide/region/[region]`)

```
Titre : Investissement locatif en [Region] : les meilleures villes [Annee] | tiili
Meta description : Ou investir en [Region] ? Comparatif des villes par rendement, prix et tension locative. Top [N] villes avec donnees [mois annee].
```

#### Article blog (`/blog/[slug]`)

```
Titre : [Titre article] | tiili
  - Le titre de l'article inclut deja le mot-cle principal
  - Exemples :
    "Prix immobilier Lyon : +3.2% au T1 2026, analyse complete | tiili"
    "Les 10 villes ou investir en 2026 pour un rendement > 6% | tiili"

Meta description : [Phrase accrocheuse avec chiffre cle]. Analyse [source] avec donnees exclusives tiili.io.
  - Exemple :
    "Lyon affiche +3.2% de hausse au T1 2026. Analyse DVF quartier par quartier avec simulation de rendement. Donnees exclusives tiili.io."
```

#### Index guide (`/guide`)

```
Titre : Guide investissement locatif par ville : prix, rendements, loyers | tiili
Meta description : Comparez [N]+ villes francaises pour votre investissement locatif. Prix au m2, rendement brut, tension locative. Donnees DVF et INSEE actualisees.
```

#### Page glossaire (`/glossaire/[term]`)

```
Titre : [Terme] : definition et calcul pour l'investissement locatif | tiili
Meta description : Qu'est-ce que le [terme] en immobilier ? Definition, formule de calcul, exemple chiffre et impact sur votre investissement locatif.
```

### 2.2 Structure Hn optimale

#### Guide ville — Hierarchie Hn

```html
<h1>Investir a Lyon en 2026 : guide complet investissement locatif</h1>
  <!-- Intro : 2-3 phrases assertives avec chiffres cles -->

  <h2>Marche immobilier a Lyon : prix au m2 et tendances</h2>
    <h3>Prix moyen par type de bien</h3>
    <h3>Evolution des prix sur 1 an et 5 ans</h3>
    <h3>Volume de transactions</h3>

  <h2>Marche locatif lyonnais : loyers et tension</h2>
    <h3>Loyers moyens par type de bien</h3>
    <h3>Tension locative et taux de vacance</h3>
    <h3>Encadrement des loyers a Lyon</h3>

  <h2>Rendement locatif a Lyon</h2>
    <h3>Rendement brut moyen</h3>
    <h3>Simulation : investir dans un T2 de 45m2 a Lyon</h3>
    <h3>Comparaison avec la moyenne nationale</h3>

  <h2>Location courte duree et Airbnb a Lyon</h2>

  <h2>Ou investir a Lyon : les meilleurs quartiers</h2>
    <h3>Croix-Rousse (4e)</h3>
    <h3>Part-Dieu / Villette (3e)</h3>
    <h3>Villeurbanne</h3>

  <h2>Qualite de vie et attractivite</h2>

  <h2>Transports et accessibilite</h2>

  <h2>Fiscalite et dispositifs a Lyon</h2>

  <h2>Risques naturels et reglementaires</h2>

  <h2>Projets urbains et perspectives</h2>

  <h2>Questions frequentes sur l'investissement a Lyon</h2>
    <!-- FAQ Schema-compatible -->
```

**Regles Hn :**
- Un seul `<h1>` par page, toujours le mot-cle principal + la ville + l'annee
- `<h2>` = sections principales (8-12 par guide ville, 4-6 par article blog)
- `<h3>` = sous-sections (2-4 par H2 maximum)
- Chaque Hn contient le nom de la ville ou le mot-cle secondaire
- Pas de saut de niveau (pas de H4 apres un H2)
- Le H1 ne doit jamais etre identique au `<title>`

#### Article blog — Hierarchie Hn

```html
<h1>Prix immobilier Lyon : +3.2% au T1 2026</h1>

  <h2>Les chiffres cles du marche lyonnais au T1 2026</h2>
  <h2>Analyse par quartier : ou les prix montent le plus</h2>
  <h2>Impact sur le rendement locatif</h2>
  <h2>Que faire en tant qu'investisseur ?</h2>
  <h2>Questions frequentes</h2>
```

### 2.3 Densite et placement des mots-cles

#### Mot-cle principal (ex: "investir a Lyon")

| Emplacement | Obligatoire | Exemple |
|-------------|-------------|---------|
| `<title>` | Oui, en debut | "Investir a Lyon en 2026..." |
| `<meta description>` | Oui | "Faut-il investir a Lyon ?" |
| `<h1>` | Oui | "Investir a Lyon en 2026 : guide complet" |
| Premier paragraphe (100 premiers mots) | Oui | "Lyon est l'une des villes les plus attractives pour investir en immobilier locatif..." |
| URL / slug | Oui | `/guide/lyon` |
| Alt d'au moins une image | Oui | "Prix immobilier Lyon evolution 2020-2026" |
| Au moins un `<h2>` | Oui | "Rendement locatif a Lyon" |
| Dernier paragraphe | Recommande | "Simulez votre investissement a Lyon sur tiili.io" |

#### Mots-cles secondaires et LSI

Pour un guide ville "Lyon" :
- Secondaires : "rendement locatif Lyon", "prix m2 Lyon", "loyer Lyon", "investissement immobilier Lyon"
- LSI (semantiquement lies) : "marche immobilier Rhone-Alpes", "T2 Lyon", "quartier Lyon investissement", "taxe fonciere Lyon"

**Densite cible :** 1-2% pour le mot-cle principal (soit 10-20 occurrences pour un article de 1000 mots). Pas de keyword stuffing : les variations naturelles et synonymes comptent.

#### Formulations optimales pour les donnees chiffrees

```
OUI (specifique, assertif) :
"Le prix moyen au m2 a Lyon est de 4 200 EUR en mars 2026, selon les donnees DVF."
"Le rendement brut moyen a Lyon atteint 5.1% pour un T2 meuble."

NON (vague, conditionnel) :
"Les prix a Lyon tournent autour de 4 000 EUR."
"Le rendement pourrait atteindre environ 5%."
```

### 2.4 Balises schema.org / JSON-LD par type de page

#### Guide ville — JSON-LD complet

```json
[
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Investir a Lyon en 2026 : prix, rendement et guide complet",
    "description": "Guide complet pour investir dans l'immobilier locatif a Lyon. Prix au m2, rendement brut, loyers, quartiers, fiscalite.",
    "image": "https://tiili.io/og/guide/lyon.png",
    "datePublished": "2026-01-15",
    "dateModified": "2026-03-17",
    "author": {
      "@type": "Organization",
      "name": "tiili.io",
      "url": "https://tiili.io"
    },
    "publisher": {
      "@type": "Organization",
      "name": "tiili.io",
      "url": "https://tiili.io",
      "logo": {
        "@type": "ImageObject",
        "url": "https://tiili.io/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://tiili.io/guide/lyon"
    },
    "about": {
      "@type": "Place",
      "name": "Lyon",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Lyon",
        "addressRegion": "Auvergne-Rhone-Alpes",
        "addressCountry": "FR"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 45.764,
        "longitude": 4.8357
      }
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Est-ce rentable d'investir a Lyon en 2026 ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Oui, Lyon offre un rendement brut moyen de 5.1% en mars 2026 pour un T2 meuble. Le marche locatif est tendu avec un taux de vacance de 2.3%, ce qui limite le risque de carence locative. Le prix moyen au m2 est de 4 200 EUR, en hausse de 3.2% sur un an."
        }
      },
      {
        "@type": "Question",
        "name": "Quel quartier choisir pour investir a Lyon ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Les quartiers les plus rentables a Lyon sont la Guillotiere (3e, rendement 5.8%), Villeurbanne-Gratte-Ciel (5.5%) et le 8e arrondissement (5.3%). Pour un investissement patrimonial, privilegiez le 6e arrondissement ou la Presqu'ile (rendement 3.5-4% mais forte plus-value potentielle)."
        }
      },
      {
        "@type": "Question",
        "name": "Quel type de bien privilegier pour investir a Lyon ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Le T2 meuble de 35-50m2 est le bien optimal a Lyon : forte demande locative (etudiants et jeunes actifs), loyer au m2 eleve (15.20 EUR/m2 meuble) et liquidite a la revente. Budget moyen : 150 000-210 000 EUR."
        }
      },
      {
        "@type": "Question",
        "name": "Lyon est-elle en zone tendue ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Oui, Lyon est classee en zone tendue (zone A). La ville applique l'encadrement des loyers depuis le 1er novembre 2021. Le loyer de reference est fixe par arrete prefectoral et varie selon le quartier, le type de bien et l'annee de construction."
        }
      }
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Guide investissement",
        "item": "https://tiili.io/guide"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Auvergne-Rhone-Alpes",
        "item": "https://tiili.io/guide/region/auvergne-rhone-alpes"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Lyon",
        "item": "https://tiili.io/guide/lyon"
      }
    ]
  }
]
```

#### Article blog — JSON-LD complet

```json
[
  {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": "Prix immobilier Lyon : +3.2% au T1 2026, analyse complete",
    "description": "Lyon affiche +3.2% de hausse au T1 2026. Analyse DVF quartier par quartier avec simulation de rendement.",
    "image": "https://tiili.io/og/blog/prix-immobilier-lyon-2026.png",
    "datePublished": "2026-03-15",
    "dateModified": "2026-03-15",
    "author": {
      "@type": "Organization",
      "name": "tiili.io",
      "url": "https://tiili.io"
    },
    "publisher": {
      "@type": "Organization",
      "name": "tiili.io",
      "url": "https://tiili.io",
      "logo": {
        "@type": "ImageObject",
        "url": "https://tiili.io/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://tiili.io/blog/prix-immobilier-lyon-2026"
    },
    "keywords": ["prix immobilier Lyon", "marche immobilier 2026", "investissement locatif Lyon"],
    "articleSection": "Actualite marche"
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "De combien ont augmente les prix a Lyon au T1 2026 ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Les prix immobiliers a Lyon ont augmente de 3.2% au premier trimestre 2026, selon les donnees DVF. Le prix moyen au m2 atteint desormais 4 200 EUR pour un appartement et 3 800 EUR pour une maison."
        }
      }
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Blog",
        "item": "https://tiili.io/blog"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Actualite marche",
        "item": "https://tiili.io/blog/categorie/actu-marche"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Prix immobilier Lyon : +3.2% au T1 2026",
        "item": "https://tiili.io/blog/prix-immobilier-lyon-2026"
      }
    ]
  }
]
```

#### Page index guide — JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Guide investissement locatif par ville",
  "description": "Comparez 200+ villes francaises pour votre investissement locatif.",
  "url": "https://tiili.io/guide",
  "publisher": {
    "@type": "Organization",
    "name": "tiili.io"
  },
  "mainEntity": {
    "@type": "ItemList",
    "numberOfItems": 200,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "url": "https://tiili.io/guide/lyon",
        "name": "Investir a Lyon"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "url": "https://tiili.io/guide/bordeaux",
        "name": "Investir a Bordeaux"
      }
    ]
  }
}
```

#### Page glossaire — JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "Rendement brut",
  "description": "Le rendement brut est le ratio entre les loyers annuels et le prix d'achat du bien, exprime en pourcentage. Formule : (loyer annuel / prix d'achat) x 100.",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "Glossaire immobilier tiili.io",
    "url": "https://tiili.io/glossaire"
  }
}
```

---

## 3. Strategie GEO (AI Optimization)

### 3.1 Principes fondamentaux GEO

Les moteurs generatifs (Gemini AI Overviews, ChatGPT Search, Perplexity) selectionnent les contenus a citer selon ces criteres :
1. **Autorite de la source** : donnees exclusives, citations verifiables
2. **Structure extractible** : phrases autonomes, listes, tableaux
3. **Fraicheur** : dates explicites, mentions de mises a jour
4. **Specificite** : chiffres precis > estimations floues
5. **Format reponse directe** : la reponse a la question dans les 2 premieres phrases

### 3.2 Structure du contenu pour extraction IA

#### Paragraphe d'accroche (snippet bait)

Chaque section importante commence par une phrase assertive complete qui repond directement a une question implicite. Cette phrase doit etre autonome (comprehensible hors contexte).

```
BON (extractible par une IA) :
"Le prix moyen au m2 a Lyon est de 4 200 EUR en mars 2026, en hausse de
3.2% sur un an (source : DVF / tiili.io). Ce niveau de prix place Lyon au
5e rang des grandes villes francaises, derriere Paris (10 500 EUR),
Nice (5 100 EUR), Bordeaux (4 600 EUR) et Aix-en-Provence (4 400 EUR)."

MAUVAIS (inexploitable par une IA) :
"Parlons maintenant des prix a Lyon. Comme vous le savez peut-etre,
les prix ont pas mal bouge ces derniers temps. Voyons les chiffres."
```

#### Structure en blocs extractibles

Chaque H2/H3 forme un bloc autonome que l'IA peut extraire independamment :

```markdown
## Rendement locatif a Lyon en 2026

Le rendement brut moyen a Lyon est de **5.1%** pour un appartement meuble
en mars 2026. Ce rendement varie selon le quartier et le type de bien :

| Quartier | Rendement brut | Prix moyen m2 | Loyer meuble m2 |
|----------|---------------|---------------|-----------------|
| Guillotiere (3e) | 5.8% | 3 600 EUR | 17.40 EUR |
| Villeurbanne | 5.5% | 3 200 EUR | 14.70 EUR |
| 8e arrondissement | 5.3% | 3 400 EUR | 15.00 EUR |
| 6e arrondissement | 3.8% | 5 800 EUR | 18.40 EUR |
| Presqu'ile (2e) | 3.5% | 6 200 EUR | 18.10 EUR |

*Source : donnees DVF et Observatoire des loyers, calculs tiili.io, mars 2026.*

**Simulation type** : un T2 de 45 m2 achete 189 000 EUR dans le 8e,
loue 675 EUR/mois en meuble, genere un rendement brut de 4.3% et un
cash-flow mensuel de +45 EUR apres credit sur 25 ans a 3.2%.
```

### 3.3 Formats de reponse privilegies

#### Listes a puces (pour les comparaisons et criteres)

```markdown
Les avantages d'investir a Lyon en 2026 :
- **Rendement brut moyen de 5.1%**, superieur a la moyenne nationale (4.2%)
- **Marche locatif tendu** : taux de vacance de 2.3%, demande locative forte
- **Bassin d'emploi dynamique** : 2e pole economique francais, +1.8% d'emploi/an
- **Reseau de transports dense** : 4 lignes de metro, gare TGV (Paris en 2h)
- **Population etudiante massive** : 175 000 etudiants, forte demande locative meublee
```

Les IA extraient tres bien les listes a puces. Chaque puce doit etre une phrase complete et autonome.

#### Tableaux de donnees (pour les comparaisons chiffrees)

```markdown
| Ville | Prix m2 | Rendement brut | Tension locative | Population |
|-------|---------|---------------|------------------|------------|
| Lyon | 4 200 EUR | 5.1% | Tendu | 522 000 |
| Bordeaux | 4 600 EUR | 4.5% | Tendu | 260 000 |
| Nantes | 3 800 EUR | 5.4% | Tendu | 320 000 |
| Toulouse | 3 500 EUR | 5.6% | Equilibre | 498 000 |
| Lille | 3 400 EUR | 5.8% | Tendu | 236 000 |
```

Les tableaux comparatifs multi-villes sont le format le plus cite par Perplexity et Gemini dans les reponses "ou investir".

#### Phrases de definition (pour les featured snippets)

Chaque terme technique doit avoir une phrase de definition au format :

```
"Le rendement brut est le ratio entre les loyers annuels bruts et le prix
d'achat total du bien immobilier, frais de notaire inclus. Il se calcule
avec la formule : (loyer annuel / prix total) x 100."
```

Format optimal : sujet + verbe "etre" + definition + formule/exemple.

### 3.4 Citation et attribution des sources

#### Format standard de citation

```
"[Donnee chiffree], selon les donnees [Source] ([periode])."

Exemples :
"Le prix median au m2 a Lyon est de 4 050 EUR, selon les donnees DVF (T4 2025)."
"La population de Lyon atteint 522 250 habitants, selon le recensement INSEE 2023."
"Le taux de vacance locative a Lyon est de 2.3%, selon l'Observatoire des loyers 2025."
```

#### Sources a citer et comment

| Source | Nom complet dans le texte | Ancre de lien |
|--------|--------------------------|---------------|
| DVF | "donnees DVF (Demandes de Valeurs Foncieres)" | data.gouv.fr |
| INSEE | "INSEE (recensement/enquete [nom])" | insee.fr |
| Observatoire des loyers | "Observatoire local des loyers" ou "ANIL" | observatoires-des-loyers.org |
| Georisques | "base Georisques du BRGM" | georisques.gouv.fr |
| ADEME | "base DPE de l'ADEME" | data.ademe.fr |
| tiili.io | "calculs tiili.io" | tiili.io |

**Regle critique :** chaque chiffre doit etre attribue a une source. Les chiffres sans source sont ignores par les IA.

#### Mention de fraicheur obligatoire

Chaque page et chaque section de donnees doit porter une date explicite :

```markdown
*Donnees mises a jour le 15 mars 2026. Sources : DVF, INSEE, Observatoire des loyers.*
```

Position : en dessous du H1 (date globale) + en dessous de chaque tableau de donnees (date specifique).

### 3.5 FAQ structuree : format et exemples

#### Regles de redaction des FAQ

1. **Question en langage naturel** : formuler exactement comme un utilisateur poserait la question a Google ou a un chatbot
2. **Reponse en 2-4 phrases** : la premiere phrase repond directement, les suivantes apportent contexte et chiffres
3. **Chiffres dans la reponse** : au moins un chiffre par reponse
4. **3-6 questions par page** : ni trop peu (pas de schema), ni trop (dilution)

#### Template FAQ pour guide ville

```markdown
## Questions frequentes sur l'investissement a [Ville]

### Est-ce rentable d'investir a [Ville] en [Annee] ?

[Ville] offre un rendement brut moyen de [X]% en [mois annee] pour un
appartement meuble. Le marche locatif est [tendu/equilibre/detendu] avec
un taux de vacance de [X]%. Le prix moyen au m2 de [X] EUR et la forte
demande locative en font [une ville attractive / un investissement a analyser
au cas par cas / un marche a aborder avec prudence] pour les investisseurs.

### Quel est le prix au m2 a [Ville] ?

Le prix moyen au m2 a [Ville] est de [X] EUR en [mois annee] (source : DVF).
Il varie de [X] EUR/m2 dans les quartiers les plus accessibles a [X] EUR/m2
dans les secteurs les plus prises. Sur un an, les prix ont [augmente/diminue]
de [X]%.

### Quel quartier choisir pour investir a [Ville] ?

Les quartiers les plus rentables a [Ville] sont [quartier 1] (rendement [X]%),
[quartier 2] ([X]%) et [quartier 3] ([X]%). Pour un investissement patrimonial,
les quartiers [quartier premium 1] et [quartier premium 2] offrent un
rendement plus faible ([X]%) mais une meilleure valorisation a long terme.

### Faut-il investir en meuble ou en nu a [Ville] ?

A [Ville], le meuble genere un loyer superieur de [X]% au nu (soit [X] EUR/m2
contre [X] EUR/m2). Le statut LMNP permet en plus de deduire l'amortissement
du bien. Pour un T2 de 45 m2, le gain annuel du meuble par rapport au nu
est d'environ [X] EUR. Le meuble est recommande si [condition].

### [Ville] est-elle eligible au dispositif Pinel ?

[Ville] est en zone [A/A bis/B1/B2/C] et [est/n'est pas] eligible au
dispositif Pinel en [annee]. [Si eligible : le plafond de loyer Pinel est
de X EUR/m2. | Si non eligible : les dispositifs alternatifs sont
Denormandie (si applicable) et le LMNP.]
```

#### Template FAQ pour article blog

```markdown
## Questions frequentes

### [Reformulation de la question implicite de l'article]

[Reponse directe avec chiffre]. [Contexte]. [Source].

### [Question d'approfondissement]

[Reponse avec actionable advice].
```

### 3.6 Donnees chiffrees : comment les formuler pour les IA

#### Regles de formatage des chiffres

| Type de donnee | Format | Exemple |
|----------------|--------|---------|
| Prix au m2 | Nombre + espace + "EUR/m2" | "4 200 EUR/m2" |
| Prix total | Nombre + espace + "EUR" | "189 000 EUR" |
| Pourcentage | Nombre + "%" | "5.1%" |
| Evolution | Signe + nombre + "%" | "+3.2%" ou "-1.5%" |
| Loyer mensuel | Nombre + espace + "EUR/mois" | "675 EUR/mois" |
| Population | Nombre + espace + "habitants" | "522 000 habitants" |
| Surface | Nombre + "m2" | "45 m2" |
| Duree | Nombre + unite | "25 ans", "2h", "15 minutes" |

#### Patterns de phrases optimaux pour les IA

**Pattern 1 — Chiffre en contexte :**
```
"Le [indicateur] a [lieu] est de [valeur] en [date] (source : [source])."
```
Exemple : "Le rendement brut moyen a Lyon est de 5.1% en mars 2026 (source : DVF/tiili.io)."

**Pattern 2 — Comparaison :**
```
"[Lieu A] affiche un [indicateur] de [valeur A], [superieur/inferieur] a [Lieu B] ([valeur B]) et a la moyenne nationale ([valeur ref])."
```
Exemple : "Lyon affiche un rendement brut de 5.1%, superieur a Bordeaux (4.5%) et a la moyenne nationale (4.2%)."

**Pattern 3 — Evolution :**
```
"Le [indicateur] a [lieu] a [augmente/diminue] de [variation] sur [periode], passant de [valeur initiale] a [valeur finale]."
```
Exemple : "Le prix au m2 a Lyon a augmente de 3.2% sur un an, passant de 4 070 EUR a 4 200 EUR."

**Pattern 4 — Classement :**
```
"[Lieu] se classe [rang]e [scope] pour [indicateur], avec [valeur]."
```
Exemple : "Lyon se classe 3e en France metropolitaine pour le rendement locatif en meuble, avec 5.1%."

**Anti-patterns (a eviter) :**
- "environ", "autour de", "a peu pres" → remplacer par le chiffre exact ou une fourchette "entre X et Y"
- "plusieurs milliers" → "4 200"
- "ces derniers temps" → "au T1 2026"
- "une hausse significative" → "+3.2%"

---

## 4. Strategie de liens

### 4.1 Maillage interne : regles automatiques

#### Regles implementees dans le generateur d'articles

Le generateur (Gemini) et le template de guide doivent inserer automatiquement ces liens :

**Regle 1 — Mention de ville = lien guide**
Toute mention d'une ville disposant d'un guide (`/guide/[city]`) genere un lien interne. Maximum 1 lien par ville par article (premiere occurrence uniquement).

```markdown
<!-- Input generateur -->
Lyon affiche un rendement de 5.1%, devant Bordeaux (4.5%).

<!-- Output avec liens -->
[Lyon](/guide/lyon) affiche un rendement de 5.1%, devant [Bordeaux](/guide/bordeaux) (4.5%).
```

**Regle 2 — Guide ville = liens villes voisines**
Chaque guide ville insere un bloc "Villes proches" avec 3-5 liens vers des villes du meme departement ou de la meme aire urbaine.

```markdown
## Investir autour de Lyon

- [Villeurbanne](/guide/villeurbanne) — 3 200 EUR/m2, rendement 5.5%
- [Saint-Etienne](/guide/saint-etienne) — 1 200 EUR/m2, rendement 8.2%
- [Grenoble](/guide/grenoble) — 2 400 EUR/m2, rendement 5.9%
- [Annecy](/guide/annecy) — 4 800 EUR/m2, rendement 3.8%
```

**Regle 3 — Articles recents de meme categorie**
Chaque article blog insere un bloc "Articles lies" avec 3 liens vers des articles de meme categorie ou meme ville.

**Regle 4 — CTA vers le simulateur**
Chaque page guide et article insere au moins un lien vers le simulateur :

```markdown
> **Simulez votre investissement a Lyon** : [creez une simulation gratuite](/property/new)
> sur tiili.io et calculez votre rendement, cash-flow et mensualites en 2 minutes.
```

**Regle 5 — Liens glossaire**
La premiere occurrence d'un terme technique lie vers sa definition :

```markdown
Le [rendement brut](/glossaire/rendement-brut) moyen a Lyon est de 5.1%.
```

#### Implementation technique

```typescript
// src/domains/blog/link-injector.ts

interface InternalLink {
  text: string;
  href: string;
  type: "city" | "article" | "glossary" | "simulator";
}

/**
 * Injecte les liens internes dans le contenu HTML genere.
 * Appele apres generation de l'article par Gemini.
 */
export function injectInternalLinks(
  html: string,
  availableCities: string[],
  recentArticles: { slug: string; title: string; category: string }[],
  glossaryTerms: string[]
): string {
  // 1. Detecter les noms de villes et inserer les liens /guide/[city]
  // 2. Ajouter le bloc "Articles lies" avant la FAQ
  // 3. Remplacer premiere occurrence de chaque terme glossaire par un lien
  // 4. Inserer le CTA simulateur
  return html;
}
```

#### Matrice de liens internes

| Page source | Liens obligatoires | Liens recommandes |
|-------------|-------------------|-------------------|
| Guide ville | Page region, 3-5 villes voisines, /guide index, CTA simulateur | Articles blog lies, glossaire |
| Article blog | Guide ville(s) mentionnee(s), CTA simulateur | Articles meme categorie, glossaire |
| Page region | Toutes les villes de la region, /guide index | Articles blog region |
| Page thematique | Top N villes du classement, /guide index | Articles lies |
| Page glossaire | Guides/articles utilisant ce terme | Autres termes lies |
| Index guide | Toutes les villes (tableau), pages regions | Derniers articles |
| Index blog | Articles recents, categories | Guides populaires |

### 4.2 Backlinks : strategie d'acquisition naturelle

#### Strategie Data PR (priorite haute)

Creer du contenu citationnellement riche que d'autres sites voudront sourcer :

1. **Classements annuels** :
   - "Top 20 des villes les plus rentables en 2026" → `/guide/top-rendement`
   - "Les villes ou les prix baissent le plus en 2026"
   - Publication en janvier (timing presse)

2. **Barometre trimestriel** :
   - "Barometre tiili : rendement locatif T1 2026 par ville"
   - Donnees exclusives DVF + calculs propres
   - Format PDF telechargeable + article
   - Envoyer aux journalistes immo (Capital, Le Figaro Immo, Les Echos, PAP)

3. **Etudes thematiques** :
   - "Airbnb vs location classique : le match ville par ville"
   - "Impact de la taxe fonciere sur le rendement : classement des villes"
   - Contenu original que les blogs immo et forums citeront

#### Strategie partenariats (priorite moyenne)

- **Blogs finances personnelles** : proposer des donnees exclusives pour guest posts
- **Chaines YouTube immo** : fournir les donnees pour leurs videos (credit + lien)
- **Forums** : repondre sur les forums immo (Devenir Rentier, Reddit r/vosfinances) avec liens pertinents
- **Comparateurs** : se faire referencer dans les comparatifs d'outils de simulation

#### Strategie Wikipedia / sources institutionnelles (priorite basse, long terme)

- Contribuer des donnees sourcer vers DVF/INSEE dans les articles Wikipedia des villes
- A terme, etre cite comme source de reference dans ces articles

### 4.3 Liens sortants : quelles sources credibiliser

#### Sources a lier systematiquement

Les liens sortants vers des sources fiables renforcent l'E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) :

| Source | URL | Usage |
|--------|-----|-------|
| DVF open data | `https://app.dvf.etalab.gouv.fr/` | Prix immobiliers |
| INSEE | `https://www.insee.fr/` | Donnees socio-economiques |
| Georisques | `https://www.georisques.gouv.fr/` | Risques naturels |
| ADEME DPE | `https://data.ademe.fr/` | Performance energetique |
| Service Public | `https://www.service-public.fr/` | Reglementation |
| BOFiP | `https://bofip.impots.gouv.fr/` | Fiscalite |
| ANIL | `https://www.anil.org/` | Loyers et reglementation |
| Legifrance | `https://www.legifrance.gouv.fr/` | Textes de loi |

**Regles liens sortants :**
- `rel="noopener"` sur tous les liens externes
- Ne pas utiliser `rel="nofollow"` sur les sources institutionnelles (on veut transferer de la confiance)
- `target="_blank"` sur tous les liens externes (ne pas perdre le visiteur)
- Maximum 3-5 liens sortants par article (hors sources institutionnelles)
- Jamais de lien vers un concurrent direct (SeLoger, MeilleursAgents, etc.)

---

## 5. SEO technique Next.js

### 5.1 robots.ts

```typescript
// src/app/robots.ts
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/login",
          "/register",
          "/profile",
          "/property/*/edit",
          "/share",
          "/dashboard",
          "/portfolio",
          "/compare",
          "/localities",
        ],
      },
      {
        // Autoriser explicitement les bots IA
        userAgent: ["GPTBot", "Google-Extended", "PerplexityBot", "ClaudeBot", "Applebot-Extended"],
        allow: ["/guide/", "/blog/", "/glossaire/"],
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: "https://tiili.io/sitemap.xml",
  };
}
```

**Points cles :**
- Les pages privees de l'app (dashboard, property edit, etc.) sont bloquees
- Les pages publiques du blog et des guides sont explicitement autorisees
- Les bots IA (GPTBot pour ChatGPT, Google-Extended pour Gemini, PerplexityBot) ont acces aux contenus editoriaux
- Ne pas bloquer `Applebot-Extended` : Apple utilise ce bot pour alimenter Apple Intelligence

### 5.2 sitemap.ts

```typescript
// src/app/sitemap.ts
import { MetadataRoute } from "next";
import { getAllCitySlugs } from "@/domains/locality/repository";
import { getAllArticleSlugs } from "@/domains/blog/repository";
import { getAllGlossaryTerms } from "@/domains/glossary/repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://tiili.io";

  // Pages statiques
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/guide`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/glossaire`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  // Guides villes (priorite haute)
  const cities = await getAllCitySlugs();
  const cityPages: MetadataRoute.Sitemap = cities.map((city) => ({
    url: `${baseUrl}/guide/${city.slug}`,
    lastModified: new Date(city.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  // Articles blog
  const articles = await getAllArticleSlugs();
  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}/blog/${article.slug}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Glossaire
  const terms = await getAllGlossaryTerms();
  const glossaryPages: MetadataRoute.Sitemap = terms.map((term) => ({
    url: `${baseUrl}/glossaire/${term.slug}`,
    lastModified: new Date(term.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticPages, ...cityPages, ...articlePages, ...glossaryPages];
}
```

**Pour les gros volumes (200+ villes) :** utiliser des sitemap indexes en splitant par type :

```typescript
// Alternative : sitemap indexes
// src/app/sitemap.ts → genere le sitemap index
// src/app/guide/sitemap.ts → sitemap des guides
// src/app/blog/sitemap.ts → sitemap des articles
```

### 5.3 ISR / Revalidation strategy

| Type de page | `revalidate` | Strategie |
|--------------|-------------|-----------|
| `/guide/[city]` | `86400` (24h) | ISR. Les donnees changent rarement. Revalidation forcee quand `locality_data` est mis a jour. |
| `/blog/[slug]` | `3600` (1h) le jour J, puis `false` (statique) | ISR le jour de publication pour corrections rapides, puis statique. |
| `/guide` (index) | `3600` (1h) | ISR. Change quand une nouvelle ville est ajoutee. |
| `/blog` (index) | `1800` (30min) | ISR. Change a chaque nouvel article. |
| `/guide/region/[region]` | `86400` (24h) | ISR. Change rarement. |
| `/guide/top-rendement` | `86400` (24h) | ISR. Recalcule quotidiennement. |
| `/glossaire/[term]` | `false` (statique) | Contenu statique. Rebuilt a chaque deploy. |

```typescript
// src/app/guide/[city]/page.tsx
export const revalidate = 86400; // 24h

// Pour forcer la revalidation quand les donnees changent :
// src/domains/locality/actions.ts
import { revalidatePath } from "next/cache";

export async function updateLocalityData(localityId: string, data: LocalityDataFields) {
  // ... save data ...
  const city = await getCityByLocalityId(localityId);
  if (city) {
    revalidatePath(`/guide/${city.slug}`);
    revalidatePath(`/guide`); // index aussi
  }
}
```

### 5.4 Core Web Vitals : budget performance

**Objectif : chaque page blog/guide < 20 Ko de HTML initial** (hors images lazy-loaded).

#### Budget par composant

| Composant | Budget max | Technique |
|-----------|-----------|-----------|
| HTML document | 15 Ko | Server Components, pas de JS client |
| CSS critique | 3 Ko | Tailwind purge, inline critical CSS |
| JavaScript initial | 0 Ko | Pages guide/blog = 100% Server Components |
| Images above-the-fold | 1 image < 50 Ko | WebP/AVIF, `next/image`, `priority` |
| Fonts | 0 requetes supplementaires | Systeme ou preload |
| JSON-LD | 2-3 Ko | Inline dans `<head>` |

#### Implementation zero-JS pour les pages editoriales

```typescript
// src/app/guide/[city]/page.tsx
// PAS de "use client" — tout est Server Component

import { Metadata } from "next";
import { getGuideData } from "@/domains/guide/service";
import GuideContent from "./GuideContent"; // Server Component aussi

export default async function GuidePage({ params }: Props) {
  const { city } = await params;
  const data = await getGuideData(city);

  return (
    <article>
      <GuideContent data={data} />
    </article>
  );
}
```

**Les pages guide et blog ne doivent charger AUCUN JavaScript** cote client. Les seuls composants interactifs autorises :
- Bouton "Simuler sur tiili.io" (simple lien `<a>`, pas de JS)
- Accordeon FAQ (CSS-only avec `<details>`/`<summary>`)
- Tableau triable (si necessaire, lazy-load le JS)

#### LCP (Largest Contentful Paint) < 1.5s

- Pas d'image hero en haut de page (le texte charge plus vite)
- Si image, utiliser `next/image` avec `priority` et `sizes`
- Preconnect aux domaines externes (`fonts.googleapis.com` deja present)

#### CLS (Cumulative Layout Shift) = 0

- Pas de publicites, pas de bannieres dynamiques
- Dimensions explicites sur toutes les images
- Fonts avec `font-display: swap` et fallback systeme

#### INP (Interaction to Next Paint) < 100ms

- Zero JS sur les pages editoriales = INP parfait
- Les seules interactions sont des navigations (liens)

### 5.5 Open Graph tags

```typescript
// src/app/guide/[city]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const data = await getGuideData(city);

  return {
    title: `Investir a ${data.cityName} en 2026 : prix, rendement et guide complet | tiili`,
    description: `Faut-il investir a ${data.cityName} ? Prix au m2 (${data.pricePerM2} EUR), rendement brut (${data.grossYield}%), loyers, quartiers, fiscalite. Donnees mars 2026.`,
    alternates: {
      canonical: `https://tiili.io/guide/${city}`,
    },
    openGraph: {
      type: "article",
      title: `Investir a ${data.cityName} en 2026 : guide complet`,
      description: `Prix au m2 : ${data.pricePerM2} EUR | Rendement brut : ${data.grossYield}% | Loyer meuble : ${data.rentPerM2} EUR/m2`,
      url: `https://tiili.io/guide/${city}`,
      siteName: "tiili.io",
      locale: "fr_FR",
      images: [
        {
          url: `https://tiili.io/og/guide/${city}.png`,
          width: 1200,
          height: 630,
          alt: `Investissement locatif a ${data.cityName} - tiili.io`,
        },
      ],
      publishedTime: data.publishedAt,
      modifiedTime: data.updatedAt,
      section: "Guide investissement",
      tags: [`investissement locatif ${data.cityName}`, `prix immobilier ${data.cityName}`, `rendement locatif`],
    },
    twitter: {
      card: "summary_large_image",
      title: `Investir a ${data.cityName} en 2026 | tiili`,
      description: `Prix m2 : ${data.pricePerM2} EUR | Rendement : ${data.grossYield}%`,
      images: [`https://tiili.io/og/guide/${city}.png`],
    },
  };
}
```

#### Generation dynamique des images OG

Utiliser `next/og` (ImageResponse) pour generer des images OG a la volee :

```typescript
// src/app/og/guide/[city]/route.tsx
import { ImageResponse } from "next/og";

export async function GET(request: Request, { params }: { params: { city: string } }) {
  const data = await getGuideData(params.city);

  return new ImageResponse(
    (
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px",
        width: "1200px",
        height: "630px",
        backgroundColor: "#f4f3ef",
        fontFamily: "DM Sans",
      }}>
        <div style={{ fontSize: 28, color: "#d97706", marginBottom: 16 }}>
          tiili.io — Guide investissement
        </div>
        <div style={{ fontSize: 52, fontWeight: 700, color: "#1a1a2e", marginBottom: 24 }}>
          Investir a {data.cityName}
        </div>
        <div style={{ display: "flex", gap: 40, fontSize: 28, color: "#4a4a6a" }}>
          <span>Prix m2 : {data.pricePerM2} EUR</span>
          <span>Rendement : {data.grossYield}%</span>
          <span>Loyer : {data.rentPerM2} EUR/m2</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

### 5.6 Structured data testing

#### Checklist de validation avant deploiement

| Test | Outil | URL |
|------|-------|-----|
| JSON-LD syntax | Google Rich Results Test | `https://search.google.com/test/rich-results` |
| JSON-LD semantique | Schema.org Validator | `https://validator.schema.org/` |
| OG tags | Facebook Sharing Debugger | `https://developers.facebook.com/tools/debug/` |
| Twitter Card | Twitter Card Validator | `https://cards-dev.twitter.com/validator` |
| Core Web Vitals | PageSpeed Insights | `https://pagespeed.web.dev/` |
| Mobile-friendly | Google Mobile-Friendly Test | `https://search.google.com/test/mobile-friendly` |
| Indexation | Google Search Console | `https://search.google.com/search-console` |

#### Tests automatises dans le pipeline CI

```typescript
// scripts/validate-structured-data.ts
// A lancer dans la CI apres build

import { JSDOM } from "jsdom";

async function validatePage(url: string) {
  const html = await fetch(url).then(r => r.text());
  const dom = new JSDOM(html);
  const scripts = dom.window.document.querySelectorAll('script[type="application/ld+json"]');

  const errors: string[] = [];

  if (scripts.length === 0) {
    errors.push(`${url}: pas de JSON-LD trouve`);
  }

  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || "");
      // Verifier les champs obligatoires
      if (data["@type"] === "Article" && !data.headline) {
        errors.push(`${url}: Article sans headline`);
      }
      if (data["@type"] === "FAQPage" && (!data.mainEntity || data.mainEntity.length === 0)) {
        errors.push(`${url}: FAQPage sans questions`);
      }
    } catch {
      errors.push(`${url}: JSON-LD invalide`);
    }
  }

  // Verifier meta description
  const metaDesc = dom.window.document.querySelector('meta[name="description"]');
  if (!metaDesc || !metaDesc.getAttribute("content")) {
    errors.push(`${url}: pas de meta description`);
  } else if (metaDesc.getAttribute("content")!.length > 160) {
    errors.push(`${url}: meta description trop longue (${metaDesc.getAttribute("content")!.length} chars)`);
  }

  // Verifier canonical
  const canonical = dom.window.document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    errors.push(`${url}: pas de canonical`);
  }

  // Verifier OG tags
  const ogTitle = dom.window.document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    errors.push(`${url}: pas de og:title`);
  }

  return errors;
}
```

---

## 6. Metriques et suivi

### 6.1 KPIs SEO

#### Acquisition (mensuel)

| KPI | Outil | Cible M+1 | Cible M+3 | Cible M+6 |
|-----|-------|-----------|-----------|-----------|
| Pages indexees | Google Search Console | 80 | 200 | 400+ |
| Impressions organiques | Google Search Console | 5 000 | 50 000 | 200 000 |
| Clics organiques | Google Search Console | 500 | 5 000 | 20 000 |
| CTR moyen | Google Search Console | 8% | 10% | 12% |
| Position moyenne (mots-cles cibles) | Google Search Console | 30 | 15 | 8 |
| Trafic organique total | Google Analytics 4 | 500 | 5 000 | 20 000 |

#### Positionnement (hebdomadaire)

| KPI | Outil | Objectif |
|-----|-------|----------|
| Mots-cles en top 10 | SE Ranking / Semrush | +10/semaine |
| Mots-cles en top 3 | SE Ranking / Semrush | +3/semaine |
| Featured snippets obtenus | Google Search Console | 1+/semaine |
| Rich results (FAQ, Article) | Google Search Console | 100% des pages |

#### Mots-cles cibles prioritaires

| Mot-cle | Volume mensuel | Difficulte | Type de page |
|---------|---------------|------------|--------------|
| "investir a [ville]" (x50 villes) | 200-2000 chacun | Moyenne | Guide ville |
| "rendement locatif [ville]" | 100-500 | Faible | Guide ville |
| "prix m2 [ville]" | 500-5000 | Elevee | Guide ville |
| "ou investir en immobilier 2026" | 5000 | Elevee | Page thematique |
| "meilleur rendement locatif" | 3000 | Elevee | /guide/top-rendement |
| "simulateur investissement locatif" | 2000 | Moyenne | CTA vers app |
| "investissement locatif [ville]" | 200-1000 | Moyenne | Guide ville |
| "loi pinel 2026" | 3000 | Elevee | Article blog |
| "lmnp 2026" | 2000 | Elevee | Article blog |
| "cash flow immobilier" | 800 | Faible | Glossaire + article |

#### Qualite technique (mensuel)

| KPI | Outil | Cible |
|-----|-------|-------|
| Core Web Vitals (LCP) | PageSpeed Insights | < 1.5s (100% pages) |
| Core Web Vitals (CLS) | PageSpeed Insights | 0 (100% pages) |
| Core Web Vitals (INP) | PageSpeed Insights | < 100ms (100% pages) |
| Score Performance Lighthouse | Lighthouse CI | > 95 |
| Erreurs d'exploration | Google Search Console | 0 |
| Pages avec erreurs structured data | Google Search Console | 0 |
| Couverture sitemap | Sitemap vs pages indexees | > 95% |
| Taille HTML moyenne | Build metrics | < 20 Ko |

### 6.2 KPIs GEO (citations IA)

#### Comment mesurer les citations IA

Les citations IA sont difficiles a suivre car les moteurs generatifs n'offrent pas encore d'analytics standardises. Voici les methodes disponibles :

**Methode 1 — Monitoring manuel regulier**

Poser les questions cles aux IA chaque semaine et noter si tiili.io est cite :

| Question test | IA testee | Cite tiili ? | Date |
|---------------|-----------|-------------|------|
| "Ou investir en immobilier en 2026 ?" | Gemini, ChatGPT, Perplexity | | |
| "Rendement locatif Lyon" | Gemini, ChatGPT, Perplexity | | |
| "Prix m2 [ville]" (x10 villes) | Gemini, ChatGPT, Perplexity | | |
| "Meilleure ville investissement locatif" | Gemini, ChatGPT, Perplexity | | |
| "Faut-il investir a [ville] ?" | Gemini, ChatGPT, Perplexity | | |

Frequence : 1 fois par semaine pour les 20 questions prioritaires.

**Methode 2 — Analyse du trafic referrer**

```typescript
// Dans Google Analytics 4, suivre les referrers :
// - chat.openai.com (ChatGPT)
// - gemini.google.com (Gemini)
// - perplexity.ai (Perplexity)
// - bing.com/chat (Copilot)

// Creer un segment GA4 "Trafic IA generative" :
// source matches regex: (chat\.openai|gemini\.google|perplexity\.ai|bing\.com/chat)
```

**Methode 3 — Google Search Console (AI Overviews)**

Google Search Console commence a reporter les impressions/clics provenant des AI Overviews. Surveiller :
- Filtre "Search Appearance" → "AI Overview"
- Impressions et CTR dans ce contexte

**Methode 4 — Outils specialises**

| Outil | Usage | Cout |
|-------|-------|------|
| Otterly.ai | Monitoring citations IA (Gemini, ChatGPT, Perplexity) | ~50 EUR/mois |
| Profound | Suivi GEO + positionnement dans les AI Overviews | Sur devis |
| HubSpot AI Search Grader | Audit ponctuel gratuit de visibilite IA | Gratuit |

#### Metriques GEO cibles

| KPI | Methode de mesure | Cible M+1 | Cible M+3 | Cible M+6 |
|-----|-------------------|-----------|-----------|-----------|
| Citations Perplexity | Monitoring manuel | 0 | 5 questions | 20 questions |
| Citations Gemini AI Overviews | Google Search Console | 0 | Premieres | Regulieres |
| Citations ChatGPT Search | Monitoring manuel | 0 | 2-3 questions | 10 questions |
| Trafic referrer IA | GA4 segment | 0 | 50/mois | 500/mois |
| Ratio pages avec JSON-LD FAQ | Audit technique | 100% guides | 100% | 100% |
| Ratio chiffres avec attribution | Audit editorial | 80% | 95% | 100% |

### 6.3 KPIs editoriaux

| KPI | Cible |
|-----|-------|
| Articles publies / semaine | 5-7 (1/jour) |
| Guides villes complets | 50 (M+1), 100 (M+3), 200 (M+6) |
| Taux de donnees P0 remplies par guide | 80% (M+1), 95% (M+3) |
| Liens internes par page (moyenne) | >= 5 |
| Pages orphelines (0 lien entrant) | 0 |
| FAQ par page guide | 4-6 |

### 6.4 Outils recommandes

#### Gratuits (indispensables)

| Outil | Usage |
|-------|-------|
| Google Search Console | Indexation, positionnement, erreurs, performance recherche |
| Google Analytics 4 | Trafic, comportement, conversions, referrers IA |
| PageSpeed Insights | Core Web Vitals, performance |
| Google Rich Results Test | Validation JSON-LD |
| Schema.org Validator | Validation semantique structured data |

#### Payants (recommandes)

| Outil | Usage | Cout estimatif |
|-------|-------|---------------|
| SE Ranking | Suivi positions, audit SEO, analyse concurrents | 40 EUR/mois |
| Screaming Frog (version gratuite suffisante au debut) | Crawl technique, audit maillage | Gratuit < 500 URLs |
| Otterly.ai | Monitoring citations IA | 50 EUR/mois |
| Ahrefs (optionnel) | Backlinks, analyse concurrentielle | 90 EUR/mois |

#### Internes (a developper)

| Script | Usage |
|--------|-------|
| `scripts/validate-structured-data.ts` | Validation JSON-LD en CI |
| `scripts/audit-internal-links.ts` | Detection pages orphelines, liens casses |
| `scripts/geo-monitoring.ts` | Requetes automatiques aux IA + log des citations |
| `scripts/seo-report.ts` | Rapport hebdo : nouvelles pages, donnees manquantes, positions |

---

## Annexe A — Checklist de lancement SEO

Avant la mise en ligne de la premiere page guide :

- [ ] `robots.ts` deploye et valide
- [ ] `sitemap.ts` deploye et accessible a `/sitemap.xml`
- [ ] Google Search Console configure et sitemap soumis
- [ ] Google Analytics 4 configure avec segment "Trafic IA"
- [ ] JSON-LD valide sur une page type via Rich Results Test
- [ ] OG tags valides via Facebook Sharing Debugger
- [ ] Core Web Vitals : LCP < 1.5s, CLS = 0, INP < 100ms
- [ ] Meta title et description uniques sur chaque page
- [ ] Canonical correct sur chaque page
- [ ] Breadcrumbs affiches et marques en BreadcrumbList
- [ ] FAQ presente sur chaque guide ville avec schema FAQPage
- [ ] Liens internes : chaque page a >= 3 liens entrants
- [ ] Pas de page orpheline (verifier avec Screaming Frog)
- [ ] `<html lang="fr">` present
- [ ] Favicon et apple-touch-icon presents
- [ ] 50 premieres villes avec donnees P0 completes

## Annexe B — Checklist de publication d'un article

A chaque nouvel article genere par la pipeline IA :

- [ ] Titre < 65 caracteres, contient mot-cle principal
- [ ] Meta description 150-160 caracteres, contient chiffre cle
- [ ] H1 unique, different du `<title>`
- [ ] Chiffres avec attribution source + date
- [ ] 3+ liens internes (dont au moins 1 vers un guide ville)
- [ ] CTA simulateur present
- [ ] FAQ avec 3-6 questions en langage naturel
- [ ] JSON-LD Article + FAQPage + BreadcrumbList
- [ ] OG tags avec image
- [ ] Slug sans accents ni caracteres speciaux
- [ ] Canonical pointe vers l'URL propre
- [ ] Donnees extraites injectees dans `locality_data` si applicable
