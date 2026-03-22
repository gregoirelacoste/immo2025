# Review Globale des Calculs — Immo2025

> Date : 2026-03-21 | Périmètre : `src/lib/calculations.ts` + composants consommateurs + scoring + loyer dégressif

---

## Résumé Exécutif

Le moteur de calcul est **globalement solide** : formules financières correctes, architecture fonctionnelle pure, bonne séparation server/client. Cependant, **12 problèmes** ont été identifiés, dont 4 critiques et 8 améliorations recommandées.

| Catégorie | OK | Warnings | Critiques |
|-----------|----|---------:|----------:|
| Frais de notaire & coût projet | ✅ | 0 | 0 |
| Prêt immobilier | ✅ | 1 | 0 |
| Rendements classiques | ✅ | 0 | 0 |
| Rendements Airbnb | ⚠️ | 1 | 1 |
| Fiscalité | ⚠️ | 2 | 1 |
| Plus-value & sortie | ⚠️ | 1 | 1 |
| Simulation overlay | ✅ | 1 | 0 |
| Score d'investissement | ⚠️ | 2 | 0 |
| Loyer dégressif | ✅ | 0 | 0 |
| Cohérence UI ↔ Calculs | ⚠️ | 0 | 2 |

---

## Itération 1 — Frais de Notaire & Coût Total du Projet

### Vérification

| Formule | Code (L8-9) | Attendu | Verdict |
|---------|------------|---------|---------|
| Frais notaire ancien | `price × 0.075` | 7.5% | ✅ Correct |
| Frais notaire neuf | `price × 0.025` | 2.5% | ✅ Correct |
| Override user | `notary_fees > 0 → user value` | Priorité user | ✅ Correct |

**Coût total du projet** (L103) :
```
total_project_cost = purchase_price + notary_fees + loan_fees + renovation_cost + furniture_cost
```
✅ **Correct** — inclut bien tous les postes de coûts.

**Cohérence `saveProperty` ↔ `calculateAll`** : les deux utilisent la même logique `notary_fees > 0 ? override : auto`. ✅

---

## Itération 2 — Prêt Immobilier

### Mensualité (L12-25)
```
M = P × r × (1+r)^n / ((1+r)^n - 1)
```
✅ Formule d'amortissement standard. Edge cases gérés (taux 0 → linéaire, montant ≤ 0 → 0).

### Assurance emprunteur (L113)
```
monthly_insurance = (loan_amount × insurance_rate%) / 12
```
✅ Calcul sur capital initial (méthode la plus courante en France).

### Coût total du crédit (L116-120)
```
total_loan_cost = (monthly_payment × months) - loan_amount + (monthly_insurance × months) + loan_fees
```
✅ Correct : intérêts totaux + assurance totale + frais de dossier.

### ⚠️ Warning : Assurance sur capital initial
L'assurance est calculée sur le capital initial constant. En réalité, certaines banques calculent sur le capital restant dû (CRD). C'est un choix simplifié acceptable mais pourrait surestimer le coût d'assurance de ~15-20%.

---

## Itération 3 — Rendements Location Classique

### Revenu annuel (L123)
```
annual_rent_income = monthly_rent × 12 × (1 - vacancy_rate / 100)
```
✅ La vacance est bien appliquée sur le brut.

### Charges annuelles (L128-133)
```
annual_charges = condo_charges + property_tax + PNO + maintenance + GLI
```
✅ Tous les postes d'exploitation sont inclus.

**Note :** `condo_charges` et `property_tax` sont des valeurs **annuelles** dans le code. Vérifié que l'UI les saisit bien en annuel.

### Rendement brut (L135-136)
```
gross_yield = (monthly_rent × 12) / total_project_cost × 100
```
✅ Correct — basé sur le loyer brut hors vacance, divisé par le coût total du projet.

### Rendement net (L138-141)
```
net_yield = (annual_rent_income - annual_charges) / total_project_cost × 100
```
✅ Correct — revenu net de charges et vacance.

### ✅ Vérifié : `condo_charges` est bien annuel partout

