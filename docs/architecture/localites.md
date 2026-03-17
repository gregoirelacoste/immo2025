# Système de Localités

## Vue d'ensemble

Le système de localités est une base de données hiérarchique des zones géographiques françaises, avec des snapshots de données temporels. Il sert de socle pour :
- Les données de marché (prix, loyers, charges)
- Les données socio-économiques (population, revenus, emploi)
- Les données d'infrastructure (transports, écoles)
- Les risques naturels

## Architecture

### Hiérarchie géographique

```
pays (depth 0)
  └── region (1)
        └── departement (2)
              └── canton (3)
                    └── ville (4)
                          └── quartier (5)
                                └── rue (6)
```

Chaque localité a un `parent_id` optionnel qui crée l'arbre hiérarchique.

### Fallback par héritage

Le **resolver** (`src/domains/locality/resolver.ts`) implémente un fallback field-by-field :
1. Cherche la localité la plus spécifique (ville → par INSEE, postal, puis nom)
2. Remonte la chaîne parent jusqu'à la racine
3. Pour chaque champ manquant, prend la première valeur non-null trouvée dans un ancêtre
4. Trace la source de chaque champ (`fieldSources`)

**Exemple :** Villeurbanne (ville) n'a pas `avg_airbnb_night_price` → hérité de Lyon Métropole (departement).

### Snapshots temporels

La table `locality_data` stocke des snapshots datés (`valid_from` / `valid_to`). Permet :
- Historique des données
- Comparaison temporelle
- Audit via `created_by` (qui a fourni la donnée)

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/domains/locality/types.ts` | Types : `Locality`, `LocalityData`, `LocalityDataFields` |
| `src/domains/locality/repository.ts` | CRUD base de données (SQLite) |
| `src/domains/locality/resolver.ts` | Résolution hiérarchique + merge des données |
| `src/domains/locality/actions.ts` | Server Actions Next.js (mutations) |
| `src/domains/market/service.ts` | Intégration marché : `getMarketData()` utilise le resolver |
| `src/domains/enrich/service.ts` | Pipeline d'enrichissement propriétés |
| `src/components/locality/LocalitiesClient.tsx` | UI admin : arbre, import JSON, prompt IA |

## Champs actuels (`LocalityDataFields`)

### Prix immobilier
| Champ | Type | Description |
|-------|------|-------------|
| `avg_purchase_price_per_m2` | number | Prix moyen achat au m² |
| `median_purchase_price_per_m2` | number | Prix médian achat au m² |
| `transaction_count` | number | Nombre de transactions |

### Marché locatif
| Champ | Type | Description |
|-------|------|-------------|
| `avg_rent_per_m2` | number | Loyer moyen nu au m² |
| `avg_rent_furnished_per_m2` | number | Loyer moyen meublé au m² |
| `vacancy_rate` | number | Taux de vacance locative |

### Charges et taxes
| Champ | Type | Description |
|-------|------|-------------|
| `avg_condo_charges_per_m2` | number | Charges copro moyennes au m² |
| `avg_property_tax_per_m2` | number | Taxe foncière moyenne au m² |

### Airbnb
| Champ | Type | Description |
|-------|------|-------------|
| `avg_airbnb_night_price` | number | Prix moyen nuitée Airbnb |
| `avg_airbnb_occupancy_rate` | number | Taux d'occupation moyen |

### Socio-économique
| Champ | Type | Description |
|-------|------|-------------|
| `population` | number | Population |
| `population_growth_pct` | number | Croissance population (%) |
| `median_income` | number | Revenu médian |
| `poverty_rate` | number | Taux de pauvreté |
| `unemployment_rate` | number | Taux de chômage |

### Infrastructure
| Champ | Type | Description |
|-------|------|-------------|
| `school_count` | number | Nombre d'écoles |
| `university_nearby` | boolean | Université à proximité |
| `public_transport_score` | number | Score transports en commun |

### Risques
| Champ | Type | Description |
|-------|------|-------------|
| `risk_level` | "faible" / "moyen" / "élevé" | Niveau de risque global |
| `natural_risks` | Array<{type, level}> | Risques naturels détaillés |

## Intégration avec les propriétés

```
Propriété (city, postal_code)
    ↓ resolveLocalityData()
Données de localité (merge hiérarchique)
    ↓ getMarketData() / buildSocioDataFromLocality()
MarketData / SocioEconomicData
    ↓ runEnrichmentPipeline()
property.market_data / property.socioeconomic_data (JSON en DB)
```

## Alimentation des données

Actuellement :
1. **Import manuel** via l'admin (JSON paste)
2. **Prompt IA** généré automatiquement pour collecter les données d'une ville

À terme (blog) :
3. **Extraction automatique** depuis les articles générés par l'IA
4. **APIs externes** (DVF, INSEE, Géorisques) intégrées dans le pipeline
