"use client";

import { useAppSelector } from "@/store/hooks";
import { SectionRenderer } from "@/components/SectionRenderer";

/**
 * The studio's live preview pane. Subscribes to the Redux draft and re-renders
 * via the same SectionRenderer used by /preview/[slug]. This is the contract:
 * what you see in the studio is what /preview will render after publish.
 */
export function StudioPreview() {
  const draft = useAppSelector((s) => s.draftPage.draft);
  if (!draft) return null;

  return (
    <div className="border-x border-dashed border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs uppercase tracking-wide text-slate-600">
        Live preview
      </div>
      <div data-testid="studio-preview-root">
        {draft.sections.map((section) => (
          <SectionRenderer key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
