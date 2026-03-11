# Standards & Conventions — Immo2025

Ce document est la reference pour toute review de code. Toute violation doit etre signalee et corrigee.

## Architecture

### Structure DDD
```
src/
  domains/           # Bounded contexts (property, market, scraping, auth)
    <domain>/
      types.ts       # Interfaces et types du domaine
      repository.ts  # Requetes DB (async, parametrees)
      actions.ts     # Server actions ("use server") — point d'entree public
      prefill.ts     # Logique metier specifique
      service.ts     # Logique metier (calculs, appels API)
      pipeline/      # Sous-modules (ex: scraping pipeline)
      ai/            # Sous-modules IA
  infrastructure/    # Details techniques (DB client, AI client)
  lib/               # Utilitaires partages (calculations, auth config)
  components/        # UI React
    ui/              # Atoms (Button, Input, Select, Alert, Card, etc.)
    property/        # Composants metier par sous-domaine
      form/          # Formulaires
      dashboard/     # Vue dashboard
      detail/        # Vue detail
  app/               # Routes Next.js App Router
```

### Separation des responsabilites
- **types.ts** : definitions de forme de donnees uniquement
- **repository.ts** : requetes DB uniquement, retourne `T | undefined` (jamais `null`)
- **actions.ts** : orchestration, auth check, revalidation — retourne `{ success: boolean; error?: string }`
- **service.ts** : logique metier pure
- **components** : rendu UI uniquement, pas de logique DB

## Nommage

| Element | Convention | Exemple |
|---------|-----------|---------|
| Fichiers TS/utilitaires | kebab-case | `text-extractor.ts`, `row-mapper.ts` |
| Fichiers composants React | PascalCase | `PropertyForm.tsx`, `Button.tsx` |
| Interfaces/Types | PascalCase | `Property`, `MarketData` |
| Variables/fonctions | camelCase | `getVisibleProperties`, `formatCurrency` |
| Constantes | SCREAMING_SNAKE_CASE | `METHOD_LABELS`, `USER_AGENT` |

## Imports

- **Toujours** utiliser l'alias `@/` (jamais de chemins relatifs `../../`)
- **Exports nommes** pour logique metier (repository, actions, services, utils)
- **Export default** uniquement pour les composants React

## TypeScript

- `strict: true` — aucune relaxation
- **Interdit** : `any`, `@ts-ignore`, `@ts-expect-error`
- `null` vs `undefined` : les queries DB retournent `undefined`, les champs optionnels utilisent `| null`
- Verification nullish : `!= null` (couvre null ET undefined)
- Types utilitaires preferes : `Omit<>`, `Pick<>`, `Record<>`

## Composants React

- `"use client"` en premiere ligne si hooks/events/state
- Props typees avec `interface Props { ... }` (pas `type Props`)
- Export : `export default function ComponentName({ prop }: Props)`
- Pas de logique metier dans les composants — deleguer aux actions/services
- Custom hooks dans des fichiers separes (`useXxx.ts`)

## Server Actions

```typescript
"use server";

export async function doSomething(args): Promise<{ success: boolean; error?: string }> {
  try {
    // Auth check
    // Logique
    // Mutation DB
    revalidatePath("/affected-path");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
```

- Toujours wrapper dans try/catch
- Jamais throw vers le client — retourner `{ success: false, error }`
- `revalidatePath()` apres chaque mutation
- Auth : `requireUserId()` pour actions protegees, `getOptionalUserId()` pour optionnel
- Orphan pattern : `getOwnerOrAllowOrphan()` pour biens sans proprietaire

## Base de donnees

- **Toujours** des requetes parametrees (`$param` ou `?`) — jamais d'interpolation de string
- Named params (`$id`, `$user_id`) pour les INSERT/UPDATE complexes
- Positional (`?`) pour les SELECT simples
- Mapping : `rowAs<T>(row)` pour convertir les rows
- Retourner `undefined` si non trouve (pas `null`, pas `throw`)

## Styling (Tailwind)

- Classes inline dans les composants
- Extraire en constantes locales si reutilise dans le meme fichier : `const inputClass = "..."`
- Mobile-first : styles de base, puis `md:` pour desktop
- Touch targets : `min-h-[44px]` minimum sur mobile
- Safe areas : `pb-safe`, `pt-safe` via CSS custom properties
- Input mobile : `inputMode="numeric"` / `inputMode="decimal"`
- Variants via `Record<Variant, string>` dans les UI atoms

## Langue

- **UI** : 100% francais (labels, boutons, messages, placeholders)
- **Messages d'erreur** : francais
- **Code** (variables, fonctions, commentaires) : anglais
- **Commentaires explicatifs** : anglais prefere, francais tolere pour contexte metier
- Formatage : `fr-FR` locale, EUR currency, `maximumFractionDigits: 0`

## Gestion d'erreurs

- Server actions : try/catch + return `{ success, error? }`
- Client : afficher via `<Alert variant="error">{error}</Alert>`
- Pas de validation excessive — valider aux frontieres systeme (input user, API externes)
- Pas de error handling pour des cas impossibles

## Anti-patterns a eviter

- Code mort non supprime
- Duplication de `getOwnerOrAllowOrphan()` dans plusieurs fichiers — centraliser
- `inputClass`/`labelClass` dupliques — utiliser les atoms UI
- Raw `<input>` au lieu des composants `<Input>`, `<NumberInput>`, `<Select>`
- `revalidatePath()` en double sur le meme chemin
- Imports non utilises
- `void` pour silencer les unused vars — preferer destructuring avec `_` prefix
