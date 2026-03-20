# Ameublement LMNP — Packs mobilier & amortissement dynamique

> Rédigé le 2026-03-20 — Commit `58a8bc8`

## Contexte

En LMNP au régime réel, le mobilier est amortissable comptablement sur 5 à 10 ans (7 ans en standard). Jusqu'ici, le moteur fiscal utilisait un forfait hardcodé de 5 000 € pour estimer l'amortissement mobilier. Ce forfait ne reflétait ni la taille du logement ni la gamme choisie.

Cette feature ajoute un onglet **Meublé** dans la fiche bien, permettant de sélectionner un pack d'ameublement adapté à la typologie du logement ou de saisir un montant personnalisé. Le coût mobilier alimente dynamiquement le calcul d'amortissement LMNP Réel.

## Architecture

```
┌─────────────────────┐     ┌───────────────────────┐
│  furniture-packs.ts │────▶│   AmenagementTab.tsx   │
│  (12 packs data)    │     │   (UI sélection pack)  │
└─────────────────────┘     └──────────┬────────────┘
                                       │ saveFurnitureCost()
                                       ▼
                            ┌───────────────────────┐
                            │  actions.ts            │
                            │  (server action)       │
                            └──────────┬────────────┘
                                       │ updateFurnitureCostRepo()
                                       ▼
                            ┌───────────────────────┐
                            │  repository.ts         │
                            │  (SQL UPDATE)          │
                            └───────────────────────┘

  Property.furniture_cost ───▶ calculations.ts ───▶ amort_meubles = cost / 7
```

### Flux utilisateur

1. L'utilisateur ouvre l'onglet **Meublé** sur une fiche bien
2. La surface du bien détermine automatiquement la **typologie** (Studio / T2 / T3 / T4+)
3. 3 packs (Éco / Standard / Premium) sont proposés avec prix et détail des items
4. Un clic sélectionne le pack → persistance immédiate via server action
5. Alternative : saisie d'un montant personnalisé
6. L'aperçu fiscal montre en temps réel l'amortissement/an et la comparaison vs forfait 5 000 €

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/domains/property/furniture-packs.ts` | Registre des 12 packs (4 typologies × 3 niveaux), types, helpers (`suggestTypology`, `getPacksForTypology`, `groupItemsByCategory`) |
| `src/components/property/detail/AmenagementTab.tsx` | Composant UI : cartes de packs, items dépliables par catégorie, montant custom, aperçu fiscal |
| `src/domains/property/types.ts` | Ajout champ `furniture_cost: number` sur `Property` |
| `src/domains/property/repository.ts` | CRUD + `updateFurnitureCost(id, userId, cost)` dédié |
| `src/domains/property/actions.ts` | Server action `saveFurnitureCost(propertyId, cost)` |
| `src/lib/calculations.ts` | `calculateFiscalImpact()` accepte `furnitureCost` (param optionnel, défaut 5000 €) |
| `src/infrastructure/database/client.ts` | Migration v9 : `ALTER TABLE properties ADD COLUMN furniture_cost REAL DEFAULT 0` |
| `src/components/property/detail/TabNavigation.tsx` | Nouvel onglet "Meublé" |
| `src/components/property/detail/PropertyDetail.tsx` | Rendu conditionnel `<AmenagementTab />` |

## Données des packs

### Grille de prix

| Typologie | Surface | Éco | Standard | Premium |
|-----------|---------|-----|----------|---------|
| Studio    | ≤ 25 m² | 1 800 € | 3 000 € | 5 000 € |
| T2        | 26–45 m² | 2 500 € | 4 000 € | 6 500 € |
| T3        | 46–70 m² | 3 500 € | 5 500 € | 8 500 € |
| T4+       | > 70 m² | 4 500 € | 7 000 € | 11 000 € |

### Catégories d'items

Chaque pack détaille ses éléments par catégorie : `chambre`, `salon`, `cuisine`, `sdb`, `divers`. Les items couvrent les éléments obligatoires du décret n°2015-981 (literie, occultants, plaques, four/micro-ondes, réfrigérateur, vaisselle, ustensiles, table, chaises, rangements, luminaires, ménage).

## Impact sur le moteur de calcul

```typescript
// Avant (forfait hardcodé)
const amort_meubles = 5000 / 7;

// Après (dynamique)
const effectiveFurnitureCost = furnitureCost > 0 ? furnitureCost : 5000;
const amort_meubles = effectiveFurnitureCost / 7;
```

- **`furniture_cost = 0`** → fallback sur le forfait 5 000 € (rétrocompatible)
- **`furniture_cost > 0`** → utilise le coût réel sélectionné
- L'amortissement impacte le `resultat_reel` LMNP et donc `lmnp_reel_tax` et `net_net_income_reel`
- Les simulations héritent automatiquement du `furniture_cost` de la propriété via le merge dans `calculateSimulation()`

## Décisions techniques

| Décision | Justification |
|----------|--------------|
| Champ `furniture_cost` sur `Property` (pas sur `Simulation`) | Le mobilier est une dépense factuelle liée au bien, pas un paramètre de simulation |
| Fallback 5 000 € quand `furniture_cost = 0` | Rétrocompatibilité — les biens existants sans pack gardent le même comportement fiscal |
| Server action dédiée `updateFurnitureCost` | Mise à jour atomique sans toucher aux autres champs du bien (pas besoin de repasser par le form complet) |
| Amortissement fixé à 7 ans | Durée standard comptable pour le mobilier en LMNP (fourchette légale 5-10 ans) |
| Suggestion de typologie automatique via surface | Évite un champ supplémentaire à renseigner ; la surface est déjà connue |
| Prix TTC des packs | Cohérent avec le reste de l'app qui manipule des montants TTC |