Après vérification approfondie :
- **UI** : label "Charges copro / an" — saisie annuelle ✅
- **Scraping/Prefill** : l'IA convertit en annuel (×12 si mensuel) ✅
- **Calculs** : additionné directement aux charges annuelles, divisé par 12 pour le cashflow mensuel ✅
- **Stockage** : valeur annuelle en base ✅

Pas de bug ×12. Le système est cohérent.

---

## Itération 4 — Rendements Airbnb

### Revenu annuel (L155-156)
```
airbnb_annual_income = price_per_night × 365 × occupancy_rate%
```
✅ Formule standard.

### Charges Airbnb (L158-162)
```
airbnb_annual_charges = airbnb_charges × 12 + property_tax + PNO + maintenance
```
✅ Pas de GLI en Airbnb — correct.

### 🔴 CRITIQUE : Charges copro manquantes en Airbnb

Les charges de copropriété (`condo_charges`) ne sont **pas incluses** dans `airbnb_annual_charges` (L158-162), alors qu'elles le sont pour la location classique.

Un bien en Airbnb paie aussi ses charges de copro. Leur absence **surestime le rendement net Airbnb**.

### ⚠️ Warning : Charges Airbnb vs charges classiques
`airbnb_charges` (saisie mensuelle × 12) est censé remplacer `condo_charges`, mais conceptuellement ce sont des choses différentes :
- `condo_charges` = charges de copropriété (incompressibles)
- `airbnb_charges` = frais d'exploitation Airbnb (ménage, linge, plateforme...)

Les deux devraient s'additionner, pas se substituer.

---

## Itération 5 — Impact Fiscal (Micro-BIC vs LMNP Réel)

### Micro-BIC (L41-42)
```
taxable = annual_rent × 50%
tax = taxable × TMI (30%)
```
✅ Abattement forfaitaire 50% correct pour LMNP micro-BIC.

### LMNP Réel (L45-52)

| Amortissement | Formule | Durée | Verdict |
|---------------|---------|-------|---------|
| Bien (hors terrain) | `purchase_price × 85% / 30` | 30 ans | ✅ |
| Travaux | `renovation_cost / 10` | 10 ans | ✅ |
| Mobilier | `furniture_cost / 7` | 7 ans | ✅ |

### 🔴 CRITIQUE : Charges déductibles incomplètes dans le réel (L50)

```typescript
charges_deductibles = condoCharges + propertyTax + monthlyInsurance * 12 + interests_year1
```

**Problèmes :**
1. **`condoCharges`** : même ambiguïté mensuel/annuel que l'itération 3
2. **`monthlyInsurance` est l'assurance emprunteur** (passée en paramètre), pas l'assurance PNO. L'assurance PNO n'est **pas déduite** dans le calcul fiscal.
3. **Manquent** dans les charges déductibles :
   - Assurance PNO (déductible en réel)
   - Frais de maintenance/entretien (déductible en réel)
   - GLI (déductible en réel)
   - Frais de comptabilité (souvent ~500-800€/an, pas modélisé)
4. **Intérêts** : seule l'année 1 est prise en compte (`loanAmount × rate`), ce qui surestime les intérêts déductibles les années suivantes (les intérêts diminuent dans un prêt amortissable).

### ⚠️ Warning : TMI figé à 30%

Le TMI est hardcodé à 30% dans `calculateAll` (L191). Or certains investisseurs sont à 11%, 41%, ou 45%. L'impact fiscal varie considérablement selon la tranche.

### ⚠️ Warning : Prélèvements sociaux non modélisés

En LMNP, les prélèvements sociaux (17.2%) s'appliquent sur le résultat imposable BIC, en plus de l'IR au TMI. Le calcul actuel ne taxe qu'au TMI, sous-estimant la charge fiscale réelle de ~17%.

---

## Itération 6 — Plus-Value & Simulation de Sortie

### Plus-value brute (L309-310)
```
PV = salePrice - purchasePrice - fraisAcquisition(7.5%)
```
✅ Les frais d'acquisition forfaitaires de 7.5% sont corrects (BOI-RFPI-PVI-20-10-20-10).

