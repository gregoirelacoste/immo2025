# Retours 12/03 — Roadmap consolidée

> Document consolidé : retours initiaux + avis experts (DB, UI/UX, Immobilier) + retour utilisateur (Thomas, primo-investisseur 35 ans) + décisions produit.

---

## 1. DB / Backend

### 1.1 Table profil utilisateur

Créer une table `user_profile` qui étend le modèle `users` existant avec les données financières personnelles et les préférences.

**Schema :**
```sql
CREATE TABLE IF NOT EXISTS user_profile (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- Profil financier
  monthly_income INTEGER DEFAULT NULL,          -- revenu net mensuel
  existing_credits INTEGER DEFAULT 0,           -- mensualités de crédits existants
  savings INTEGER DEFAULT NULL,                 -- épargne disponible
  max_debt_ratio REAL DEFAULT 35,               -- taux d'endettement max (%)
  -- Préférences de recherche
  target_cities TEXT DEFAULT '[]',              -- JSON array de villes cibles
  min_budget INTEGER DEFAULT NULL,
  max_budget INTEGER DEFAULT NULL,
  target_property_types TEXT DEFAULT '["ancien"]', -- JSON array
  -- Defaults financiers (JSON partiel, mergé avec defaults TypeScript au runtime)
  default_inputs TEXT NOT NULL DEFAULT '{}',
  -- Pondération scoring (JSON partiel)
  scoring_weights TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT DEFAULT (datetime('now'))
);
```

**Defaults TypeScript (mergés au runtime) :**
```typescript
const DEFAULT_INPUTS = {
  personal_contribution_pct: 10,  // % du prix d'achat
  loan_duration: 20,             // ans (corrigé: 18→20, les banques font 15/20/25)
  interest_rate: 3.5,            // % (ajouté: paramètre critique manquant)
  insurance_rate: 0.34,          // %
  loan_fees: 0,                  // €
  rent_per_m2: 12,               // €/m²/mois (corrigé: 10→12, plus représentatif)
  property_tax_per_m2: 13,       // €/m²/an (corrigé: 20→13, 20 était excessif)
  vacancy_rate: 8,               // % (corrigé: 5→8, plus prudent)
};
```

> **Approche technique** : le JSON en DB est partiel. Le code merge au runtime : `{ ...DEFAULT_INPUTS, ...JSON.parse(row.default_inputs) }`. Pas besoin de migrer le JSON quand on ajoute un nouveau champ.

**Capacité d'emprunt calculée automatiquement :**
Avec `monthly_income`, `existing_credits` et `max_debt_ratio`, l'app calcule :
- Mensualité max = (monthly_income × max_debt_ratio / 100) - existing_credits
- Montant max empruntable (selon durée et taux par défaut)
- Fourchette de prix de bien cible

→ Affichable sur la page profil ET utilisé pour un indicateur vert/orange/rouge sur chaque bien ("dans mon budget ?", "taux d'endettement : 32%").

### 1.2 Table photos

**Schema :**
```sql
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id TEXT DEFAULT NULL REFERENCES properties(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT DEFAULT NULL,
  source TEXT NOT NULL DEFAULT 'upload' CHECK (source IN ('camera', 'upload', 'scraping')),
  ai_analysis TEXT DEFAULT NULL,
  latitude REAL DEFAULT NULL,
  longitude REAL DEFAULT NULL,
  taken_at TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_property_id ON photos(property_id);
CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos(user_id, taken_at);
```

- `property_id` nullable → photos orphelines possibles (photo de rue, rattachement ultérieur)
- Plus de limite à 5 photos par bien
- Thumbnails générés à l'upload (~200px, WebP) pour la mosaïque
- Stockage : Vercel Blob en prod (CDN intégré, ~$0.023/Go)

### 1.3 Status des biens

Valeurs actuelles : `added, favorite, contacted, visit_planned, visited, validated, not_validated, offer_sent, accepted`

**Modifications :**

| Action | Détail |
|---|---|
| Ajouter | `negotiation` — entre offer_sent et accepted |
| Ajouter | `under_contract` (sous compromis) — étape critique 2-3 mois |
| Ajouter | `purchased` / `managed` — suivi post-achat |
| Transformer | `favorite` → booléen `is_favorite` séparé (marqueur, pas étape pipeline) |
| Ajouter colonne | `status_changed_at TEXT DEFAULT NULL` |

### 1.4 Cache données socio-éco

