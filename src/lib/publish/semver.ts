import type { Page, ReleaseBump, Section } from "@/types/page";
import {
  HeroPropsSchema,
  FeatureGridPropsSchema,
  TestimonialPropsSchema,
  CtaPropsSchema,
} from "@/schemas/sectionValidation";
import { z } from "zod";

/**
 * Deterministic SemVer diff for Page documents.
 *
 * Precedence (high -> low): major > minor > patch > none.
 *
 * Rules (per task brief):
 *   - none  : payloads are deep-equal.
 *   - major : a section was removed OR a section's `type` changed OR a
 *             *required* prop on an existing section transitioned from
 *             present-and-valid to missing-or-empty.
 *   - minor : a section was added OR an *optional* prop appeared on an
 *             existing section where it was previously absent.
 *   - patch : text / prop value changes on existing sections where the
 *             structural arrangement is identical. Section reordering is
 *             classified as patch — the SET of sections is unchanged, only
 *             order — and order changes never bump majors.
 *
 * The function is pure and side-effect free; identical inputs always
 * produce identical outputs, which is what makes "idempotent publish" work.
 */

const propSchemaByType = {
  hero: HeroPropsSchema,
  featureGrid: FeatureGridPropsSchema,
  testimonial: TestimonialPropsSchema,
  cta: CtaPropsSchema,
} as const;

function isOptional(field: z.ZodTypeAny): boolean {
  return field instanceof z.ZodOptional || field instanceof z.ZodDefault;
}

function getRequiredKeys(type: Section["type"]): string[] {
  const schema = propSchemaByType[type];
  if (!schema) return [];
  const shape = schema.shape;
  return Object.entries(shape)
    .filter(([, field]) => !isOptional(field as z.ZodTypeAny))
    .map(([key]) => key);
}

function getOptionalKeys(type: Section["type"]): string[] {
  const schema = propSchemaByType[type];
  if (!schema) return [];
  const shape = schema.shape;
  return Object.entries(shape)
    .filter(([, field]) => isOptional(field as z.ZodTypeAny))
    .map(([key]) => key);
}

function hasValue(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string" && v.length === 0) return false;
  return true;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
    .join(",")}}`;
}

function deepEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

const bumpRank: Record<ReleaseBump, number> = { none: 0, patch: 1, minor: 2, major: 3 };
function max(a: ReleaseBump, b: ReleaseBump): ReleaseBump {
  return bumpRank[a] >= bumpRank[b] ? a : b;
}

export function calculateSemVerBump(originalPage: Page, draftPage: Page): ReleaseBump {
  if (deepEqual(originalPage, draftPage)) return "none";

  let level: ReleaseBump = "patch";

  const origById = new Map(originalPage.sections.map((s) => [s.id, s]));
  const draftById = new Map(draftPage.sections.map((s) => [s.id, s]));

  // 1. Section removed -> MAJOR (short-circuit).
  for (const id of origById.keys()) {
    if (!draftById.has(id)) return "major";
  }

  // 2. Type changed or required prop dropped -> MAJOR (short-circuit).
  for (const [id, draftSection] of draftById) {
    const origSection = origById.get(id);
    if (!origSection) continue;
    if (origSection.type !== draftSection.type) return "major";

    const required = getRequiredKeys(draftSection.type);
    for (const key of required) {
      if (hasValue(origSection.props[key]) && !hasValue(draftSection.props[key])) {
        return "major";
      }
    }
  }

  // 3. Section added -> MINOR.
  for (const id of draftById.keys()) {
    if (!origById.has(id)) level = max(level, "minor");
  }

  // 4. Optional prop appeared -> MINOR.
  for (const [id, draftSection] of draftById) {
    const origSection = origById.get(id);
    if (!origSection) continue;
    const optional = getOptionalKeys(draftSection.type);
    for (const key of optional) {
      if (!hasValue(origSection.props[key]) && hasValue(draftSection.props[key])) {
        level = max(level, "minor");
      }
    }
  }

  // 5. Otherwise (text/value changes, reorder, title edits) -> at least PATCH.
  // `level` defaults to "patch" and only escalates above; we never fall
  // back to "none" once deep-inequality is established above.
  return level;
}

/** Increments a "X.Y.Z" version string per the given bump. "none" returns the input. */
export function applyBump(currentVersion: string, bump: ReleaseBump): string {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(currentVersion);
  if (!match) throw new Error(`Invalid version: ${currentVersion}`);
  const [, majorStr, minorStr, patchStr] = match;
  const major = Number(majorStr);
  const minor = Number(minorStr);
  const patch = Number(patchStr);
  switch (bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    case "none":
      return currentVersion;
  }
}

export const INITIAL_VERSION = "1.0.0";
