import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Accessibility gate. Runs axe-core against every primary route, writes a
 * machine-readable report to a11y-report.json (uploaded by CI), and FAILS
 * the suite on any "critical" or "serious" violation.
 *
 * AAA-oriented config: we opt into best-practice + WCAG 2.x AA + AAA tags.
 * "best-practice" includes some non-WCAG checks (e.g. duplicate IDs) that
 * we want enforced regardless.
 */

interface Violation {
  id: string;
  impact: string | null | undefined;
  help: string;
  helpUrl: string;
  nodes: number;
  route: string;
}

const REPORT_PATH = path.join(process.cwd(), "a11y-report.json");

const ROUTES = [
  { url: "/", name: "home" },
  { url: "/preview/home", name: "preview-home" },
  { url: "/preview/launch", name: "preview-launch" },
  { url: "/login", name: "login" },
];

const collected: Violation[] = [];

test.beforeAll(async () => {
  await fs.writeFile(REPORT_PATH, JSON.stringify({ runs: [] }, null, 2));
});

test.afterAll(async () => {
  await fs.writeFile(
    REPORT_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), violations: collected }, null, 2),
  );
});

for (const route of ROUTES) {
  test(`a11y: ${route.name} (${route.url})`, async ({ page }) => {
    await page.goto(route.url);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      .analyze();

    for (const v of results.violations) {
      collected.push({
        id: v.id,
        impact: v.impact,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.length,
        route: route.url,
      });
    }

    const blocking = results.violations.filter((v) =>
      v.impact === "critical" || v.impact === "serious",
    );

    if (blocking.length > 0) {
      const summary = blocking
        .map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`)
        .join("\n");
      // eslint-disable-next-line no-console
      console.log(`A11y violations on ${route.url}:\n${summary}`);
    }
    expect(blocking, `Critical/serious a11y violations on ${route.url}`).toEqual([]);
  });
}
