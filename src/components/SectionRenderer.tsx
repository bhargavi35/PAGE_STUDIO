import { sectionRegistry, isKnownSectionType } from "@/components/sectionRegistry";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import UnsupportedSection from "@/components/sections/UnsupportedSection";
import { validateSection } from "@/schemas/sectionValidation";
import type { Section } from "@/types/page";

/**
 * Server component that turns a raw Section into either:
 *   - the matching registry component with validated props, or
 *   - the UnsupportedSection fallback (unknown type / failed Zod validation).
 *
 * Wrapped in a SectionErrorBoundary so a runtime crash in one section
 * doesn't cascade to the rest of the page.
 */
export function SectionRenderer({ section }: { section: Section }) {
  const validation = validateSection(section);

  if (!validation.ok) {
    return (
      <UnsupportedSection
        reason={validation.error}
        rawType={validation.rawType}
        rawId={validation.rawId}
      />
    );
  }

  const validated = validation.section;

  if (!isKnownSectionType(validated.type)) {
    return (
      <UnsupportedSection
        reason="No renderer is registered for this section type."
        rawType={validated.type}
        rawId={validated.id}
      />
    );
  }

  // Discriminated dispatch: each registry entry is typed to its own props.
  // The `as never` here is a controlled erasure of the union — we have
  // *just proved* the props match via Zod's discriminatedUnion.
  switch (validated.type) {
    case "hero": {
      const C = sectionRegistry.hero;
      return (
        <SectionErrorBoundary sectionId={validated.id}>
          <C props={validated.props} />
        </SectionErrorBoundary>
      );
    }
    case "featureGrid": {
      const C = sectionRegistry.featureGrid;
      return (
        <SectionErrorBoundary sectionId={validated.id}>
          <C props={validated.props} />
        </SectionErrorBoundary>
      );
    }
    case "testimonial": {
      const C = sectionRegistry.testimonial;
      return (
        <SectionErrorBoundary sectionId={validated.id}>
          <C props={validated.props} />
        </SectionErrorBoundary>
      );
    }
    case "cta": {
      const C = sectionRegistry.cta;
      return (
        <SectionErrorBoundary sectionId={validated.id}>
          <C props={validated.props} />
        </SectionErrorBoundary>
      );
    }
  }
}
