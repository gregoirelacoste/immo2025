# Plan : Onglets Travaux & Équipements — Impact financier automatique

## Vision

Chaque élément du bien (sol, murs, fenêtres, cuisine…) a un **état** qui détermine un **coût de remise en état**. Chaque équipement (parking, cave, balcon…) a une **présence** qui affecte la **valeur locative**. Le tout alimente automatiquement la simulation financière.

Le mode visite n'est plus un onglet — c'est un **mode de présentation** (bouton) qui guide l'utilisateur à remplir les mêmes données, pièce par pièce, avec photos.

### Tabs finaux

```
Bien → Travaux → Équipements → Simulation → Score → [Visite = bouton]
```

---

## Partie 1 : Onglet Travaux

### Principe

Chaque **poste de travaux** a un état noté de 1 à 5 étoiles. L'état détermine un pourcentage du coût de remplacement total :

| Étoiles | État | % du coût de remplacement | Signification |
|---------|------|--------------------------|---------------|
| 5 ★★★★★ | Neuf / refait | 0% | Aucun travaux nécessaire |
| 4 ★★★★☆ | Bon état | 0% | Usure normale, pas de travaux |
| 3 ★★★☆☆ | Correct | 30% | Rafraîchissement à prévoir |
| 2 ★★☆☆☆ | Usé | 60% | Rénovation partielle nécessaire |
| 1 ★☆☆☆☆ | Vétuste | 100% | Remplacement complet |
| — (vide) | Non évalué | 0% | Pas d'impact (donnée manquante) |

### Postes de travaux — Gros œuvre & structure

| Poste | Clé | Coût de référence | Unité | Impact sur |
|-------|-----|-------------------|-------|------------|
| Sols (revêtement) | `reno_floors` | 45 €/m² | × surface | `renovation_cost` |
| Murs (peinture/enduit) | `reno_walls` | 30 €/m² | × surface | `renovation_cost` |
| Plafonds | `reno_ceilings` | 25 €/m² | × surface | `renovation_cost` |
| Portes intérieures | `reno_doors` | 350 € | × nb portes (défaut: 5) | `renovation_cost` |
| Fenêtres / double vitrage | `reno_windows` | 800 € | × nb fenêtres (défaut: 4) | `renovation_cost` |
| Volets / stores | `reno_shutters` | 400 € | × nb fenêtres (défaut: 4) | `renovation_cost` |
| Isolation (murs+combles) | `reno_insulation` | 80 €/m² | × surface | `renovation_cost` |

### Postes de travaux — Installations techniques

| Poste | Clé | Coût de référence | Unité | Impact sur |
|-------|-----|-------------------|-------|------------|
| Électricité (mise aux normes) | `reno_electrical` | 80 €/m² | × surface | `renovation_cost` |
| Plomberie | `reno_plumbing` | 60 €/m² | × surface | `renovation_cost` |
| Chauffage (système complet) | `reno_heating` | 5 000 € | forfait | `renovation_cost` |
| VMC | `reno_vmc` | 2 500 € | forfait | `renovation_cost` |
| Climatisation | `reno_aircon` | 3 500 € | forfait | `renovation_cost` |

### Postes de travaux — Pièces

| Poste | Clé | Coût de référence | Unité | Impact sur |
|-------|-----|-------------------|-------|------------|
| Cuisine (équipée complète) | `reno_kitchen` | 6 000 € | forfait | `renovation_cost` |
| Salle de bain | `reno_bathroom` | 5 000 € | forfait | `renovation_cost` |
| WC | `reno_wc` | 1 500 € | forfait | `renovation_cost` |

### Postes de travaux — Extérieur (si maison)

| Poste | Clé | Coût de référence | Unité | Impact sur |
|-------|-----|-------------------|-------|------------|
| Toiture | `reno_roof` | 120 €/m² | × surface / 2 | `renovation_cost` |
| Façade (ravalement) | `reno_facade` | 50 €/m² | × surface × 1.5 | `renovation_cost` |

### Postes d'entretien récurrent — Vétusté mobilier

Ces éléments ne génèrent pas de travaux immédiats mais impactent le **coût d'entretien mensuel** (provision pour remplacement) :

