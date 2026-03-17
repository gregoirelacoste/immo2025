# LocalityDataFields — Cible complète

## Objectif

Définir l'ensemble des données qu'on veut collecter pour chaque ville française afin d'avoir une base de données exhaustive pour :
1. **L'app** — simulations plus précises, enrichissement automatique des propriétés
2. **Le blog** — articles data-driven uniques (SEO/GEO)
3. **Les guides villes** — pages référence pour chaque ville

Le blog est le moteur principal d'alimentation de ces données.

---

## Champs actuels (22 champs)

Déjà dans `LocalityDataFields` :
- Prix achat (moyen, médian, nb transactions)
- Loyers (nu, meublé, vacance)
- Charges (copro, taxe foncière)
- Airbnb (prix nuit, occupation)
- Socio-éco (population, croissance, revenus, pauvreté, chômage)
- Infrastructure (écoles, université, transports)
- Risques (niveau global, risques naturels)

---

## Nouveaux champs cibles

### Prix immobilier segmentés
| Champ | Type | Source probable |
|-------|------|----------------|
| `avg_price_studio_per_m2` | number | DVF, SeLoger, blog |
| `avg_price_small_apt_per_m2` | number | DVF (T2-T3) |
| `avg_price_large_apt_per_m2` | number | DVF (T4+) |
| `avg_price_house_per_m2` | number | DVF |
| `price_trend_1y_pct` | number | DVF / actus marché |
| `price_trend_5y_pct` | number | DVF historique |
| `avg_selling_time_days` | number | Agences, SeLoger |
| `new_construction_permits` | number | Sit@del / communes |

### Loyers segmentés
| Champ | Type | Source probable |
|-------|------|----------------|
| `avg_rent_studio_per_m2` | number | Observatoire loyers |
| `avg_rent_small_apt_per_m2` | number | Observatoire loyers |
| `avg_rent_large_apt_per_m2` | number | Observatoire loyers |
| `avg_rent_house_per_m2` | number | Observatoire loyers |
| `rent_trend_1y_pct` | number | Observatoire / actus |
| `market_tension` | "tendu" / "équilibré" / "détendu" | Préfectures, ANIL |
| `rent_control_zone` | boolean | Encadrement des loyers (Paris, Lyon, etc.) |

### Airbnb enrichi
| Champ | Type | Source probable |
|-------|------|----------------|
| `airbnb_listing_count` | number | AirDNA, InsideAirbnb |
| `airbnb_regulation` | string | Réglementation locale (120j, enregistrement...) |
| `airbnb_avg_revenue_monthly` | number | AirDNA |

### Démographie avancée
| Champ | Type | Source probable |
|-------|------|----------------|
| `avg_age` | number | INSEE |
| `student_population_pct` | number | INSEE / rectorat |
| `senior_population_pct` | number | INSEE |
| `household_size_avg` | number | INSEE |
| `net_migration_rate` | number | INSEE (attractivité) |

### Économie locale
| Champ | Type | Source probable |
|-------|------|----------------|
| `main_employers` | string[] | CCI, presse locale |
| `economic_sectors` | string[] | INSEE SIRENE |
| `business_creation_rate` | number | INSEE |
| `job_market_dynamism` | "fort" / "moyen" / "faible" | Pôle Emploi |

