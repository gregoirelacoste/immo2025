Redige la documentation technique pour la feature qui vient d'etre implementee dans ce cycle.

## Process

1. **Identifier les changements** : lis les commits recents (`git log --oneline -10`) et le diff depuis le dernier tag ou merge pour comprendre la feature.

2. **Determiner le fichier de doc** :
   - Architecture/systeme → `docs/architecture/<feature>.md`
   - Guide d'utilisation → `docs/guides/<feature>.md`
   - API/integration → `docs/api/<feature>.md`
   - Si un fichier doc existant couvre deja le sujet, mets-le a jour au lieu d'en creer un nouveau.

3. **Rediger avec ce template** :

```markdown
# <Titre de la feature>

> Redige le YYYY-MM-DD — Commit `<hash court>`

## Contexte
Quel probleme cette feature resout. Pourquoi c'etait necessaire.

## Architecture
Comment c'est implemente. Diagrammes de flux, tables de fichiers/responsabilites.

## Fichiers cles
Liste des fichiers principaux avec leur role.

## Utilisation
Comment utiliser la feature (CLI, UI, API).

## Decisions techniques
Choix notables et pourquoi (ex: protection des sources, pattern fire-and-forget).
```

4. **Contraintes de redaction** :
   - Langue : francais pour le contenu, anglais pour les noms de code/fichiers
   - Inclure la date du jour et le hash du dernier commit pertinent
   - Pas de prose inutile — aller droit au but
   - Preferer les tableaux aux longues listes
   - Inclure les commandes CLI exactes si applicable
   - Referencier les fichiers avec leur chemin relatif depuis la racine

5. **Commit** : ajouter le fichier doc au commit de la feature ou dans un commit separe `docs: <description>`.

## Rappel

Ce skill doit etre invoque en fin de cycle de grosse feature. Si la feature est triviale (fix 1 fichier, refactor mineur), ne pas creer de doc.
