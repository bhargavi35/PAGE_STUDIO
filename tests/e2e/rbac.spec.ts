import { test, expect } from "@playwright/test";

async function setRole(page: import("@playwright/test").Page, role: "viewer" | "editor" | "publisher") {
  await page.context().addCookies([
    {
      name: "ps_role",
      value: role,
      url: page.url() && page.url() !== "about:blank" ? page.url() : "http://localhost:3000/",
    },
  ]);
}

test.describe("RBAC enforcement", () => {
  test("viewer is redirected to /403 when accessing /studio/*", async ({ page }) => {
    await page.goto("/");
    await setRole(page, "viewer");
    await page.goto("/studio/home");
    await expect(page).toHaveURL(/\/403/);
    await expect(page.getByRole("heading", { name: /don't have access/i })).toBeVisible();
  });

  test("editor can open the studio but cannot publish", async ({ page }) => {
    await page.goto("/");
    await setRole(page, "editor");
    await page.goto("/studio/home");
    await expect(page.getByRole("heading", { name: /studio:/i })).toBeVisible();
    await expect(page.getByText(/editor role:/i)).toBeVisible();
  });

  test("publisher can open the studio AND see the publish button", async ({ page }) => {
    await page.goto("/");
    await setRole(page, "publisher");
    await page.goto("/studio/home");
    await expect(page.getByRole("button", { name: /publish \(/i })).toBeVisible();
  });

  test("non-publisher gets 403 from /api/publish even via direct request", async ({ request, baseURL }) => {
    const res = await request.post(`${baseURL}/api/publish`, {
      headers: { cookie: "ps_role=editor" },
      data: { slug: "home", draft: {} },
    });
    expect(res.status()).toBe(403);
  });
});
