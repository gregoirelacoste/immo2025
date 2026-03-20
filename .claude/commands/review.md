Review le code modifie du projet Immo2025 en 3 phases.

Arguments : $ARGUMENTS
- Vide ou "uncommitted" → review les fichiers modifies non commites (staged + unstaged + untracked)
- "last" → review le dernier commit
- "last:N" → review les N derniers commits
- "branch" → review tous les commits de la branche courante vs main
- Un chemin de fichier → review ce fichier specifiquement

---

## Phase 1 — Scope

Determine les fichiers a reviewer selon l'argument :

1. Lance la commande git appropriee pour obtenir le diff :
   - uncommitted : `git diff HEAD --name-only` + `git ls-files --others --exclude-standard` (untracked)
   - last : `git diff HEAD~1 --name-only`
   - last:N : `git diff HEAD~N --name-only`
   - branch : `git diff main...HEAD --name-only`
   - fichier : le fichier specifie

2. Compte les fichiers et les lignes changees (`git diff --stat` avec la meme ref).

3. Classifie chaque fichier dans une categorie :
   - **logic** : `domains/`, `lib/`, `actions.ts`, `repository.ts`, `service.ts`, `types.ts`, server actions, DB queries, calculations
   - **ui** : `components/`, `app/**/page.tsx`, `app/**/loading.tsx`, styling, layouts

4. Affiche un resume :
   ```
   📋 Scope : X fichiers, ~Y lignes modifiees
   Logic : [liste fichiers]
   UI : [liste fichiers]
   ```

Si aucun fichier modifie, dis-le et arrete.

---

## Phase 2 — Review

Lis le fichier STANDARDS.md a la racine du projet pour connaitre les standards.

### Strategie

- **Petit diff** (≤5 fichiers ET ≤300 lignes) → review single-pass, toi-meme, pas d'agent.
- **Gros diff** (>5 fichiers OU >300 lignes) → 2 agents en parallele :
  - **Agent Logic** : review uniquement les fichiers "logic". Focus : bugs, securite, SQL injection, server actions pattern, types, coherence metier (calculs financiers, regles notary_fees/loan, prefill_sources), code mort.
  - **Agent UI** : review uniquement les fichiers "ui". Focus : composants React patterns, "use client", props typing, Tailwind mobile-first, touch targets 44px, atoms UI utilises au lieu de raw HTML, accessibilite, langue FR dans l'UI.

### Checklist commune (pour single-pass ou chaque agent)

#### Bugs potentiels
- Server actions sans try/catch ou qui throw au lieu de return `{ success, error }`
- Queries DB avec interpolation de string (injection SQL)
- Acces a des proprietes potentiellement undefined sans `!= null`
- `revalidatePath` manquant apres mutation
- Race conditions dans les mutations
- Auth check manquant (`requireUserId()` / `getOwnerOrAllowOrphan()`)

#### Code mort
- Imports non utilises
- Variables / fonctions non utilisees
- Fichiers non references (pour les nouveaux fichiers uniquement)

#### Standards (cf STANDARDS.md)
- Nommage : kebab-case fichiers TS, PascalCase composants, camelCase vars
- Imports : `@/` alias obligatoire, pas de `../../`
- TypeScript : pas de `any`, `ts-ignore`, `ts-expect-error`
- Composants : `interface Props`, `"use client"` si hooks/state, `export default function`
- Server actions : try/catch, return pattern, revalidation
- DB : params nommes `$x` pour INSERT/UPDATE, `?` pour SELECT simple, `rowAs<T>()`, retour `undefined`
- Styling : Tailwind inline, mobile-first (`md:` pour desktop), `min-h-[44px]` touch targets
- Langue : UI en FR, code en EN

#### Duplication
- Logique repetee entre fichiers modifies
- Patterns qui existent deja dans les atoms UI (`Button`, `Input`, `NumberInput`, `Select`, `Card`, `Alert`)

#### Securite
- Auth checks manquants
- Ownership non verifie sur les proprietes
- Input non sanitise aux frontieres

### Format de sortie

Pour chaque probleme :
```
[SEVERITY] fichier:ligne — description du probleme
Fix: description de la correction
```

Severites : `BUG`, `WARN`, `STYLE`, `DEAD_CODE`

Si multi-agent, fusionne les resultats des deux agents en une liste unique triee par severite.

---

## Phase 3 — Fix

1. Corrige directement tous les `BUG` et `DEAD_CODE`.
2. Corrige les `WARN` et `STYLE` si le fix est simple, local, et sans risque de regression.
3. Ne touche PAS au code non concerne par la review — pas de refactoring opportuniste.

Affiche un resume final :
```
✅ Corriges : X issues (lister)
⚠️ A valider : Y issues (lister avec justification)
🟢 RAS : Z fichiers sans probleme
```
