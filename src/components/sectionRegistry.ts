import type { ComponentType } from "react";
import Hero from "@/components/sections/Hero";
import FeatureGrid from "@/components/sections/FeatureGrid";
import Testimonial from "@/components/sections/Testimonial";
import Cta from "@/components/sections/Cta";
import type { SectionType } from "@/types/page";
import type {
  HeroProps,
  FeatureGridProps,
  TestimonialProps,
  CtaProps,
} from "@/schemas/sectionValidation";

/**
 * Map of section type -> component. The mapped type below is the linchpin of
 * the schema-driven renderer:
 *
 *  - It is `Record<SectionType, ...>` (not Partial), so removing an entry
 *    fails the TypeScript build. Compile-time guarantee that every known
 *    section type has a renderer.
 *  - The component prop type is keyed by section type, so each entry only
 *    accepts the correct, validated props.
 *
 * Unknown types coming from Contentful (e.g. a new section type added in CMS
 * before the frontend ships) fall through to UnsupportedSection at render time.
 */

type PropsByType = {
  hero: HeroProps;
  featureGrid: FeatureGridProps;
  testimonial: TestimonialProps;
  cta: CtaProps;
};

type RegistryShape = {
  [K in SectionType]: ComponentType<{ props: PropsByType[K] }>;
};

export const sectionRegistry: RegistryShape = {
  hero: Hero,
  featureGrid: FeatureGrid,
  testimonial: Testimonial,
  cta: Cta,
};

export const knownSectionTypes = Object.keys(sectionRegistry) as SectionType[];

export function isKnownSectionType(t: string): t is SectionType {
  return (knownSectionTypes as string[]).includes(t);
}
