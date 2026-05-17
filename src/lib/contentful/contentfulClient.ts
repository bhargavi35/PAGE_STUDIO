import { createClient, type ContentfulClientApi, type Entry, type EntryFieldTypes } from "contentful";
import type { Page, Section, SectionType } from "@/types/page";
import { loadFixturePage, isFixtureSlug } from "@/lib/fixtures/fixturePages";

/**
 * The ONLY place that knows about Contentful SDK / response shapes.
 * Public API of this module:
 *   - fetchPageBySlug(slug, previewMode): returns a domain `Page` or null.
 *   - listAvailableSlugs(): for static generation / debugging.
 *
 * If Contentful env vars are not set, we fall back to local fixtures so the
 * app can run end-to-end locally without credentials. Switching to real
 * Contentful is a 4-env-var change in .env.local.
 */

interface PageFields {
  pageId: EntryFieldTypes.Symbol;
  slug: EntryFieldTypes.Symbol;
  title: EntryFieldTypes.Symbol;
  sections: EntryFieldTypes.Array<EntryFieldTypes.EntryLink<SectionSkeleton>>;
}

interface SectionFields {
  sectionId: EntryFieldTypes.Symbol;
  type: EntryFieldTypes.Symbol;
  props: EntryFieldTypes.Object;
}

interface PageSkeleton {
  contentTypeId: "page";
  fields: PageFields;
}

interface SectionSkeleton {
  contentTypeId: "section";
  fields: SectionFields;
}

type ClientCacheKey = `${string}:${"preview" | "delivery"}`;
const clientCache = new Map<ClientCacheKey, ContentfulClientApi<undefined>>();

function getClient(previewMode: boolean): ContentfulClientApi<undefined> | null {
  const space = process.env.CONTENTFUL_SPACE_ID;
  const environment = process.env.CONTENTFUL_ENVIRONMENT || "master";
  const deliveryToken = process.env.CONTENTFUL_DELIVERY_TOKEN;
  const previewToken = process.env.CONTENTFUL_PREVIEW_TOKEN;
  const accessToken = previewMode ? previewToken : deliveryToken;
  if (!space || !accessToken) return null;

  const key: ClientCacheKey = `${space}:${previewMode ? "preview" : "delivery"}`;
  const cached = clientCache.get(key);
  if (cached) return cached;

  const client = createClient({
    space,
    environment,
    accessToken,
    host: previewMode ? "preview.contentful.com" : "cdn.contentful.com",
  });
  clientCache.set(key, client);
  return client;
}

export function isContentfulConfigured(): boolean {
  return Boolean(
    process.env.CONTENTFUL_SPACE_ID &&
      (process.env.CONTENTFUL_DELIVERY_TOKEN || process.env.CONTENTFUL_PREVIEW_TOKEN),
  );
}

/**
 * Explicit transformer: Contentful Entry -> domain Section.
 * Lives INSIDE this adapter file so Contentful types never reach the registry,
 * renderer, or Redux store. Anything wrong with the shape (missing fields,
 * unexpected props blob) is reported as an opaque transform error; the calling
 * page can still render unaffected sections.
 */
function transformSection(entry: Entry<SectionSkeleton, undefined, string>): Section | null {
  const fields = entry.fields;
  const rawType = fields.type;
  const rawId = fields.sectionId || entry.sys.id;
  const rawProps = fields.props;

  if (typeof rawType !== "string" || typeof rawId !== "string") return null;
  if (!rawProps || typeof rawProps !== "object") return null;

  return {
    id: rawId,
    type: rawType as SectionType,
    props: rawProps as Record<string, unknown>,
  };
}

function transformPage(entry: Entry<PageSkeleton, undefined, string>): Page {
  const fields = entry.fields;
  const sectionEntries = (fields.sections || []) as Array<Entry<SectionSkeleton, undefined, string>>;

  const sections = sectionEntries
    .map(transformSection)
    .filter((s): s is Section => s !== null);

  return {
    pageId: (fields.pageId as string) || entry.sys.id,
    slug: fields.slug as string,
    title: fields.title as string,
    sections,
  };
}

export async function fetchPageBySlug(slug: string, previewMode = false): Promise<Page | null> {
  // Fixture fallback path — used when Contentful is not configured OR when the
  // slug is in the fixture set (helps local dev + e2e without round-tripping a CMS).
  if (!isContentfulConfigured() || isFixtureSlug(slug)) {
    return loadFixturePage(slug);
  }

  const client = getClient(previewMode);
  if (!client) return loadFixturePage(slug);

  const response = await client.getEntries<PageSkeleton>({
    content_type: "page",
    "fields.slug": slug,
    include: 2,
    limit: 1,
  });

  const entry = response.items[0];
  if (!entry) return null;

  return transformPage(entry);
}

export async function listAvailableSlugs(previewMode = false): Promise<string[]> {
  if (!isContentfulConfigured()) {
    const { fixtureSlugs } = await import("@/lib/fixtures/fixturePages");
    return fixtureSlugs;
  }
  const client = getClient(previewMode);
  if (!client) return [];
  const response = await client.getEntries<PageSkeleton>({
    content_type: "page",
    select: ["fields.slug"],
    limit: 1000,
  });
  return response.items
    .map((i) => i.fields.slug)
    .filter((s): s is string => typeof s === "string");
}
