import type { Middleware } from "@reduxjs/toolkit";
import type { RootState } from "@/store/store";

const STORAGE_PREFIX = "page-studio:draft:";

function buildKey(slug: string) {
  return `${STORAGE_PREFIX}${slug}`;
}

/**
 * Saves draftPage to localStorage, keyed per-slug, on every action that
 * touches draftPage state. Cheap throttle (microtask-level) and only runs
 * on the client.
 *
 * Restoration is handled imperatively in the studio shell so we can scope
 * by slug (the reducer doesn't know which slug it's editing).
 */
let queued = false;
export const localStoragePersistMiddleware: Middleware = (storeApi) => (next) => (action) => {
  const result = next(action);
  if (typeof window === "undefined") return result;
  const a = action as { type?: string };
  if (!a.type || !a.type.startsWith("draftPage/")) return result;

  if (queued) return result;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    const state = storeApi.getState() as RootState;
    const draft = state.draftPage.draft;
    if (!draft) return;
    try {
      window.localStorage.setItem(
        buildKey(draft.slug),
        JSON.stringify({ draft, savedAt: Date.now() }),
      );
    } catch {
      // localStorage may be full / disabled (incognito). Silent: a publish-time
      // re-fetch always recovers state.
    }
  });
  return result;
};

export function loadPersistedDraft(slug: string): unknown | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(buildKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { draft?: unknown };
    return parsed.draft ?? null;
  } catch {
    return null;
  }
}

export function clearPersistedDraft(slug: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(buildKey(slug));
}
