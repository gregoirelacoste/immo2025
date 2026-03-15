# Plan : Simulation comme source unique de vérité financière

## Principe
Supprimer la lecture des champs financiers depuis `Property`. Toutes les données financières passent par `Simulation`. Les champs restent en DB (pas de migration destructive) mais ne sont plus lus pour les calculs ou l'affichage.

---

## Étape 1 : Garantir qu'un bien a toujours une simulation (transaction atomique)

**Fichiers :** `property/actions.ts`, `scraping/actions.ts`, `collect/share-actions.ts`

**Problème actuel :** `createSimulation().catch(() => {})` — fire-and-forget, silencieux en cas d'échec.

**Action :**
- Remplacer tous les `.catch(() => {})` par un `await` dans un try/catch
- Si la simulation échoue, logguer l'erreur mais ne PAS bloquer la création du bien (le fallback reste)
- Ajouter dans `getSimulationsForProperty` / pages serveur : si 0 simulations, en créer une automatiquement (auto-repair)

**Effet de bord :** Aucun — c'est un renforcement de la garantie existante.

---

## Étape 2 : Charger la première simulation partout côté serveur

**Fichiers :**
- `app/property/[id]/page.tsx` — charge déjà les simulations ✓
- `app/property/[id]/rental/page.tsx` — charge PAS de simulation ✗
- `app/property/[id]/visit` — pas de chargement serveur (VisitMode reçoit property)
- `app/dashboard/page.tsx` — charge en batch ✓
- `app/portfolio/page.tsx` — charge en batch ✓
- `app/compare/page.tsx` — charge en batch ✓
- `domains/enrich/service.ts` — enrichissement côté serveur
- `domains/rental/repository.ts` — calcul côté serveur

**Action :**
- `rental/page.tsx` : charger la première simulation et l'utiliser pour `calculateSimulation`
- `rental/repository.ts` (`getRentalSummary`) : accepter un paramètre `simulation` optionnel
- `enrich/service.ts` (`enrichProperty`) : charger la première simulation du bien pour le scoring
- `visit/page.tsx` : charger la première simulation, passer au composant
- `VisitMode.tsx` : accepter `simulation` prop, utiliser `calculateSimulation`

**Effet de bord :**
- Le scoring investment peut changer si la simulation a des valeurs différentes du property → c'est voulu, le score doit refléter la simulation active
- Le suivi locatif comparera le rendement réel vs simulation (plus pertinent)

---

## Étape 3 : Supprimer les fallbacks `calculateAll(property)`

**Fichiers concernés :**
- `PropertyDetail.tsx` ligne 51 : `firstSim ? calculateSimulation(...) : calculateAll(property)`
- `DashboardClient.tsx` ligne 82 : `sim ? calculateSimulation(...) : calculateAll(p)`
- `CompareView.tsx` ligne 26 : `sim ? calculateSimulation(...) : calculateAll(p)`
- `portfolio/page.tsx` ligne 37 : `sim ? calculateSimulation(...) : calculateAll(property)`

**Action :**
- Remplacer tous les fallbacks par `calculateSimulation(property, firstSim!)` — la simulation existe toujours (garanti par étape 1)
- Garder `calculateAll` uniquement pour le `PropertyForm` (preview live sans simulation DB)

**Effet de bord :** Si malgré tout une property n'a pas de simulation (données legacy), l'auto-repair de l'étape 1 couvre ce cas.

---

## Étape 4 : MarketDataPanel — utiliser la simulation pour le loyer de comparaison

**Fichier :** `MarketDataPanel.tsx`

**Problème actuel :** Lit `property.monthly_rent` directement (lignes 109-129) pour comparer au marché.

**Action :**
- Accepter un prop `monthlyRent: number` au lieu de lire `property.monthly_rent`
- Le parent (`PropertyDetail`) passe `firstSim.monthly_rent` ou la valeur calculée

**Effet de bord :** Le loyer comparé au marché reflétera la simulation active — cohérent.

---

