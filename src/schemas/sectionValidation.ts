import { z } from "zod";

/**
 * Per-section prop schemas. Each schema describes the *validated* shape
 * that a registered section component can rely on.
 *
 * Optional fields use .optional() so they appear in the structural diff as
 * additive (minor bump). Required fields removed in a draft trigger a major
 * bump via the SemVer engine.
 */

export const HeroPropsSchema = z.object({
  title: z.string().min(1, "Hero title is required"),
  subtitle: z.string().optional(),
  ctaLabel: z.string().min(1, "Hero CTA label is required"),
  ctaUrl: z.string().url("Hero CTA URL must be a valid URL"),
  imageUrl: z.string().url().optional(),
  eyebrow: z.string().optional(),
});

export const FeatureItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().optional(),
});

export const FeatureGridPropsSchema = z.object({
  heading: z.string().min(1, "Feature grid heading is required"),
  intro: z.string().optional(),
  features: z.array(FeatureItemSchema).min(1, "Add at least one feature"),
});

export const TestimonialPropsSchema = z.object({
  quote: z.string().min(1, "Testimonial quote is required"),
  authorName: z.string().min(1, "Author name is required"),
  authorRole: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

export const CtaPropsSchema = z.object({
  heading: z.string().min(1, "CTA heading is required"),
  body: z.string().optional(),
  buttonLabel: z.string().min(1, "CTA button label is required"),
  buttonUrl: z.string().url("CTA URL must be a valid URL"),
});

/**
 * Discriminated union by `type`. Zod can narrow the props for free,
 * which means the section registry consumers get type-safe props
 * without manual casting once a section has passed validation.
 */
export const HeroSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("hero"),
  props: HeroPropsSchema,
});

export const FeatureGridSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("featureGrid"),
  props: FeatureGridPropsSchema,
});

export const TestimonialSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("testimonial"),
  props: TestimonialPropsSchema,
});

export const CtaSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("cta"),
  props: CtaPropsSchema,
});

export const SectionSchema = z.discriminatedUnion("type", [
  HeroSectionSchema,
  FeatureGridSectionSchema,
  TestimonialSectionSchema,
  CtaSectionSchema,
]);

export const PageSchema = z.object({
  pageId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  sections: z.array(SectionSchema),
});

/** Inferred, narrow types for component props. Consumers should prefer these. */
export type HeroProps = z.infer<typeof HeroPropsSchema>;
export type FeatureGridProps = z.infer<typeof FeatureGridPropsSchema>;
export type TestimonialProps = z.infer<typeof TestimonialPropsSchema>;
export type CtaProps = z.infer<typeof CtaPropsSchema>;
export type ValidatedSection = z.infer<typeof SectionSchema>;
export type ValidatedPage = z.infer<typeof PageSchema>;

/** Result tuple used by the schema-driven renderer to gracefully degrade. */
export type SectionValidationResult =
  | { ok: true; section: ValidatedSection }
  | { ok: false; error: string; rawId?: string; rawType?: string };

export function validateSection(input: unknown): SectionValidationResult {
  const result = SectionSchema.safeParse(input);
  if (result.success) {
    return { ok: true, section: result.data };
  }
  const obj = (input ?? {}) as { id?: unknown; type?: unknown };
  return {
    ok: false,
    error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    rawId: typeof obj.id === "string" ? obj.id : undefined,
    rawType: typeof obj.type === "string" ? obj.type : undefined,
  };
}
