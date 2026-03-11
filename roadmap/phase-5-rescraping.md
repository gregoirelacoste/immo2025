# Phase 5 — Re-scraping intelligent

## Objectif

Surveiller les annonces importees : detecter les changements de prix, re-scraper periodiquement, notifier l'utilisateur des evolutions.

## User stories

1. Je vois quand chaque bien a ete scrape pour la derniere fois
2. Je vois un badge sur le dashboard quand un prix a change
3. Je configure la frequence de re-scraping (off / quotidien / hebdomadaire)
4. Je recois une notification in-app quand un prix baisse
5. Je vois l'historique des prix sur la page detail

## Nouveaux champs Property

```typescript
last_scraped_at: string | null;
previous_price: number | null;
price_change_percent: number | null;
rescrape_frequency: "off" | "daily" | "weekly";
```

## Nouvelles tables

### `scrape_history`
```sql
CREATE TABLE IF NOT EXISTS scrape_history (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  scraped_at TEXT NOT NULL DEFAULT (datetime('now')),
  purchase_price REAL,
  surface REAL,
  city TEXT,
  source_url TEXT,
  method TEXT,
  success INTEGER NOT NULL DEFAULT 1,
  error TEXT,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);
```

### `notifications`
```sql
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('price_drop', 'price_increase', 'scrape_error')),
  message TEXT NOT NULL,
  data TEXT DEFAULT '{}',
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);
```

## Nouveau domaine `src/domains/rescrape/`

| Fichier | Role |
|---------|------|
| `types.ts` | `ScrapeHistoryEntry`, `Notification`, `RescrapeFrequency` |
| `repository.ts` | CRUD scrape_history + notifications, `getPropertiesDueForRescrape()` |
| `actions.ts` | `rescrapeWithHistory()`, `setRescrapeFrequency()`, `markNotificationRead()` |
| `service.ts` | `detectPriceChange()` — fonction pure |

## Flow de re-scraping

```
rescrapeWithHistory(propertyId)
  1. Appeler rescrapeProperty() existant
  2. Enregistrer dans scrape_history
  3. Comparer ancien prix / nouveau prix
  4. Si changement : mettre a jour previous_price, price_change_percent
  5. Si baisse + user_id : creer notification
  6. Mettre a jour last_scraped_at
```

## Cron periodique

Nouvelle route API : `src/app/api/cron/rescrape/route.ts`
- Protegee par `CRON_SECRET` env var
- Requete les biens dont `rescrape_frequency != 'off'` et `last_scraped_at` depasse
- Traite chaque bien avec rate limiting (meme hostname delay que Phase 4)

## Composants UI

| Composant | Role |
|-----------|------|
| `ScrapeHistory.tsx` | Tableau historique sur la page detail |
| `NotificationBell.tsx` | Icone cloche + dropdown dans Navbar |
| `PropertyCard.tsx` | Badge changement prix (fleche verte/rouge + %) |
| `PropertyTable.tsx` | Indicateur dans colonne prix |

## Indicateurs visuels changement de prix

- Baisse : `↓ -5.2%` en vert (bonne nouvelle pour l'acheteur)
- Hausse : `↑ +3.1%` en rouge
- Affiche sur PropertyCard et PropertyTable quand `price_change_percent != null`
