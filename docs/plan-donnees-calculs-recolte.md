# Plan : Formaliser le modèle "Données × Calculs × Modes de récolte"

## Contexte

L'app Immo2025 a 3 couches orthogonales qui existent déjà implicitement mais ne sont pas formalisées :
1. **Données** — les ~65 champs de la fiche Property
2. **Calculs** — les métriques dérivées (cash flow, rendement net, score) via `calculateAll()`
3. **Modes de récolte** — les différentes façons de remplir la fiche (scraping, agent immo, visite, IA, recherche documentaire)

**Problème :** Aujourd'hui, rien ne relie formellement un champ à ses calculs dépendants ni aux modes de récolte capables de le fournir. L'utilisateur ne sait pas ce qu'il lui manque pour prendre une bonne décision, ni comment l'obtenir.

**Objectif :** Formaliser ce modèle pour que l'app puisse dire : "Il te manque la taxe foncière → demande-la à l'agent immo" et afficher un taux de complétion + un niveau de confiance par donnée. L'utilisateur doit pouvoir remplir n'importe quelle donnée directement depuis le panneau de complétion, sans passer par un mode spécifique (visite, édition…).

---

## Principe clé : Catégories de décision d'investissement

Les champs ne sont **pas** groupés par importance abstraite mais par **axe de décision** — ce qui permet à l'utilisateur de voir d'un coup d'œil quelle dimension de son analyse est incomplète.

```ts
type FieldCategory = "achat" | "travaux" | "revenus" | "charges" | "credit"
```

| Catégorie | Ce qu'elle détermine | Exemples de champs |
|-----------|---------------------|-------------------|
| **Achat** | Le prix au m² réel | purchase_price, surface, notary_fees, agency_fees, prix DVF |
| **Travaux** | Le coût de remise en état | renovation_cost, dpe_rating, travaux copro |
| **Revenus** | Le loyer au m² atteignable | monthly_rent, loyer marché, airbnb_price, vacancy_rate |
| **Charges** | Les dépenses récurrentes | property_tax, condo_charges, insurance, management_fees |
| **Crédit** | Le coût du financement | personal_contribution, loan_amount, interest_rate, loan_duration |

---

## Phase 1 : Registre de champs + Complétion (fondation)

### 1a. Créer `src/domains/property/field-registry.ts`

Registre central qui mappe chaque champ Property pertinent à :

```ts
interface FieldMetadata {
  key: keyof Property           // ex: "property_tax"
  label: string                 // ex: "Taxe foncière" (FR)
  category: FieldCategory       // ex: "charges"
  importance: "critical" | "important" | "nice-to-have"
  inputType: "currency" | "number" | "percent" | "select" | "text"
  suffix?: string               // ex: "€/mois", "%", "€"
  calculations: string[]        // ex: ["net_yield", "cashflow", "annual_charges"]
  collectModes: CollectMode[]   // ex: ["scraping", "agent_immo", "visite"]
  agentQuestion?: string        // ex: "Quel est le montant exact de la taxe foncière ?"
  placeholder?: string          // ex: "1 200"
}

type FieldCategory = "achat" | "travaux" | "revenus" | "charges" | "credit"
type CollectMode = "scraping" | "market_data" | "agent_immo" | "visite" | "estimation_ia" | "text" | "photo" | "manual"
```

~25 champs à mapper (les champs qui alimentent les calculs) :

**Achat :**
- `purchase_price` (critical) — Prix d'achat
- `surface` (critical) — Surface
- `notary_fees` (important) — Frais de notaire
- `agency_fees` (nice-to-have) — Frais d'agence

**Travaux :**
- `renovation_cost` (important) — Coût rénovation
- `dpe_rating` (nice-to-have) — Classement DPE

**Revenus :**
- `monthly_rent` (critical) — Loyer mensuel
- `vacancy_rate` (important) — Taux de vacance
- `airbnb_price_per_night` (nice-to-have) — Prix nuit Airbnb
- `airbnb_occupancy_rate` (nice-to-have) — Taux occupation Airbnb

