import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchPageBySlug } from "@/lib/contentful/contentfulClient";
import { SectionRenderer } from "@/components/SectionRenderer";
import { Button } from "@/components/ui/button";

/**
 * Public-facing preview. Server-rendered. Reads page from the Contentful
 * adapter (or fixtures), runs each section through the schema-driven
 * renderer. Bad sections degrade to UnsupportedSection / error boundary;
 * the page itself never throws.
 */
export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const previewMode = preview === "1" || preview === "true";

  const page = await fetchPageBySlug(slug, previewMode);
  if (!page) notFound();

  return (
    <>
      <nav
        aria-label="Preview controls"
        className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur"
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-semibold text-blue-800 underline">
            ← All pages
          </Link>
          <span className="text-sm text-slate-700">
            Preview: <code className="rounded bg-slate-100 px-1.5 py-0.5">{slug}</code>
            {previewMode ? (
              <span
                className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900"
                aria-label="Draft preview mode"
              >
                Draft mode
              </span>
            ) : null}
          </span>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/studio/${slug}`}>Open in studio</Link>
        </Button>
      </nav>

      <main id="main" data-testid="preview-main">
        {page.sections.map((section) => (
          <SectionRenderer key={section.id} section={section} />
        ))}
      </main>
    </>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await fetchPageBySlug(slug);
  return {
    title: page ? `${page.title} — Page Studio` : `${slug} — Page Studio`,
  };
}