| Poste | Clé | Coût de remplacement | Durée de vie | Impact mensuel si vétuste |
|-------|-----|---------------------|--------------|--------------------------|
| Électroménager | `wear_appliances` | 2 000 € | 10 ans | ~17 €/mois |
| Mobilier (si meublé) | `wear_furniture` | 3 000 € | 8 ans | ~31 €/mois |
| Chauffe-eau / cumulus | `wear_water_heater` | 1 200 € | 12 ans | ~8 €/mois |
| Chaudière / PAC | `wear_boiler` | 4 000 € | 15 ans | ~22 €/mois |

### Calcul automatique

```ts
interface TravauxSummary {
  totalRenovationCost: number;        // Somme des (coût_ref × %_état) → alimente renovation_cost
  monthlyMaintenanceCost: number;     // Provision entretien mensuel → alimente charges
  items: TravauxItemResult[];         // Détail par poste
}

interface TravauxItemResult {
  key: string;
  label: string;
  rating: number | null;              // 1-5 ou null
  referenceCost: number;              // Coût si remplacement total
  estimatedCost: number;              // Coût ajusté selon rating
}
```

**Formule principale :**
```
Pour chaque poste avec rating ≤ 3 :
  coût_poste = coût_référence × facteur[rating]

renovation_cost = Σ coût_poste (tous les postes)
```

Les coûts de référence basés sur la surface utilisent `property.surface`. Les forfaits sont fixes. L'utilisateur peut **overrider** le coût calculé d'un poste avec un montant manuel.

### UI — Onglet Travaux

```
┌─────────────────────────────────────────────────┐
│ 🔧 Travaux                                      │
│                                                 │
│ Budget estimé : 18 500 €          [Personnaliser]│
│ ████████████░░░░░░  Entretien : +47 €/mois      │
│                                                 │
│ ── Structure ──────────────────────────────────  │
│                                                 │
│ Sols            ★★★☆☆  Correct    ~1 350 €     │
│ Murs            ★★☆☆☆  Usé        ~2 700 €     │
│ Plafonds        ★★★★☆  Bon        —             │
│ Portes          ☆☆☆☆☆  Non évalué               │
│ Fenêtres        ★★☆☆☆  Usé        ~2 880 €     │
│                                                 │
│ ── Installations ──────────────────────────────  │
│                                                 │
│ Électricité     ★☆☆☆☆  Vétuste    ~3 600 €     │
│ Plomberie       ★★★☆☆  Correct    ~810 €       │
│ Chauffage       ★★★★★  Neuf       —             │
│ VMC             ☆☆☆☆☆  Non évalué               │
│                                                 │
│ ── Pièces ─────────────────────────────────────  │
│                                                 │
│ Cuisine         ★★☆☆☆  Usé        ~3 600 €     │
│ Salle de bain   ★★★☆☆  Correct    ~1 500 €     │
│ WC              ★★★★☆  Bon        —             │
│                                                 │
│ ── Entretien récurrent ────────────────────────  │
│                                                 │
│ Chauffe-eau     ★★☆☆☆  Usé     prov. ~8 €/mois │
│ Chaudière       ★★★★★  Neuf    prov. 0 €/mois   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Interaction :** Tap sur une ligne → affiche le détail avec :
- Les 5 étoiles cliquables (composant `StarRating`)
- Le coût de référence (informatif)
- Un champ override "Montant personnalisé" (optionnel)
- Le hint contextuel (ex: "Vérifier joints, condensation entre vitres")

---

## Partie 2 : Onglet Équipements

### Principe

Chaque équipement est un **toggle** (présent/absent). Sa présence ou absence modifie la valeur locative estimée par rapport à la moyenne du marché.

### Équipements et impact locatif

Les coefficients représentent l'impact sur le loyer au m² par rapport au prix moyen du marché.

#### Équipements à forte valeur (impactent le loyer)

| Équipement | Clé | Impact loyer si présent | Impact si absent | Champ coût optionnel |
|-----------|-----|------------------------|------------------|---------------------|
| Parking / garage | `eq_parking` | +5% | -3% | Prix place (€) |
| Cave | `eq_cave` | +2% | 0% | — |
| Balcon | `eq_balcon` | +4% | 0% | — |
| Terrasse | `eq_terrasse` | +6% | 0% | — |
| Jardin privatif | `eq_jardin` | +5% | 0% | — |
| Ascenseur (si étage ≥ 3) | `eq_ascenseur` | +3% | -5% | — |
| Gardien / concierge | `eq_gardien` | +2% | 0% | — |

#### Équipements de confort (différencient le bien)

| Équipement | Clé | Impact loyer si présent | Impact si absent |
|-----------|-----|------------------------|------------------|
| Cuisine équipée | `eq_cuisine_equipee` | +3% | -2% |
| Climatisation | `eq_climatisation` | +3% | 0% |
| Double vitrage | `eq_double_vitrage` | +2% | -3% |
| Fibre optique | `eq_fibre` | +1% | -1% |
| Cheminée / poêle | `eq_cheminee` | +1% | 0% |
| Parquet | `eq_parquet` | +1% | 0% |
| Interphone / digicode | `eq_interphone` | +1% | 0% |
| Meublé | `eq_meuble` | +15% | 0% |
| Piscine | `eq_piscine` | +8% | 0% |

#### Cuisine — cas spécial avec coût

Si `eq_cuisine_equipee` est coché, un champ optionnel "Coût de la cuisine" apparaît :
- Impacte `renovation_cost` si la cuisine doit être refaite
- Le rating cuisine dans l'onglet Travaux (`reno_kitchen`) gère l'état

### Calcul automatique

```ts
interface EquipmentSummary {
  adjustedRentPerM2: number;          // loyer marché × (1 + Σ impacts%)
  totalImpactPercent: number;         // Σ de tous les impacts (peut être négatif)
  items: EquipmentItemResult[];
}

