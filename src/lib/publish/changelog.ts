import type { Page, Section } from "@/types/page";
import {
  HeroPropsSchema,
  FeatureGridPropsSchema,
  TestimonialPropsSchema,
  CtaPropsSchema,
} from "@/schemas/sectionValidation";

const propSchemaByType = {
  hero: HeroPropsSchema,
  featureGrid: FeatureGridPropsSchema,
  testimonial: TestimonialPropsSchema,
  cta: CtaPropsSchema,
} as const;

function keysOf(type: Section["type"]): string[] {
  const schema = propSchemaByType[type];
  return schema ? Object.keys(schema.shape) : [];
}

/**
 * Human-readable changelog entries summarizing what shifted between two pages.
 * Deterministic — entries are emitted in a stable order so two identical
 * diffs produce identical changelogs (and identical release JSON).
 */
export function buildChangelog(originalPage: Page, draftPage: Page): string[] {
  const lines: string[] = [];

  if (originalPage.title !== draftPage.title) {
    lines.push(`Page title: "${originalPage.title}" → "${draftPage.title}"`);
  }

  const origById = new Map(originalPage.sections.map((s) => [s.id, s]));
  const draftById = new Map(draftPage.sections.map((s) => [s.id, s]));

  // Removals (stable: original order).
  for (const s of originalPage.sections) {
    if (!draftById.has(s.id)) lines.push(`Removed section "${s.id}" (${s.type})`);
  }
  // Additions (stable: draft order).
  for (const s of draftPage.sections) {
    if (!origById.has(s.id)) lines.push(`Added section "${s.id}" (${s.type})`);
  }

  // Per-section changes (stable: draft order, ignoring purely-new sections).
  for (const draftSection of draftPage.sections) {
    const original = origById.get(draftSection.id);
    if (!original) continue;
    if (original.type !== draftSection.type) {
      lines.push(`Section "${draftSection.id}" type: ${original.type} → ${draftSection.type}`);
      continue;
    }
    for (const k of keysOf(draftSection.type)) {
      const before = original.props[k];
      const after = draftSection.props[k];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        lines.push(`Section "${draftSection.id}": prop "${k}" changed`);
      }
    }
  }

  // Reorder (detect only when the *set* is unchanged but order differs).
  const sameSet =
    originalPage.sections.length === draftPage.sections.length &&
    originalPage.sections.every((s) => draftById.has(s.id));
  if (sameSet) {
    const origOrder = originalPage.sections.map((s) => s.id).join(",");
    const draftOrder = draftPage.sections.map((s) => s.id).join(",");
    if (origOrder !== draftOrder) lines.push(`Reordered sections`);
  }

  return lines;
}
