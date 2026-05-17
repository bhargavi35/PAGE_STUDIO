import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Page, Section, SectionType } from "@/types/page";

/**
 * draftPage owns the in-progress page being edited. The "original" snapshot
 * is kept in parallel so the SemVer diff engine has something deterministic
 * to compare against on publish.
 *
 * RTK uses Immer under the hood, so reducers can be written in a mutation
 * style without producing actual mutations to current state.
 */

// JSON-deep-clone. Page is JSON-shaped by Zod schema, and unlike clonePage
// this works on Immer Proxy drafts — clonePage trips on the Proxy's
// internal traps and throws "could not be cloned".
function clonePage<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface DraftPageState {
  draft: Page | null;
  original: Page | null;
  isDirty: boolean;
}

const initialState: DraftPageState = {
  draft: null,
  original: null,
  isDirty: false,
};

function emptySectionProps(type: SectionType): Record<string, unknown> {
  switch (type) {
    case "hero":
      return {
        title: "New Hero",
        subtitle: "",
        ctaLabel: "Learn more",
        ctaUrl: "https://example.com",
      };
    case "featureGrid":
      return {
        heading: "Why choose us",
        features: [{ title: "Feature one", description: "Describe it." }],
      };
    case "testimonial":
      return {
        quote: "This product changed our workflow.",
        authorName: "Anonymous",
      };
    case "cta":
      return {
        heading: "Ready to start?",
        buttonLabel: "Get started",
        buttonUrl: "https://example.com",
      };
  }
}

export const draftPageSlice = createSlice({
  name: "draftPage",
  initialState,
  reducers: {
    /** Hydrate the editor from the published/source page. Resets dirty flag. */
    setPage(state, action: PayloadAction<Page>) {
      state.draft = clonePage(action.payload);
      state.original = clonePage(action.payload);
      state.isDirty = false;
    },
    /** Edit a section's props (shallow merge). Marks dirty. */
    updateSectionProps(
      state,
      action: PayloadAction<{ sectionId: string; props: Record<string, unknown> }>,
    ) {
      if (!state.draft) return;
      const target = state.draft.sections.find((s) => s.id === action.payload.sectionId);
      if (!target) return;
      target.props = { ...target.props, ...action.payload.props };
      state.isDirty = true;
    },
    /** Append a new section of a known type with sensible defaults. */
    addSection(state, action: PayloadAction<{ type: SectionType; id?: string }>) {
      if (!state.draft) return;
      const id =
        action.payload.id ??
        `${action.payload.type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const newSection: Section = {
        id,
        type: action.payload.type,
        props: emptySectionProps(action.payload.type),
      };
      state.draft.sections.push(newSection);
      state.isDirty = true;
    },
    /** Replace the sections array with a new ordered list. Used by drag/reorder UI. */
    reorderSections(state, action: PayloadAction<Section[]>) {
      if (!state.draft) return;
      state.draft.sections = action.payload;
      state.isDirty = true;
    },
    /** Remove a section by id. */
    removeSection(state, action: PayloadAction<{ sectionId: string }>) {
      if (!state.draft) return;
      state.draft.sections = state.draft.sections.filter((s) => s.id !== action.payload.sectionId);
      state.isDirty = true;
    },
    /** Mark the current draft as the new baseline (called after a successful publish). */
    markPublished(state) {
      if (!state.draft) return;
      state.original = clonePage(state.draft);
      state.isDirty = false;
    },
    /** Discard local changes and revert to the original page. */
    resetDraft(state) {
      if (!state.original) return;
      state.draft = clonePage(state.original);
      state.isDirty = false;
    },
  },
});

export const {
  setPage,
  updateSectionProps,
  addSection,
  reorderSections,
  removeSection,
  markPublished,
  resetDraft,
} = draftPageSlice.actions;

export default draftPageSlice.reducer;
