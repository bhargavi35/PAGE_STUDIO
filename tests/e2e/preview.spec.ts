import { test, expect } from "@playwright/test";

test.describe("/preview/[slug]", () => {
  test("renders the home fixture page with hero + CTA", async ({ page }) => {
    await page.goto("/preview/home");
    await expect(page.getByRole("heading", { level: 1, name: /ship landing pages/i })).toBeVisible();
    // CTA button (rendered as a link by Hero/Cta)
    await expect(page.getByRole("link", { name: /open the studio/i }).first()).toBeVisible();
  });

  test("CTA link is keyboard focusable and announces correctly", async ({ page }) => {
    await page.goto("/preview/home");
    const cta = page.getByRole("link", { name: /open the studio/i }).first();
    await cta.focus();
    await expect(cta).toBeFocused();
  });

  test("404s gracefully on an unknown slug", async ({ page }) => {
    const res = await page.goto("/preview/no-such-page");
    expect(res?.status()).toBe(404);
  });
});
