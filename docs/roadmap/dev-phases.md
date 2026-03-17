# Plan de développement phasé

> Basé sur les retours du 12/03 consolidés (`roadmap/feedbacks/1203-rework.md`).
> Chaque phase est découpée en tâches atomiques avec dépendances, fichiers impactés, et effort estimé.

---

## Phase 1 — Profil utilisateur & fondations DB

**Objectif :** Poser les bases : table profil, page config, correction des défauts, nettoyage UI.
**Durée estimée :** 1 sprint

### 1.1 Table `user_profile` + migration

**Fichiers à créer/modifier :**
- `src/domains/auth/types.ts` → ajouter interface `UserProfile`
- `src/domains/auth/repository.ts` → ajouter `getUserProfile()`, `upsertUserProfile()`
- `src/infrastructure/database/client.ts` → ajouter CREATE TABLE dans l'init

**Schema :**
```sql
CREATE TABLE IF NOT EXISTS user_profile (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  monthly_income INTEGER DEFAULT NULL,
  existing_credits INTEGER DEFAULT 0,
  savings INTEGER DEFAULT NULL,
  max_debt_ratio REAL DEFAULT 35,
  target_cities TEXT DEFAULT '[]',
  min_budget INTEGER DEFAULT NULL,
  max_budget INTEGER DEFAULT NULL,
  target_property_types TEXT DEFAULT '["ancien"]',
  default_inputs TEXT NOT NULL DEFAULT '{}',
  scoring_weights TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT DEFAULT (datetime('now'))
);
```

**Tâches :**
- [ ] Créer l'interface `UserProfile` dans `src/domains/auth/types.ts`
- [ ] Créer les constantes `DEFAULT_INPUTS` et `DEFAULT_SCORING_WEIGHTS` dans un nouveau fichier `src/domains/auth/defaults.ts`
- [ ] Ajouter la migration dans `src/infrastructure/database/client.ts`
- [ ] Ajouter `PRAGMA foreign_keys = ON` dans `getDb()`
- [ ] Créer `getUserProfile(userId)` et `upsertUserProfile(userId, data)` dans le repository
- [ ] Créer `src/domains/auth/actions.ts` → server action `saveUserProfile()`

### 1.2 Page Profil / Configuration

**Fichiers à créer :**
- `src/app/profile/page.tsx` → server component, fetch du profil
- `src/components/profile/ProfileForm.tsx` → formulaire client interactif
- `src/components/profile/BorrowingCapacity.tsx` → calcul capacité d'emprunt en temps réel

**Sections de la page :**
1. **Profil financier** : revenu net, crédits existants, épargne, taux endettement max
   → Affiche en live : capacité d'emprunt, fourchette de prix cible
2. **Préférences de recherche** : villes cibles, fourchette budget, types de bien
3. **Inputs par défaut** : tableau éditable (durée, taux, assurance, loyer/m², taxe foncière, vacance)
4. **Pondération du score** : tableau éditable

**Tâches :**
- [ ] Créer la route `src/app/profile/page.tsx`
- [ ] Créer `ProfileForm.tsx` avec les 4 sections
- [ ] Créer `BorrowingCapacity.tsx` (calcul : mensualité max = revenu × 35% - crédits, puis montant empruntable selon durée/taux)
- [ ] Ajouter sauvegarde auto (debounce 1s) ou bouton "Enregistrer"
- [ ] Ajouter bouton "Réinitialiser les valeurs par défaut"

### 1.3 Nav bottom → 3 onglets

**Fichiers à modifier :**
- `src/components/Navbar.tsx`

**Tâches :**
- [ ] Ajouter l'onglet "Profil" (icône engrenage) → lien vers `/profile`
- [ ] Ajuster la grille de 2 à 3 colonnes

### 1.4 Correction des valeurs par défaut

**Fichiers à modifier :**
- `src/domains/auth/defaults.ts` (nouveau, créé en 1.1)
- `src/components/property/form/PropertyForm.tsx` → utiliser les defaults du profil au lieu des valeurs hardcodées
- `src/domains/property/prefill.ts` → étendre pour source "Par défaut"

**Valeurs corrigées :**
| Ancien | Nouveau |
|---|---|
| Durée 18 ans | 20 ans |
| Pas de taux d'intérêt par défaut | 3.5% |
| Taxe foncière ~20€/m² | 13€/m² |
| Vacance 5% | 8% |
| Loyer/m² 10€ | 12€ |

