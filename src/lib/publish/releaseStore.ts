import type { Page, Release } from "@/types/page";

/**
 * In-memory release store. Releases live in a module-scope Map keyed by slug
 * and ordered newest-first. State survives within a warm serverless instance
 * but is reset on cold start and on every deploy.
 *
 * This is a deliberate demo-grade choice — the brief asks for an immutable
 * versioned snapshot, but Vercel's serverless filesystem is read-only outside
 * /tmp (which itself is ephemeral). A production deployment would back this
 * with Vercel Blob / S3 / a database; the public function signatures here are
 * shaped so that swap is a one-file change. Flagged in README "What is not
 * included".
 *
 * The `globalThis` keying is purely so Next.js dev-mode HMR doesn't wipe the
 * store between hot reloads — it has no effect in production.
 */

type Store = Map<string, Release[]>;

const STORE_KEY = "__pageStudioReleaseStore__";

function getStore(): Store {
  const g = globalThis as unknown as Record<string, Store | undefined>;
  if (!g[STORE_KEY]) g[STORE_KEY] = new Map();
  return g[STORE_KEY]!;
}

export async function getReleaseHistory(slug: string): Promise<Release[]> {
  const list = getStore().get(slug);
  return list ? [...list] : [];
}

export async function getLatestRelease(slug: string): Promise<Release | null> {
  const list = getStore().get(slug);
  return list && list.length > 0 ? list[0] : null;
}

export async function writeRelease(release: Release): Promise<void> {
  const store = getStore();
  const existing = store.get(release.slug) ?? [];
  // Newest first; preserve immutability by replacing rather than mutating.
  store.set(release.slug, [release, ...existing.filter((r) => r.version !== release.version)]);
}

/** Page-only snapshot equality for idempotency checks. */
export function pagesEqualForIdempotency(a: Page, b: Page): boolean {
  return stableStringify(a) === stableStringify(b);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
    .join(",")}}`;
}