```sql
CREATE TABLE IF NOT EXISTS zone_data (
  commune_code TEXT PRIMARY KEY,  -- code INSEE
  commune_name TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL  -- fetched_at + 30 jours
);
```

- Clé sur code commune INSEE. TTL 30 jours.
- `properties.socioeconomic_data` reste (snapshot historique).

### 1.5 Points d'attention techniques

| Priorité | Action | Effort |
|---|---|---|
| **Critique** | Activer `PRAGMA foreign_keys = ON` dans `getDb()` | 1 ligne |
| **Important** | `SELECT` explicite au dashboard (pas `SELECT *`) | Moyen |
| **Recommandé** | Table `schema_version` pour tracker les migrations | Faible |

---

## 2. UI / Ergonomie

### 2.1 Dashboard

- ✅ Retirer le formulaire complet de la home
- ✅ Retirer les sorts sous forme de boutons → dropdown compact "Trier par : [Rendement ▼]"
- ✅ Garder la barre URL rapide (SmartCollector compact) comme accélérateur
- ✅ Garder filtres par status en chips inline (bon pattern, déjà en place)
- ✅ Garder bouton "nouveau bien" sur desktop (pas de nav bottom en desktop)
- ❌ Pas de menu burger (anti-pattern mobile, taux de découverte faible)

### 2.2 Nav bottom (mobile)

Actuellement 2 items (Dashboard + Nouveau). Passer à **3 items** :

| Position | Onglet | Icône |
|---|---|---|
| 1 | Dashboard | Maison |
| 2 | Nouveau | + |
| 3 | Profil / Config | Engrenage |

> **Décision produit** : pas de galerie en nav globale. La galerie photo vit au niveau du bien (voir §3.1). L'appareil photo est contextuel (voir §3.2).

### 2.3 Page bien — Refonte en onglets

**3 onglets :**

| Onglet | Contenu |
|---|---|
| **Financier** | Formulaire financier, KPIs (rendement, cashflow, mensualité), données marché (prix/m² DVF), indicateur budget |
| **Contexte & Quartier** | Données socio-éco, carte, description, galerie photos du bien |
| **Visite** | Mode photo guidé, notes terrain, photos de visite |

**Sticky header** sur tous les onglets : prix + rendement net + cashflow mensuel.

**Suppressions :**
- Encart boutons (relancer scrapping, coller texte, retour dash)
- Encart score (intégré dans KPIs)
- Bouton accès visite (remplacé par l'onglet)
- ✅ **Section Airbnb masquée par défaut** (champs pré-remplis avec defaults, visible en mode "avancé")

### 2.4 Champs dynamiques liés

2 groupes bidirectionnels indépendants :
1. **Prix d'achat ↔ Apport ↔ Montant emprunté**
2. **Surface ↔ Loyer m²/mois ↔ Loyer mensuel**

UX :
- Pattern "dernière saisie gagne"
- Fond gris/bleu pâle sur les champs calculés
- Icône cadenas pour verrouiller une valeur
- Debounce 300-500ms

### 2.5 Mode débutant vs avancé

Masquer par défaut les champs secondaires pour réduire la charge cognitive :
- Champs Airbnb
- Frais de dossier bancaire
- Taux d'assurance
- Vacance locative (pré-rempli avec défaut)

Bouton "Afficher les options avancées" pour tout voir.

### 2.6 Mini-guide contextuel

Icône "?" sur chaque champ financier, avec une explication en 1 phrase :
- "Vacance locative : % du temps où le bien n'est pas loué. 5% = marché tendu, 8-10% = prudent."
- "Apport personnel : généralement 10% minimum. Les banques demandent au moins les frais de notaire."

---

## 3. Features

### 3.1 Photos — Au niveau du bien

**Décision : pas de galerie globale en nav.** Les photos vivent dans l'onglet "Contexte & Quartier" de chaque bien.

- Mosaïque des photos liées au bien
- Upload (drag & drop desktop, sélection mobile)
- Prise de photo directe (appareil contextuel)
- Extraction EXIF (date, GPS) automatique
- Pas de limite de photos

### 3.2 Appareil photo contextuel — 2 cas d'usage

#### Cas 1 : Photo dans la rue (panneau "à vendre")

L'utilisateur voit un bien en vente dans la rue, prend une photo via l'app.

**Flow :**
1. Bouton photo accessible depuis le dashboard ou la nav
2. Prise de photo → géolocalisation automatique
3. L'app **crée une nouvelle fiche bien** avec :
   - Latitude/longitude de la prise de vue
   - Photo rattachée
   - Adresse inversée (reverse geocoding)
   - Status : `added`
4. L'utilisateur peut ensuite compléter (chercher l'annonce en ligne, ajouter les données)

