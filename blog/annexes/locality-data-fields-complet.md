# Referentiel complet des champs LocalityDataFields

> Version 1.0 — 17 mars 2026
> Document de reference pour le pipeline blog -> donnees -> app (tiili.fr)

---

## Table des matieres

1. [Vue d'ensemble](#1-vue-densemble)
2. [Referentiel des champs par categorie](#2-referentiel-des-champs-par-categorie)
3. [Mapping article -> donnees](#3-mapping-article--donnees)
4. [Regles de validation](#4-regles-de-validation)
5. [Schema TypeScript cible](#5-schema-typescript-cible)

---

## 1. Vue d'ensemble

### Objectif

Collecter ~90 champs structures par localite francaise pour alimenter :
- **L'app tiili.fr** : simulations precises (rendement, cashflow, fiscalite)
- **Le blog** : articles data-driven uniques (SEO/GEO)
- **Les guides villes** : pages reference autogenerees

### Niveaux de priorite

| Priorite | Definition | Critere |
|----------|-----------|---------|
| **P0** | Impact direct sur les calculs app | Alimente `calculateAll()`, `getMarketData()`, `buildSocioDataFromLocality()`, scoring |
| **P1** | Valeur editoriale forte | Articles SEO uniques, guides villes, attractivite investisseur |
| **P2** | Completude long terme | Enrichissement progressif, differenciateur vs concurrence |

### Sources de donnees

| Code source | Description | Automatisable |
|-------------|-----------|---------------|
| `API_DVF` | Demandes de valeurs foncieres (data.gouv.fr) | Oui |
| `API_INSEE` | Donnees INSEE (recensement, revenus, emploi) | Oui |
| `API_GEORISQUES` | Georisques.gouv.fr (risques naturels, SEVESO, radon) | Oui |
| `API_ADEME` | DPE open data (diagnostics energetiques) | Oui |
| `API_ATMO` | Indices qualite de l'air (ATMO France) | Oui |
| `API_SNCF` | Gares et desserte TGV | Oui |
| `API_BAN` | Base Adresse Nationale (geocodage) | Oui |
| `OPENDATA_GOV` | Divers jeux data.gouv.fr (zonages fiscaux, ecoles, equipements) | Oui |
| `IA_BLOG` | Extraction IA depuis articles blog generes | Semi-auto |
| `IA_SCRAPING` | Scraping + IA depuis sources web (AirDNA, observatoires) | Semi-auto |
| `EDITORIAL` | Redaction editoriale (resumes, descriptions) | Manuel |
| `REFERENTIEL` | Tables de reference statiques (zones Pinel, ZRR) | Mise a jour annuelle |

### Frequences de mise a jour

| Code | Frequence | Cas d'usage |
|------|-----------|-------------|
| `ANNUELLE` | 1 fois/an | Prix, loyers, population, revenus, fiscalite |
| `SEMESTRIELLE` | 2 fois/an | Tendances, tensions marche, Airbnb |
| `TRIMESTRIELLE` | 4 fois/an | Actualites marche, projets urbains |
| `PONCTUELLE` | A la creation + quand change | Zonages fiscaux, gares, risques |
| `CONTINUE` | A chaque article pertinent | Enrichissement progressif par le blog |

---

## 2. Referentiel des champs par categorie

### 2.1 Prix immobilier (13 champs)

| # | Champ | Type | Description | Source(s) | Frequence | Priorite | Article(s) alimentant |
|---|-------|------|-------------|-----------|-----------|----------|-----------------------|
| 1 | `avg_purchase_price_per_m2` | `number` | Prix moyen achat au m2 (tous types confondus) | `API_DVF` | ANNUELLE | **P0** | Guide ville, Actu marche |
| 2 | `median_purchase_price_per_m2` | `number` | Prix median achat au m2 | `API_DVF` | ANNUELLE | **P0** | Guide ville, Actu marche |
| 3 | `transaction_count` | `number` | Nombre de transactions sur la periode | `API_DVF` | ANNUELLE | **P0** | Guide ville, Actu marche |
| 4 | `avg_price_studio_per_m2` | `number` | Prix moyen studio (T1) au m2 | `API_DVF`, `IA_BLOG` | ANNUELLE | **P0** | Guide ville, Article type bien |
| 5 | `avg_price_small_apt_per_m2` | `number` | Prix moyen petit appartement (T2-T3) au m2 | `API_DVF`, `IA_BLOG` | ANNUELLE | **P0** | Guide ville, Article type bien |
| 6 | `avg_price_large_apt_per_m2` | `number` | Prix moyen grand appartement (T4+) au m2 | `API_DVF`, `IA_BLOG` | ANNUELLE | **P0** | Guide ville |
| 7 | `avg_price_house_per_m2` | `number` | Prix moyen maison au m2 | `API_DVF`, `IA_BLOG` | ANNUELLE | **P0** | Guide ville |
| 8 | `price_trend_1y_pct` | `number` | Evolution des prix sur 1 an (%) | `API_DVF`, `IA_BLOG` | SEMESTRIELLE | **P0** | Actu marche, Guide ville |
| 9 | `price_trend_5y_pct` | `number` | Evolution des prix sur 5 ans (%) | `API_DVF` | ANNUELLE | **P1** | Guide ville |
| 10 | `avg_selling_time_days` | `number` | Delai moyen de vente (jours) | `IA_SCRAPING`, `IA_BLOG` | SEMESTRIELLE | **P1** | Actu marche, Guide ville |
| 11 | `new_construction_permits` | `number` | Nombre de permis de construire neufs (annuel) | `OPENDATA_GOV` | ANNUELLE | **P1** | Actu marche, Urbanisme |
| 12 | `price_per_m2_min` | `number` | Prix plancher au m2 constate | `API_DVF` | ANNUELLE | **P1** | Guide ville |
| 13 | `price_per_m2_max` | `number` | Prix plafond au m2 constate | `API_DVF` | ANNUELLE | **P1** | Guide ville |

### 2.2 Marche locatif (11 champs)

| # | Champ | Type | Description | Source(s) | Frequence | Priorite | Article(s) alimentant |
|---|-------|------|-------------|-----------|-----------|----------|-----------------------|
| 14 | `avg_rent_per_m2` | `number` | Loyer moyen nu au m2 | `OPENDATA_GOV`, `IA_BLOG` | ANNUELLE | **P0** | Guide ville, Loyers |
| 15 | `avg_rent_furnished_per_m2` | `number` | Loyer moyen meuble au m2 | `IA_BLOG`, `IA_SCRAPING` | ANNUELLE | **P0** | Guide ville, Loyers |
| 16 | `vacancy_rate` | `number` | Taux de vacance locative (%) | `API_INSEE`, `IA_BLOG` | ANNUELLE | **P0** | Guide ville, Marche locatif |
| 17 | `avg_rent_studio_per_m2` | `number` | Loyer moyen studio (T1) au m2 | `OPENDATA_GOV`, `IA_BLOG` | ANNUELLE | **P0** | Guide ville, Loyers |
| 18 | `avg_rent_small_apt_per_m2` | `number` | Loyer moyen T2-T3 au m2 | `OPENDATA_GOV`, `IA_BLOG` | ANNUELLE | **P0** | Guide ville, Loyers |
| 19 | `avg_rent_large_apt_per_m2` | `number` | Loyer moyen T4+ au m2 | `OPENDATA_GOV`, `IA_BLOG` | ANNUELLE | **P0** | Guide ville |
| 20 | `avg_rent_house_per_m2` | `number` | Loyer moyen maison au m2 | `OPENDATA_GOV`, `IA_BLOG` | ANNUELLE | **P0** | Guide ville |
| 21 | `rent_trend_1y_pct` | `number` | Evolution des loyers sur 1 an (%) | `IA_BLOG`, `IA_SCRAPING` | SEMESTRIELLE | **P0** | Actu marche, Loyers |
| 22 | `market_tension` | `enum` | Tension du marche locatif | `REFERENTIEL`, `IA_BLOG` | ANNUELLE | **P0** | Guide ville, Actu marche |
| 23 | `rent_control_zone` | `boolean` | Zone d'encadrement des loyers | `REFERENTIEL` | PONCTUELLE | **P0** | Guide ville, Fiscalite |
| 24 | `rent_ceiling_per_m2` | `number` | Plafond de loyer au m2 (si encadrement) | `REFERENTIEL`, `OPENDATA_GOV` | ANNUELLE | **P0** | Guide ville, Fiscalite |

### 2.3 Charges et taxes (4 champs)

| # | Champ | Type | Description | Source(s) | Frequence | Priorite | Article(s) alimentant |
|---|-------|------|-------------|-----------|-----------|----------|-----------------------|
| 25 | `avg_condo_charges_per_m2` | `number` | Charges copropriete moyennes mensuelles au m2 | `IA_BLOG`, `IA_SCRAPING` | ANNUELLE | **P0** | Guide ville |
| 26 | `avg_property_tax_per_m2` | `number` | Taxe fonciere moyenne annuelle au m2 | `IA_BLOG`, `OPENDATA_GOV` | ANNUELLE | **P0** | Guide ville, Fiscalite |
| 27 | `property_tax_rate_pct` | `number` | Taux de taxe fonciere communale (%) | `OPENDATA_GOV` | ANNUELLE | **P0** | Fiscalite, Guide ville |
| 28 | `housing_tax_rate_pct` | `number` | Taux de taxe d'habitation residences secondaires (%) | `OPENDATA_GOV` | ANNUELLE | **P1** | Fiscalite |

### 2.4 Airbnb / location courte duree (6 champs)

| # | Champ | Type | Description | Source(s) | Frequence | Priorite | Article(s) alimentant |
|---|-------|------|-------------|-----------|-----------|----------|-----------------------|
| 29 | `avg_airbnb_night_price` | `number` | Prix moyen nuitee Airbnb (EUR) | `IA_SCRAPING`, `IA_BLOG` | SEMESTRIELLE | **P0** | Guide ville, Airbnb |
| 30 | `avg_airbnb_occupancy_rate` | `number` | Taux d'occupation moyen Airbnb (%) | `IA_SCRAPING`, `IA_BLOG` | SEMESTRIELLE | **P0** | Guide ville, Airbnb |
| 31 | `airbnb_listing_count` | `number` | Nombre d'annonces Airbnb actives | `IA_SCRAPING` | SEMESTRIELLE | **P1** | Airbnb |
| 32 | `airbnb_regulation` | `string` | Reglementation locale LCD (texte libre) | `IA_BLOG`, `EDITORIAL` | PONCTUELLE | **P1** | Airbnb, Reglementation |
| 33 | `airbnb_avg_revenue_monthly` | `number` | Revenu mensuel moyen par annonce (EUR) | `IA_SCRAPING`, `IA_BLOG` | SEMESTRIELLE | **P0** | Airbnb, Guide ville |
| 34 | `max_lcd_nights_per_year` | `number` | Nombre max de nuitees LCD autorisees par an | `REFERENTIEL` | PONCTUELLE | **P0** | Airbnb, Reglementation |

### 2.5 Fiscalite et dispositifs (8 champs)

| # | Champ | Type | Description | Source(s) | Frequence | Priorite | Article(s) alimentant |
|---|-------|------|-------------|-----------|-----------|----------|-----------------------|
| 35 | `pinel_eligible` | `boolean` | Eligibilite dispositif Pinel/Pinel+ | `REFERENTIEL` | ANNUELLE | **P0** | Fiscalite, Guide ville |
| 36 | `pinel_zone` | `enum` | Zone Pinel (A_bis, A, B1, B2, C) | `REFERENTIEL` | PONCTUELLE | **P0** | Fiscalite, Guide ville |
| 37 | `denormandie_eligible` | `boolean` | Eligibilite dispositif Denormandie | `REFERENTIEL` | ANNUELLE | **P0** | Fiscalite, Guide ville |
| 38 | `zrr` | `boolean` | Zone de Revitalisation Rurale | `REFERENTIEL` | PONCTUELLE | **P1** | Fiscalite |
| 39 | `loc_avantages_eligible` | `boolean` | Eligibilite Loc'Avantages (ex-Cosse) | `REFERENTIEL` | ANNUELLE | **P1** | Fiscalite |
| 40 | `rent_ceiling_pinel` | `number` | Plafond de loyer Pinel au m2 (EUR) | `REFERENTIEL` | ANNUELLE | **P0** | Fiscalite |
| 41 | `opah_zone` | `boolean` | Zone OPAH (Operation Programmee Amelioration Habitat) | `REFERENTIEL`, `IA_BLOG` | PONCTUELLE | **P1** | Fiscalite, Renovation |
| 42 | `qpv_zone` | `boolean` | Quartier Prioritaire Ville (QPV) | `REFERENTIEL` | PONCTUELLE | **P1** | Fiscalite, Guide ville |

### 2.6 Demographie (9 champs)

| # | Champ | Type | Description | Source(s) | Frequence | Priorite | Article(s) alimentant |
|---|-------|------|-------------|-----------|-----------|----------|-----------------------|
| 43 | `population` | `number` | Population municipale | `API_INSEE` | ANNUELLE | **P0** | Guide ville |
| 44 | `population_growth_pct` | `number` | Croissance annuelle de la population (%) | `API_INSEE` | ANNUELLE | **P0** | Guide ville, Demographie |
| 45 | `median_income` | `number` | Revenu median annuel par UC (EUR) | `API_INSEE` | ANNUELLE | **P0** | Guide ville, Demographie |
| 46 | `poverty_rate` | `number` | Taux de pauvrete (%) | `API_INSEE` | ANNUELLE | **P1** | Guide ville, Demographie |
| 47 | `unemployment_rate` | `number` | Taux de chomage (%) | `API_INSEE` | ANNUELLE | **P0** | Guide ville, Demographie |
| 48 | `avg_age` | `number` | Age moyen de la population | `API_INSEE` | ANNUELLE | **P1** | Demographie, Guide ville |
| 49 | `student_population_pct` | `number` | Part des etudiants dans la population (%) | `API_INSEE`, `IA_BLOG` | ANNUELLE | **P1** | Demographie, Guide ville |
| 50 | `senior_population_pct` | `number` | Part des 65+ dans la population (%) | `API_INSEE` | ANNUELLE | **P1** | Demographie, Guide ville |
| 51 | `household_size_avg` | `number` | Taille moyenne des menages | `API_INSEE` | ANNUELLE | **P1** | Demographie |
| 52 | `net_migration_rate` | `number` | Solde migratoire (pour 1000 habitants) | `API_INSEE` | ANNUELLE | **P1** | Demographie, Guide ville |

### 2.7 Economie locale (5 champs)

| # | Champ | Type | Description | Source(s) | Frequence | Priorite | Article(s) alimentant |
|---|-------|------|-------------|-----------|-----------|----------|-----------------------|
| 53 | `main_employers` | `string[]` | Principaux employeurs de la commune | `IA_BLOG`, `EDITORIAL` | ANNUELLE | **P1** | Guide ville, Economie |
| 54 | `economic_sectors` | `string[]` | Secteurs economiques dominants | `API_INSEE`, `IA_BLOG` | ANNUELLE | **P1** | Guide ville, Economie |
| 55 | `business_creation_rate` | `number` | Taux de creation d'entreprises (%) | `API_INSEE` | ANNUELLE | **P1** | Economie, Guide ville |
| 56 | `job_market_dynamism` | `enum` | Dynamisme du marche de l'emploi | `IA_BLOG`, `EDITORIAL` | ANNUELLE | **P1** | Guide ville, Economie |
| 57 | `total_jobs` | `number` | Nombre total d'emplois dans la commune | `API_INSEE` | ANNUELLE | **P1** | Economie |

### 2.8 Qualite de vie (9 champs)

| # | Champ | Type | Description | Source(s) | Frequence | Priorite | Article(s) alimentant |
|---|-------|------|-------------|-----------|-----------|----------|-----------------------|
| 58 | `air_quality_index` | `number` | Indice qualite de l'air (1-6, norme ATMO) | `API_ATMO` | ANNUELLE | **P1** | Qualite de vie, Guide ville |
| 59 | `green_space_pct` | `number` | Part d'espaces verts (% superficie) | `OPENDATA_GOV`, `IA_BLOG` | PONCTUELLE | **P1** | Qualite de vie |
| 60 | `noise_level_score` | `number` | Score de nuisance sonore (1-10, 1=calme) | `OPENDATA_GOV`, `IA_BLOG` | PONCTUELLE | **P2** | Qualite de vie |
| 61 | `safety_score` | `number` | Score de securite (1-100, 100=tres sur) | `OPENDATA_GOV`, `IA_BLOG` | ANNUELLE | **P1** | Qualite de vie, Guide ville |
| 62 | `healthcare_density` | `number` | Medecins generalistes pour 10 000 habitants | `OPENDATA_GOV`, `IA_BLOG` | ANNUELLE | **P1** | Qualite de vie, Guide ville |
| 63 | `cultural_venues_count` | `number` | Nombre d'equipements culturels | `OPENDATA_GOV` | PONCTUELLE | **P2** | Qualite de vie |
| 64 | `sport_facilities_count` | `number` | Nombre d'equipements sportifs | `OPENDATA_GOV` | PONCTUELLE | **P2** | Qualite de vie |
| 65 | `life_quality_ranking` | `number` | Classement qualite de vie (rang national parmi les villes) | `IA_BLOG`, `IA_SCRAPING` | ANNUELLE | **P1** | Qualite de vie, Guide ville |
| 66 | `sunshine_hours_year` | `number` | Heures d'ensoleillement par an | `OPENDATA_GOV` | PONCTUELLE | **P2** | Qualite de vie |

### 2.9 Transports (8 champs)

| # | Champ | Type | Description | Source(s) | Frequence | Priorite | Article(s) alimentant |
|---|-------|------|-------------|-----------|-----------|----------|-----------------------|
| 67 | `public_transport_score` | `number` | Score transports en commun (0-100) | `IA_BLOG`, `OPENDATA_GOV` | ANNUELLE | **P0** | Guide ville, Transports |
| 68 | `transport_details` | `string` | Description des reseaux locaux (metro, tram, bus) | `IA_BLOG`, `EDITORIAL` | PONCTUELLE | **P1** | Guide ville, Transports |
| 69 | `train_station` | `boolean` | Presence d'une gare ferroviaire | `API_SNCF` | PONCTUELLE | **P1** | Guide ville, Transports |
| 70 | `tgv_station` | `boolean` | Presence d'une gare TGV | `API_SNCF` | PONCTUELLE | **P1** | Guide ville, Transports |
| 71 | `airport_nearby` | `boolean` | Aeroport a moins de 60 min | `OPENDATA_GOV` | PONCTUELLE | **P2** | Transports |
| 72 | `commute_to_nearest_metropole_min` | `number` | Temps de trajet vers la metropole la plus proche (min) | `IA_BLOG`, `EDITORIAL` | PONCTUELLE | **P1** | Guide ville, Transports |
| 73 | `bike_score` | `number` | Score velo-friendly (0-100) | `IA_BLOG`, `OPENDATA_GOV` | ANNUELLE | **P2** | Qualite de vie, Transports |
| 74 | `nearest_metropole_name` | `string` | Nom de la metropole la plus proche | `REFERENTIEL` | PONCTUELLE | **P1** | Guide ville |

### 2.10 Education (7 champs)

| # | Champ | Type | Description | Source(s) | Frequence | Priorite | Article(s) alimentant |
|---|-------|------|-------------|-----------|-----------|----------|-----------------------|
| 75 | `school_count` | `number` | Nombre total d'etablissements scolaires | `OPENDATA_GOV` | ANNUELLE | **P1** | Guide ville |
| 76 | `university_nearby` | `boolean` | Universite a proximite (commune ou agglo) | `OPENDATA_GOV` | PONCTUELLE | **P0** | Guide ville |
| 77 | `nursery_count` | `number` | Nombre de creches | `OPENDATA_GOV` | ANNUELLE | **P2** | Guide ville |
| 78 | `primary_school_count` | `number` | Nombre d'ecoles primaires | `OPENDATA_GOV` | ANNUELLE | **P2** | Guide ville |
| 79 | `secondary_school_count` | `number` | Nombre de colleges et lycees | `OPENDATA_GOV` | ANNUELLE | **P2** | Guide ville |
| 80 | `higher_education_institutions` | `number` | Nombre d'etablissements d'enseignement superieur | `OPENDATA_GOV`, `IA_BLOG` | ANNUELLE | **P2** | Guide ville |
| 81 | `school_quality_score` | `number` | Score qualite scolaire (0-100, base taux reussite bac/brevet) | `OPENDATA_GOV`, `IA_BLOG` | ANNUELLE | **P1** | Guide ville |

### 2.11 Parc immobilier (7 champs)

| # | Champ | Type | Description | Source(s) | Frequence | Priorite | Article(s) alimentant |
|---|-------|------|-------------|-----------|-----------|----------|-----------------------|
| 82 | `housing_stock_count` | `number` | Nombre total de logements | `API_INSEE` | ANNUELLE | **P2** | Guide ville |
| 83 | `social_housing_pct` | `number` | Part de logements sociaux (%) | `OPENDATA_GOV` | ANNUELLE | **P1** | Guide ville |
| 84 | `owner_occupier_pct` | `number` | Part de proprietaires occupants (%) | `API_INSEE` | ANNUELLE | **P1** | Guide ville |
| 85 | `vacant_housing_pct` | `number` | Part de logements vacants (%) | `API_INSEE` | ANNUELLE | **P0** | Guide ville |
| 86 | `avg_housing_age` | `number` | Anciennete moyenne du bati (annees) | `API_INSEE` | PONCTUELLE | **P2** | Guide ville |
| 87 | `avg_dpe_rating` | `string` | Note DPE moyenne (lettre A-G) | `API_ADEME` | ANNUELLE | **P1** | Guide ville, DPE |
| 88 | `dpe_distribution` | `object` | Repartition DPE (% par lettre A-G) | `API_ADEME` | ANNUELLE | **P2** | Guide ville, DPE |

### 2.12 Risques et environnement (10 champs)

| # | Champ | Type | Description | Source(s) | Frequence | Priorite | Article(s) alimentant |
|---|-------|------|-------------|-----------|-----------|----------|-----------------------|
| 89 | `risk_level` | `enum` | Niveau de risque global synthetise | `API_GEORISQUES`, `IA_BLOG` | PONCTUELLE | **P0** | Guide ville |
| 90 | `natural_risks` | `array` | Liste des risques naturels identifies | `API_GEORISQUES` | PONCTUELLE | **P0** | Guide ville, Risques |
| 91 | `flood_risk_level` | `enum` | Niveau de risque inondation | `API_GEORISQUES` | PONCTUELLE | **P1** | Risques, Guide ville |
| 92 | `seismic_zone` | `number` | Zone sismique (1-5) | `API_GEORISQUES` | PONCTUELLE | **P2** | Risques |
| 93 | `industrial_risk` | `boolean` | Presence de sites SEVESO | `API_GEORISQUES` | PONCTUELLE | **P1** | Risques |
| 94 | `radon_level` | `number` | Potentiel radon (1-3) | `API_GEORISQUES` | PONCTUELLE | **P2** | Risques |
| 95 | `soil_pollution_sites` | `number` | Nombre de sites pollues recenses (BASOL/SIS) | `API_GEORISQUES` | PONCTUELLE | **P2** | Risques |
| 96 | `coastal_erosion_risk` | `boolean` | Risque d'erosion cotiere | `API_GEORISQUES` | PONCTUELLE | **P2** | Risques |
| 97 | `clay_shrinkage_risk` | `enum` | Risque retrait-gonflement des argiles | `API_GEORISQUES` | PONCTUELLE | **P1** | Risques, Guide ville |
| 98 | `climate_risk_score` | `number` | Score synthetique risque climatique (0-100) | `IA_BLOG`, `API_GEORISQUES` | ANNUELLE | **P1** | Risques |

### 2.13 Urbanisme et projets (5 champs)

| # | Champ | Type | Description | Source(s) | Frequence | Priorite | Article(s) alimentant |
|---|-------|------|-------------|-----------|-----------|----------|-----------------------|
| 99 | `major_urban_projects` | `string[]` | Grands projets urbains en cours ou a venir | `IA_BLOG`, `EDITORIAL` | TRIMESTRIELLE | **P1** | Urbanisme, Guide ville |
| 100 | `heritage_protection_zone` | `boolean` | Zone de protection du patrimoine (ABF, SPR) | `REFERENTIEL` | PONCTUELLE | **P1** | Guide ville |
| 101 | `future_transport_projects` | `string[]` | Projets de transport en cours ou planifies | `IA_BLOG`, `EDITORIAL` | TRIMESTRIELLE | **P1** | Transports, Urbanisme |
| 102 | `neighborhood_vibe` | `string` | Description de l'ambiance/caractere du lieu | `IA_BLOG`, `EDITORIAL` | PONCTUELLE | **P1** | Guide ville |
| 103 | `investment_opportunity_summary` | `string` | Resume synthetique pour investisseurs (genere IA) | `IA_BLOG` | SEMESTRIELLE | **P1** | Guide ville |

---

## 3. Mapping article -> donnees

### 3.1 Types d'articles et champs alimentes

#### Article "Guide ville" (template principal)

Le guide complet d'une ville pour l'investissement locatif. C'est l'article le plus riche en donnees.

**Champs alimentes (40+ champs) :**

| Categorie | Champs |
|-----------|--------|
| Prix immobilier | `avg_purchase_price_per_m2`, `median_purchase_price_per_m2`, `transaction_count`, `avg_price_studio_per_m2`, `avg_price_small_apt_per_m2`, `avg_price_large_apt_per_m2`, `avg_price_house_per_m2`, `price_trend_1y_pct`, `price_trend_5y_pct`, `price_per_m2_min`, `price_per_m2_max` |
| Marche locatif | `avg_rent_per_m2`, `avg_rent_furnished_per_m2`, `vacancy_rate`, `avg_rent_studio_per_m2`, `avg_rent_small_apt_per_m2`, `market_tension`, `rent_control_zone` |
| Charges | `avg_condo_charges_per_m2`, `avg_property_tax_per_m2`, `property_tax_rate_pct` |
| Airbnb | `avg_airbnb_night_price`, `avg_airbnb_occupancy_rate`, `airbnb_avg_revenue_monthly` |
| Demographie | `population`, `population_growth_pct`, `median_income`, `unemployment_rate` |
| Transports | `public_transport_score`, `transport_details`, `commute_to_nearest_metropole_min` |
| Qualite de vie | `safety_score`, `healthcare_density`, `life_quality_ranking` |
| Fiscalite | `pinel_eligible`, `pinel_zone`, `denormandie_eligible` |
| Risques | `risk_level`, `natural_risks`, `flood_risk_level` |
| Editorial | `neighborhood_vibe`, `investment_opportunity_summary` |

#### Article "Actualite marche immobilier"

Mise a jour trimestrielle sur les tendances du marche dans une ou plusieurs villes.

**Champs alimentes (8-12 champs) :**
- `price_trend_1y_pct`
- `rent_trend_1y_pct`
- `avg_purchase_price_per_m2` (mise a jour)
- `avg_rent_per_m2` (mise a jour)
- `market_tension`
- `avg_selling_time_days`
- `transaction_count`
- `new_construction_permits`
- `vacancy_rate` (mise a jour)
- `vacant_housing_pct` (mise a jour)

#### Article "Fiscalite et dispositifs"

Cadrage fiscal et aide a l'investissement (Pinel, Denormandie, LMNP, etc.).

**Champs alimentes (10-12 champs) :**
- `property_tax_rate_pct`
- `housing_tax_rate_pct`
- `pinel_eligible`, `pinel_zone`, `rent_ceiling_pinel`
- `denormandie_eligible`
- `zrr`
- `loc_avantages_eligible`
- `opah_zone`, `qpv_zone`
- `rent_control_zone`, `rent_ceiling_per_m2`

#### Article "Location courte duree / Airbnb"

Focus sur la location saisonniere dans une ville ou region.

**Champs alimentes (6-8 champs) :**
- `avg_airbnb_night_price`
- `avg_airbnb_occupancy_rate`
- `airbnb_listing_count`
- `airbnb_regulation`
- `airbnb_avg_revenue_monthly`
- `max_lcd_nights_per_year`
- `market_tension`

#### Article "Demographie et economie"

Analyse des dynamiques demographiques et economiques d'une ville.

**Champs alimentes (12-15 champs) :**
- `population`, `population_growth_pct`
- `median_income`, `poverty_rate`, `unemployment_rate`
- `avg_age`, `student_population_pct`, `senior_population_pct`
- `household_size_avg`, `net_migration_rate`
- `main_employers`, `economic_sectors`
- `business_creation_rate`, `job_market_dynamism`, `total_jobs`

#### Article "Transports et mobilite"

Focus sur l'accessibilite et les projets de transport.

**Champs alimentes (8-10 champs) :**
- `public_transport_score`
- `transport_details`
- `train_station`, `tgv_station`, `airport_nearby`
- `commute_to_nearest_metropole_min`
- `bike_score`
- `nearest_metropole_name`
- `future_transport_projects`

#### Article "Risques et environnement"

Analyse des risques naturels et pollution.

**Champs alimentes (10+ champs) :**
- `risk_level`, `natural_risks`
- `flood_risk_level`, `seismic_zone`
- `industrial_risk`, `radon_level`
- `soil_pollution_sites`, `coastal_erosion_risk`
- `clay_shrinkage_risk`, `climate_risk_score`
- `air_quality_index`

#### Article "Qualite de vie"

Classement et comparaison de la qualite de vie entre villes.

**Champs alimentes (9-11 champs) :**
- `air_quality_index`, `green_space_pct`
- `noise_level_score`, `safety_score`
- `healthcare_density`
- `cultural_venues_count`, `sport_facilities_count`
- `life_quality_ranking`, `sunshine_hours_year`
- `school_quality_score`

#### Article "Urbanisme et grands projets"

Projets urbains, renovation, nouvelles infrastructures.

**Champs alimentes (5-7 champs) :**
- `major_urban_projects`
- `future_transport_projects`
- `heritage_protection_zone`
- `new_construction_permits`
- `opah_zone`
- `neighborhood_vibe`

#### Article "DPE et renovation energetique"

Focus sur la performance energetique du parc immobilier.

**Champs alimentes (4-6 champs) :**
- `avg_dpe_rating`, `dpe_distribution`
- `avg_housing_age`
- `opah_zone`
- `housing_stock_count`

#### Article "Loyers par type de bien"

Comparaison detaillee des loyers par typologie.

**Champs alimentes (8-10 champs) :**
- `avg_rent_per_m2`, `avg_rent_furnished_per_m2`
- `avg_rent_studio_per_m2`, `avg_rent_small_apt_per_m2`
- `avg_rent_large_apt_per_m2`, `avg_rent_house_per_m2`
- `rent_trend_1y_pct`
- `market_tension`, `vacancy_rate`
- `rent_control_zone`, `rent_ceiling_per_m2`

### 3.2 Matrice synthetique article -> categorie de champs

| Type d'article | Prix | Loyers | Charges | Airbnb | Fiscalite | Demo. | Eco. | Qual. vie | Transports | Educ. | Parc | Risques | Urba. |
|---------------|------|--------|---------|--------|-----------|-------|------|-----------|------------|-------|------|---------|-------|
| Guide ville | +++ | +++ | ++ | ++ | ++ | ++ | + | ++ | ++ | + | + | ++ | + |
| Actu marche | +++ | ++ | - | - | - | - | - | - | - | - | - | - | + |
| Fiscalite | - | + | ++ | - | +++ | - | - | - | - | - | - | - | + |
| Airbnb/LCD | - | - | - | +++ | - | - | - | - | - | - | - | - | + |
| Demographie | - | - | - | - | - | +++ | +++ | + | - | - | - | - | - |
| Transports | - | - | - | - | - | - | - | - | +++ | - | - | - | ++ |
| Risques | - | - | - | - | - | - | - | + | - | - | - | +++ | - |
| Qualite vie | - | - | - | - | - | - | - | +++ | + | + | - | + | - |
| Urbanisme | + | - | - | - | + | - | - | - | ++ | - | + | - | +++ |
| DPE/Reno | - | - | - | - | + | - | - | - | - | - | +++ | - | + |
| Loyers type | - | +++ | - | - | + | - | - | - | - | - | - | - | - |

Legende : `+++` = source principale, `++` = source secondaire, `+` = quelques champs, `-` = non concerne

---

## 4. Regles de validation

### 4.1 Bornes par champ

#### Prix immobilier

| Champ | Min | Max | Unite | Coherence |
|-------|-----|-----|-------|-----------|
| `avg_purchase_price_per_m2` | 200 | 25 000 | EUR/m2 | >= `price_per_m2_min`, <= `price_per_m2_max` |
| `median_purchase_price_per_m2` | 200 | 25 000 | EUR/m2 | Ecart < 50% avec avg |
| `transaction_count` | 0 | 500 000 | nombre | Proportionnel a la population (ratio 0.5-5%) |
| `avg_price_studio_per_m2` | 500 | 30 000 | EUR/m2 | >= avg general (les studios sont plus chers au m2) |
| `avg_price_small_apt_per_m2` | 300 | 25 000 | EUR/m2 | Proche du avg general (+/- 30%) |
| `avg_price_large_apt_per_m2` | 200 | 22 000 | EUR/m2 | <= avg small apt (decote grands volumes) |
| `avg_price_house_per_m2` | 200 | 20 000 | EUR/m2 | Generalement < avg apt (sauf zones rurales) |
| `price_trend_1y_pct` | -30 | 50 | % | Rarement > +/- 15% en France metropolitaine |
| `price_trend_5y_pct` | -50 | 150 | % | Cumule, coherent avec 5x trend 1y (ordre de grandeur) |
| `avg_selling_time_days` | 10 | 365 | jours | Inversement correle a `market_tension` |
| `new_construction_permits` | 0 | 50 000 | nombre | Proportionnel a la population |
| `price_per_m2_min` | 100 | 20 000 | EUR/m2 | < `avg_purchase_price_per_m2` |
| `price_per_m2_max` | 500 | 50 000 | EUR/m2 | > `avg_purchase_price_per_m2` |

#### Marche locatif

| Champ | Min | Max | Unite | Coherence |
|-------|-----|-----|-------|-----------|
| `avg_rent_per_m2` | 3 | 50 | EUR/m2/mois | < `avg_rent_furnished_per_m2` |
| `avg_rent_furnished_per_m2` | 5 | 65 | EUR/m2/mois | > `avg_rent_per_m2` (ecart typique +15% a +40%) |
| `vacancy_rate` | 0 | 30 | % | Inversement correle a `market_tension` |
| `avg_rent_studio_per_m2` | 5 | 60 | EUR/m2/mois | >= avg general (plus cher au m2 en petit) |
| `avg_rent_small_apt_per_m2` | 4 | 45 | EUR/m2/mois | Proche avg general |
| `avg_rent_large_apt_per_m2` | 3 | 35 | EUR/m2/mois | <= avg small apt |
| `avg_rent_house_per_m2` | 3 | 30 | EUR/m2/mois | Generalement <= avg apt |
| `rent_trend_1y_pct` | -15 | 30 | % | Rarement > +/- 10% en France metropolitaine |
| `market_tension` | — | — | enum | Si `vacancy_rate` < 3% => `tendu`, > 8% => `detendu` |
| `rent_control_zone` | — | — | boolean | Vrai uniquement pour Paris, Lyon, Lille, Montpellier, Bordeaux, etc. |
| `rent_ceiling_per_m2` | 5 | 50 | EUR/m2/mois | Seulement si `rent_control_zone` = true |

#### Charges et taxes

| Champ | Min | Max | Unite | Coherence |
|-------|-----|-----|-------|-----------|
| `avg_condo_charges_per_m2` | 0.5 | 10 | EUR/m2/mois | Plus eleve en zone urbaine |
| `avg_property_tax_per_m2` | 1 | 30 | EUR/m2/an | Coherent avec `property_tax_rate_pct` |
| `property_tax_rate_pct` | 10 | 80 | % | Taux communal + intercommunal + departemental |
| `housing_tax_rate_pct` | 0 | 60 | % | 0 si pas de surtaxe residences secondaires |

#### Airbnb

| Champ | Min | Max | Unite | Coherence |
|-------|-----|-----|-------|-----------|
| `avg_airbnb_night_price` | 20 | 500 | EUR/nuit | Coherent avec loyer mensuel / 20-25 nuits |
| `avg_airbnb_occupancy_rate` | 10 | 95 | % | Moyenne nationale ~55-65% |
| `airbnb_listing_count` | 0 | 100 000 | nombre | Proportionnel a la population et au tourisme |
| `airbnb_regulation` | — | — | string | max 500 caracteres |
| `airbnb_avg_revenue_monthly` | 100 | 15 000 | EUR/mois | = night_price * 30 * occupancy_rate (approx) |
| `max_lcd_nights_per_year` | 0 | 365 | jours | 120 par defaut (loi ELAN), 0 si interdit |

#### Fiscalite

| Champ | Min | Max | Unite | Coherence |
|-------|-----|-----|-------|-----------|
| `pinel_eligible` | — | — | boolean | Si true, `pinel_zone` obligatoire |
| `pinel_zone` | — | — | enum | A_bis, A, B1, B2, C |
| `denormandie_eligible` | — | — | boolean | Villes Action Coeur de Ville |
| `zrr` | — | — | boolean | Exclusif avec zones Pinel A/A_bis |
| `loc_avantages_eligible` | — | — | boolean | — |
| `rent_ceiling_pinel` | 5 | 20 | EUR/m2/mois | Depend de `pinel_zone` |
| `opah_zone` | — | — | boolean | — |
| `qpv_zone` | — | — | boolean | — |

#### Demographie

| Champ | Min | Max | Unite | Coherence |
|-------|-----|-----|-------|-----------|
| `population` | 50 | 2 200 000 | habitants | Paris = cas particulier (~2.1M) |
| `population_growth_pct` | -5 | 10 | %/an | > 2% = exceptionnel |
| `median_income` | 10 000 | 80 000 | EUR/an/UC | Moyenne nationale ~22 000 EUR |
| `poverty_rate` | 2 | 60 | % | Moyenne nationale ~14% |
| `unemployment_rate` | 2 | 35 | % | Moyenne nationale ~7.5% |
| `avg_age` | 25 | 60 | ans | Moyenne nationale ~42 ans |
| `student_population_pct` | 0 | 40 | % | > 15% = ville tres etudiante |
| `senior_population_pct` | 5 | 50 | % | Moyenne nationale ~20% |
| `household_size_avg` | 1.2 | 4.0 | personnes | Moyenne nationale ~2.2 |
| `net_migration_rate` | -30 | 30 | pour 1000 | Positif = ville attractive |

#### Economie locale

| Champ | Min | Max | Unite | Coherence |
|-------|-----|-----|-------|-----------|
| `main_employers` | — | — | string[] | max 10 elements, max 100 chars chacun |
| `economic_sectors` | — | — | string[] | max 10 elements |
| `business_creation_rate` | 0 | 30 | % | Moyenne nationale ~15% |
| `job_market_dynamism` | — | — | enum | Coherent avec `unemployment_rate` |
| `total_jobs` | 0 | 2 000 000 | nombre | Proportionnel a la population |

#### Qualite de vie

| Champ | Min | Max | Unite | Coherence |
|-------|-----|-----|-------|-----------|
| `air_quality_index` | 1 | 6 | indice ATMO | 1 = bon, 6 = tres mauvais |
| `green_space_pct` | 0 | 80 | % | Plus eleve en zone rurale |
| `noise_level_score` | 1 | 10 | score | 1 = calme, 10 = tres bruyant |
| `safety_score` | 0 | 100 | score | 100 = tres sur |
| `healthcare_density` | 0 | 50 | pour 10 000 hab | Moyenne nationale ~8-10 |
| `cultural_venues_count` | 0 | 1 000 | nombre | Proportionnel a la population |
| `sport_facilities_count` | 0 | 5 000 | nombre | Proportionnel a la population |
| `life_quality_ranking` | 1 | 500 | rang | Classement national |
| `sunshine_hours_year` | 1 400 | 3 000 | heures | Lille ~1600, Nice ~2800 |

#### Transports

| Champ | Min | Max | Unite | Coherence |
|-------|-----|-----|-------|-----------|
| `public_transport_score` | 0 | 100 | score | 100 = excellente desserte |
| `transport_details` | — | — | string | max 1000 caracteres |
| `train_station` | — | — | boolean | — |
| `tgv_station` | — | — | boolean | Si `tgv_station` = true, `train_station` doit etre true |
| `airport_nearby` | — | — | boolean | A moins de 60 min en voiture |
| `commute_to_nearest_metropole_min` | 0 | 300 | minutes | 0 si la ville EST une metropole |
| `bike_score` | 0 | 100 | score | 100 = tres velo-friendly |
| `nearest_metropole_name` | — | — | string | max 100 caracteres |

#### Education

| Champ | Min | Max | Unite | Coherence |
|-------|-----|-----|-------|-----------|
| `school_count` | 0 | 2 000 | nombre | = nursery + primary + secondary + higher (approx) |
| `university_nearby` | — | — | boolean | Coherent avec `higher_education_institutions` > 0 |
| `nursery_count` | 0 | 500 | nombre | — |
| `primary_school_count` | 0 | 1 000 | nombre | — |
| `secondary_school_count` | 0 | 500 | nombre | — |
| `higher_education_institutions` | 0 | 100 | nombre | — |
| `school_quality_score` | 0 | 100 | score | Base sur taux reussite bac/brevet |

#### Parc immobilier

| Champ | Min | Max | Unite | Coherence |
|-------|-----|-----|-------|-----------|
| `housing_stock_count` | 20 | 1 500 000 | nombre | Coherent avec population / household_size |
| `social_housing_pct` | 0 | 80 | % | Objectif loi SRU = 25% |
| `owner_occupier_pct` | 10 | 90 | % | + `social_housing_pct` + `vacant_housing_pct` <= 100 |
| `vacant_housing_pct` | 0 | 40 | % | Coherent avec `vacancy_rate` locatif (mais different) |
| `avg_housing_age` | 0 | 200 | ans | Age median du parc |
| `avg_dpe_rating` | — | — | string | Lettre A-G |
| `dpe_distribution` | — | — | object | Somme des % = 100% |

#### Risques

| Champ | Min | Max | Unite | Coherence |
|-------|-----|-----|-------|-----------|
| `risk_level` | — | — | enum | Synthese des risques individuels |
| `natural_risks` | — | — | array | Max 20 elements |
| `flood_risk_level` | — | — | enum | Doit etre dans `natural_risks` si > `nul` |
| `seismic_zone` | 1 | 5 | zone | 1 = tres faible, 5 = forte |
| `industrial_risk` | — | — | boolean | — |
| `radon_level` | 1 | 3 | categorie | 1 = faible, 3 = significatif |
| `soil_pollution_sites` | 0 | 100 | nombre | — |
| `coastal_erosion_risk` | — | — | boolean | Seulement pour les communes littorales |
| `clay_shrinkage_risk` | — | — | enum | — |
| `climate_risk_score` | 0 | 100 | score | Synthese multi-risques climatiques |

#### Urbanisme

| Champ | Min | Max | Unite | Coherence |
|-------|-----|-----|-------|-----------|
| `major_urban_projects` | — | — | string[] | Max 10 elements, max 200 chars chacun |
| `heritage_protection_zone` | — | — | boolean | — |
| `future_transport_projects` | — | — | string[] | Max 10 elements, max 200 chars chacun |
| `neighborhood_vibe` | — | — | string | Max 500 caracteres |
| `investment_opportunity_summary` | — | — | string | Max 1000 caracteres |

### 4.2 Regles de coherence inter-champs

```
1. PRIX
   avg_purchase_price_per_m2 doit etre compris entre price_per_m2_min et price_per_m2_max
   |median - avg| / avg < 0.5  (ecart median/moyen < 50%)
   avg_price_studio_per_m2 >= avg_price_small_apt_per_m2 >= avg_price_large_apt_per_m2

2. LOYERS
   avg_rent_per_m2 < avg_rent_furnished_per_m2  (marge meuble +15% a +40%)
   avg_rent_studio_per_m2 >= avg_rent_small_apt_per_m2 >= avg_rent_large_apt_per_m2
   Si rent_control_zone = true, rent_ceiling_per_m2 doit etre renseigne

3. RENDEMENT IMPLICITE
   rendement_brut_implicite = (avg_rent_per_m2 * 12) / avg_purchase_price_per_m2 * 100
   Doit etre entre 2% et 15% (alerte si hors bornes)

4. TENSION MARCHE
   Si vacancy_rate < 3% => market_tension doit etre "tendu"
   Si vacancy_rate > 8% => market_tension doit etre "detendu"
   Si market_tension = "tendu", avg_selling_time_days < 120 (attendu)

5. AIRBNB
   airbnb_avg_revenue_monthly ≈ avg_airbnb_night_price * 30 * (avg_airbnb_occupancy_rate / 100)
   Tolerance : +/- 30%

6. FISCALITE
   Si pinel_eligible = true, pinel_zone != null
   Si pinel_zone in ["A_bis", "A"], zrr doit etre false
   Si rent_control_zone = true, rent_ceiling_per_m2 > 0

7. DEMOGRAPHIE
   student_population_pct + senior_population_pct < 80  (reste de la population active)
   Si university_nearby = true, higher_education_institutions >= 1
   housing_stock_count ≈ population / household_size_avg (tolerance +/- 40%)

8. TRANSPORTS
   Si tgv_station = true, train_station doit etre true
   Si commute_to_nearest_metropole_min = 0, la ville elle-meme est une metropole

9. PARC IMMOBILIER
   owner_occupier_pct + social_housing_pct + vacant_housing_pct <= 100
   Somme dpe_distribution (A+B+C+D+E+F+G) = 100%
   avg_dpe_rating coherent avec le mode de dpe_distribution

10. RISQUES
    Si flood_risk_level != "nul", il doit apparaitre dans natural_risks
    Si industrial_risk = true, un risque technologique doit apparaitre dans natural_risks
    coastal_erosion_risk = true seulement si commune littorale (a verifier avec geo)
```

---

## 5. Schema TypeScript cible

Le type complet pret a remplacer `LocalityDataFields` dans `src/domains/locality/types.ts`.

```typescript
/**
 * All metrics stored per locality snapshot.
 * Every field is optional — fallback to parent for missing fields.
 *
 * ~103 champs organises en 13 categories.
 * Conventions :
 *   - Prix et loyers en EUR (pas de centimes pour les prix au m2)
 *   - Pourcentages en valeur absolue (ex: 5.2 pour 5.2%, pas 0.052)
 *   - Scores normalises sur 0-100 sauf mention contraire
 *   - Textes libres en francais, max longueur indiquee en commentaire
 */
export interface LocalityDataFields {
  // ── Prix immobilier ──────────────────────────────────────────────────
  /** Prix moyen achat au m2 (EUR), tous types confondus. Source: DVF. */
  avg_purchase_price_per_m2?: number | null;
  /** Prix median achat au m2 (EUR). Source: DVF. */
  median_purchase_price_per_m2?: number | null;
  /** Nombre de transactions immobilieres sur la periode. Source: DVF. */
  transaction_count?: number | null;
  /** Prix moyen studio (T1) au m2 (EUR). Source: DVF. */
  avg_price_studio_per_m2?: number | null;
  /** Prix moyen petit appartement (T2-T3) au m2 (EUR). Source: DVF. */
  avg_price_small_apt_per_m2?: number | null;
  /** Prix moyen grand appartement (T4+) au m2 (EUR). Source: DVF. */
  avg_price_large_apt_per_m2?: number | null;
  /** Prix moyen maison au m2 (EUR). Source: DVF. */
  avg_price_house_per_m2?: number | null;
  /** Evolution des prix sur 1 an (%). Ex: -2.5 = baisse de 2.5%. */
  price_trend_1y_pct?: number | null;
  /** Evolution des prix sur 5 ans (%). Cumulee. */
  price_trend_5y_pct?: number | null;
  /** Delai moyen de vente en jours. */
  avg_selling_time_days?: number | null;
  /** Nombre de permis de construire neufs (annuel). */
  new_construction_permits?: number | null;
  /** Prix plancher au m2 constate (EUR). */
  price_per_m2_min?: number | null;
  /** Prix plafond au m2 constate (EUR). */
  price_per_m2_max?: number | null;

  // ── Marche locatif ───────────────────────────────────────────────────
  /** Loyer moyen location nue au m2/mois (EUR). */
  avg_rent_per_m2?: number | null;
  /** Loyer moyen location meublee au m2/mois (EUR). */
  avg_rent_furnished_per_m2?: number | null;
  /** Taux de vacance locative (%). Ex: 5.0 = 5%. */
  vacancy_rate?: number | null;
  /** Loyer moyen studio (T1) au m2/mois (EUR). */
  avg_rent_studio_per_m2?: number | null;
  /** Loyer moyen T2-T3 au m2/mois (EUR). */
  avg_rent_small_apt_per_m2?: number | null;
  /** Loyer moyen T4+ au m2/mois (EUR). */
  avg_rent_large_apt_per_m2?: number | null;
  /** Loyer moyen maison au m2/mois (EUR). */
  avg_rent_house_per_m2?: number | null;
  /** Evolution des loyers sur 1 an (%). */
  rent_trend_1y_pct?: number | null;
  /** Tension du marche locatif. */
  market_tension?: "tendu" | "equilibre" | "detendu" | null;
  /** Zone soumise a l'encadrement des loyers. */
  rent_control_zone?: boolean | null;
  /** Plafond de loyer au m2/mois (EUR) si encadrement. */
  rent_ceiling_per_m2?: number | null;

  // ── Charges et taxes ─────────────────────────────────────────────────
  /** Charges copropriete moyennes mensuelles au m2 (EUR/m2/mois). */
  avg_condo_charges_per_m2?: number | null;
  /** Taxe fonciere moyenne annuelle au m2 (EUR/m2/an). */
  avg_property_tax_per_m2?: number | null;
  /** Taux de taxe fonciere communale (%). Inclut part communale + intercommunale. */
  property_tax_rate_pct?: number | null;
  /** Taux de taxe d'habitation residences secondaires (%). 0 si pas de surtaxe. */
  housing_tax_rate_pct?: number | null;

  // ── Airbnb / location courte duree ───────────────────────────────────
  /** Prix moyen nuitee Airbnb (EUR). */
  avg_airbnb_night_price?: number | null;
  /** Taux d'occupation moyen Airbnb (%). */
  avg_airbnb_occupancy_rate?: number | null;
  /** Nombre d'annonces Airbnb actives dans la commune. */
  airbnb_listing_count?: number | null;
  /** Reglementation locale LCD. Max 500 chars. */
  airbnb_regulation?: string | null;
  /** Revenu mensuel moyen par annonce Airbnb (EUR). */
  airbnb_avg_revenue_monthly?: number | null;
  /** Nombre max de nuitees LCD autorisees par an (120 par defaut, loi ELAN). */
  max_lcd_nights_per_year?: number | null;

  // ── Fiscalite et dispositifs ─────────────────────────────────────────
  /** Eligibilite dispositif Pinel/Pinel+. */
  pinel_eligible?: boolean | null;
  /** Zone Pinel. Null si non eligible. */
  pinel_zone?: "A_bis" | "A" | "B1" | "B2" | "C" | null;
  /** Eligibilite dispositif Denormandie. */
  denormandie_eligible?: boolean | null;
  /** Zone de Revitalisation Rurale. */
  zrr?: boolean | null;
  /** Eligibilite Loc'Avantages (ex-Cosse ancien). */
  loc_avantages_eligible?: boolean | null;
  /** Plafond de loyer Pinel au m2/mois (EUR). Selon zone. */
  rent_ceiling_pinel?: number | null;
  /** Zone OPAH (Operation Programmee Amelioration Habitat). */
  opah_zone?: boolean | null;
  /** Quartier Prioritaire de la politique de la Ville. */
  qpv_zone?: boolean | null;

  // ── Demographie ──────────────────────────────────────────────────────
  /** Population municipale. */
  population?: number | null;
  /** Croissance annuelle de la population (%). */
  population_growth_pct?: number | null;
  /** Revenu median annuel par unite de consommation (EUR). */
  median_income?: number | null;
  /** Taux de pauvrete (%). */
  poverty_rate?: number | null;
  /** Taux de chomage (%). */
  unemployment_rate?: number | null;
  /** Age moyen de la population (ans). */
  avg_age?: number | null;
  /** Part des etudiants dans la population (%). */
  student_population_pct?: number | null;
  /** Part des 65+ dans la population (%). */
  senior_population_pct?: number | null;
  /** Taille moyenne des menages (personnes). */
  household_size_avg?: number | null;
  /** Solde migratoire net (pour 1000 habitants). Positif = attractif. */
  net_migration_rate?: number | null;

  // ── Economie locale ──────────────────────────────────────────────────
  /** Principaux employeurs (max 10). */
  main_employers?: string[] | null;
  /** Secteurs economiques dominants (max 10). */
  economic_sectors?: string[] | null;
  /** Taux de creation d'entreprises annuel (%). */
  business_creation_rate?: number | null;
  /** Dynamisme du marche de l'emploi. */
  job_market_dynamism?: "fort" | "moyen" | "faible" | null;
  /** Nombre total d'emplois dans la commune. */
  total_jobs?: number | null;

  // ── Qualite de vie ───────────────────────────────────────────────────
  /** Indice qualite de l'air ATMO (1=bon, 6=tres mauvais). */
  air_quality_index?: number | null;
  /** Part d'espaces verts (% de la superficie). */
  green_space_pct?: number | null;
  /** Score nuisance sonore (1=calme, 10=tres bruyant). */
  noise_level_score?: number | null;
  /** Score securite (0-100, 100=tres sur). */
  safety_score?: number | null;
  /** Densite medicale : medecins generalistes pour 10 000 habitants. */
  healthcare_density?: number | null;
  /** Nombre d'equipements culturels (theatres, cinemas, musees...). */
  cultural_venues_count?: number | null;
  /** Nombre d'equipements sportifs. */
  sport_facilities_count?: number | null;
  /** Classement qualite de vie (rang national, 1=meilleur). */
  life_quality_ranking?: number | null;
  /** Heures d'ensoleillement par an. */
  sunshine_hours_year?: number | null;

  // ── Transports ───────────────────────────────────────────────────────
  /** Score transports en commun (0-100, 100=excellente desserte). */
  public_transport_score?: number | null;
  /** Description des reseaux de transport locaux. Max 1000 chars. */
  transport_details?: string | null;
  /** Presence d'une gare ferroviaire. */
  train_station?: boolean | null;
  /** Presence d'une gare TGV. */
  tgv_station?: boolean | null;
  /** Aeroport a moins de 60 min en voiture. */
  airport_nearby?: boolean | null;
  /** Temps de trajet vers la metropole la plus proche (min). 0 si la ville est une metropole. */
  commute_to_nearest_metropole_min?: number | null;
  /** Score velo-friendly (0-100). */
  bike_score?: number | null;
  /** Nom de la metropole la plus proche. Max 100 chars. */
  nearest_metropole_name?: string | null;

  // ── Education ────────────────────────────────────────────────────────
  /** Nombre total d'etablissements scolaires (tous niveaux). */
  school_count?: number | null;
  /** Universite a proximite (commune ou agglomeration). */
  university_nearby?: boolean | null;
  /** Nombre de creches. */
  nursery_count?: number | null;
  /** Nombre d'ecoles primaires (maternelle + elementaire). */
  primary_school_count?: number | null;
  /** Nombre de colleges et lycees. */
  secondary_school_count?: number | null;
  /** Nombre d'etablissements d'enseignement superieur. */
  higher_education_institutions?: number | null;
  /** Score qualite scolaire (0-100, base taux reussite bac/brevet). */
  school_quality_score?: number | null;

  // ── Parc immobilier ──────────────────────────────────────────────────
  /** Nombre total de logements dans la commune. */
  housing_stock_count?: number | null;
  /** Part de logements sociaux (%). */
  social_housing_pct?: number | null;
  /** Part de proprietaires occupants (%). */
  owner_occupier_pct?: number | null;
  /** Part de logements vacants (%). */
  vacant_housing_pct?: number | null;
  /** Anciennete moyenne du bati (annees). */
  avg_housing_age?: number | null;
  /** Note DPE moyenne du parc (lettre A-G). */
  avg_dpe_rating?: "A" | "B" | "C" | "D" | "E" | "F" | "G" | null;
  /** Repartition DPE du parc (% par lettre). Somme = 100. */
  dpe_distribution?: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    F: number;
    G: number;
  } | null;

  // ── Risques et environnement ─────────────────────────────────────────
  /** Niveau de risque global synthetise. */
  risk_level?: "faible" | "moyen" | "eleve" | null;
  /** Liste des risques naturels identifies. Max 20 elements. */
  natural_risks?: Array<{
    type: string;
    level: "faible" | "moyen" | "fort";
  }> | null;
  /** Niveau de risque inondation. */
  flood_risk_level?: "nul" | "faible" | "moyen" | "fort" | null;
  /** Zone sismique (1=tres faible, 5=forte). */
  seismic_zone?: 1 | 2 | 3 | 4 | 5 | null;
  /** Presence de sites SEVESO a proximite. */
  industrial_risk?: boolean | null;
  /** Potentiel radon (1=faible, 2=moyen, 3=significatif). */
  radon_level?: 1 | 2 | 3 | null;
  /** Nombre de sites pollues recenses (BASOL/SIS). */
  soil_pollution_sites?: number | null;
  /** Risque d'erosion cotiere (communes littorales). */
  coastal_erosion_risk?: boolean | null;
  /** Risque retrait-gonflement des argiles. */
  clay_shrinkage_risk?: "nul" | "faible" | "moyen" | "fort" | null;
  /** Score synthetique risque climatique (0-100, 100=risque maximal). */
  climate_risk_score?: number | null;

  // ── Urbanisme et projets ─────────────────────────────────────────────
  /** Grands projets urbains en cours ou a venir. Max 10 elements, 200 chars chacun. */
  major_urban_projects?: string[] | null;
  /** Zone de protection du patrimoine (ABF, Secteur Protege Remarquable). */
  heritage_protection_zone?: boolean | null;
  /** Projets de transport en cours ou planifies. Max 10 elements, 200 chars chacun. */
  future_transport_projects?: string[] | null;
  /** Description de l'ambiance/caractere du lieu. Max 500 chars. */
  neighborhood_vibe?: string | null;
  /** Resume synthetique pour investisseurs (genere IA). Max 1000 chars. */
  investment_opportunity_summary?: string | null;
}
```

### Constante LOCALITY_DATA_FIELD_KEYS correspondante

```typescript
/** All field keys of LocalityDataFields */
export const LOCALITY_DATA_FIELD_KEYS: (keyof LocalityDataFields)[] = [
  // Prix immobilier
  "avg_purchase_price_per_m2",
  "median_purchase_price_per_m2",
  "transaction_count",
  "avg_price_studio_per_m2",
  "avg_price_small_apt_per_m2",
  "avg_price_large_apt_per_m2",
  "avg_price_house_per_m2",
  "price_trend_1y_pct",
  "price_trend_5y_pct",
  "avg_selling_time_days",
  "new_construction_permits",
  "price_per_m2_min",
  "price_per_m2_max",
  // Marche locatif
  "avg_rent_per_m2",
  "avg_rent_furnished_per_m2",
  "vacancy_rate",
  "avg_rent_studio_per_m2",
  "avg_rent_small_apt_per_m2",
  "avg_rent_large_apt_per_m2",
  "avg_rent_house_per_m2",
  "rent_trend_1y_pct",
  "market_tension",
  "rent_control_zone",
  "rent_ceiling_per_m2",
  // Charges et taxes
  "avg_condo_charges_per_m2",
  "avg_property_tax_per_m2",
  "property_tax_rate_pct",
  "housing_tax_rate_pct",
  // Airbnb
  "avg_airbnb_night_price",
  "avg_airbnb_occupancy_rate",
  "airbnb_listing_count",
  "airbnb_regulation",
  "airbnb_avg_revenue_monthly",
  "max_lcd_nights_per_year",
  // Fiscalite et dispositifs
  "pinel_eligible",
  "pinel_zone",
  "denormandie_eligible",
  "zrr",
  "loc_avantages_eligible",
  "rent_ceiling_pinel",
  "opah_zone",
  "qpv_zone",
  // Demographie
  "population",
  "population_growth_pct",
  "median_income",
  "poverty_rate",
  "unemployment_rate",
  "avg_age",
  "student_population_pct",
  "senior_population_pct",
  "household_size_avg",
  "net_migration_rate",
  // Economie locale
  "main_employers",
  "economic_sectors",
  "business_creation_rate",
  "job_market_dynamism",
  "total_jobs",
  // Qualite de vie
  "air_quality_index",
  "green_space_pct",
  "noise_level_score",
  "safety_score",
  "healthcare_density",
  "cultural_venues_count",
  "sport_facilities_count",
  "life_quality_ranking",
  "sunshine_hours_year",
  // Transports
  "public_transport_score",
  "transport_details",
  "train_station",
  "tgv_station",
  "airport_nearby",
  "commute_to_nearest_metropole_min",
  "bike_score",
  "nearest_metropole_name",
  // Education
  "school_count",
  "university_nearby",
  "nursery_count",
  "primary_school_count",
  "secondary_school_count",
  "higher_education_institutions",
  "school_quality_score",
  // Parc immobilier
  "housing_stock_count",
  "social_housing_pct",
  "owner_occupier_pct",
  "vacant_housing_pct",
  "avg_housing_age",
  "avg_dpe_rating",
  "dpe_distribution",
  // Risques et environnement
  "risk_level",
  "natural_risks",
  "flood_risk_level",
  "seismic_zone",
  "industrial_risk",
  "radon_level",
  "soil_pollution_sites",
  "coastal_erosion_risk",
  "clay_shrinkage_risk",
  "climate_risk_score",
  // Urbanisme et projets
  "major_urban_projects",
  "heritage_protection_zone",
  "future_transport_projects",
  "neighborhood_vibe",
  "investment_opportunity_summary",
];
```

### Notes sur la migration depuis le schema actuel

Le schema actuel (22 champs) est un sous-ensemble strict du schema cible (103 champs). La migration est **non-destructive** :

1. **Champs conserves a l'identique** (19) : tous les champs numeriques et booleens existants
2. **Champ modifie** (1) : `risk_level` passe de `"eleve"` a `"eleve"` (identique, mais attention : le code existant utilise `"élevé"` avec accent — le schema cible supprime l'accent pour coherence snake_case)
3. **Champs ajoutes** (81) : tous les nouveaux champs sont optionnels (`?`), donc aucun impact sur les donnees existantes

**Action requise avant migration :** verifier que le code existant qui lit `risk_level === "élevé"` est mis a jour vers `"eleve"` (sans accent), ou conserver l'accent dans le type. Decision a prendre.

### Champs P0 — impact direct sur les calculs app

Les champs suivants alimentent directement `calculateAll()`, `getMarketData()`, `buildSocioDataFromLocality()` ou le scoring :

| Champ | Utilise par | Impact |
|-------|-----------|--------|
| `avg_purchase_price_per_m2` | `getMarketData()` → prefill `purchase_price` | Estimation du prix d'achat |
| `median_purchase_price_per_m2` | `getMarketData()` | Comparaison avec le prix reel |
| `transaction_count` | `getMarketData()` | Indicateur de liquidite |
| `avg_price_studio_per_m2` | **NOUVEAU** : segmentation par type | Prix plus precis selon le bien |
| `avg_price_small_apt_per_m2` | **NOUVEAU** : segmentation par type | Prix plus precis selon le bien |
| `avg_price_house_per_m2` | **NOUVEAU** : segmentation par type | Prix plus precis selon le bien |
| `price_trend_1y_pct` | **NOUVEAU** : `calculateExitSimulation()` | Appreciation realiste |
| `avg_rent_per_m2` | `getMarketData()` → prefill `monthly_rent` | Estimation du loyer |
| `avg_rent_furnished_per_m2` | `getMarketData()` | Loyer meuble |
| `vacancy_rate` | `getMarketData()` → prefill `vacancy_rate` | Calcul revenu net |
| `avg_rent_studio_per_m2` | **NOUVEAU** : segmentation par type | Loyer plus precis |
| `avg_rent_small_apt_per_m2` | **NOUVEAU** : segmentation par type | Loyer plus precis |
| `rent_trend_1y_pct` | **NOUVEAU** : projection long terme | Tendance locative |
| `market_tension` | **NOUVEAU** : scoring investissement | Risque vacance |
| `rent_control_zone` | **NOUVEAU** : alerte plafond loyer | Eviter sur-estimation loyer |
| `rent_ceiling_per_m2` | **NOUVEAU** : plafond effectif | Cap loyer maximum |
| `avg_condo_charges_per_m2` | `getMarketData()` → prefill `condo_charges` | Calcul charges |
| `avg_property_tax_per_m2` | `getMarketData()` → prefill `property_tax` | Calcul charges |
| `property_tax_rate_pct` | **NOUVEAU** : estimation taxe fonciere | Calcul plus precis |
| `avg_airbnb_night_price` | `getMarketData()` → prefill Airbnb | Calcul rendement Airbnb |
| `avg_airbnb_occupancy_rate` | `getMarketData()` → prefill Airbnb | Calcul rendement Airbnb |
| `airbnb_avg_revenue_monthly` | **NOUVEAU** : benchmark revenu LCD | Comparaison directe |
| `max_lcd_nights_per_year` | **NOUVEAU** : calcul revenu LCD reel | Plafonnement legal |
| `pinel_eligible` | **NOUVEAU** : calcul fiscal Pinel | Avantage fiscal |
| `pinel_zone` | **NOUVEAU** : plafond loyer Pinel | Calcul fiscal |
| `denormandie_eligible` | **NOUVEAU** : calcul fiscal Denormandie | Avantage fiscal |
| `rent_ceiling_pinel` | **NOUVEAU** : plafond Pinel | Cap loyer Pinel |
| `population` | `buildSocioDataFromLocality()` | Scoring attractivite |
| `population_growth_pct` | `buildSocioDataFromLocality()` | Scoring dynamisme |
| `median_income` | `buildSocioDataFromLocality()` | Scoring solvabilite locataires |
| `unemployment_rate` | `buildSocioDataFromLocality()` | Scoring risque |
| `public_transport_score` | `buildSocioDataFromLocality()` | Scoring accessibilite |
| `university_nearby` | `buildSocioDataFromLocality()` | Scoring demande locative |
| `risk_level` | `buildSocioDataFromLocality()` | Scoring risque |
| `natural_risks` | `buildSocioDataFromLocality()` | Scoring risque |
| `vacant_housing_pct` | **NOUVEAU** : indicateur de marche | Risque vacance structurelle |

---

> **Total : 103 champs** (13 existants conserves + 90 nouveaux)
> 36 champs P0, 43 champs P1, 24 champs P2
