import Link from "next/link";
import { listAvailableSlugs } from "@/lib/contentful/contentfulClient";
import { getCurrentRole } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const slugs = await listAvailableSlugs();
  const role = await getCurrentRole();

  return (
    <main id="main" className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-800">Page Studio</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Schema-driven landing pages, with versioned releases.
        </h1>
        <p className="text-base text-slate-700">
          Signed in as <strong className="font-semibold">{role}</strong>. Pick a page to preview, or
          open the studio to edit it (editor + publisher roles).
        </p>
        <p className="text-sm text-slate-600">
          <Link href="/login" className="underline">
            Switch role
          </Link>
        </p>
      </header>

      <section aria-labelledby="pages-heading" className="flex flex-col gap-4">
        <h2 id="pages-heading" className="text-2xl font-semibold text-slate-900">
          Available pages
        </h2>
        {slugs.length === 0 ? (
          <p className="text-slate-700">
            No pages found. Add Contentful credentials in <code>.env.local</code> or use the
            built-in fixtures.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {slugs.map((slug) => (
              <li
                key={slug}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wide text-slate-600">slug</span>
                  <code className="text-base font-semibold text-slate-900">/{slug}</code>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/preview/${slug}`}>Preview</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/studio/${slug}`}>Open studio</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