## Étape 5 : PropertyDetail "Bien" tab — travaux et données factuelles

**Fichier :** `PropertyDetail.tsx`

**Problème actuel :** Lit `property.renovation_cost` directement (ligne 193).

**Action :**
- Les travaux sont un champ simulation (ajustable par scénario) → afficher depuis `firstSim.renovation_cost`
- Le DPE, type, surface, prix d'achat restent sur `property` (données factuelles du bien)

**Effet de bord :** Aucun — les travaux varient logiquement par simulation.

---

## Étape 6 : SimulationTab `handleCreateFirst` — ne plus lire property financier

**Fichier :** `SimulationTab.tsx` lignes 50-77

**Problème actuel :** Lit les 16 champs financiers de `property` pour créer la première simulation.

**Action :**
- Ce code ne devrait plus jamais s'exécuter (étape 1 garantit toujours ≥1 simulation)
- Le garder comme safety net mais utiliser des valeurs par défaut raisonnables plutôt que `property.xxx`
- Ou encore mieux : appeler `createDefaultSimulation` côté serveur qui utilise déjà des defaults

**Effet de bord :** Aucun — c'est du code de recovery.

---

## Étape 7 : PropertyForm (création/édition) — découpler de Property financier

**Fichier :** `PropertyForm.tsx`

**Problème actuel :** Le formulaire écrit les champs financiers dans `PropertyFormData` → `saveProperty` les écrit dans la table `properties` ET copie dans simulation.

**Action :**
- **NE PAS modifier le formulaire pour l'instant** — c'est l'interface de saisie initiale
- La `PropertyFormData` contient les champs financiers car c'est le formulaire de création
- `saveProperty` continuera d'écrire dans `properties` (pour seed) ET dans la simulation
- Le `fakeProperty` + `calculateAll` pour le live preview reste tel quel (pas de simulation DB pendant la saisie)

**Pourquoi :** Le form est le point d'entrée des données. Il ne lit pas Property, il ÉCRIT. Pas de changement nécessaire.

**Effet de bord :** Aucun.

---

## Étape 8 : Rescrape — synchroniser la simulation

**Fichier :** `property/actions.ts` (`rescrapeProperty`)

**Problème actuel :** Le rescrape met à jour `properties` (monthly_rent, condo_charges, etc.) mais ne touche pas à la simulation.

**Action :**
- Après rescrape, mettre à jour aussi la première simulation avec les nouvelles données scrapées (monthly_rent, condo_charges, property_tax)
- Seulement les champs qui viennent du scraping, pas les champs utilisateur (apport, durée, etc.)

**Effet de bord :** Le rescrape mettra à jour cohéremment la simulation — plus de désync.

---

## Résumé des fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `property/actions.ts` | await simulation + rescrape sync |
| `scraping/actions.ts` | await simulation |
| `collect/share-actions.ts` | await simulation |
| `app/property/[id]/rental/page.tsx` | charger simulation |
| `app/property/[id]/visit/page.tsx` | charger simulation, passer prop |
| `domains/rental/repository.ts` | accepter simulation param |
| `domains/enrich/service.ts` | charger simulation pour scoring |
| `components/visit/VisitMode.tsx` | accepter simulation, calculateSimulation |
| `components/property/detail/PropertyDetail.tsx` | supprimer fallback, passer monthlyRent |
| `components/property/detail/MarketDataPanel.tsx` | prop monthlyRent |
| `components/property/detail/SimulationTab.tsx` | simplifier handleCreateFirst |
| `components/property/dashboard/DashboardClient.tsx` | supprimer fallback |
| `components/compare/CompareView.tsx` | supprimer fallback |
| `app/portfolio/page.tsx` | supprimer fallback |

## Ce qu'on NE touche PAS
- Table `properties` en DB — pas de migration destructive
- `PropertyFormData` / formulaire de création — c'est le point d'entrée
- `calculateAll()` — reste pour le live preview du formulaire
- `calculateSimulation()` — inchangé