**Charges :**
- `property_tax` (important) — Taxe foncière
- `condo_charges` (important) — Charges de copropriété
- `insurance_pno` (nice-to-have) — Assurance PNO
- `management_fees_percent` (nice-to-have) — Frais de gestion

**Crédit :**
- `personal_contribution` (important) — Apport personnel
- `loan_amount` (critical) — Montant emprunt
- `interest_rate` (critical) — Taux d'intérêt
- `loan_duration` (critical) — Durée du prêt
- `insurance_rate` (nice-to-have) — Taux assurance emprunteur

### 1b. Créer `src/domains/property/completion.ts`

```ts
interface CategoryCompletion {
  category: FieldCategory
  label: string                  // "Achat", "Travaux", etc.
  icon: string                   // emoji ou nom d'icône
  filled: number                 // nb champs remplis
  total: number                  // nb champs dans la catégorie
  percent: number                // filled/total * 100
  missingFields: FieldMetadata[] // champs manquants triés par importance
}

interface CompletionSummary {
  globalPercent: number               // pondéré : critical=3, important=2, nice-to-have=1
  categories: CategoryCompletion[]    // complétion par catégorie
  totalMissing: number                // nb total de champs manquants
}

function getCompletionSummary(property: Property): CompletionSummary
```

### 1c. Ajouter `confidence` au prefill — modifier `src/domains/property/prefill.ts`

Étendre `PrefillRecord` :
```ts
{ source: string, value: any, confidence?: "estimated" | "declared" | "verified" }
```

Mapper les sources existantes :
- Scraping → `"declared"`
- Market data / estimation DVF → `"estimated"`
- Collage texte (IA) → `"declared"`
- Photo (IA Vision) → `"estimated"`
- Visite → `"verified"`
- Agent immo → `"declared"`
- Saisie manuelle (depuis CompletionPanel) → `"declared"`

### 1d. Composants UI — Panneau de complétion avec tabs par catégorie

#### Architecture UI

Le panneau de complétion est un **nouvel onglet "Données"** dans les tabs existants de la page détail (à côté de Bien, Simulation, Score, Visite). Il utilise des **sous-tabs horizontaux** par catégorie d'investissement.

