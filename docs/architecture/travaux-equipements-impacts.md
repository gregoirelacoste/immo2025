# Système d'estimation Travaux & Équipements

Documentation technique du fonctionnement des calculs d'impact financier liés aux travaux de rénovation et aux équipements d'un bien immobilier.

---

## 1. Onglet Travaux — Estimation du budget rénovation

### Principe général

Chaque **poste de travaux** est noté de 1 à 5 étoiles par l'utilisateur. Cette note détermine un **pourcentage du coût de remplacement total** qui sera appliqué.

### Échelle de notation (étoiles)

| Étoiles | État | Facteur appliqué | Signification |
|---------|------|------------------|---------------|
| 5 ★★★★★ | Neuf / refait | **0%** | Aucun travaux nécessaire |
| 4 ★★★★☆ | Bon état | **0%** | Usure normale, pas de travaux |
| 3 ★★★☆☆ | Correct | **30%** | Rafraîchissement à prévoir |
| 2 ★★☆☆☆ | Usé | **60%** | Rénovation partielle nécessaire |
| 1 ★☆☆☆☆ | Vétuste | **100%** | Remplacement complet |
| — (vide) | Non évalué | **0%** | Pas d'impact (donnée manquante) |

> Un poste non évalué (pas de rating) n'a aucun impact sur le budget. Seuls les postes explicitement notés comptent.

### Formule de calcul

```
coût_poste = coût_de_référence × facteur[rating]
budget_total = Σ coût_poste (tous les postes non-récurrents)
```

Si l'utilisateur saisit un **montant personnalisé (override)** pour un poste, celui-ci remplace le calcul automatique.

### Modes de calcul du coût de référence

Chaque poste a un **mode de calcul** qui détermine comment le coût de référence total est obtenu :

| Mode | Formule | Exemple |
|------|---------|---------|
| `per_m2` | coût unitaire × surface du bien | Sols : 45 €/m² × 60 m² = 2 700 € |
| `per_m2_half` | coût unitaire × (surface / 2) | Toiture : 120 €/m² × 30 m² = 3 600 € |
| `per_m2_x1_5` | coût unitaire × (surface × 1.5) | Façade : 50 €/m² × 90 m² = 4 500 € |
| `per_unit` | coût unitaire × nombre d'unités | Fenêtres : 700 € × 4 = 2 800 € |
| `forfait` | coût fixe | Chauffage : 5 000 € |

> Pour `per_m2_half` (toiture) : on estime la surface de toiture à environ la moitié de la surface habitable.
> Pour `per_m2_x1_5` (façade) : on estime la surface de façade à environ 1.5× la surface habitable.

---

### Postes de travaux — Tableau complet

#### Structure (gros œuvre)

| Poste | Clé | Coût de réf. | Mode | Unités par défaut |
|-------|-----|-------------|------|-------------------|
| Sols (revêtement) | `reno_floors` | 45 €/m² | per_m2 | — |
| Murs (peinture/enduit) | `reno_walls` | 30 €/m² | per_m2 | — |
| Plafonds | `reno_ceilings` | 25 €/m² | per_m2 | — |
| Portes intérieures | `reno_doors` | 350 €/porte | per_unit | 5 portes |
| Fenêtres / double vitrage | `reno_windows` | 700 €/fenêtre | per_unit | 4 fenêtres |
| Volets / stores | `reno_shutters` | 400 €/fenêtre | per_unit | 4 fenêtres |
| Isolation (murs+combles) | `reno_insulation` | 80 €/m² | per_m2 | — |

#### Installations techniques

| Poste | Clé | Coût de réf. | Mode |
|-------|-----|-------------|------|
| Électricité (mise aux normes) | `reno_electrical` | 80 €/m² | per_m2 |
| Plomberie | `reno_plumbing` | 60 €/m² | per_m2 |
| Chauffage (système complet) | `reno_heating` | 5 000 € | forfait |
| VMC | `reno_vmc` | 2 500 € | forfait |
| Climatisation | `reno_aircon` | 3 500 € | forfait |

#### Pièces

| Poste | Clé | Coût de réf. | Mode |
|-------|-----|-------------|------|
| Cuisine (équipée complète) | `reno_kitchen` | 6 000 € | forfait |
| Salle de bain | `reno_bathroom` | 5 000 € | forfait |
| WC | `reno_wc` | 1 500 € | forfait |

#### Extérieur (maison uniquement)

