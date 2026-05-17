import { NextRequest, NextResponse } from "next/server";
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
import type { Release } from "@/types/page";

/**
 * Publish endpoint. Defense-in-depth:
 *   1. Middleware already enforces publisher role at the edge.
 *   2. This handler re-checks role here (belt + suspenders — middleware
 *      mistakes shouldn't expose this route).
 *   3. Re-validates the draft against PageSchema before doing anything.
 *   4. Recomputes the SemVer bump from server-known baseline (the latest
 *      release on disk), NOT from anything the client claims.
 */
export async function POST(request: NextRequest) {
  try {
    const role = await getCurrentRole();
    if (!can(role, "canPublish")) {
      return NextResponse.json(
        { error: "forbidden", reason: "publish role required" },
        { status: 403 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const parsed = parseBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: "invalid_body", reason: parsed.reason }, { status: 400 });
    }
    const { slug, draft } = parsed;

    if (draft.slug !== slug) {
      return NextResponse.json(
        { error: "slug_mismatch", reason: "draft.slug must equal route slug" },
        { status: 400 },
      );
    }

    const latest = await getLatestRelease(slug);
    const baseline = latest?.snapshot ?? draft;

    // Idempotency: publishing the same content twice doesn't create a new release.
    if (latest && pagesEqualForIdempotency(latest.snapshot, draft)) {
      return NextResponse.json({
        status: "noop",
        version: latest.version,
        bump: "none",
        changelog: [],
        publishedBy: latest.publishedBy,
        createdAt: latest.createdAt,
      });
    }

    const bump = latest ? calculateSemVerBump(baseline, draft) : "minor";
    const previousVersion = latest?.version ?? "0.9.0";
    const version = latest ? applyBump(previousVersion, bump) : INITIAL_VERSION;
    const changelog = latest ? buildChangelog(baseline, draft) : ["Initial release"];

    const release: Release = {
      pageId: draft.pageId,
      slug,
      version,
      bump,
      changelog,
      snapshot: draft,
      createdAt: new Date().toISOString(),
      publishedBy: `role:${role}`,
    };

    await writeRelease(release);

    return NextResponse.json({
      status: "published",
      version: release.version,
      bump: release.bump,
      changelog: release.changelog,
      publishedBy: release.publishedBy,
      createdAt: release.createdAt,
    });
  } catch (err) {
    // Never leak a raw stack to clients, but log it so Vercel function logs
    // still show the cause. The studio UI already renders `reason` when set.
    console.error("[publish] unhandled error", err);
    return NextResponse.json(
      { error: "publish_failed", reason: err instanceof Error ? err.message : "unknown error" },
      { status: 500 },
    );
  }
}

type ParseOk = { ok: true; slug: string; draft: import("@/types/page").Page };
type ParseErr = { ok: false; reason: string };

function parseBody(body: unknown): ParseOk | ParseErr {
  if (!body || typeof body !== "object") return { ok: false, reason: "body must be an object" };
  const { slug, draft } = body as { slug?: unknown; draft?: unknown };
  if (typeof slug !== "string" || slug.length === 0) {
    return { ok: false, reason: "slug must be a non-empty string" };
  }
  const draftResult = PageSchema.safeParse(draft);
  if (!draftResult.success) {
    return {
      ok: false,
      reason: draftResult.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  }
  return { ok: true, slug, draft: draftResult.data };
}
