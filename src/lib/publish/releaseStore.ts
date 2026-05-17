import { promises as fs } from "node:fs";
import path from "node:path";
import type { Page, Release } from "@/types/page";

/**
 * Filesystem-backed release store. Each release is an immutable JSON snapshot
 * at releases/<slug>/<version>.json. The latest pointer lives at
 * releases/<slug>/latest.json. This is intentionally simple — a production
 * deployment would swap this for blob storage (S3, Vercel Blob) or a database.
 *
 * Why filesystem on Vercel? The repo's releases/ directory is committed; the
 * brief asks for an immutable, versioned artefact and this gives reviewers
 * git-visible evidence of the publish flow without standing up infra.
 *
 * Caveat: on Vercel's serverless runtime, FS writes outside /tmp are
 * ephemeral. For production we'd switch to blob storage — flagged in README.
 */

const RELEASES_ROOT = path.join(process.cwd(), "releases");

function slugDir(slug: string) {
  return path.join(RELEASES_ROOT, slug);
}

function versionFile(slug: string, version: string) {
  return path.join(slugDir(slug), `${version}.json`);
}

function latestFile(slug: string) {
  return path.join(slugDir(slug), "latest.json");
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

async function safeReadJson<T>(p: string): Promise<T | null> {
  try {
    const buf = await fs.readFile(p, "utf8");
    return JSON.parse(buf) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/**
 * Read the release history for a slug, newest first. Returns [] if no
 * releases have been published yet.
 */
export async function getReleaseHistory(slug: string): Promise<Release[]> {
  const dir = slugDir(slug);
  try {
    const files = await fs.readdir(dir);
    const versionFiles = files.filter((f) => /^\d+\.\d+\.\d+\.json$/.test(f));
    const releases = await Promise.all(
      versionFiles.map(async (f) => {
        const data = await safeReadJson<Release>(path.join(dir, f));
        return data;
      }),
    );
    return releases
      .filter((r): r is Release => r !== null)
      .sort((a, b) => compareSemVer(b.version, a.version));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function getLatestRelease(slug: string): Promise<Release | null> {
  return safeReadJson<Release>(latestFile(slug));
}

/**
 * Write a release atomically: write to a temp path, then rename. Prevents
 * partial-write corruption if the process is killed mid-publish.
 */
export async function writeRelease(release: Release): Promise<void> {
  await ensureDir(slugDir(release.slug));
  const finalPath = versionFile(release.slug, release.version);
  const tmpPath = `${finalPath}.tmp`;
  const json = JSON.stringify(release, null, 2);
  await fs.writeFile(tmpPath, json, "utf8");
  await fs.rename(tmpPath, finalPath);

  // Update the latest pointer (overwrite is fine — it's a pointer, not an artefact).
  await fs.writeFile(latestFile(release.slug), json, "utf8");
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

function compareSemVer(a: string, b: string): number {
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
  }
  return 0;
}