| Poste | Clé | Coût de réf. | Mode | Note |
|-------|-----|-------------|------|------|
| Toiture | `reno_roof` | 120 €/m² | per_m2_half | Surface toiture ≈ surface / 2 |
| Façade (ravalement) | `reno_facade` | 50 €/m² | per_m2_x1_5 | Surface façade ≈ surface × 1.5 |

---

### Exemple de calcul complet

Bien de **60 m²**, notes suivantes :

| Poste | Rating | Coût réf. | Facteur | Coût estimé |
|-------|--------|-----------|---------|-------------|
| Sols | 3★ (Correct) | 60 × 45 = 2 700 € | 30% | **810 €** |
| Murs | 2★ (Usé) | 60 × 30 = 1 800 € | 60% | **1 080 €** |
| Fenêtres | 1★ (Vétuste) | 4 × 700 = 2 800 € | 100% | **2 800 €** |
| Électricité | 2★ (Usé) | 60 × 80 = 4 800 € | 60% | **2 880 €** |
| Cuisine | 3★ (Correct) | 6 000 € | 30% | **1 800 €** |
| Plafonds | 5★ (Neuf) | 60 × 25 = 1 500 € | 0% | **0 €** |

**Budget travaux total = 810 + 1 080 + 2 800 + 2 880 + 1 800 = 9 370 €**

---

### Entretien récurrent — Provision mensuelle

Les postes d'entretien ne génèrent pas de travaux immédiats mais une **provision mensuelle** pour anticiper le remplacement futur.

| Poste | Clé | Coût remplacement | Durée de vie | Provision mensuelle max |
|-------|-----|-------------------|--------------|------------------------|
| Électroménager | `wear_appliances` | 2 000 € | 10 ans | ~17 €/mois |
| Mobilier (si meublé) | `wear_furniture` | 3 000 € | 8 ans | ~31 €/mois |
| Chauffe-eau / cumulus | `wear_water_heater` | 1 200 € | 12 ans | ~8 €/mois |
| Chaudière / PAC | `wear_boiler` | 4 000 € | 15 ans | ~22 €/mois |

**Formule :** `provision_mensuelle = coût_remplacement / (durée_de_vie × 12)`

> La provision ne s'active que si le poste est noté ≤ 3★ (l'équipement montre des signes d'usure ou est vétuste). Pour 4★ et 5★ : provision = 0 €/mois.

---

## 2. Onglet Équipements — Impact sur la valeur locative

### Principe général

Chaque équipement est un **toggle** (présent / absent). Sa présence ou absence modifie le loyer estimé par rapport au prix moyen du marché.

### Formule

```
loyer_ajusté_m² = loyer_marché_m² × (1 + Σ impact_équipements)
```

Le loyer de marché provient de :
1. Les données marché DVF/Observatoire des loyers (`avgRentPerM2`)
2. Le `rent_per_m2` saisi manuellement
3. Le calcul `monthly_rent / surface`
4. Fallback : 15 €/m²

### Tableau des impacts

#### Extérieur & parties communes

| Équipement | Clé | Si présent | Si absent | Note |
|-----------|-----|-----------|-----------|------|
| Parking / garage | `parking` | **+5%** | **-3%** | Fort impact en banlieue/province |
| Cave | `cave` | **+2%** | 0% | |
| Balcon | `balcon` | **+4%** | 0% | Balcon > 4 m² |
| Terrasse | `terrasse` | **+6%** | 0% | |
| Jardin privatif | `jardin` | **+5%** | 0% | |
| Ascenseur | `ascenseur` | **+3%** | **-5%** | Impact surtout si étage ≥ 3 |
| Gardien / concierge | `gardien` | **+2%** | 0% | |

#### Confort intérieur

| Équipement | Clé | Si présent | Si absent | Note |
|-----------|-----|-----------|-----------|------|
| Cuisine équipée | `cuisine_equipee` | **+3%** | **-2%** | Standard attendu |
| Climatisation | `climatisation` | **+3%** | 0% | Surtout dans le Sud |
| Double vitrage | `double_vitrage` | **+2%** | **-3%** | Son absence pénalise |
| Fibre optique | `fibre` | **+1%** | **-1%** | |
| Cheminée / poêle | `cheminee` | **+1%** | 0% | |
| Parquet | `parquet` | **+1%** | 0% | |
| Interphone / digicode | `interphone` | **+1%** | 0% | Standard attendu en ville |
| Meublé | `meuble` | **+15%** | 0% | Plus fort impact individuel |
| Piscine | `piscine` | **+8%** | 0% | Surtout maisons |

### Impacts négatifs

