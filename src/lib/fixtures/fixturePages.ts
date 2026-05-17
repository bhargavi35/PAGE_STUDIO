import type { Page } from "@/types/page";

/**
 * Local fixtures used when Contentful is not configured (no env vars) or for
 * deterministic e2e tests. Shape matches the *output* of the Contentful
 * adapter's transformer, NOT Contentful's wire format — i.e. plain domain Page.
 */

const homePage: Page = {
  pageId: "home-v1",
  slug: "home",
  title: "Home",
  sections: [
    {
      id: "hero-1",
      type: "hero",
      props: {
        eyebrow: "Page Studio",
        title: "Ship landing pages without shipping code.",
        subtitle:
          "Authoring, preview, immutable releases, accessibility — built for content teams who care about quality.",
        ctaLabel: "Open the Studio",
        ctaUrl: "https://example.com/studio/home",
      },
    },
    {
      id: "features-1",
      type: "featureGrid",
      props: {
        heading: "Built for ambitious content teams",
        intro: "Schema-driven, versioned, accessible by default.",
        features: [
          {
            title: "Schema-driven renderer",
            description: "Zod validation per section. Unknown types degrade gracefully.",
            icon: "🧩",
          },
          {
            title: "Immutable releases",
            description: "Every publish is a SemVer-bumped, JSON-snapshot release.",
            icon: "📦",
          },
          {
            title: "AAA accessibility",
            description: "Keyboard-first, focus-visible, reduced-motion respecting.",
            icon: "♿",
          },
        ],
      },
    },
    {
      id: "testimonial-1",
      type: "testimonial",
      props: {
        quote:
          "We replaced a 6-week deploy cycle with same-day publishing. Engineers got their afternoons back.",
        authorName: "Priya Anand",
        authorRole: "Head of Growth, Acme Co.",
      },
    },
    {
      id: "cta-1",
      type: "cta",
      props: {
        heading: "Try it on your next landing page.",
        body: "Open the studio, drop in some sections, and publish a release in under five minutes.",
        buttonLabel: "Open the studio",
        buttonUrl: "https://example.com/studio/home",
      },
    },
  ],
};

const launchPage: Page = {
  pageId: "launch-v1",
  slug: "launch",
  title: "Launch",
  sections: [
    {
      id: "hero-launch",
      type: "hero",
      props: {
        title: "We just shipped v2.",
        subtitle: "Faster publishing. Better diffs. Same WCAG AAA.",
        ctaLabel: "Read the changelog",
        ctaUrl: "https://example.com/changelog",
      },
    },
    {
      id: "cta-launch",
      type: "cta",
      props: {
        heading: "Upgrade in one command.",
        buttonLabel: "View the docs",
        buttonUrl: "https://example.com/docs",
      },
    },
  ],
};

const fixtures: Record<string, Page> = {
  home: homePage,
  launch: launchPage,
};

export const fixtureSlugs = Object.keys(fixtures);

export function isFixtureSlug(slug: string): boolean {
  return slug in fixtures;
}

export function loadFixturePage(slug: string): Page | null {
  const page = fixtures[slug];
  if (!page) return null;
  return structuredClone(page);
}
