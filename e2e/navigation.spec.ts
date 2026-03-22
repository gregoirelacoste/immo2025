import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("les liens de navigation fonctionnent (desktop)", async ({ page, isMobile }) => {
    test.skip(!!isMobile, "Test desktop uniquement");
    await page.goto("/dashboard");

    // La navbar desktop est visible
    const desktopNav = page.locator("nav.hidden.md\\:block");
    await expect(desktopNav).toBeVisible();

    // Cliquer sur Blog dans la navbar desktop
    const blogLink = desktopNav.getByRole("link", { name: /blog/i });
    await blogLink.click();
    await expect(page).toHaveURL(/\/blog/);
    await page.goBack();
  });

  test("les liens de navigation fonctionnent (mobile)", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Test mobile uniquement");
    await page.goto("/dashboard");

    // Sur mobile, la bottom tab bar contient les liens
    const bottomNav = page.locator("nav.md\\:hidden.fixed");
    await expect(bottomNav).toBeVisible();

    // Naviguer via la bottom bar
    const links = bottomNav.getByRole("link");
    const count = await links.count();
    expect(count).toBeGreaterThan(2);
  });

  test("le responsive mobile affiche la bottom bar", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Test mobile uniquement");
    await page.goto("/dashboard");

    const bottomNav = page.locator("nav.md\\:hidden.fixed");
    await expect(bottomNav).toBeVisible();
  });
});
