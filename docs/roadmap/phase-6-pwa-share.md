# Phase 6 — Partage PWA ameliore

## Objectif

Ameliorer le share target PWA pour accepter les images, gerer le partage depuis les apps immo populaires avec un parsing specifique, et afficher un ecran de preview avant sauvegarde.

## User stories

1. Je partage une capture d'ecran d'annonce depuis mon telephone → l'app extrait les donnees de l'image
2. Je partage depuis LeBonCoin → l'app reconnait la source et optimise le parsing
3. Apres le partage, je vois un apercu de ce qui a ete extrait avant de confirmer
4. Le traitement ne me bloque pas

## Changement manifest.json

Passer de GET a POST avec support fichiers :

```json
{
  "share_target": {
    "action": "/api/share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "url": "url",
      "text": "text",
      "title": "title",
      "files": [
        {
          "name": "images",
          "accept": ["image/png", "image/jpeg", "image/webp"]
        }
      ]
    }
  }
}
```

## Architecture

```
Share depuis une app
  |
  v
POST /api/share (route API)
  ├── Parse multipart/form-data
  ├── Stocke en memoire (UUID, TTL 10min)
  └── Redirect → /share/preview?sessionId=xxx
        |
        v
SharePreview (client component)
  ├── Affiche : URL, texte, images partagees
  ├── Detecte la source (LeBonCoin, SeLoger, etc.)
  ├── Lance l'extraction (scraping/IA)
  ├── Affiche l'apercu des donnees extraites
  └── "Confirmer et enregistrer" / "Modifier"
```

## Parsers specifiques par app

Nouveau fichier : `src/domains/scraping/app-parsers.ts`

| Source | Detection | Donnees extraites du texte partage |
|--------|-----------|-----------------------------------|
| LeBonCoin | URL contient `leboncoin.fr` | Prix + ville dans le titre |
| SeLoger | URL contient `seloger.com` | Surface + ville dans le titre |
| PAP | URL contient `pap.fr` | Prix dans le titre |
| Generique | Autre | Pas de pre-parsing |

Ces "hints" sont merges avec le resultat du scraping complet pour ameliorer la fiabilite.

## Fichiers a creer

| Fichier | Role |
|---------|------|
| `src/app/api/share/route.ts` | Route POST pour recevoir le partage |
| `src/app/share/preview/page.tsx` | Page de preview |
| `src/components/collect/SharePreview.tsx` | Composant preview avec extraction |
| `src/domains/scraping/app-parsers.ts` | Parsers specifiques par app |
| `src/domains/collect/share-store.ts` | Stockage temporaire en memoire |

## Fichiers a modifier

| Fichier | Changement |
|---------|-----------|
| `public/manifest.json` | Share target POST + files |
| `public/sw.js` | `/api/share` dans NO_CACHE_PATTERNS, bump cache version |
| `src/domains/collect/types.ts` | Ajouter `ShareData` type |

## Stockage temporaire

Map en memoire avec TTL :

```typescript
const pendingShares = new Map<string, { data: ShareData; expiresAt: number }>();

export function storeShareData(data: ShareData): string // retourne sessionId
export function getShareData(sessionId: string): ShareData | undefined
```

Acceptable pour l'architecture single-server SQLite actuelle.

## Dependances

- Phase 3 (analyse photo) : necessaire pour traiter les images partagees
- `callGeminiWithImage` doit etre implemente (Phase 3)

## Points d'attention

- Le POST share target est un breaking change → incrementer `CACHE_NAME` dans le SW
- Les images partagees peuvent etre grandes → compression cote serveur si necessaire
- Le stockage en memoire est perdu au redemarrage → acceptable, l'utilisateur peut re-partager
