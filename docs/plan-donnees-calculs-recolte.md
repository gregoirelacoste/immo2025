# Plan : Formaliser le modèle "Données × Calculs × Modes de récolte"

## Contexte

L'app Immo2025 a 3 couches orthogonales qui existent déjà implicitement mais ne sont pas formalisées :
1. **Données** — les ~65 champs de la fiche Property
2. **Calculs** — les métriques dérivées (cash flow, rendement net, score) via `calculateAll()`
3. **Modes de récolte** — les différentes façons de remplir la fiche (scraping, agent immo, visite, IA, recherche documentaire)

**Problème :** Aujourd'hui, rien ne relie formellement un champ à ses calculs dépendants ni aux modes de récolte capables de le fournir. L'utilisateur ne sait pas ce qu'il lui manque pour prendre une bonne décision, ni comment l'obtenir.

**Objectif :** Formaliser ce modèle pour que l'app puisse dire : "Il te manque la taxe foncière → demande-la à l'agent immo" et afficher un taux de complétion + un niveau de confiance par donnée.

---

## Phase 1 : Registre de champs + Complétion (fondation)

### 1a. Créer `src/domains/property/field-registry.ts`

Registre central qui mappe chaque champ Property pertinent à :

```ts
interface FieldMetadata {
  key: keyof Property           // ex: "property_tax"
  label: string                 // ex: "Taxe foncière" (FR)
  importance: "critical" | "important" | "nice-to-have"
  calculations: string[]        // ex: ["net_yield", "cashflow", "annual_charges"]
  collectModes: CollectMode[]   // ex: ["scraping", "agent_immo", "visite"]
  agentQuestion?: string        // ex: "Quel est le montant exact de la taxe foncière ?"
}

type CollectMode = "scraping" | "market_data" | "agent_immo" | "visite" | "estimation_ia" | "text" | "photo" | "manual"
```

~25 champs à mapper (les champs qui alimentent les calculs) :
- **critical** : purchase_price, surface, monthly_rent, loan_amount, interest_rate, loan_duration
- **important** : property_tax, condo_charges, vacancy_rate, renovation_cost, dpe_rating, personal_contribution
- **nice-to-have** : amenities, neighborhood, description, airbnb_price_per_night, etc.

### 1b. Créer `src/domains/property/completion.ts`

```ts
interface CompletionSummary {
  percent: number                    // pondéré : critical=3, important=2, nice-to-have=1
  missingFields: FieldMetadata[]     // champs manquants triés par importance
  suggestions: Map<CollectMode, FieldMetadata[]>  // groupés par mode de récolte
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

### 1d. Composants UI

- **`CompletionBadge.tsx`** — badge circulaire avec % (réutilisable sur dashboard + détail)
- **`CompletionPanel.tsx`** — panneau détaillé : champs manquants groupés par mode de récolte suggéré, avec boutons d'action

**Intégration :** Ajouter sur la page détail `/property/[id]` et éventuellement en mini-badge sur le dashboard.

---

## Phase 2 : Mode "Questions Agent Immo" (nouveau)

### 2a. Créer `src/domains/property/agent-questions.ts`

```ts
function generateAgentChecklist(property: Property): AgentQuestion[]
```

Génère dynamiquement les questions à poser à l'agent en se basant sur :
- Les champs manquants du registre qui ont `collectModes.includes("agent_immo")`
- Le `agentQuestion` du registre pour chaque champ

### 2b. Route `/property/[id]/agent-questions`

- Checklist interactive des questions à poser
- Input texte pour noter les réponses
- Bouton "Enregistrer" → met à jour les champs Property + prefill_sources (source: "Agent immobilier", confidence: "declared")
- Option partage/export de la checklist

**Réutiliser** le pattern accordion déjà présent dans le système de visite.

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

---

## Phase 4 : Visualisation de la confiance

- Badges visuels à côté des valeurs dans la vue détail :
  - ✓ vert = "verified" (visite)
  - ○ ambre = "declared" (scraping, agent)
  - ? gris = "estimated" (IA, market data)
- Étendre le pattern `prefillHint()` existant dans PropertyForm
- Avertissement quand un calcul dépend de données estimées : "Ce rendement est basé sur des estimations"

---

## Phase 5 : Graphe de dépendances calculs

### Créer `src/domains/property/calculation-graph.ts`

```ts
function getAffectedCalculations(fieldKey: string): string[]  // "Quels calculs changent si je modifie ce champ ?"
function getRequiredFields(calculation: string): string[]      // "De quels champs dépend ce calcul ?"
function getCalculationCompleteness(property: Property): Map<string, { complete: boolean, missingFields: string[] }>
```

---

## Séquencement

```
Phase 1 (fondation)  →  Phase 2 + Phase 3 (parallèle)  →  Phase 4  →  Phase 5
```

Phase 1 est le socle nécessaire pour tout le reste. Phases 2 et 3 sont indépendantes entre elles.

## Fichiers à créer (8)

| Fichier | Phase |
|---------|-------|
| `src/domains/property/field-registry.ts` | 1 |
| `src/domains/property/completion.ts` | 1 |
| `src/components/CompletionBadge.tsx` | 1 |
| `src/components/CompletionPanel.tsx` | 1 |
| `src/domains/property/agent-questions.ts` | 2 |
| `src/app/property/[id]/agent-questions/page.tsx` | 2 |
| `src/domains/visit/field-mapping.ts` | 3 |
| `src/domains/property/calculation-graph.ts` | 5 |

## Fichiers à modifier (3)

| Fichier | Modification | Phase |
|---------|-------------|-------|
| `src/domains/property/prefill.ts` | Ajouter `confidence` à PrefillRecord | 1 |
| Page détail property | Intégrer CompletionPanel + badges confiance | 1, 4 |
| `src/domains/visit/actions.ts` | Ajouter `syncVisitDataToProperty` | 3 |

## Fichiers existants à réutiliser

| Fichier | Ce qu'on réutilise |
|---------|-------------------|
| `src/domains/property/types.ts` | Property, PropertyFormData |
| `src/domains/property/prefill.ts` | PrefillRecord, fonctions merge* |
| `src/lib/calculations.ts` | calculateAll, noms des métriques |
| `src/domains/property/actions.ts` | saveProperty pour les mises à jour |
| Composants visite existants | Pattern accordion, checklist |

## Vérification

- `npm run build` doit passer après chaque phase
- Tester manuellement :
  - Phase 1 : Créer une propriété avec peu d'infos → vérifier que le % complétion est bas et les suggestions pertinentes
  - Phase 2 : Ouvrir la checklist agent → vérifier que les questions correspondent aux champs manquants
  - Phase 4 : Vérifier les badges de confiance sur une propriété avec des données de sources mixtes
