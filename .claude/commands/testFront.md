Ecris et execute un test E2E Playwright pour verifier ce que l'utilisateur demande.

Arguments : $ARGUMENTS

---

## Contexte

L'app Immo2025 (tiili.io) utilise Playwright pour les tests E2E. Le fichier de test temporaire sera `e2e/_adhoc.spec.ts`.

### Cibles disponibles
- **Local** : `npm run test:e2e -- e2e/_adhoc.spec.ts --project=chromium`
- **Prod** : `npm run test:e2e:prod -- e2e/_adhoc.spec.ts --project=chromium`

Par defaut, teste sur **prod** (`tiili.io`). Si l'utilisateur dit "en local" ou "en dev", teste en local.
Pour tester en mobile, ajoute `--project=mobile`.

### Structure de l'app (pour ecrire les bons selecteurs)

**Navigation :**
- Desktop navbar : `nav.hidden.md\\:block` (visible >= md)
- Mobile top bar : `nav.md\\:hidden` (sticky top)
- Mobile bottom bar : `nav.md\\:hidden.fixed` (fixed bottom, contient les liens principaux)
- Sidebar drawer : s'ouvre au clic sur le burger, contient liens : Dashboard, Recherches, + Nouveau bien, Comparer, Patrimoine, Guides villes, Blog

**Pages publiques (pas besoin d'auth) :**
- `/dashboard` — liste de proprietes, navbar, titre dans `<h1>` ou cards
- `/login` — formulaire avec bouton "Connexion" ou "Se connecter"
- `/register` — formulaire avec bouton "Creer" ou "S'inscrire"
- `/blog` — heading h1 "Blog investissement immobilier", liste d'articles avec liens
- `/blog/[slug]` — article complet
- `/guide` — tableau des villes avec prix, loyers, rendements
- `/guide/[city]` — page detaillee d'une ville

**Pages authentifiees :**
- `/property/new` — formulaire de creation de bien
- `/property/[id]` — detail d'un bien
- `/property/[id]/edit` — edition d'un bien
- `/compare` — comparaison de biens
- `/searches` — recherches sauvegardees
- `/portfolio` — patrimoine

**Patterns Playwright a suivre :**
- Preferer `getByRole()`, `getByText()`, `getByLabel()` aux selecteurs CSS
- Utiliser `page.locator("nav").first()` quand il y a ambiguite sur les nav
- Les pages sont en francais (boutons, labels, headings)
- Utiliser `await page.waitForLoadState("networkidle")` si la page a du contenu dynamique
- Filtrer les erreurs console benines : `hydrat`, `favicon`, `service-worker`, `AuthError`, `Failed to fetch`

**Exemples de tests existants :**

```typescript
// Test simple de chargement
test("le blog charge", async ({ page }) => {
  await page.goto("/blog");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/blog/i);
});

// Test navigation desktop
test("nav desktop", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "Test desktop uniquement");
  await page.goto("/dashboard");
  const desktopNav = page.locator("nav.hidden.md\\:block");
  await expect(desktopNav).toBeVisible();
  const blogLink = desktopNav.getByRole("link", { name: /blog/i });
  await blogLink.click();
  await expect(page).toHaveURL(/\/blog/);
});

// Test avec verification console
test("pas d'erreur critique", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  const critical = errors.filter(
    (e) => !e.includes("hydrat") && !e.includes("AuthError") && !e.includes("Failed to fetch")
  );
  expect(critical).toHaveLength(0);
});
```

---

## Process

1. **Analyser la demande** : comprendre ce que l'utilisateur veut tester. Si c'est vague, demander des precisions.

2. **Lire le code source** des pages/composants concernes pour comprendre la structure HTML, les labels, les textes affichés. C'est ESSENTIEL pour ecrire des selecteurs fiables.

3. **Ecrire le test** dans `e2e/_adhoc.spec.ts` :
   - Import : `import { test, expect } from "@playwright/test";`
   - Ecrire des tests clairs avec des noms en francais
   - Gerer desktop vs mobile avec `isMobile` si pertinent
   - Utiliser des assertions precises (texte visible, URL, status code)

4. **Executer le test** :
   - Prod par defaut : `npm run test:e2e:prod -- e2e/_adhoc.spec.ts --project=chromium`
   - Local si demande : `npm run test:e2e -- e2e/_adhoc.spec.ts --project=chromium`
   - Si l'utilisateur veut tester en mobile aussi : relancer avec `--project=mobile`

5. **Analyser les resultats** :
   - Si tout passe : afficher un resume concis des tests qui passent
   - Si un test echoue : lire le screenshot d'echec (`test-results/.../*.png`), analyser l'erreur, expliquer le probleme et proposer un diagnostic
   - Si c'est un bug de l'app (pas du test) : le signaler clairement

6. **Conserver ou nettoyer** :
   - Si l'utilisateur veut garder le test : le deplacer dans le bon fichier `e2e/` et lui donner un nom pertinent
   - Sinon le fichier `_adhoc.spec.ts` sera ecrase au prochain `/test`

## Contraintes

- Ne JAMAIS ecrire de test qui modifie des donnees en prod (pas de creation/suppression de proprietes sur tiili.io)
- Sur prod, tester uniquement en lecture (navigation, affichage, verification de contenu)
- Sur local, les tests peuvent creer/modifier des donnees
- Timeout max par test : 30s prod, 15s local
- Si le test echoue, TOUJOURS lire le screenshot pour donner un diagnostic visuel