### Qualité de vie
| Champ | Type | Source probable |
|-------|------|----------------|
| `air_quality_index` | number | ATMO France |
| `green_space_pct` | number | Corine Land Cover |
| `noise_level_score` | number | Bruitparif / cartes bruit |
| `safety_score` | number | Ministère Intérieur (taux délinquance) |
| `healthcare_density` | number | ARS (médecins/hab) |
| `cultural_venues_count` | number | OpenStreetMap, data.gouv |
| `sport_facilities_count` | number | RES (recensement équipements sportifs) |
| `life_quality_ranking` | number | Classement villes (JDD, L'Express...) |
| `sunshine_hours_year` | number | Météo France |

### Transports détaillés
| Champ | Type | Source probable |
|-------|------|----------------|
| `transport_details` | string | Réseaux locaux |
| `train_station` | boolean | SNCF |
| `tgv_station` | boolean | SNCF |
| `airport_nearby` | boolean | DGAC |
| `commute_to_nearest_metropole_min` | number | Google Maps |
| `bike_score` | number | Classement vélo-friendly |

### Éducation détaillée
| Champ | Type | Source probable |
|-------|------|----------------|
| `nursery_count` | number | CAF / communes |
| `primary_school_count` | number | Éducation nationale |
| `secondary_school_count` | number | Éducation nationale |
| `higher_education_institutions` | number | MESRI |
| `school_quality_score` | number | Taux réussite bac/brevet |

### Parc immobilier
| Champ | Type | Source probable |
|-------|------|----------------|
| `housing_stock_count` | number | INSEE |
| `social_housing_pct` | number | RPLS |
| `owner_occupier_pct` | number | INSEE |
| `vacant_housing_pct` | number | INSEE (logements vacants) |
| `avg_housing_age` | number | INSEE (ancienneté bâti) |
| `avg_dpe_rating` | string | ADEME / DPE open data |
| `dpe_distribution` | object | ADEME (% par lettre A-G) |

### Fiscalité & dispositifs
| Champ | Type | Source probable |
|-------|------|----------------|
| `property_tax_rate_pct` | number | DGFIP |
| `pinel_eligible` | boolean | data.gouv.fr |
| `denormandie_eligible` | boolean | ANAH |
| `zrr` | boolean | data.gouv.fr |
| `loc_avantages_eligible` | boolean | ANAH |
| `rent_ceiling_pinel` | number | BOFiP |

### Risques & pollution détaillés
| Champ | Type | Source probable |
|-------|------|----------------|
| `flood_risk_level` | "nul" / "faible" / "moyen" / "fort" | Géorisques |
| `seismic_zone` | 1-5 | Géorisques |
| `industrial_risk` | boolean | SEVESO / Géorisques |
| `radon_level` | 1-3 | IRSN |
| `soil_pollution_sites` | number | BASOL / SIS |
| `coastal_erosion_risk` | boolean | Géorisques |
| `clay_shrinkage_risk` | "nul" / "faible" / "moyen" / "fort" | Géorisques |

### Urbanisme & projets
| Champ | Type | Source probable |
|-------|------|----------------|
| `major_urban_projects` | string[] | Collectivités, presse |
| `heritage_protection_zone` | boolean | ABF / secteurs sauvegardés |
| `future_transport_projects` | string[] | Mobilité (ex: LGV, métro) |
| `neighborhood_vibe` | string | Description quartier |
| `investment_opportunity_summary` | string | Résumé IA pour investisseurs |

---

## Total : ~90 champs cibles

### Priorités d'alimentation

**P0 — Impact direct sur les calculs app** (alimente simulations + rendement) :
- Prix segmentés par type de bien
- Loyers segmentés
- Tendances prix/loyers
- Tension marché
- Fiscalité locale (taxe foncière, dispositifs)

**P1 — Valeur éditorial forte** (articles + guides SEO uniques) :
- Qualité de vie (air, bruit, sécurité, santé)
- Transports détaillés
- Économie locale
- Démographie avancée
- Urbanisme & projets

**P2 — Enrichissement progressif** (complétude long terme) :
- Parc immobilier
- Risques détaillés
- Airbnb enrichi
- Éducation détaillée

---

## Utilisation par le blog

Chaque article extrait des données structurées qui viennent enrichir ces champs :
- Article "guide ville X" → alimente P0 + P1 pour cette ville
- Article "actu marché" → met à jour tendances + tensions
- Article "fiscalité" → met à jour dispositifs et taux
- Article "transports Grand Paris" → met à jour projets + transport

La boucle : **article → données extraites → locality_data → guides mis à jour → meilleur SEO**.
