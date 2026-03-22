# Guides quartier — enrichissement via recherche IA

> Ajouté le 2026-03-22

## Contexte

La feature "Recherche quartier" (Gemini + Google Search grounding) stocke des données qualitatives dans `locality_qualitative` au niveau quartier. Les guides ville (`/guide/[city]`) utilisent `LocalityDataView` + `resolveLocalityData` mais ne descendent pas vers les quartiers enfants. Il faut connecter les deux.

## Options envisagées

### A) Stocker aussi au niveau ville

Quand on recherche un quartier, dupliquer/agréger les données qualitatives au niveau ville. Les guides ville s'enrichissent automatiquement via le resolver existant.

- **Pro** : zéro changement côté guides, le resolver trouve les données directement
- **Con** : données qualitatives d'un quartier spécifique présentées comme données ville (perte de granularité)

### B) Créer des pages guide par quartier

Nouvelles routes `/guide/[city]/[quartier]` avec des guides dédiés par quartier.

- **Pro** : SEO ciblé ("investir quartier Croix-Rousse Lyon"), données précises au bon niveau
- **Con** : plus de pages à générer, besoin de `generateStaticParams` pour les quartiers, UX navigation

### C) Les deux (recommandé)

1. Page guide ville : section "Quartiers analysés" listant les quartiers avec données qualitatives, lien vers chaque sous-page
2. Pages guide quartier : données qualitatives complètes + fallback vers données ville pour le quantitatif (prix, loyers, démographie…)
3. La recherche quartier depuis l'onglet Localité alimente directement ces guides sans process supplémentaire

## Architecture cible (option C)

```
/guide/lyon-69123                    → guide ville (existant)
  └─ Section "Quartiers analysés"    → liste des quartiers avec vibe + lien
/guide/lyon-69123/centre-ville       → guide quartier (nouveau)
  └─ Données qualitatives complètes  → locality_qualitative
  └─ Données quantitatives           → fallback ville via resolver
```

### Fichiers à créer/modifier

| Fichier | Changement |
|---------|------------|
| `src/app/guide/[city]/[quartier]/page.tsx` | **Nouveau** — page guide quartier avec `resolveLocalityData` depuis le quartier |
| `src/app/guide/[city]/page.tsx` | Ajouter section "Quartiers analysés" — liste des quartiers enfants avec `neighborhood_vibe` |
| `src/domains/locality/repository.ts` | Ajouter `getQuartiersForCity(villeId)` — liste des quartiers d'une ville avec données qualitatives |

### Flow de données

```
Onglet Localité (bien) → "Recherche quartier"
  → searchQuartier() → locality_qualitative (quartier)
  → Aucun process supplémentaire

Guide ville /guide/[city]
  → getAllLocalities(type=ville)
  → getQuartiersForCity(villeId)
  → Si quartiers avec neighborhood_vibe → afficher section "Quartiers"

Guide quartier /guide/[city]/[quartier]
  → resolveLocalityData(city, postalCode, undefined, undefined, neighborhood)
  → Quartier qualitative + ville quantitative via fallback
  → LocalityDataView (déjà prêt, affiche les neighborhood_* fields)
```

### SEO

- Title : "Investir quartier {quartier} à {ville} en {year}"
- JSON-LD : Article + FAQPage (questions sur le quartier)
- Canonical : `/guide/{city-slug}/{quartier-slug}`
- Internal linking : guide ville ↔ guide quartier

## Prérequis

- [x] Recherche quartier fonctionnelle (Gemini + grounding)
- [x] `locality_qualitative` table + resolver support
- [x] `LocalityDataView` affiche les données qualitatives
- [ ] `getQuartiersForCity()` dans repository
- [ ] Page guide quartier
- [ ] Section quartiers dans guide ville

## Priorité

Moyenne — dépend du volume de recherches quartier effectuées. Plus il y a de quartiers enrichis, plus les guides sont utiles. Peut être implémenté incrémentalement : d'abord la section dans le guide ville, puis les sous-pages.