### Abattements IR (L328-333)
| Durée | Taux | Code | Légal | Verdict |
|-------|------|------|-------|---------|
| 0-5 ans | 0% | ✅ | 0% | ✅ |
| 6-21 ans | 6%/an | ✅ | 6%/an | ✅ |
| 22e année | via `(22-5)×6 = 102%` cappé? | ⚠️ | 4% | ⚠️ |
| 22+ ans | 100% | ✅ | 100% | ✅ |

### 🔴 CRITIQUE : Abattement IR 22e année

Le barème légal prévoit 6% par an de la 6e à la 21e année (= 96%) puis **4%** la 22e année (= 100% total). Le code fait :
```typescript
if (holdingYears >= 22) abattementIR = 100;
else if (holdingYears > 5) abattementIR = (holdingYears - 5) * 6;
```
Pour `holdingYears = 21` : `(21 - 5) × 6 = 96%` ✅
Pour `holdingYears >= 22` : `100%` ✅

**En fait c'est correct** car le code saute directement à 100% à 22 ans au lieu de calculer 96% + 4%. Le résultat est juste. ✅

### Abattements PS (L340-347)
| Durée | Code | Légal | Verdict |
|-------|------|-------|---------|
| 0-5 ans | 0% | 0% | ✅ |
| 6-21 ans | `(n-5) × 1.65%` | 1.65%/an | ✅ |
| 22e année | `1.65×16 + 1.6 = 28%` | 26.4% + 1.6% = 28% | ✅ |
| 23-30 ans | `28% + (n-22) × 9%` | 9%/an | ✅ |
| 30+ ans | 100% | 100% | ✅ |

✅ Barème PS correct.

### ⚠️ Warning : `calculateExitSimulation` utilise `simulation.loan_amount` (L383)

Le CRD est calculé avec `simulation.loan_amount` au lieu du `computedLoan` recalculé dans `calculateSimulation`. Si le `loan_amount` stocké dans la simulation est obsolète, le CRD sera faux.

---

## Itération 7 — Simulation Overlay

### Fusion property + simulation (L236-258)
✅ Architecture correcte :
- Paramètres de prêt → simulation
- `loan_amount` → recalculé (pas stocké)
- `monthly_rent` → simulation si > 0, sinon property
- `condo_charges` et `property_tax` → toujours property (données factuelles)

### ⚠️ Warning : Duplication du calcul de loan_amount

`calculateSimulation` (L234) recalcule :
```
computedLoan = price + notary + renovation + furniture - contribution
```
`SimulationEditor.tsx` (L45-51) duplique cette même logique localement. Si l'une change, l'autre peut diverger.

---

## Itération 8 — Score d'Investissement

### Architecture
Score sur 100 points :
- **Financial** : 50 pts (yield, cashflow, exit, prix/marché, loyer/marché)
- **Localité** : 35 pts (population, revenus, emploi, infra, risques)
- **Terrain** : 15 pts (note de visite)

### ⚠️ Warning : Biais des valeurs neutres

