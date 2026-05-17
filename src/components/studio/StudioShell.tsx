"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setPage } from "@/store/slices/draftPageSlice";
import { hydrateHistory } from "@/store/slices/publishSlice";
import { loadPersistedDraft } from "@/store/localStorageMiddleware";
import { PageSchema } from "@/schemas/sectionValidation";
import type { Page, Role } from "@/types/page";
import type { PublishHistoryEntry } from "@/store/slices/publishSlice";
import { SectionList } from "@/components/studio/SectionList";
import { SectionEditor } from "@/components/studio/SectionEditor";
import { StudioPreview } from "@/components/studio/StudioPreview";
import { PublishBar } from "@/components/studio/PublishBar";

export function StudioShell({
  slug,
  sourcePage,
  currentVersion,
  historyPreview,
  role,
}: {
  slug: string;
  sourcePage: Page;
  currentVersion: string | null;
  historyPreview: PublishHistoryEntry[];
  role: Role;
}) {
  const dispatch = useAppDispatch();
  const draft = useAppSelector((s) => s.draftPage.draft);

  useEffect(() => {
    // Restore-from-localStorage path: only adopt the persisted draft if it
    // validates against the current schema. Otherwise discard it (schema may
    // have evolved since the draft was saved) and fall through to source.
    const persisted = loadPersistedDraft(slug);
    if (persisted) {
      const parsed = PageSchema.safeParse(persisted);
      if (parsed.success && parsed.data.slug === slug) {
        dispatch(setPage(parsed.data));
        dispatch(hydrateHistory(historyPreview));
        return;
      }
    }
    dispatch(setPage(sourcePage));
    dispatch(hydrateHistory(historyPreview));
  }, [slug, sourcePage, historyPreview, dispatch]);

  if (!draft) {
    return (
      <main id="main" className="flex flex-1 items-center justify-center">
        <p className="text-slate-700">Loading studio…</p>
      </main>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-semibold text-blue-800 underline">
            ← All pages
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">
            Studio: <code className="rounded bg-slate-100 px-1.5 py-0.5">{slug}</code>
          </h1>
          {currentVersion ? (
            <span className="text-xs text-slate-600">latest: v{currentVersion}</span>
          ) : (
            <span className="text-xs text-slate-600">no releases yet</span>
          )}
        </div>
        <PublishBar slug={slug} sourcePage={sourcePage} role={role} currentVersion={currentVersion} />
      </header>

      <main
        id="main"
        className="grid flex-1 grid-cols-1 gap-0 lg:grid-cols-[280px_1fr_360px]"
      >
        <aside
          aria-label="Sections list"
          className="border-r border-slate-200 bg-slate-50 p-4"
        >
          <SectionList />
        </aside>

        <section aria-label="Live preview" className="bg-white overflow-y-auto">
          <StudioPreview />
        </section>

        <aside
          aria-label="Section editor"
          className="border-l border-slate-200 bg-slate-50 p-4 overflow-y-auto"
        >
          <SectionEditor />
        </aside>
      </main>
    </>
  );
}
