# Phase 1 — Champ unifie auto-detect

## Objectif

Remplacer le SmartCollector a 3 onglets par un **champ unique** qui detecte automatiquement le type d'input (URL, texte, image) et adapte son comportement.

## UX cible

```
┌─────────────────────────────────────────────────┐
│  [Badge: URL/Texte/Photo]  (quand detecte)      │
│                                                  │
│  ┌──────────────────────────────────────┐  📷   │
│  │ textarea                              │  btn  │
│  │ "Collez une URL, du texte ou une     │       │
│  │  image d'annonce..."                  │       │
│  └──────────────────────────────────────┘       │
│                                                  │
│  [Apercu image]  (si photo detectee)             │
│                                                  │
│  [ ====  Importer / Analyser  ==== ]             │
└─────────────────────────────────────────────────┘
```

## Detection automatique

### Texte saisi/colle
1. Commence par `http://` ou `https://` → mode **URL** (badge bleu)
2. Contient une URL dans du texte plus long → mode **URL** (extrait la 1ere URL)
3. Sinon → mode **Texte** (badge ambre)

### Coller (Ctrl+V / Cmd+V)
1. Clipboard contient une image → mode **Photo** (badge vert), affiche apercu
2. Clipboard contient du texte → delegation a la detection texte

### Drag & drop
1. Fichier image depose → mode **Photo**, lecture en data URL
2. Texte depose (ex: URL depuis barre d'adresse) → detection texte

### Bouton camera
- Icone camera a droite du champ (toujours visible)
- Mobile : ouvre l'appareil photo (`<input capture="environment">`)
- Desktop : ouvre le selecteur de fichiers (`accept="image/*"`)

## Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `src/domains/collect/types.ts` | Ajouter `DetectedInput` interface |
| `src/domains/collect/detector.ts` | Réécrire : `detectFromText()`, `detectFromPaste()`, `detectFromDrop()` |
| `src/components/collect/SmartCollector.tsx` | Réécrire : champ unique + event handlers |

## Nouveaux types

```typescript
export interface DetectedInput {
  mode: CollectMode;
  text?: string;
  url?: string;
  imageData?: string;
  fileName?: string;
}
```

## Event handlers

| Event | Handler | Comportement |
|-------|---------|-------------|
| `onChange` | `handleInput` | Detecte URL/texte, met a jour le badge |
| `onPaste` | `handlePaste` | Verifie clipboard pour images, sinon texte |
| `onDragOver` | `handleDragOver` | Feedback visuel (bordure indigo pointillee) |
| `onDrop` | `handleDrop` | Lecture image ou texte depuis le drop |
| `onKeyDown` | `handleKeyDown` | Enter soumet en mode compact |
| Click camera | `handleCameraClick` | Ouvre input file/camera |

## Cas limites

1. URL dans du texte long → priorise l'URL
2. Coller texte + image → priorise URL si texte est URL, sinon image
3. Plusieurs images deposees → prend la premiere
4. L'utilisateur tape par-dessus une URL collee → bascule texte/URL dynamiquement
5. Champ vide + image chargee → mode photo, bouton actif
6. Image tres grande → compression JPEG 0.85 cote client

## Compatibilite

- **Mobile** : pas de drag & drop natif, le bouton camera est le moyen principal d'ajouter une photo
- **Desktop** : drag & drop + coller fonctionne
- **Compact mode** (dashboard) : textarea 1-2 lignes, apercu image reduit

## Migration

Les props `SmartCollector` (`existingPropertyId`, `onSuccess`, `compact`) restent identiques. Les appelants (`DashboardClient`, `PropertyForm`) n'ont aucun changement.