> C'est le cas où la création automatique de bien a du sens : l'intention est explicitement "j'ai trouvé un bien".

#### Cas 2 : Photos pendant la visite (guidage photo)

L'utilisateur visite un bien déjà dans l'app. L'onglet "Visite" devient un **mode photo guidé** :

**Flow :**
1. L'app suggère quoi photographier dans l'ordre :
   - "Façade de l'immeuble"
   - "Entrée / parties communes"
   - "Pièce principale / séjour"
   - "Cuisine"
   - "Salle de bain"
   - "Compteur électrique / tableau"
   - "Vue depuis la fenêtre"
   - "Éléments à signaler (fissures, humidité...)"
2. Chaque photo est prise dans le contexte de la suggestion → rattachée au bien + taguée avec le type de pièce
3. L'utilisateur peut skip une suggestion, ajouter des photos libres, ou prendre des notes vocales/texte entre les photos
4. À la fin, l'app a un dossier visite structuré

> **Pourquoi pas une checklist à cocher** : l'agent immo est là pour répondre aux questions. Le téléphone sert à documenter visuellement, pas à remplir un formulaire. Le guidage photo remplace la checklist de manière naturelle — chaque suggestion est une "question visuelle" implicite.

### 3.3 Analyse photo IA

**Priorité : secondaire.** Utile mais pas critique.

Si implémenté, détecter en priorité :
1. Fissures, humidité, moisissures (red flags coûteux)
2. Type de chauffage (radiateurs grille-pain = DPE catastrophique)
3. Fenêtres (simple/double vitrage)
4. Sol (parquet/carrelage/moquette → impact budget travaux)

### 3.4 Provenance des inputs

Sous chaque champ, source en petit texte gris :

| Source (enum) | Quand |
|---|---|
| Scrapping IA | Valeur extraite par scraping |
| Par défaut | Valeur issue de `user_profile.default_inputs` |
| Entrée manuellement | Modifié par l'utilisateur |
| Généré via IA photo | Extrait d'une analyse photo |
| Observatoire des loyers | Données marché loyer |
| Estimation DVF | Données marché achat |

### 3.5 Scoring — 2 niveaux

| Score | Poids | Critères |
|---|---|---|
| **Score financier** | 70% | Cashflow/mois, rentabilité nette, prix/m² vs marché |
| **Score terrain** | 30% | Impressions visite (via photos + notes) |

Pondération configurable dans la page profil/config.

### 3.6 Page Profil / Configuration

Accessible depuis nav bottom (onglet 3). Contient :

**Section Profil financier :**
- Revenu net mensuel
- Crédits existants (mensualités)
- Épargne disponible
- Taux d'endettement max (défaut 35%)
- → Affiche : capacité d'emprunt calculée, fourchette de prix cible

**Section Préférences de recherche :**
- Villes cibles
- Fourchette de budget
- Types de bien (ancien/neuf)

**Section Inputs par défaut :**
- Tableau éditable avec chaque paramètre et sa valeur
- Bouton "Réinitialiser les valeurs par défaut"

**Section Pondération du score :**
- Poids de chaque critère (tableau éditable)

---

## 4. Données & calculs manquants

### 4.1 Champs prioritaires à ajouter sur `properties`

