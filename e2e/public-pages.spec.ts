import { test, expect } from "@playwright/test";

test.describe("Pages publiques", () => {
  test("la page d'accueil redirige vers /dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("le dashboard se charge sans erreur", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveTitle(/tiili|immo/i);
    // Vérifie qu'au moins une navbar est présente
    await expect(page.locator("nav").first()).toBeVisible();
  });

  test("la page login s'affiche", async ({ page }) => {
    await page.goto("/login");
    // Le formulaire de connexion doit être visible
    await expect(page.getByRole("button", { name: /connexion|se connecter/i })).toBeVisible();
  });

  test("la page inscription s'affiche", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("button", { name: /créer|inscription|s'inscrire/i })).toBeVisible();
  });

  test("le blog charge et affiche des articles", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/blog/i);
  });

  test("le guide villes charge", async ({ page }) => {
    await page.goto("/guide");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
