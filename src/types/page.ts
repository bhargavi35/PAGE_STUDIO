/**
 * Domain types for the Page Studio.
 *
 * Section.props is intentionally typed as Record<string, unknown> at this layer:
 * runtime validation is the responsibility of the Zod schemas in
 * src/schemas/sectionValidation.ts. Validated, narrowed prop shapes are
 * inferred from those schemas and re-exported below for component consumers.
 */

export type SectionType = "hero" | "featureGrid" | "testimonial" | "cta";

export interface Section {
  id: string;
  type: SectionType;
  props: Record<string, unknown>;
}

export interface Page {
  pageId: string;
  slug: string;
  title: string;
  sections: Section[];
}

export type Role = "viewer" | "editor" | "publisher";

export type ReleaseBump = "patch" | "minor" | "major" | "none";

export interface Release {
  pageId: string;
  slug: string;
  version: string;
  bump: ReleaseBump;
  changelog: string[];
  snapshot: Page;
  createdAt: string;
  publishedBy: string;
}
