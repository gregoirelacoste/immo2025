# Phase 4 — Collecte en lot (Batch)

## Objectif

Permettre l'import de plusieurs biens en une seule operation : coller plusieurs URLs ou un texte contenant plusieurs annonces.

## User stories

1. Je colle 5 URLs LeBonCoin (une par ligne) → chacune est scrapee avec un indicateur de progression
2. Je colle un texte long avec plusieurs annonces → l'IA les separe et cree un bien par annonce
3. Je vois quelles URLs ont echoue et peux les reessayer individuellement

## Detection du mode batch

Dans le champ unifie :
- **URLs** : si le textarea contient >= 2 lignes commencant par `http` → mode batch URL
- **Texte** : si le texte depasse 2000 caracteres → proposer "Diviser en annonces"
- Indicateur visuel : "5 URLs detectees — import en lot"

## Architecture

```
Client: SmartCollector
  |-- detecte mode batch
  |-- appelle collectProperty() pour chaque URL sequentiellement
  |-- met a jour le statut par item en temps reel
  v
BatchProgressList (composant)
  ├── Item 1: ✅ Lyon - 150 000 €
  ├── Item 2: ⏳ En cours...
  ├── Item 3: ❌ Erreur — Reessayer
  └── Item 4: ⏳ En attente
```

## Orchestration cote client

Plutot qu'une seule server action qui traite tout, le **client orchestre** les appels individuels :
- Permet le feedback en temps reel (pas d'attente de la fin du batch)
- Utilise les server actions existantes (`collectProperty`)
- Controle de concurrence : max 3 appels simultanes

## Rate limiting

- Map `hostname → lastRequestTime` cote client
- Delai minimum entre 2 requetes au meme hostname : 2 secondes
- Grouper les URLs par hostname, stagger les requetes

## Fichiers a creer

| Fichier | Role |
|---------|------|
| `src/domains/collect/batch-types.ts` | `BatchItem`, `BatchResult`, `BatchItemStatus` |
| `src/domains/scraping/ai/text-splitter.ts` | Split texte multi-annonces via Gemini |
| `src/components/collect/BatchProgressList.tsx` | Liste de progression par item |

## Fichiers a modifier

| Fichier | Changement |
|---------|-----------|
| `src/components/collect/SmartCollector.tsx` | Detection batch + delegation |
| `src/domains/collect/detector.ts` | Detection multi-URL |

## Types

```typescript
export type BatchItemStatus = "pending" | "processing" | "success" | "error";

export interface BatchItem {
  id: string;
  input: string;
  mode: "url" | "text";
  status: BatchItemStatus;
  propertyId?: string;
  error?: string;
}
```

## Limites

- Maximum 20 URLs par batch
- Maximum 10 annonces detectees dans un texte
- Timeout par item : 30 secondes

## Text splitting (IA)

Prompt Gemini : "Recois un texte contenant potentiellement plusieurs annonces immobilieres. Decoupe-les en annonces separees. Retourne un JSON array de strings."

Fallback si IA echoue : decoupe sur les doubles sauts de ligne.
