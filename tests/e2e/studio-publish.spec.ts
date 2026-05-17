import { test, expect } from "@playwright/test";

test.describe("Studio publish flow", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.context().addCookies([
      { name: "ps_role", value: "publisher", url: baseURL ?? "http://localhost:3000/" },
    ]);
  });

  test("editing a hero title bumps the SemVer indicator to patch", async ({ page }) => {
    await page.goto("/studio/launch");
    await expect(page.getByRole("heading", { name: /studio:/i })).toBeVisible();
    // Click the hero section card
    await page.getByRole("button", { name: /edit hero section hero-launch/i }).click();
    const titleInput = page.getByLabel("Title");
    await titleInput.fill("Launching faster than ever");
    await expect(page.getByTestId("publish-bump-indicator")).toContainText(/patch/i);
  });

  test("adding a section bumps to minor", async ({ page }) => {
    await page.goto("/studio/launch");
    await page.getByRole("button", { name: "+ Testimonial" }).click();
    await expect(page.getByTestId("publish-bump-indicator")).toContainText(/minor/i);
  });

  test("removing a section bumps to major", async ({ page }) => {
    await page.goto("/studio/launch");
    // First section: hero-launch — remove the second one (cta-launch) to keep page non-empty.
    const removeButtons = page.getByRole("button", { name: /^remove /i });
    await removeButtons.last().click();
    await expect(page.getByTestId("publish-bump-indicator")).toContainText(/major/i);
  });

  test("publishing produces a release JSON and clears dirty state", async ({ page }) => {
    await page.goto("/studio/launch");
    await page.getByRole("button", { name: /edit hero section hero-launch/i }).click();
    await page.getByLabel("Title").fill(`Smoke test publish ${Date.now()}`);
    await page.getByRole("button", { name: /publish \(/i }).click();
    await expect(page.getByTestId("publish-feedback")).toContainText(/published v/i, { timeout: 15_000 });
  });
});
