"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addSection,
  removeSection,
  reorderSections,
} from "@/store/slices/draftPageSlice";
import { setActiveSection } from "@/store/slices/uiSlice";
import type { SectionType } from "@/types/page";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SECTION_TYPES: { value: SectionType; label: string }[] = [
  { value: "hero", label: "Hero" },
  { value: "featureGrid", label: "Feature Grid" },
  { value: "testimonial", label: "Testimonial" },
  { value: "cta", label: "Call to action" },
];

export function SectionList() {
  const dispatch = useAppDispatch();
  const draft = useAppSelector((s) => s.draftPage.draft);
  const activeId = useAppSelector((s) => s.ui.activeSectionId);

  if (!draft) return null;

  const move = (id: string, dir: -1 | 1) => {
    const idx = draft.sections.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= draft.sections.length) return;
    const next = [...draft.sections];
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    dispatch(reorderSections(next));
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Sections
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          {draft.sections.length} on this page
        </p>
      </div>

      <ol
        aria-label="Sections in order"
        className="flex flex-col gap-2"
      >
        {draft.sections.map((section, idx) => {
          const isActive = section.id === activeId;
          return (
            <li key={section.id}>
              <div
                className={cn(
                  "flex flex-col gap-2 rounded-md border bg-white p-3 transition-colors",
                  isActive ? "border-blue-700 ring-2 ring-blue-700" : "border-slate-200",
                )}
              >
                <button
                  type="button"
                  onClick={() => dispatch(setActiveSection(section.id))}
                  className="flex items-start justify-between gap-2 text-left"
                  aria-pressed={isActive}
                  aria-label={`Edit ${section.type} section ${section.id}`}
                >
                  <span className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                      {section.type}
                    </span>
                    <span className="text-xs text-slate-700">{section.id}</span>
                  </span>
                </button>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => move(section.id, -1)}
                    disabled={idx === 0}
                    aria-label={`Move ${section.id} up`}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => move(section.id, 1)}
                    disabled={idx === draft.sections.length - 1}
                    aria-label={`Move ${section.id} down`}
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (activeId === section.id) dispatch(setActiveSection(null));
                      dispatch(removeSection({ sectionId: section.id }));
                    }}
                    aria-label={`Remove ${section.id}`}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <fieldset className="flex flex-col gap-2 rounded-md border border-dashed border-slate-300 p-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Add section
        </legend>
        {SECTION_TYPES.map((t) => (
          <Button
            key={t.value}
            variant="outline"
            size="sm"
            onClick={() => dispatch(addSection({ type: t.value }))}
          >
            + {t.label}
          </Button>
        ))}
      </fieldset>
    </div>
  );
}