**Tâches :**
- [ ] Modifier `PropertyForm` pour charger les defaults depuis le profil utilisateur (ou fallback sur `DEFAULT_INPUTS`)
- [ ] Marquer les champs pré-remplis avec source "Par défaut" dans `prefill_sources`

### 1.5 Masquer Airbnb par défaut

**Fichiers à modifier :**
- `src/components/property/form/AirbnbSection.tsx` → wrappée dans un toggle "Mode avancé"
- `src/components/property/form/PropertyForm.tsx` → état `showAdvanced`

**Tâches :**
- [ ] Ajouter un toggle/bouton "Afficher les options avancées" dans le formulaire
- [ ] Masquer `AirbnbSection` + frais dossier + taux assurance par défaut
- [ ] Garder les valeurs pré-remplies silencieusement même si masquées

---

## Phase 2 — Données métier manquantes

**Objectif :** Ajouter les champs et calculs critiques pour que les résultats financiers soient fiables.
**Durée estimée :** 1 sprint
**Dépendance :** Phase 1 (defaults + profil)

### 2.1 Nouveaux champs sur `properties`

**Fichiers à modifier :**
- `src/infrastructure/database/client.ts` → ALTER TABLE migrations
- `src/domains/property/types.ts` → ajouter les champs à l'interface
- `src/domains/property/repository.ts` → inclure dans les queries
- `src/infrastructure/database/row-mapper.ts` → mapper les nouvelles colonnes

**Champs à ajouter :**
```sql
ALTER TABLE properties ADD COLUMN renovation_cost INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN dpe_rating TEXT DEFAULT NULL;
ALTER TABLE properties ADD COLUMN fiscal_regime TEXT DEFAULT 'micro_bic';
```

**Tâches :**
- [ ] Ajouter les migrations
- [ ] Mettre à jour le type `Property`
- [ ] Mettre à jour le row mapper
- [ ] Mettre à jour `stripMeta()` pour inclure ces champs dans les updates

### 2.2 Champs dans le formulaire

**Fichiers à modifier :**
- `src/components/property/form/PropertyForm.tsx`
- Éventuellement un nouveau `src/components/property/form/RenovationSection.tsx`

**Tâches :**
- [ ] Ajouter input "Montant travaux" (€) dans la section financière
- [ ] Ajouter select "DPE" (A-G) dans la section principale, avec alerte visuelle si F ou G ("Interdiction de location en 2028/2034")
- [ ] Ajouter select "Régime fiscal" (Micro-BIC / LMNP Réel / Micro-foncier / Réel foncier) — mode avancé, défaut Micro-BIC

### 2.3 Intégrer travaux dans les calculs

**Fichiers à modifier :**
- `src/lib/calculations.ts`

**Tâches :**
- [ ] `total_project_cost` += `renovation_cost`
- [ ] Recalculer tous les rendements en conséquence
- [ ] Ajouter dans `PropertyCalculations` : `total_project_cost_with_renovation`

### 2.4 Simulation fiscale simplifiée

**Fichiers à créer/modifier :**
- `src/lib/calculations.ts` → ajouter calculs fiscaux
- `src/components/property/form/FiscalSection.tsx` (nouveau) → affichage comparatif

**Logique :**
```
Micro-BIC :
  revenu_imposable = loyer_annuel × 50%
  impot = revenu_imposable × TMI (30% par défaut)

LMNP Réel :
  amortissement_bien = (purchase_price × 85%) / 30  (hors terrain ~15%)
  amortissement_travaux = renovation_cost / 10
  amortissement_meubles = 5000 / 7  (forfait mobilier)
  charges_deductibles = condo_charges×12 + property_tax + insurance×12 + interests_year
  resultat = loyer_annuel - charges_deductibles - amortissements
  impot = max(0, resultat) × TMI
```

**Tâches :**
- [ ] Ajouter `calculateFiscalImpact(property, regime)` dans calculations.ts
- [ ] Ajouter dans `PropertyCalculations` : `net_net_yield`, `annual_tax`, `fiscal_savings`
- [ ] Créer `FiscalSection.tsx` : affichage côte à côte Micro-BIC vs LMNP Réel avec économie
- [ ] Mini-guide "?" expliquant chaque régime en 2 phrases

### 2.5 Indicateur budget (depuis profil)