| Champ | Priorité | Impact |
|---|---|---|
| `renovation_cost` (travaux) | **Haute** | Faux pour ~60% des biens anciens sans ça. Intégré dans `total_project_cost`. |
| `fiscal_regime` (micro_bic / lmnp_reel / micro_foncier / reel_foncier) | **Haute** | Change la renta de 2-3 points. |
| `dpe_rating` (A à G) | **Haute** | Critère éliminatoire : G interdit, F en 2028, E en 2034. |
| `interest_rate` (taux d'intérêt) | **Haute** | Paramètre fondamental. Pré-rempli depuis `user_profile.default_inputs`. |

### 4.2 Calculs prioritaires

| Calcul | Priorité | Description |
|---|---|---|
| **Rendement net-net** (après impôts) | **Haute** | `net_yield` actuel ignore la fiscalité. |
| **Simulation fiscale simplifiée** | **Haute** | Micro-BIC (abattement 50%) vs LMNP réel (amortissement). Différenciateur vs concurrence. |
| **Capacité d'emprunt** | **Haute** | Calculée depuis le profil. Indicateur vert/orange/rouge par bien. |
| **Indicateur loyer réaliste** | Moyenne | Croiser loyer annoncé vs observatoire des loyers. Alerter si loyer gonflé. |
| TRI | Moyenne | Métrique avancée intégrant cashflow + plus-value + fiscalité. |

### 4.3 Données socio-éco — Priorités

| Donnée | Priorité |
|---|---|
| **Tension locative** (ratio offre/demande) | Décisive |
| **Évolution démographique** | Décisive |
| Bassin d'emploi / taux de chômage | Important |
| Transports (gare/tram/métro) | Important |
| Universités / écoles supérieures | Important |
| Projets urbains | Important |
| Écoles primaires | Secondaire |
| Risques naturels | Secondaire |

### 4.4 Airbnb

**Décision : masquer par défaut.** Les champs Airbnb (`airbnb_price_per_night`, `airbnb_occupancy_rate`, `airbnb_charges`) et la section `AirbnbSection` sont visibles uniquement en mode avancé. Le primo-investisseur en location longue durée n'en a pas besoin.

---

## 5. Différenciateurs potentiels

| # | Feature | Valeur perçue | Effort |
|---|---|---|---|
| 1 | **Comparaison multi-biens côte à côte** | Très haute (tue le tableur Excel) | Élevé |
| 2 | **Simulation fiscale LMNP** | Très haute (payant chez la concurrence à 19€/mois) | Élevé |
| 3 | **Photo de rue → création de fiche géolocalisée** | Haute (use case terrain unique) | Moyen |
| 4 | **Mode photo guidé en visite** | Haute (remplace la checklist, naturel) | Moyen |
| 5 | **Alertes seuils personnalisés** | Haute (veille automatique) | Élevé |
| 6 | **Historique DVF du bien exact** | Haute (arme de négociation) | Moyen |
| 7 | **Suivi post-achat** | Moyenne (fidélisation long terme) | Élevé |

---

## 6. Synthèse des priorités

### Phase 1 — Fondations (quick wins)

| # | Action | Catégorie | Effort |
|---|---|---|---|
| 1 | Activer `PRAGMA foreign_keys = ON` | DB | 1 ligne |
| 2 | Créer table `user_profile` + page profil/config | DB+UI | Moyen |
| 3 | Corriger valeurs par défaut (20 ans, 3.5%, 13€/m² TF, 8% vacance) | DB | Faible |
| 4 | Nav bottom 3 onglets (Dashboard / Nouveau / Profil) | UI | Faible |
| 5 | Masquer section Airbnb par défaut | UI | Faible |
| 6 | Ajouter champs travaux + DPE + taux d'intérêt sur properties | DB | Faible |

### Phase 2 — Valeur métier

| # | Action | Catégorie | Effort |
|---|---|---|---|
| 7 | Simulation fiscale simplifiée (micro-BIC vs LMNP réel) | Feature | Élevé |
| 8 | Capacité d'emprunt (depuis profil) + indicateur budget par bien | Feature | Moyen |
| 9 | Page bien : 3 onglets + sticky header KPI | UI | Moyen |
| 10 | Champs dynamiques liés (cadenas + fond gris) | UI | Moyen |
| 11 | Nouveaux status (negotiation, under_contract, purchased) + is_favorite | DB | Faible |
| 12 | Mode débutant vs avancé + mini-guide contextuel "?" | UI | Moyen |

### Phase 3 — Photo & terrain

| # | Action | Catégorie | Effort |
|---|---|---|---|
| 13 | Table photos + stockage Vercel Blob | DB | Moyen |
| 14 | Photo de rue → création fiche géolocalisée | Feature | Moyen |
| 15 | Mode photo guidé en visite | Feature | Élevé |
| 16 | Galerie photos au niveau du bien (onglet Contexte) | UI | Moyen |
| 17 | Scoring 2 niveaux (financier 70% + terrain 30%) | Feature | Moyen |

### Phase 4 — Différenciation

| # | Action | Catégorie | Effort |
|---|---|---|---|
| 18 | Comparaison multi-biens côte à côte | Feature | Élevé |
| 19 | Historique DVF du bien exact | Feature | Moyen |
| 20 | Analyse photo IA | Feature | Élevé |
| 21 | Alertes seuils personnalisés | Feature | Élevé |
| 22 | Suivi post-achat | Feature | Élevé |
| 23 | Cache données socio-éco (table zone_data) | DB | Faible |