```
┌─────────────────────────────────────────────────┐
│  Bien │ Simulation │ Score │ ★ Données │ Visite │   ← tabs principaux
├─────────────────────────────────────────────────┤
│                                                 │
│  Complétion globale : 68%  ████████░░░░         │
│                                                 │
│  ┌────────┬─────────┬─────────┬────────┬──────┐ │
│  │Achat   │Travaux  │Revenus  │Charges │Crédit│ │   ← sous-tabs catégorie
│  │ 4/4 ✓  │ 0/2     │ 2/4     │ 1/4    │ 4/5  │ │      avec badge x/y
│  └────────┴─────────┴─────────┴────────┴──────┘ │
│                                                 │
│  ── Charges (1/4 renseigné) ──────────────────  │
│                                                 │
│  ✓ Charges copro         120 €/mois  ○ ambre   │   ← rempli, lecture seule
│                                                 │
│  ┌ Taxe foncière ─────────────────────────────┐ │
│  │ [________1 200__] €/an        [Enregistrer]│ │   ← manquant, input inline
│  │ 💡 Demandez à l'agent immo                │ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  ┌ Assurance PNO ─────────────────────────────┐ │
│  │ [______________] €/an         [Enregistrer]│ │   ← manquant, input inline
│  └────────────────────────────────────────────┘ │
│                                                 │
│  ┌ Frais de gestion ─────────────────────────┐ │
│  │ [______________] %            [Enregistrer]│ │   ← manquant, input inline
│  └────────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Composants

- **`CompletionBadge.tsx`** — Badge circulaire avec % global (réutilisable sur dashboard + tab label)
- **`CompletionTab.tsx`** — Onglet "Données" complet :
  - Barre de progression globale en haut
  - Sous-tabs horizontaux par catégorie avec compteur `x/y`
  - Les catégories complètes (100%) sont grisées / cochées
  - Seule la catégorie sélectionnée affiche ses champs → **pas de scroll infini**
- **`CategoryFieldList.tsx`** — Liste des champs d'une catégorie :
  - Champs remplis : affichage compact (label + valeur + pastille confiance)
  - Champs manquants : input inline avec type adapté (currency/number/percent) + bouton save
  - Suggestion du meilleur mode de récolte sous chaque champ manquant
- **`InlineFieldEditor.tsx`** — Input inline pour un champ individuel :
  - Input formaté selon `inputType` (€, %, nombre)
  - Bouton "Enregistrer" → server action `updatePropertyField(id, key, value)`
  - Feedback visuel (✓ vert) après sauvegarde
  - Pastille de confiance automatique : "declared" (saisie manuelle)

#### Server Action pour sauvegarde inline

Ajouter dans `src/domains/property/actions.ts` :
```ts
async function updatePropertyField(
  propertyId: number,
  fieldKey: keyof Property,
  value: string | number,
  source: string = "Saisie manuelle"
): Promise<void>
```
- Met à jour le champ dans la DB
- Met à jour `prefill_sources` avec `{ source, value, confidence: "declared" }`
- Revalide le cache de la page

**Intégration :** Ajouter comme nouvel onglet dans `TabNavigation.tsx` (entre Score et Visite). Mini-badge `CompletionBadge` aussi visible sur le dashboard (cards/table).

---

## Phase 2 : Mode "Questions Agent Immo" (enrichi)

### 2a. Créer `src/domains/property/agent-questions.ts`

```ts
function generateAgentChecklist(property: Property): AgentQuestion[]
```

Génère dynamiquement les questions à poser à l'agent en se basant sur :
- Les champs manquants du registre qui ont `collectModes.includes("agent_immo")`
- Le `agentQuestion` du registre pour chaque champ
- Groupé par catégorie de décision (pas en vrac)

### 2b. Route `/property/[id]/agent-questions`

- Checklist interactive des questions à poser, groupées par catégorie
- Input texte pour noter les réponses
- Bouton "Enregistrer" → met à jour les champs Property + prefill_sources (source: "Agent immobilier", confidence: "declared")
- Option partage/export de la checklist (copier en texte pour WhatsApp/email)

**Accès :** Bouton "Préparer mes questions agent" visible dans le `CompletionTab` quand des champs manquants ont le mode `agent_immo`.

**Réutiliser** le pattern accordion (`CollapsibleSection`) déjà présent dans le système de visite.

---

## Phase 3 : Intégration données de visite (nouveau)

### 3a. Créer `src/domains/visit/field-mapping.ts`

Mapper les items de checklist visite → champs Property :
```ts
function mapVisitDataToPropertyFields(visitData): Partial<PropertyFormData>
```

### 3b. Action serveur `syncVisitDataToProperty()`

- Convertit les réponses visite en champs Property
- Met à jour prefill_sources avec source: "Visite", confidence: "verified"
- Recalcule le score d'investissement
- Le `CompletionTab` se met à jour automatiquement (les champs passent de "manquant" à "rempli verified")

---

## Phase 4 : Visualisation de la confiance

- Pastilles visuelles à côté des valeurs dans le `CompletionTab` ET dans la vue détail "Bien" :
  - ✓ vert = "verified" (visite)
  - ○ ambre = "declared" (scraping, agent, saisie manuelle)
  - ? gris = "estimated" (IA, market data)
- Étendre le pattern `prefillHint()` existant dans PropertyForm
- Avertissement quand un calcul dépend de données estimées : "Ce rendement est basé sur des estimations"
- Dans le `CompletionTab`, les champs remplis affichent leur pastille → l'utilisateur voit la fiabilité de chaque donnée

---

## Phase 5 : Graphe de dépendances calculs

### Créer `src/domains/property/calculation-graph.ts`

```ts
function getAffectedCalculations(fieldKey: string): string[]  // "Quels calculs changent si je modifie ce champ ?"
function getRequiredFields(calculation: string): string[]      // "De quels champs dépend ce calcul ?"
function getCalculationCompleteness(property: Property): Map<string, { complete: boolean, missingFields: string[] }>
```

**Intégration UI :** Dans le `CompletionTab`, sous chaque champ manquant, afficher les calculs impactés :
> "Renseigner la taxe foncière améliorera : rendement net, cash-flow mensuel"

---

## Séquencement

```
Phase 1 (fondation)  →  Phase 2 + Phase 3 (parallèle)  →  Phase 4  →  Phase 5
```

Phase 1 est le socle nécessaire pour tout le reste. Phases 2 et 3 sont indépendantes entre elles.

## Fichiers à créer (10)

| Fichier | Phase | Description |
|---------|-------|-------------|
| `src/domains/property/field-registry.ts` | 1 | Registre central champs × catégories × modes |
| `src/domains/property/completion.ts` | 1 | Calcul complétion globale + par catégorie |
| `src/components/property/detail/CompletionBadge.tsx` | 1 | Badge % circulaire |
| `src/components/property/detail/CompletionTab.tsx` | 1 | Onglet "Données" avec sous-tabs catégorie |
| `src/components/property/detail/CategoryFieldList.tsx` | 1 | Liste champs remplis + manquants par catégorie |
| `src/components/property/detail/InlineFieldEditor.tsx` | 1 | Input inline + save pour un champ |
| `src/domains/property/agent-questions.ts` | 2 | Générateur checklist agent immo |
| `src/app/property/[id]/agent-questions/page.tsx` | 2 | Page checklist agent immo |
| `src/domains/visit/field-mapping.ts` | 3 | Mapping visite → champs Property |
| `src/domains/property/calculation-graph.ts` | 5 | Graphe dépendances calculs |

## Fichiers à modifier (4)

| Fichier | Modification | Phase |
|---------|-------------|-------|
| `src/domains/property/prefill.ts` | Ajouter `confidence` à PrefillRecord | 1 |
| `src/domains/property/actions.ts` | Ajouter `updatePropertyField` server action | 1 |
| `src/components/property/detail/TabNavigation.tsx` | Ajouter onglet "Données" avec CompletionBadge | 1 |
| `src/domains/visit/actions.ts` | Ajouter `syncVisitDataToProperty` | 3 |

## Fichiers existants à réutiliser

| Fichier | Ce qu'on réutilise |
|---------|-------------------|
| `src/domains/property/types.ts` | Property, PropertyFormData |
| `src/domains/property/prefill.ts` | PrefillRecord, fonctions merge* |
| `src/lib/calculations.ts` | calculateAll, noms des métriques |
| `src/domains/property/actions.ts` | saveProperty pour les mises à jour |
| `src/components/ui/CollapsibleSection.tsx` | Accordion pour agent-questions |
| `src/components/property/detail/TabNavigation.tsx` | Système de tabs existant |

## Vérification

- `npm run build` doit passer après chaque phase
- Tester manuellement :
  - Phase 1 : Créer une propriété avec peu d'infos → vérifier que le % complétion est bas, les sous-tabs montrent les catégories incomplètes, et la saisie inline fonctionne
  - Phase 1 : Remplir un champ via l'input inline → vérifier la sauvegarde + mise à jour du compteur
  - Phase 2 : Ouvrir la checklist agent → vérifier que les questions correspondent aux champs manquants, groupées par catégorie
  - Phase 4 : Vérifier les pastilles de confiance sur une propriété avec des données de sources mixtes