interface EquipmentItemResult {
  key: string;
  label: string;
  icon: string;
  present: boolean;
  impactPercent: number;              // impact appliqué (positif ou négatif)
}
```

**Formule :**
```
loyer_ajusté_m2 = loyer_marché_m2 × (1 + Σ impact_équipement)

Exemple :
  Loyer marché : 15 €/m²
  Parking (+5%) + Balcon (+4%) - Pas d'ascenseur étage 4 (-5%) = +4%
  Loyer ajusté : 15 × 1.04 = 15.60 €/m²
```

### UI — Onglet Équipements

```
┌─────────────────────────────────────────────────┐
│ 🏠 Équipements                                   │
│                                                 │
│ Impact loyer estimé : +12%  (+1.80 €/m²)        │
│ Loyer ajusté : 16.80 €/m² (vs 15.00 marché)    │
│                                                 │
│ ── Extérieur & parties communes ───────────────  │
│                                                 │
│ [✓] 🅿️ Parking / garage             +5%        │
│ [✓] 🏚️ Cave                          +2%        │
│ [✓] 🌇 Balcon                         +4%        │
│ [ ] ☀️ Terrasse                       —          │
│ [ ] 🌳 Jardin privatif               —          │
│ [✓] 🛗 Ascenseur                      +3%        │
│ [ ] 👤 Gardien                        —          │
│                                                 │
│ ── Confort intérieur ──────────────────────────  │
│                                                 │
│ [✓] 🍳 Cuisine équipée               +3%        │
│     └─ Valeur cuisine : [5 000] €               │
│ [ ] ❄️ Climatisation                  —          │
│ [✓] 🪟 Double vitrage                +2%        │
│ [✓] 📡 Fibre optique                 +1%        │
│ [ ] 🔥 Cheminée                       —          │
│ [✓] 🪵 Parquet                        +1%        │
│ [✓] 🔔 Interphone                     +1%        │
│ [ ] 🛋️ Meublé                        —          │
│ [ ] 🏊 Piscine                        —          │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Interaction :** Toggle switch pour chaque équipement. L'impact loyer se met à jour en temps réel en haut.

---

## Partie 3 : Mode Visite (bouton, pas onglet)

### Changement

L'onglet "Visite" disparaît. Un **bouton flottant** ou un bouton dans la barre de tabs donne accès au mode visite qui :
- Présente les mêmes données (Travaux + Équipements) organisées **pièce par pièce**
- Permet de prendre des photos tagguées
- Ajoute les red flags et questions vendeur
- En sortant du mode visite, les données saisies **alimentent les onglets Travaux et Équipements**

Le mode visite existant (`/property/[id]/visit`) est conservé tel quel mais les données de visite sont **synchronisées** vers les ratings travaux et les toggles équipements.

---

## Partie 4 : Intégration dans la simulation

### Ce qui alimente quoi

```
Onglet Travaux
  └─ totalRenovationCost → property.renovation_cost → Simulation.renovation_cost
  └─ monthlyMaintenanceCost → charges mensuelles supplémentaires

Onglet Équipements
  └─ adjustedRentPerM2 → suggestion pour property.rent_per_m2 / monthly_rent
  └─ totalImpactPercent → affiché comme indicateur dans Simulation
```

