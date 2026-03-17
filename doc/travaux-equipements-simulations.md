# Travaux, Équipements et Simulations

## Vue d'ensemble

Ces trois systèmes permettent à l'utilisateur de modéliser finement un investissement :
- **Travaux** : estimer le budget rénovation et les provisions d'entretien
- **Équipements** : évaluer l'impact des équipements sur le loyer
- **Simulations** : tester des scénarios d'investissement différents

## Travaux

### Fonctionnement

Système de notation par étoiles (1-5★) pour chaque poste de travaux :

| Rating | Label | Facteur coût |
|--------|-------|-------------|
| 5★ | Neuf / refait | 0% |
| 4★ | Bon état | 0% |
| 3★ | Correct | 30% |
| 2★ | Usé | 60% |
| 1★ | Vétuste | 100% |

### Catégories de postes (20 postes)

**Structure (7)** : sols, murs, plafonds, portes, fenêtres, volets, isolation
**Installations (5)** : électricité, plomberie, chauffage, VMC, climatisation
**Pièces (3)** : cuisine, salle de bain, WC
**Extérieur (2)** : toiture, façade
**Entretien récurrent (4)** : électroménager, mobilier, chauffe-eau, chaudière/PAC

### Modes de calcul

- `per_m2` : coût × surface
- `per_m2_half` : coût × surface/2 (toiture)
- `per_m2_x1_5` : coût × surface×1.5 (façade)
- `per_unit` : coût × nombre d'unités (portes, fenêtres)
- `forfait` : coût fixe

### Stockage

- `property.travaux_ratings` : JSON `{ "reno_floors": 3, "reno_walls": 2 }`
- `property.travaux_overrides` : JSON `{ "reno_floors": 2500 }` (override manuel)
- Calculé à la volée par `calculateTravaux()`, jamais stocké en dur

### Fichiers clés

- `src/domains/property/travaux-registry.ts` — registre des 20 postes
- `src/domains/property/travaux-calculator.ts` — calcul des coûts
- `src/components/property/detail/TravauxTab.tsx` — UI notation étoiles

---

## Équipements

### Fonctionnement

Chaque équipement impacte le loyer en % (positif si présent, négatif si absent).

### Liste des équipements (16)

**Extérieur (7)** :
| Équipement | Présent | Absent |
|------------|---------|--------|
| Parking | +5% | -3% |
| Cave | +2% | — |
| Balcon | +4% | — |
| Terrasse | +6% | — |
| Jardin | +5% | — |
| Ascenseur | +3% | -5% |
| Gardien | +2% | — |

**Confort (9)** :
| Équipement | Présent | Absent |
|------------|---------|--------|
| Cuisine équipée | +3% | -2% |
| Climatisation | +3% | — |
| Double vitrage | +2% | -3% |
| Fibre | +1% | -1% |
| Cheminée | +1% | — |
| Parquet | +1% | — |
| Interphone | +1% | — |
| Meublé | +15% | — |
| Piscine | +8% | — |

### Stockage

- `property.amenities` : JSON array `["parking", "meuble", "fibre"]`
- Impact calculé par `calculateEquipmentImpact(marketRentPerM2, amenities)`

### Fichiers clés

- `src/domains/property/equipment-impact.ts` — registre des impacts
- `src/domains/property/equipment-calculator.ts` — calcul impact loyer
- `src/components/property/detail/EquipementsTab.tsx` — UI toggles

---

## Simulations

### Fonctionnement

Chaque propriété peut avoir N simulations + 1 simulation système (virtuelle).

**Simulation système (`__system__`)** :
- Construite à la volée depuis les données propriété + localité
- Non stockée en DB
- Sert de référence/baseline

**Simulations utilisateur** :
- Créées, dupliquées, éditées par l'utilisateur
- Une simulation "active" désignée par `property.active_simulation_id`

### Paramètres d'une simulation

| Groupe | Champs |
|--------|--------|
| Financement | loan_amount, interest_rate, loan_duration, personal_contribution, insurance_rate, loan_fees, notary_fees |
| Revenus | monthly_rent, vacancy_rate |
| Charges | condo_charges, property_tax |
| Airbnb | airbnb_price_per_night, airbnb_occupancy_rate, airbnb_charges |
| Coûts | renovation_cost, fiscal_regime |
| Récurrent | maintenance_per_m2, pno_insurance, gli_rate |
| Sortie | holding_duration, annual_appreciation |

### Calculs

- `calculateSimulation(property, simulation)` → rendement, cashflow, mensualité
- `calculateExitSimulation(property, simulation, calcs)` → ROI sur durée détention
- Priorité : simulation > propriété > fallback

### Fichiers clés

- `src/domains/simulation/types.ts` — types Simulation, SimulationFormData
- `src/domains/simulation/system.ts` — construction simulation système
- `src/domains/simulation/repository.ts` — CRUD DB
- `src/domains/simulation/actions.ts` — Server Actions
- `src/lib/calculations.ts` — calculateAll(), calculateSimulation(), calculateExitSimulation()
- `src/components/property/detail/SimulationTab.tsx` — UI carrousel

---

## Interconnexions

```
Localité (données marché)
    ↓
Simulation système (baseline auto)
    ↓                           ↑
Équipements (impact loyer %)    Travaux (budget réno)
    ↓                           ↓
Simulation utilisateur (scénarios custom)
    ↓
Calculs financiers (rendement, cashflow, ROI)
```

Le blog alimentera à terme les données de localité, ce qui impactera automatiquement :
- La simulation système (baseline plus précise)
- Les estimations de loyer (via équipements + données marché locales)
- Les comparaisons propriété vs marché
