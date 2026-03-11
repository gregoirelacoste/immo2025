Review la qualite du code du projet Immo2025.

Lis le fichier STANDARDS.md a la racine du projet pour connaitre les standards.

## Checklist de review

### 1. Code mort
- Imports non utilises
- Variables non utilisees
- Fonctions non appelees
- Fichiers non references
- Routes mortes

### 2. Bugs potentiels
- Server actions sans try/catch
- Queries DB sans parametres (injection SQL)
- Acces a des proprietes potentiellement undefined sans verification
- Race conditions dans les mutations
- revalidatePath manquants apres mutations

### 3. Standards du projet
Compare chaque fichier modifie recemment contre STANDARDS.md :
- Nommage (fichiers, variables, types)
- Imports (@/ alias, named vs default exports)
- TypeScript (any, ts-ignore, strict violations)
- Composants (interface Props, "use client", export default)
- Server actions (try/catch, return pattern, revalidation)
- DB (parametrized queries, rowAs mapping, undefined not null)
- Styling (Tailwind inline, mobile-first, touch targets)
- Langue (FR pour UI, EN pour code)

### 4. Duplication
- Logique dupliquee entre fichiers
- Patterns repetes qui devraient etre abstraits
- Helper functions definies dans plusieurs fichiers

### 5. Securite
- Auth checks manquants sur les server actions
- Proprietes accessibles sans verification ownership
- Input non sanitize

## Format de sortie

Pour chaque probleme trouve :
```
[SEVERITY] fichier:ligne — description du probleme
Fix: description de la correction
```

Severites : BUG, WARN, STYLE, DEAD_CODE

Apres l'analyse, corrige directement tous les BUG et DEAD_CODE.
Pour les WARN et STYLE, corrige si le fix est simple et sans risque.
