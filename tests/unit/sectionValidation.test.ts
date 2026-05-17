import { describe, expect, it } from "vitest";
import { PageSchema, validateSection } from "@/schemas/sectionValidation";

describe("PageSchema", () => {
  it("accepts a well-formed page", () => {
    const result = PageSchema.safeParse({
      pageId: "p1",
      slug: "home",
      title: "Home",
      sections: [
        {
          id: "hero-1",
          type: "hero",
          props: {
            title: "Hi",
            ctaLabel: "Go",
            ctaUrl: "https://example.com",
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a section with an unknown type", () => {
    const result = PageSchema.safeParse({
      pageId: "p1",
      slug: "home",
      title: "Home",
      sections: [{ id: "x", type: "carousel", props: {} }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a hero missing required ctaUrl", () => {
    const result = PageSchema.safeParse({
      pageId: "p1",
      slug: "home",
      title: "Home",
      sections: [{ id: "hero-1", type: "hero", props: { title: "Hi", ctaLabel: "Go" } }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a hero with a non-URL ctaUrl", () => {
    const result = PageSchema.safeParse({
      pageId: "p1",
      slug: "home",
      title: "Home",
      sections: [
        {
          id: "hero-1",
          type: "hero",
          props: { title: "Hi", ctaLabel: "Go", ctaUrl: "not-a-url" },
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("validateSection", () => {
  it("returns ok=true with narrowed section on valid input", () => {
    const r = validateSection({
      id: "cta-1",
      type: "cta",
      props: {
        heading: "Go",
        buttonLabel: "Click",
        buttonUrl: "https://example.com",
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.section.type).toBe("cta");
    }
  });

  it("returns ok=false with a readable error for invalid input", () => {
    const r = validateSection({ id: "x", type: "hero", props: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.length).toBeGreaterThan(0);
      expect(r.rawType).toBe("hero");
    }
  });

  it("captures rawType when the type is unknown", () => {
    const r = validateSection({ id: "x", type: "carousel", props: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.rawType).toBe("carousel");
  });
});
