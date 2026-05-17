"use server";

/**
 * Server Action variant of the publish endpoint. The /api/publish HTTP route
 * is the primary public surface (the studio client posts to it via fetch),
 * but this Server Action is useful for:
 *
 *   1. Server components / forms that want progressive enhancement.
 *   2. Test harnesses that import the function directly.
 *   3. Anywhere we want type-safe cross-boundary calls without JSON shipping.
 *
 * Defense-in-depth: re-checks the role cookie (publisher only), re-validates
 * the page via Zod, re-computes the bump from the latest on-disk snapshot,
 * and writes an atomic file. Idempotent — re-publishing identical content
 * returns the existing version without writing a new file.
 */

import { getCurrentRole, can } from "@/lib/auth/session";
import { PageSchema } from "@/schemas/sectionValidation";
import {
  getLatestRelease,
  pagesEqualForIdempotency,
  writeRelease,
} from "@/lib/publish/releaseStore";
import {
  calculateSemVerBump,
  applyBump,
  INITIAL_VERSION,
} from "@/lib/publish/semver";
import { buildChangelog } from "@/lib/publish/changelog";
import type { Page, Release, ReleaseBump } from "@/types/page";

export type PublishActionResult =
  | {
      status: "published";
      version: string;
      bump: ReleaseBump;
      changelog: string[];
      publishedBy: string;
      createdAt: string;
    }
  | { status: "noop"; version: string; publishedBy: string; createdAt: string }
  | { status: "error"; reason: string };

export async function publishDraftAction(input: {
  slug: string;
  draft: Page;
}): Promise<PublishActionResult> {
  const role = await getCurrentRole();
  if (!can(role, "canPublish")) {
    // The brief says: "throw a strict 'Unauthorized Action' server error."
    // We surface this as an Error so any caller awaiting the action surfaces
    // it via React's error boundary / form action error channel.
    throw new Error("Unauthorized Action");
  }

  const parsed = PageSchema.safeParse(input.draft);
  if (!parsed.success) {
    return {
      status: "error",
      reason: parsed.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  }
  if (parsed.data.slug !== input.slug) {
    return { status: "error", reason: "draft.slug must equal route slug" };
  }

  const latest = await getLatestRelease(input.slug);
  const baseline = latest?.snapshot ?? parsed.data;

  if (latest && pagesEqualForIdempotency(latest.snapshot, parsed.data)) {
    return {
      status: "noop",
      version: latest.version,
      publishedBy: latest.publishedBy,
      createdAt: latest.createdAt,
    };
  }

  const bump = latest ? calculateSemVerBump(baseline, parsed.data) : "minor";
  const previousVersion = latest?.version ?? "0.9.0";
  const version = latest ? applyBump(previousVersion, bump) : INITIAL_VERSION;
  const changelog = latest
    ? buildChangelog(baseline, parsed.data)
    : ["Initial release"];

  const release: Release = {
    pageId: parsed.data.pageId,
    slug: input.slug,
    version,
    bump,
    changelog,
    snapshot: parsed.data,
    createdAt: new Date().toISOString(),
    publishedBy: `role:${role}`,
  };

  await writeRelease(release);

  return {
    status: "published",
    version: release.version,
    bump: release.bump,
    changelog: release.changelog,
    publishedBy: release.publishedBy,
    createdAt: release.createdAt,
  };
}