**Fichiers à modifier :**
- `src/components/property/detail/` → ajouter badge vert/orange/rouge
- `src/components/property/dashboard/` → ajouter badge dans les cartes/lignes

**Logique :**
```
mensualite = calculée depuis le bien
taux_endettement = (mensualite + existing_credits) / monthly_income × 100
vert : < 30%
orange : 30-35%
rouge : > 35%
```

**Tâches :**
- [ ] Créer `src/components/property/BudgetIndicator.tsx`
- [ ] Intégrer dans la page détail (sticky header) et le dashboard (carte/ligne)
- [ ] Passer le profil utilisateur via les server components

---

## Phase 3 — Refonte UI page bien

**Objectif :** Réorganiser la page bien en 3 onglets, sticky header, mode débutant.
**Durée estimée :** 1 sprint
**Dépendance :** Phase 2 (nouveaux champs + calculs fiscaux)

### 3.1 Sticky header KPI

**Fichiers à créer :**
- `src/components/property/detail/StickyHeader.tsx`

**Contenu :** prix d'achat | rendement net | cashflow mensuel | badge budget | badge DPE

**Tâches :**
- [ ] Créer le composant avec `sticky top-0 z-10`
- [ ] Afficher sur toutes les vues (onglets)
- [ ] Responsive : compact sur mobile

### 3.2 Navigation par onglets

**Fichiers à modifier :**
- `src/app/property/[id]/page.tsx` → restructurer avec onglets
- `src/app/property/[id]/edit/page.tsx` → idem

**Fichiers à créer :**
- `src/components/property/detail/TabNavigation.tsx`
- `src/components/property/detail/FinancierTab.tsx`
- `src/components/property/detail/ContexteTab.tsx`
- `src/components/property/detail/VisiteTab.tsx`

**Onglets :**
1. **Financier** : formulaire financier + KPIs + simulation fiscale + données marché DVF
2. **Contexte & Quartier** : socio-éco + carte + description + galerie photos du bien
3. **Visite** : mode photo guidé + notes

**Tâches :**
- [ ] Créer `TabNavigation.tsx` (tabs horizontaux, swipeable sur mobile)
- [ ] Migrer le contenu existant de `PropertyDetail` dans les 3 tabs
- [ ] Supprimer les sections : encart boutons, encart score standalone, bouton visite
- [ ] Garder URL persistante : `/property/[id]?tab=financier|contexte|visite`

### 3.3 Tri dropdown compact (dashboard)

**Fichiers à modifier :**
- `src/components/property/dashboard/DashboardClient.tsx`
- Supprimer ou remplacer `SortBar` existant

**Tâches :**
- [ ] Remplacer les boutons sort par un `<select>` ou dropdown "Trier par : [Rendement ▼]"
- [ ] Garder les mêmes options de tri

### 3.4 Mode débutant + mini-guide contextuel

**Fichiers à créer :**
- `src/components/ui/FieldTooltip.tsx` → icône "?" avec explication inline

**Fichiers à modifier :**
- `src/components/property/form/PropertyForm.tsx` → ajouter tooltips sur chaque champ financier

**Tâches :**
- [ ] Créer `FieldTooltip` (click → affiche texte sous le champ, pas de popup)
- [ ] Rédiger les textes d'aide pour chaque champ (~15 champs)
- [ ] Toggle "Mode avancé" persiste dans `user_profile` ou localStorage

### 3.5 Champs dynamiques liés

**Fichiers à modifier :**
- `src/components/property/form/PropertyForm.tsx`
- Hooks existants : `useLoanAutoCalc`, `useRentAutoCalc` (à étendre)

**Tâches :**
- [ ] Groupe 1 : prix ↔ apport ↔ emprunt (tracking "dernière saisie")
- [ ] Groupe 2 : surface ↔ loyer/m² ↔ loyer mensuel
- [ ] Ajouter fond gris/bleu sur les champs calculés automatiquement
- [ ] Ajouter icône cadenas (verrouiller = exclure du recalcul)
- [ ] Debounce 300ms sur les onChange

---

## Phase 4 — Photos & terrain

**Objectif :** Système photo complet : prise de vue contextuelle, galerie par bien, mode visite guidé.
**Durée estimée :** 1-2 sprints
**Dépendance :** Phase 3 (onglets page bien)

### 4.1 Table `photos` + API stockage