### Mise à jour automatique

Quand l'utilisateur modifie un rating dans Travaux ou toggle un équipement :
1. Le total est recalculé côté client (instantané)
2. Un bouton "Appliquer à la simulation" persiste le résultat via `updatePropertyField`
3. Les KPIs du hero se mettent à jour (cashflow, rendement)

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/domains/property/travaux-registry.ts` | Registre des postes de travaux avec coûts de référence |
| `src/domains/property/travaux-calculator.ts` | Calcul du budget travaux total + entretien mensuel |
| `src/domains/property/equipment-impact.ts` | Registre des impacts locatifs par équipement |
| `src/domains/property/equipment-calculator.ts` | Calcul du loyer ajusté |
| `src/components/property/detail/TravauxTab.tsx` | Refonte complète avec star ratings |
| `src/components/property/detail/EquipementsTab.tsx` | Nouvel onglet équipements |
| `src/components/ui/StarRating.tsx` | Composant 5 étoiles cliquable |
| `src/components/ui/ToggleSwitch.tsx` | Toggle switch pour équipements |

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/property/detail/TabNavigation.tsx` | Ajouter "Équipements", supprimer "Visite" (→ bouton) |
| `src/components/property/detail/PropertyDetail.tsx` | Intégrer EquipementsTab, bouton visite |
| `src/domains/property/actions.ts` | Actions pour sauvegarder ratings travaux et toggles équipements |
| `src/lib/calculations.ts` | Optionnel : intégrer le coût d'entretien dans les charges |

## Stockage des données

### Option retenue : champs JSON dans Property

Ajouter 2 champs JSON à la table `properties` :

```sql
ALTER TABLE properties ADD COLUMN travaux_ratings TEXT DEFAULT '{}';
-- JSON: { "reno_floors": 3, "reno_walls": 2, ... }

ALTER TABLE properties ADD COLUMN travaux_overrides TEXT DEFAULT '{}';
-- JSON: { "reno_floors": 2500, ... }  (montants personnalisés)
```

Les équipements utilisent déjà le champ `amenities` (JSON array de clés). On y ajoute les coûts optionnels :

```sql
ALTER TABLE properties ADD COLUMN equipment_costs TEXT DEFAULT '{}';
-- JSON: { "eq_cuisine_equipee": 5000, "eq_parking": 15000 }
```

## Séquencement

```
Phase A : Domain logic (registres + calculateurs)
Phase B : UI atoms (StarRating, ToggleSwitch)
Phase C : TravauxTab refonte + EquipementsTab
Phase D : Intégration simulation + migration visite→bouton
Phase E : Sync visite → travaux/équipements
```

## Composants UI détaillés

### StarRating

```
★★★☆☆  →  tap sur étoile 2 → ★★☆☆☆
```
- 5 étoiles cliquables/tappables (min-h: 44px par étoile)
- Couleur : 1★ = rouge, 2★ = orange, 3★ = ambre, 4★ = vert clair, 5★ = vert
- Possibilité de remettre à 0 (tap sur l'étoile déjà sélectionnée)
- Label d'état affiché à droite ("Vétuste", "Usé", "Correct", "Bon", "Neuf")

### ToggleSwitch

- Switch iOS-style (ambre quand actif)
- Label à gauche, impact % à droite
- Animation de transition

### TravauxItemRow

```
[Sols]  ★★★☆☆  Correct  ~1 350 €  [▼]
  └─ Coût référence : 45 €/m² × 45 m² = 2 025 €
  └─ Facteur état (3★) : 30% × 2 025 = 607 €  [Override: ______ €]
```

- Ligne compacte par défaut (label + étoiles + estimation)
- Expandable : détail du calcul + override
- Utilise le pattern `CollapsibleSection` existant

## Vérification

- `npm run build` après chaque phase
- Tests manuels :
  - Phase A : Vérifier les calculs avec des valeurs connues
  - Phase C : Mettre 1★ partout → vérifier que le total correspond à la somme des coûts de référence
  - Phase C : Mettre 5★ partout → total = 0 €
  - Phase C : Toggle tous les équipements → vérifier l'impact loyer
  - Phase D : Vérifier que le renovation_cost dans la simulation se met à jour
