import { describe, expect, it } from "vitest";
import { calculateSemVerBump, applyBump, INITIAL_VERSION } from "@/lib/publish/semver";
import type { Page } from "@/types/page";

const basePage: Page = {
  pageId: "p1",
  slug: "demo",
  title: "Demo",
  sections: [
    {
      id: "hero-1",
      type: "hero",
      props: {
        title: "Hello",
        ctaLabel: "Go",
        ctaUrl: "https://example.com",
      },
    },
    {
      id: "cta-1",
      type: "cta",
      props: {
        heading: "Sign up",
        buttonLabel: "Join",
        buttonUrl: "https://example.com/join",
      },
    },
  ],
};

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

describe("calculateSemVerBump", () => {
  it("returns 'none' when payloads are deep-equal", () => {
    expect(calculateSemVerBump(basePage, clone(basePage))).toBe("none");
  });

  it("returns 'patch' for a text/prop change on an existing section", () => {
    const draft = clone(basePage);
    draft.sections[0].props.title = "Hello, world";
    expect(calculateSemVerBump(basePage, draft)).toBe("patch");
  });

  it("returns 'patch' when title changes but structure is identical", () => {
    const draft = clone(basePage);
    draft.title = "Demo (v2)";
    expect(calculateSemVerBump(basePage, draft)).toBe("patch");
  });

  it("returns 'patch' when sections are merely reordered", () => {
    const draft = clone(basePage);
    draft.sections.reverse();
    expect(calculateSemVerBump(basePage, draft)).toBe("patch");
  });

  it("returns 'minor' when a new section is added", () => {
    const draft = clone(basePage);
    draft.sections.push({
      id: "feat-1",
      type: "featureGrid",
      props: {
        heading: "Features",
        features: [{ title: "F1", description: "D1" }],
      },
    });
    expect(calculateSemVerBump(basePage, draft)).toBe("minor");
  });

  it("returns 'minor' when an optional prop appears on an existing section", () => {
    const draft = clone(basePage);
    draft.sections[0].props.subtitle = "A new subtitle";
    expect(calculateSemVerBump(basePage, draft)).toBe("minor");
  });

  it("returns 'major' when a section is removed", () => {
    const draft = clone(basePage);
    draft.sections.pop();
    expect(calculateSemVerBump(basePage, draft)).toBe("major");
  });

  it("returns 'major' when a section type is changed in place", () => {
    const draft = clone(basePage);
    draft.sections[0] = {
      id: "hero-1",
      type: "cta",
      props: {
        heading: "Hello",
        buttonLabel: "Go",
        buttonUrl: "https://example.com",
      },
    };
    expect(calculateSemVerBump(basePage, draft)).toBe("major");
  });

  it("returns 'major' when a required prop is removed from an existing section", () => {
    const draft = clone(basePage);
    delete draft.sections[0].props.ctaLabel;
    expect(calculateSemVerBump(basePage, draft)).toBe("major");
  });

  it("major dominates when multiple changes co-occur (added + removed)", () => {
    const draft = clone(basePage);
    draft.sections.pop();
    draft.sections.push({
      id: "new-cta",
      type: "cta",
      props: {
        heading: "New CTA",
        buttonLabel: "Click",
        buttonUrl: "https://example.com/x",
      },
    });
    expect(calculateSemVerBump(basePage, draft)).toBe("major");
  });

  it("minor dominates when add + patch co-occur", () => {
    const draft = clone(basePage);
    draft.sections[0].props.title = "Changed";
    draft.sections.push({
      id: "feat-1",
      type: "featureGrid",
      props: {
        heading: "Features",
        features: [{ title: "F1", description: "D1" }],
      },
    });
    expect(calculateSemVerBump(basePage, draft)).toBe("minor");
  });

  it("is order-independent within prop objects (stable serialization)", () => {
    const a = clone(basePage);
    const b = clone(basePage);
    // Reorder keys on b's first section props
    b.sections[0].props = {
      ctaUrl: "https://example.com",
      ctaLabel: "Go",
      title: "Hello",
    };
    expect(calculateSemVerBump(a, b)).toBe("none");
  });
});

describe("applyBump", () => {
  it("bumps major correctly", () => {
    expect(applyBump("1.2.3", "major")).toBe("2.0.0");
  });
  it("bumps minor correctly", () => {
    expect(applyBump("1.2.3", "minor")).toBe("1.3.0");
  });
  it("bumps patch correctly", () => {
    expect(applyBump("1.2.3", "patch")).toBe("1.2.4");
  });
  it("noops on 'none'", () => {
    expect(applyBump("1.2.3", "none")).toBe("1.2.3");
  });
  it("initial version is 1.0.0", () => {
    expect(INITIAL_VERSION).toBe("1.0.0");
  });
  it("throws on malformed input", () => {
    expect(() => applyBump("not-a-version", "patch")).toThrow();
  });
});
