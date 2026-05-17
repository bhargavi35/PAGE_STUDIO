import Link from "next/link";
import { getCurrentRole } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; reason?: string }>;
}) {
  const { from, reason } = await searchParams;
  const role = await getCurrentRole();

  return (
    <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-20">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">403</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          You don&apos;t have access to this page.
        </h1>
        <p className="mt-3 text-sm text-slate-700">
          You are signed in as <strong>{role}</strong>.{" "}
          {reason === "publish-role-required"
            ? "Publishing requires the publisher role."
            : "Editing requires the editor or publisher role."}
        </p>
        {from ? (
          <p className="mt-1 text-xs text-slate-600">
            Blocked path: <code className="rounded bg-slate-100 px-1 py-0.5">{from}</code>
          </p>
        ) : null}
      </header>

      <div className="flex gap-3">
        <Button asChild>
          <Link href={`/login${from ? `?from=${encodeURIComponent(from)}` : ""}`}>
            Switch role
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