Certains équipements ont un **impact négatif si absents** — ce sont des standards attendus par les locataires :

- **Parking absent** (-3%) : pénalisant en zone où le stationnement est difficile
- **Ascenseur absent** (-5%) : fortement pénalisant au-dessus du 2e étage
- **Double vitrage absent** (-3%) : perçu comme un défaut
- **Cuisine équipée absente** (-2%) : standard attendu en location meublée
- **Fibre absente** (-1%) : de plus en plus attendu

### Exemple de calcul

Bien avec loyer marché de **15 €/m²** :

| Équipement | État | Impact |
|-----------|------|--------|
| Parking | ✅ Présent | +5% |
| Balcon | ✅ Présent | +4% |
| Ascenseur (4e étage) | ❌ Absent | -5% |
| Double vitrage | ✅ Présent | +2% |
| Fibre | ✅ Présent | +1% |
| Meublé | ❌ Absent | 0% |

**Impact total = +5% +4% -5% +2% +1% = +7%**
**Loyer ajusté = 15 × 1.07 = 16.05 €/m²**

Pour un 60 m² : **963 €/mois** (vs 900 €/mois au prix marché brut)

---

## 3. Impact sur la simulation financière

### Ce qui alimente quoi

```
Onglet Travaux
  ├── totalRenovationCost → property.renovation_cost → coût projet total
  └── monthlyMaintenanceCost → charges mensuelles supplémentaires

Onglet Équipements
  └── adjustedRentPerM2 → suggestion pour le loyer mensuel
```

### Flux de données

1. L'utilisateur note les postes (étoiles) et toggle les équipements
2. Le calcul se fait **côté client** en temps réel (pas d'appel serveur)
3. Les ratings et toggles sont **sauvegardés en base** à chaque modification
4. L'utilisateur clique **"Appliquer à la simulation"** pour injecter le `renovation_cost` calculé dans la simulation

### Stockage en base

| Colonne | Type | Contenu |
|---------|------|---------|
| `travaux_ratings` | TEXT (JSON) | `{ "reno_floors": 3, "reno_walls": 2, ... }` |
| `travaux_overrides` | TEXT (JSON) | `{ "reno_floors": 2500 }` (montants personnalisés) |
| `equipment_costs` | TEXT (JSON) | `{ "eq_cuisine_equipee": 5000 }` (coûts optionnels) |
| `amenities` | TEXT (JSON) | `["parking", "balcon", "fibre", ...]` (équipements présents) |

---

## 4. Sources des coûts de référence

Les coûts de référence sont des **médianes** issues de sources professionnelles françaises (2024-2025) :

- **Sols** : 45 €/m² — médiane entre ponçage parquet (20-35 €) et pose carrelage standard (60-120 €)
- **Murs** : 30 €/m² — enduit + peinture 2 couches (25-50 €/m²)
- **Électricité** : 80 €/m² — rénovation complète mise aux normes (80-100 € HT/m²)
- **Plomberie** : 60 €/m² — refonte réseau partiel
- **Fenêtres** : 700 €/fenêtre — PVC double vitrage fourni-posé (400-900 €)
- **Chauffage** : 5 000 € — chaudière gaz condensation ou PAC air-air multi-split
- **Cuisine** : 6 000 € — rénovation intermédiaire (mobilier + électroménager)
- **Salle de bain** : 5 000 € — rénovation moyenne (sanitaires + carrelage)
- **Toiture** : 120 €/m² — réfection complète couverture (120-300 €/m²)
- **Façade** : 50 €/m² — ravalement standard nettoyage + enduit (50-110 €/m²)

Les impacts locatifs des équipements sont basés sur les études MySweetImmo, Yespark, et les statistiques de l'observatoire des loyers.

---

## 5. Fichiers source

| Fichier | Rôle |
|---------|------|
| `src/domains/property/travaux-registry.ts` | Registre des 21 postes de travaux |
| `src/domains/property/travaux-calculator.ts` | Calcul budget travaux + provision entretien |
| `src/domains/property/equipment-impact.ts` | Registre des 16 équipements avec impacts |
| `src/domains/property/equipment-calculator.ts` | Calcul loyer ajusté |
| `src/components/property/detail/TravauxTab.tsx` | UI onglet Travaux (star ratings) |
| `src/components/property/detail/EquipementsTab.tsx` | UI onglet Équipements (toggles) |
| `src/components/ui/StarRating.tsx` | Composant 5 étoiles cliquable |
| `src/components/ui/ToggleSwitch.tsx` | Toggle switch iOS-style |
