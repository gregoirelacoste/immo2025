# Plan : Ratio de valorisation du bien — Évolution des prix sur X années

## Contexte

Actuellement, l'hypothèse de revente repose sur un `annual_appreciation` unique (1.5% par défaut ou trend DVF 1 an). C'est fragile et ne reflète ni l'historique long terme du marché local, ni les travaux/améliorations faits sur le bien.

**Objectif** : calculer combien un bien gagne ou perd en % sur X années, en combinant :
1. La tendance marché locale (CAGR DVF 10 ans)
2. La valorisation propre au bien (travaux, équipements, quartier, décotes)

---

## Phase 1 — DVF Multi-Années : CAGR 10 ans

**But** : remplacer le trend 1 an par un CAGR calculé sur 10 ans de données DVF.

### Modifications existantes

| Fichier | Changement |
|---------|-----------|
| `src/domains/market/dvf-client.ts` | Passer `minYear` de `currentYear - 2` à `currentYear - 10` dans `fetchDvfMutations()`. Augmenter le timeout si nécessaire. |
| `src/domains/market/dvf-client.ts` | Nouvelle fonction `computeCagr(mutations)` : grouper par année → prix moyen/m² par an → CAGR = `(prix_récent / prix_ancien)^(1/nb_années) - 1` |
| `src/domains/locality/types.ts` | Ajouter champ `price_cagr_10y_pct?: number \| null` dans `LocalityDataFields` |
| `src/infrastructure/database/client.ts` | Migration : ajouter colonne `price_cagr_10y_pct` à `locality_prices` |
| `src/domains/simulation/system.ts` | Modifier le default : `annual_appreciation: loc.price_cagr_10y_pct ?? loc.price_trend_pct ?? 1.5` |

### Nouveautés

| Fichier | Ajout |
|---------|-------|
| `src/domains/market/dvf-trend.ts` | Fonction `fetchDvfTrend(city)` → retourne `{ cagrPct, yearlyPrices: { year, avgPricePerM2, count }[], periodYears }` |

### Points d'attention
- L'API cquest peut ne pas avoir 10 ans de données pour toutes les communes → fallback sur la période disponible
- Filtrer les outliers (P5-P95) par année pour éviter les biais
- Minimum 3 années avec des données pour calculer un CAGR fiable, sinon fallback sur `price_trend_pct`

---

## Phase 2 — Table de valorisation du bien

**But** : permettre à l'utilisateur de saisir les travaux, équipements, qualité du quartier et décotes qui impactent la valeur du bien.

### Nouvelle table DB

```sql
CREATE TABLE IF NOT EXISTS property_valorisations (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  category TEXT NOT NULL,          -- 'travaux' | 'equipement' | 'quartier' | 'decote'
  label TEXT NOT NULL,             -- ex: "Rénovation cuisine", "Climatisation"
  cost INTEGER DEFAULT 0,         -- coût des travaux/équipements en €
  recovery_rate INTEGER DEFAULT 70, -- % du coût récupéré en valeur (ex: 70%)
  impact_pct REAL DEFAULT 0,      -- impact direct en % sur la valeur (pour quartier/décote)
  date_done TEXT,                  -- date de réalisation (optionnel)
  notes TEXT,                      -- commentaire libre
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

**Logique par catégorie :**

| Catégorie | Saisie utilisateur | Impact sur la valeur |
|-----------|-------------------|---------------------|
| `travaux` | Coût + taux de récupération (défaut 70%) | `+coût × taux_récup` sur la valeur de base |
| `equipement` | Coût + taux de récupération (défaut 60%) | `+coût × taux_récup` sur la valeur de base |
| `quartier` | Score impact en % (-10% à +10%) | Multiplicateur sur l'appréciation annuelle |
| `decote` | Impact en % (négatif) | Réduit la valeur de base (vétusté, DPE, conformité) |

### Nouveaux fichiers

| Fichier | Contenu |
|---------|---------|
| `src/domains/valorisation/types.ts` | Type `PropertyValorisation`, catégories, defaults |
| `src/domains/valorisation/repository.ts` | CRUD DB : `getValorisations(propertyId)`, `saveValorisation()`, `deleteValorisation()` |
| `src/lib/actions.ts` | Nouvelles server actions : `saveValorisation()`, `removeValorisation()` |

---

## Phase 3 — Calcul de sortie enrichi

**But** : intégrer les valorisations dans `calculateExitSimulation` pour un prix de revente réaliste.

### Formule proposée

```
Valeur de base améliorée = prix_achat
  + Σ(travaux.coût × travaux.taux_récup / 100)
  + Σ(équipements.coût × équipements.taux_récup / 100)
  + prix_achat × Σ(décotes.impact_pct / 100)

Taux effectif = CAGR_marché + Σ(quartier.impact_pct / 100) / nb_facteurs_quartier

Prix de revente = valeur_améliorée × (1 + taux_effectif)^années
```

### Modifications

| Fichier | Changement |
|---------|-----------|
| `src/lib/calculations.ts` | `calculateExitSimulation()` : ajouter paramètre `valorisations: PropertyValorisation[]`, calculer `valeur_améliorée` et `taux_effectif` |
| `src/domains/property/types.ts` | Enrichir `ExitSimulation` avec `baseValueAdjustment`, `appreciationAdjustment`, `adjustedBaseValue` |
| `src/domains/simulation/types.ts` | Pas de changement — `annual_appreciation` reste le taux marché, les ajustements quartier s'ajoutent au calcul |

---

## Phase 4 — UI

### Modifications existantes

| Composant | Changement |
|-----------|-----------|
| `ExitSimulationPanel.tsx` | Afficher la décomposition : valeur de base → +valorisations → ×appréciation → prix de revente. Montrer le delta vs sans valorisation. |
| `SimulationEditor.tsx` | Afficher la source du taux d'appréciation : "CAGR DVF 10 ans" / "Trend 1 an" / "Défaut 1.5%". Badge informatif. |
| `DvfHistoryPanel.tsx` | Ajouter un mini-graphique ou résumé de l'évolution année par année si les données sont disponibles. |

### Nouveaux composants

| Composant | Contenu |
|-----------|---------|
| `src/components/property/detail/ValorisationEditor.tsx` | Liste des valorisations + formulaire d'ajout. 4 onglets (Travaux / Équipements / Quartier / Décotes). Chaque ligne : label, coût ou %, taux de récupération, date, bouton supprimer. Résumé en bas : impact total sur la valeur. |

---

## Ordre d'implémentation recommandé

1. **Phase 1** (DVF CAGR) — indépendant, améliore immédiatement le default `annual_appreciation`
2. **Phase 2** (Table valorisations) — DB + types + CRUD, sans impact sur l'existant
3. **Phase 3** (Calcul enrichi) — branche les valorisations dans le calcul de sortie
4. **Phase 4** (UI) — peut commencer en parallèle de la phase 3 pour le formulaire de saisie

---

## Ce qu'on ne touche PAS

- `calculateAll()` / rendements / cashflow → pas impactés (la valorisation n'affecte que la revente)
- Le scoring existant → pas impacté
- Le scraping → pas impacté
- Les simulations manuelles → elles héritent du CAGR comme default mais restent éditables