**Fichiers à créer :**
- `src/domains/photo/types.ts`
- `src/domains/photo/repository.ts`
- `src/domains/photo/actions.ts` → server actions (upload, delete, reassign)
- `src/domains/photo/storage.ts` → abstraction Vercel Blob / filesystem local

**Tâches :**
- [ ] Créer le domaine `photo` avec types, repository, actions
- [ ] Migration DB (CREATE TABLE photos)
- [ ] Intégration Vercel Blob (prod) / filesystem (dev)
- [ ] Génération de thumbnails à l'upload (sharp, ~200px, WebP)
- [ ] API : `uploadPhoto()`, `deletePhoto()`, `getPhotosForProperty()`, `reassignPhoto()`

### 4.2 Galerie photos dans l'onglet Contexte

**Fichiers à créer :**
- `src/components/property/detail/PhotoGallery.tsx` → mosaïque
- `src/components/property/detail/PhotoViewer.tsx` → vue plein écran

**Tâches :**
- [ ] Mosaïque responsive (2 cols mobile, 3-4 cols desktop)
- [ ] Vue plein écran au tap (swipe entre photos)
- [ ] Bouton "Prendre une photo" + "Importer"
- [ ] Bouton supprimer par photo
- [ ] Métadonnées : date, géoloc, source

### 4.3 Photo de rue → création de fiche

**Fichiers à modifier :**
- `src/components/Navbar.tsx` → bouton photo rapide (icône appareil photo dans la top bar)
- `src/components/collect/CollectorPhotoMode.tsx` → adapter le flow

**Flow :**
1. Bouton photo dans la nav (ou FAB flottant)
2. Prise de photo → géolocalisation
3. Reverse geocoding → adresse
4. Création d'un bien avec : photo, lat/lon, adresse, status `added`
5. Redirection vers la fiche du bien

**Tâches :**
- [ ] Ajouter bouton photo dans la navbar mobile (petit, discret)
- [ ] Flow : photo → géoloc → reverse geocoding → `saveProperty()` → redirect
- [ ] Rattachement automatique de la photo au bien créé

### 4.4 Mode photo guidé en visite

**Fichiers à créer :**
- `src/components/visit/PhotoGuidedMode.tsx`
- `src/domains/visit/photo-guide.ts` → séquence de suggestions

**Séquence :**
```typescript
const PHOTO_GUIDE = [
  { id: 'facade', label: 'Façade de l\'immeuble', tip: 'Vue d\'ensemble, état général' },
  { id: 'common_areas', label: 'Parties communes', tip: 'Hall, escalier, boîtes aux lettres' },
  { id: 'living_room', label: 'Pièce principale', tip: 'Vue large, luminosité' },
  { id: 'kitchen', label: 'Cuisine', tip: 'Équipements, état' },
  { id: 'bathroom', label: 'Salle de bain', tip: 'Robinetterie, ventilation, joints' },
  { id: 'bedroom', label: 'Chambre(s)', tip: 'Taille, rangements' },
  { id: 'electrical', label: 'Tableau électrique', tip: 'Aux normes ? Disjoncteurs' },
  { id: 'windows', label: 'Fenêtres / vue', tip: 'Double vitrage, exposition, vis-à-vis' },
  { id: 'heating', label: 'Chauffage', tip: 'Type de radiateurs, chaudière' },
  { id: 'issues', label: 'Points à signaler', tip: 'Fissures, humidité, bruit...' },
];
```

**Tâches :**
- [ ] UI : carte suggestion avec bouton "Photographier" + "Passer"
- [ ] Chaque photo est taguée avec l'id de la suggestion
- [ ] Zone de notes texte entre chaque étape
- [ ] Résumé final : toutes les photos prises + notes
- [ ] Possibilité d'ajouter des photos libres à tout moment

---

## Phase 5 — Status & scoring

**Objectif :** Pipeline complet, scoring refondu, `favorite` en booléen.
**Durée estimée :** 0.5 sprint
**Dépendance :** Phase 2 (calculs fiscaux)

### 5.1 Nouveaux status + is_favorite

**Fichiers à modifier :**
- `src/infrastructure/database/client.ts` → migrations
- `src/domains/property/types.ts` → ajouter les nouveaux status + `is_favorite`
- `src/components/property/StatusSelector.tsx`
- `src/components/property/StatusBadge.tsx`
- `src/components/property/dashboard/DashboardClient.tsx` → filtre chips

