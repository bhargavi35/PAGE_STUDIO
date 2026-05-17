import { notFound } from "next/navigation";
import { fetchPageBySlug } from "@/lib/contentful/contentfulClient";
import { getCurrentRole } from "@/lib/auth/session";
import { StudioShell } from "@/components/studio/StudioShell";
import { getReleaseHistory } from "@/lib/publish/releaseStore";

export default async function StudioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const role = await getCurrentRole();
  const page = await fetchPageBySlug(slug, true);
  if (!page) notFound();

  // The "source" page passed to the editor is the latest published snapshot,
  // if one exists — otherwise we fall back to the CMS draft. This makes the
  // SemVer diff a real "draft vs last release" comparison.
  const history = await getReleaseHistory(slug);
  const sourcePage = history[0]?.snapshot ?? page;
  const currentVersion = history[0]?.version ?? null;

  return (
    <StudioShell
      slug={slug}
      sourcePage={sourcePage}
      currentVersion={currentVersion}
      historyPreview={history.slice(0, 5).map((r) => ({
        version: r.version,
        bump: r.bump,
        createdAt: r.createdAt,
        publishedBy: r.publishedBy,
        changelog: r.changelog,
      }))}
      role={role}
    />
  );
}

export const dynamic = "force-dynamic";
