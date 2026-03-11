# Phase 3 — Analyse photo via Gemini Vision

## Objectif

Permettre l'extraction de donnees immobilieres a partir de photos : captures d'ecran d'annonces, photos de vitrines d'agences, flyers, photos du bien.

## Types de photos supportes

| Type | Donnees attendues | Fiabilite |
|------|-------------------|-----------|
| Capture d'ecran d'annonce | Prix, surface, ville, adresse, description | Haute |
| Vitrine d'agence | Plusieurs biens avec prix/surface | Moyenne |
| Flyer / annonce papier | Prix, surface, contact | Moyenne |
| Photo du bien | Type de bien, estimation surface | Faible |

## Architecture

```
Client: image base64 + PhotoMetadata (GPS, timestamp)
  |
  v
Server: collectFromPhoto()
  ├── reverseGeocode(lat, lon) si GPS disponible
  ├── extractFromPhoto(imageData) → callGeminiWithImage
  │   ├── 1 listing → creer la propriete
  │   └── N listings → retourner la liste pour selection
  v
Client: PhotoListingPicker (si multi-listing)
  |
  v
Server: createPropertyFromPhotoListing(listing)
```

## Fichiers a creer

| Fichier | Role |
|---------|------|
| `src/domains/collect/ai/photo-extractor.ts` | Extraction via Gemini Vision |
| `src/components/collect/PhotoListingPicker.tsx` | Selection d'un bien parmi plusieurs |

## Fichiers a modifier

| Fichier | Changement |
|---------|-----------|
| `src/infrastructure/ai/gemini.ts` | Ajouter `callGeminiWithImage()` multimodal |
| `src/domains/collect/types.ts` | Ajouter `PhotoAnalysisResult`, `PhotoListing` |
| `src/domains/collect/actions.ts` | Implementer `collectFromPhoto()` |
| `src/domains/property/prefill.ts` | Ajouter `buildPrefillFromPhoto()` |
| `src/components/collect/SmartCollector.tsx` | Brancher le submit photo + multi-listing |
| `next.config.ts` | `serverActions.bodySizeLimit: "10mb"` |

## Prompt Gemini Vision

```
Tu es un expert en immobilier francais. Analyse cette image et extrais les informations
de biens immobiliers visibles.

L'image peut etre :
- Une capture d'ecran d'une annonce immobiliere (LeBonCoin, SeLoger, etc.)
- Une photo de vitrine d'agence immobiliere (peut contenir PLUSIEURS annonces)
- Une photo d'une annonce papier ou flyer
- Une photo d'un bien immobilier

Pour CHAQUE bien identifie, extrais :
- purchase_price : prix de vente en euros (nombre entier)
- surface : surface habitable en m²
- city : ville
- postal_code : code postal
- address : adresse si visible
- property_type : "ancien" ou "neuf"
- description : resume court (max 200 chars)
- number_of_rooms : nombre de pieces

Retourne un JSON :
{
  "listings": [{ ... }],
  "image_type": "screenshot" | "vitrine" | "flyer" | "property_photo" | "unknown"
}
```

## Appel API multimodal

```typescript
// Dans gemini.ts
export async function callGeminiWithImage(
  prompt: string,
  imageBase64: string,  // sans le prefixe data:...
  imageMimeType: string,
  config: GeminiConfig
): Promise<string> {
  const body = {
    contents: [{
      parts: [
        { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
        { text: prompt }
      ]
    }],
    generationConfig: { ... }
  };
  // ... POST vers gemini-2.5-flash (pas flash-lite)
}
```

## Multi-listing (vitrine d'agence)

Quand `listings.length > 1` :
1. `collectFromPhoto` retourne `{ success: true, multipleListings: [...] }`
2. `SmartCollector` affiche `PhotoListingPicker`
3. L'utilisateur selectionne un bien → `createPropertyFromPhotoListing(listing)`
4. Redirection vers `/property/{id}/edit`

## Gestion du `number_of_rooms`

Pas de colonne DB dediee. Le nombre de pieces extrait est ajoute au debut de la description :
`"3 pieces — Appartement lumineux..."`. Migration DB optionnelle plus tard.

## Prefill tracking

Source : `"Photo (IA)"` pour les champs extraits par Gemini, `"Photo (GPS)"` pour les champs issus du reverse geocoding.

## Gestion des erreurs

| Cas | Comportement |
|-----|-------------|
| Pas de GEMINI_API_KEY | "Configuration IA manquante" |
| API Gemini echoue | "Erreur du service d'analyse" |
| Reponse non parseable | "L'IA n'a pas pu analyser cette image" |
| Aucun bien detecte | "Aucune annonce detectee dans cette image" |
| Photo de bien sans prix | Cree avec ce qui est infere, l'utilisateur complete |
| GPS echoue | Continue sans localisation |

## Config Next.js

```typescript
// next.config.ts
experimental: {
  serverActions: {
    bodySizeLimit: "10mb",
  },
}
```