**Tâches :**
- [ ] Ajouter : `negotiation`, `under_contract`, `purchased`, `managed`
- [ ] Retirer `favorite` des status → `ALTER TABLE properties ADD COLUMN is_favorite INTEGER DEFAULT 0`
- [ ] Migration : `UPDATE properties SET is_favorite = 1 WHERE property_status = 'favorite'` puis `UPDATE properties SET property_status = 'added' WHERE property_status = 'favorite'`
- [ ] Ajouter `status_changed_at`
- [ ] Mettre à jour les composants UI (couleurs, icônes, labels)
- [ ] Ajouter icône étoile toggle pour `is_favorite` dans le dashboard

### 5.2 Scoring 2 niveaux

**Fichiers à modifier :**
- `src/domains/enrich/scoring.ts` → refonte
- `src/domains/property/types.ts` → nouveau format `score_breakdown`

**Logique :**
```
Score financier (70%) :
  - Cashflow/mois (normalisé 0-100)
  - Rentabilité nette (normalisé 0-100)
  - Prix/m² vs marché (normalisé 0-100)

Score terrain (30%) :
  - Note visite globale (si disponible, sinon neutre)

Pondérations configurables via user_profile.scoring_weights
```

**Tâches :**
- [ ] Refondre `calculateInvestmentScore()` avec les 2 niveaux
- [ ] Charger les poids depuis `user_profile.scoring_weights` (fallback defaults)
- [ ] Retirer les critères socio-éco du scoring
- [ ] Afficher le détail du score (contribution de chaque critère) dans la page bien

---

## Phase 6 — Différenciation

**Objectif :** Features à forte valeur perçue qui différencient l'app de la concurrence.
**Durée estimée :** 2+ sprints
**Dépendance :** Phases 1-5

### 6.1 Comparaison multi-biens

**Fichiers à créer :**
- `src/app/compare/page.tsx`
- `src/components/compare/CompareView.tsx`
- `src/components/compare/CompareSelector.tsx`

**Tâches :**
- [ ] Sélection de 2-4 biens depuis le dashboard (checkbox)
- [ ] Page comparaison en colonnes avec toutes les métriques clés
- [ ] Highlight automatique du meilleur KPI par ligne (vert)
- [ ] Mobile : scroll horizontal ou vue empilée

### 6.2 Historique DVF du bien exact

**Fichiers à créer :**
- `src/domains/market/dvf-history.ts` → requête DVF par adresse/parcelle

**Tâches :**
- [ ] Requêter l'API DVF avec adresse exacte ou coordonnées
- [ ] Afficher l'historique des transactions (prix, date, surface) dans l'onglet Financier
- [ ] Afficher le delta prix actuel vs dernière transaction

### 6.3 Analyse photo IA

**Fichiers à créer :**
- `src/domains/photo/ai-analysis.ts` → appel Gemini avec l'image

**Tâches :**
- [ ] Envoyer la photo à Gemini avec prompt structuré
- [ ] Extraire : état général, type de chauffage, fenêtres, sol, problèmes détectés
- [ ] Stocker le résultat dans `photos.ai_analysis`
- [ ] Afficher sous la photo avec icônes (alerte rouge pour les problèmes)

### 6.4 Alertes seuils personnalisés

**Tâches :**
- [ ] Définition des seuils dans `user_profile` (cashflow min, renta min, zone géo)
- [ ] Cron ou webhook : scraper les nouvelles annonces
- [ ] Notification push (PWA) si un bien matche

### 6.5 Suivi post-achat

**Tâches :**
- [ ] Nouveau mode pour les biens en status `purchased`/`managed`
- [ ] Saisie des loyers perçus, charges réelles, travaux réalisés
- [ ] Comparaison rendement prévisionnel vs réel
- [ ] Dashboard dédié "Mon patrimoine"

---

## Résumé visuel

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4
Profil DB    Données     Refonte UI   Photos
Config       métier      3 onglets    Visite guidée
Nav bottom   Fiscalité   Champs liés
Defaults     Budget      Tri dropdown
                │
                ├──→ Phase 5
                │    Status
                │    Scoring
                │
                └──→ Phase 6
                     Comparaison
                     DVF historique
                     IA photo
                     Alertes
                     Post-achat
```

**Phases 1-3** = socle fonctionnel solide (3 sprints)
**Phases 4-5** = expérience terrain complète (1.5 sprint)
**Phase 6** = différenciation marché (2+ sprints)
