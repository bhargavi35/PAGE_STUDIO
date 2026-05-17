"use client";

import { useMemo, useState, useTransition } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  publishError,
  publishNoop,
  publishPending,
  publishSuccess,
  publishReset,
} from "@/store/slices/publishSlice";
import { markPublished, resetDraft } from "@/store/slices/draftPageSlice";
import { calculateSemVerBump } from "@/lib/publish/semver";
import type { Page, Role } from "@/types/page";
import { Button } from "@/components/ui/button";
import { PageSchema } from "@/schemas/sectionValidation";
import { clearPersistedDraft } from "@/store/localStorageMiddleware";

/**
 * Publish UI. Shows the computed SemVer bump live (client-side), and on
 * click POSTs to /api/publish where the *server* re-computes the bump
 * authoritatively (never trust client diff). The middleware also gates
 * the API at /api/publish to publisher role.
 */
export function PublishBar({
  slug,
  sourcePage,
  role,
  currentVersion,
}: {
  slug: string;
  sourcePage: Page;
  role: Role;
  currentVersion: string | null;
}) {
  const dispatch = useAppDispatch();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const draft = useAppSelector((s) => s.draftPage.draft);
  const isDirty = useAppSelector((s) => s.draftPage.isDirty);
  const status = useAppSelector((s) => s.publish.status);
  const lastVersion = useAppSelector((s) => s.publish.lastVersion);
  const lastBump = useAppSelector((s) => s.publish.lastBump);

  const bump = useMemo(() => {
    if (!draft) return "none";
    return calculateSemVerBump(sourcePage, draft);
  }, [draft, sourcePage]);

  const canPublish = role === "publisher";
  const cannotEdit = role === "viewer";

  if (cannotEdit) {
    return (
      <p className="text-sm text-slate-700">
        Read-only role.{" "}
        <a href="/login" className="underline">
          Switch role
        </a>{" "}
        to edit.
      </p>
    );
  }

  const onPublish = () => {
    if (!draft) return;
    setFeedback(null);
    const validation = PageSchema.safeParse(draft);
    if (!validation.success) {
      const msg =
        "Draft is invalid: " +
        validation.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
      setFeedback(msg);
      return;
    }
    dispatch(publishPending());
    startTransition(async () => {
      try {
        const res = await fetch("/api/publish", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, draft }),
        });
        if (res.status === 403) {
          dispatch(publishError("Forbidden: publisher role required."));
          setFeedback("You don't have permission to publish.");
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          dispatch(publishError(text || `HTTP ${res.status}`));
          setFeedback(text || `Publish failed (HTTP ${res.status})`);
          return;
        }
        const data = (await res.json()) as {
          status: "published" | "noop";
          version: string;
          bump: "patch" | "minor" | "major" | "none";
          changelog: string[];
          publishedBy: string;
          createdAt: string;
        };
        if (data.status === "noop") {
          dispatch(publishNoop());
          setFeedback(`No changes since v${data.version}. Idempotent publish — no new version.`);
          return;
        }
        dispatch(
          publishSuccess({
            version: data.version,
            bump: data.bump,
            changelog: data.changelog,
            createdAt: data.createdAt,
            publishedBy: data.publishedBy,
          }),
        );
        dispatch(markPublished());
        clearPersistedDraft(slug);
        setFeedback(`Published v${data.version} (${data.bump}).`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        dispatch(publishError(msg));
        setFeedback(`Publish error: ${msg}`);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        aria-live="polite"
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs"
        data-testid="publish-bump-indicator"
      >
        Bump:{" "}
        <strong
          className={
            bump === "major"
              ? "text-red-700"
              : bump === "minor"
                ? "text-amber-700"
                : bump === "patch"
                  ? "text-blue-800"
                  : "text-slate-600"
          }
        >
          {bump}
        </strong>
        {!isDirty ? <span className="ml-2 text-slate-500">(saved)</span> : null}
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={!isDirty}
        onClick={() => {
          dispatch(resetDraft());
          dispatch(publishReset());
          clearPersistedDraft(slug);
          setFeedback(null);
        }}
      >
        Discard changes
      </Button>

      <Button
        size="sm"
        onClick={onPublish}
        disabled={!canPublish || isPending || status === "pending"}
        aria-disabled={!canPublish}
        title={canPublish ? "" : "Requires publisher role"}
      >
        {isPending || status === "pending" ? "Publishing…" : `Publish (${bump})`}
      </Button>

      {feedback ? (
        <p
          role="status"
          aria-live="polite"
          className="basis-full text-xs text-slate-700"
          data-testid="publish-feedback"
        >
          {feedback}
        </p>
      ) : null}

      {!canPublish ? (
        <p className="basis-full text-xs text-slate-600">
          Editor role: edits save locally, publish is disabled.
        </p>
      ) : null}

      {lastVersion && status === "success" ? (
        <p className="basis-full text-xs text-emerald-800">
          Last release: v{lastVersion} ({lastBump}).
        </p>
      ) : null}
    </div>
  );
}
