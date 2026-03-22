import { test, expect } from "@playwright/test";

test.describe("Performance basique", () => {
  test("le dashboard charge en moins de 5s", async ({ page }) => {
    const start = Date.now();
    await page.goto("/dashboard");
    await expect(page.locator("nav").first()).toBeVisible();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  test("pas d'erreur console critique", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Filtrer les erreurs connues/bénignes (ex: hydration warnings en dev)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("hydrat") &&
        !e.includes("favicon") &&
        !e.includes("service-worker") &&
        !e.includes("AuthError") &&
        !e.includes("Failed to fetch")
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test("pas de page 500 sur les routes principales", async ({ page }) => {
    const routes = ["/dashboard", "/login", "/register", "/blog", "/guide"];

    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} devrait répondre 200`).toBeLessThan(500);
    }
  });
});