Quand les données sont manquantes, le score attribue des valeurs "neutres" (milieu de l'échelle). Un bien sans données de marché obtient quand même ~50/100, ce qui peut induire en erreur.

**Suggestion** : Afficher clairement "score partiel" ou "données insuffisantes" quand des catégories entières manquent.

### ⚠️ Warning : Hypothèses hardcodées dans le cashflow scoring

Le scoring du cashflow local utilise des hypothèses fixes (taux 3.5%, durée 20 ans, assurance 0.34%) qui ne correspondent pas forcément aux paramètres réels du bien évalué. Cela peut créer un décalage entre le score et la réalité du bien.

---

## Itération 9 — Loyer Dégressif & Élasticité

### Formule (loi de puissance)
```
L = k × S^α
rent_adjusted = base_rent_per_m2 × (surface / ref_surface)^(α - 1)
```
✅ **Formule correcte** : modélise bien la dégressivité du loyer/m² avec la surface.

### Paramètres
- `α` par défaut = 0.72 (empiriquement correct pour le marché français)
- `ref_surface` par défaut = 45 m² (T2 typique)

### Intégration
✅ Correctement intégré dans :
- `estimateMonthlyRent()` — estimation serveur
- `useRentAutoCalc` — recalcul client temps réel
- `applyMarketDataToPrefill()` — préremplissage
- `scoreRentVsMarket()` — scoring ajusté surface

---

## Itération 10 — Cohérence UI ↔ Calculs

### Composants sans problème (utilisent `calcs` directement) ✅
- `PropertyDetail.tsx` — KPIs hero
- `ResultsSummarySection.tsx` — résumé formulaire
- `FiscalSection.tsx` — impact fiscal
- `ExitSimulationPanel.tsx` — simulation de sortie
- `PropertyCard.tsx` — carte dashboard
- `PropertyTable.tsx` — tableau dashboard
- `CompareView.tsx` — comparaison
- `PortfolioView.tsx` — portefeuille

### 🔴 CRITIQUE : Recalculs locaux dans les modales de breakdown

**`CashflowBreakdownModal.tsx`** et **`YieldBreakdownModal.tsx`** recalculent localement les revenus, la vacance et les charges au lieu d'utiliser les valeurs de `PropertyCalculations`. Cela crée un risque de divergence :
- Les valeurs affichées dans le breakdown peuvent ne pas correspondre exactement au total affiché dans le KPI
- Si la logique de `calculateAll` évolue, les modales ne seront pas mises à jour

**`LoanCostBreakdownModal.tsx`** calcule localement la répartition intérêts/capital de l'année 1 avec une boucle d'amortissement — logique non exposée par `calculations.ts`.

### 🔴 CRITIQUE : Duplication de la logique de loan_amount

`SimulationEditor.tsx` (L45-51) duplique le calcul de `loan_amount` déjà présent dans `calculateSimulation`. Si la formule change dans l'un, l'autre divergera.

---

## Itération 11 — Synthèse & Préconisations

### Problèmes Critiques à Corriger

| # | Problème | Impact | Effort |
|---|----------|--------|--------|
| ~~1~~ | ~~Copro charges : ambiguïté mensuel/annuel~~ | ~~Vérifié : cohérent~~ | ~~N/A~~ |
| 2 | **Copro charges absentes du rendement Airbnb** | Rendement Airbnb surestimé | Faible |
| 3 | **Charges déductibles incomplètes en LMNP réel** | Impôt réel sous/surestimé | Moyen |
| 4 | **Modales breakdown recalculent localement** | Risque de divergence UI | Moyen |

### Améliorations Recommandées

| # | Amélioration | Priorité |
|---|-------------|----------|
| 5 | TMI paramétrable (pas hardcodé 30%) | Haute |
| 6 | Prélèvements sociaux 17.2% en LMNP | Haute |
| 7 | Assurance emprunteur : option CRD vs capital initial | Basse |
| 8 | CRD sortie : utiliser `computedLoan` au lieu de `simulation.loan_amount` | Moyenne |
| 9 | Centraliser le calcul de `loan_amount` (supprimer duplication SimulationEditor) | Moyenne |
| 10 | Score : afficher "données insuffisantes" si catégories vides | Moyenne |
| 11 | Score : utiliser les vrais paramètres du bien pour le cashflow local | Basse |
| 12 | Exposer la répartition intérêts/capital depuis `calculations.ts` | Basse |

### Préconisations de Refactoring

1. **Clarifier les unités** : Documenter dans les types si chaque champ est mensuel ou annuel. Convention suggérée :
   - Suffixe `_monthly` ou `_annual` explicite
   - Ou commentaire TSDoc sur chaque champ

2. **Extraire les constantes** : TMI, taux PS (17.2%), durées d'amortissement, dans un objet `FISCAL_CONSTANTS` exporté.

3. **Enrichir `PropertyCalculations`** : Ajouter des champs intermédiaires (`year1_interest`, `year1_capital`, `annual_depreciation`) pour que les modales n'aient pas à recalculer.

4. **Supprimer les recalculs dans les modales** : `CashflowBreakdownModal` et `YieldBreakdownModal` devraient recevoir un objet structuré avec le détail, pas recalculer.

5. **`calculateFiscalImpact`** : Accepter un objet `FiscalParams` au lieu de 10 paramètres positionnels. Plus maintenable et extensible.
