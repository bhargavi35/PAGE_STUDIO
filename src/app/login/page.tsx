import Link from "next/link";
import { redirect } from "next/navigation";
import { ROLE_COOKIE, getCurrentRole, isRole } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";

/**
 * Dev login. Production swap: replace this with a real IdP-backed sign-in.
 * The page exists primarily so the rest of the app has a redirect target
 * when the middleware blocks a request.
 *
 * Auto-redirect-after-login is opt-in via ?from=/studio/home etc.
 */
async function switchRole(formData: FormData) {
  "use server";
  const role = formData.get("role");
  const target = formData.get("redirectTo");
  if (typeof role !== "string" || !isRole(role)) {
    redirect("/login?reason=invalid-role");
  }
  const store = await cookies();
  store.set(ROLE_COOKIE, role, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  redirect(typeof target === "string" && target.startsWith("/") ? target : "/");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; reason?: string }>;
}) {
  const { from, reason } = await searchParams;
  const current = await getCurrentRole();

  return (
    <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-16">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-slate-700">
          Dev-only role switcher. Production would integrate a real identity provider here.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          You are currently signed in as <strong>{current}</strong>.
        </p>
      </header>

      {reason === "edit-access-required" ? (
        <p
          role="status"
          className="rounded-md border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          You need <strong>editor</strong> or <strong>publisher</strong> access to open the studio.
        </p>
      ) : null}
      {reason === "invalid-role" ? (
        <p
          role="alert"
          className="rounded-md border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          Invalid role selected.
        </p>
      ) : null}

      <form action={switchRole} className="flex flex-col gap-4">
        <input type="hidden" name="redirectTo" value={from ?? "/"} />
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold text-slate-900">Choose a role</legend>
          {(["viewer", "editor", "publisher"] as const).map((role) => (
            <label key={role} className="flex items-start gap-3 rounded-md border border-slate-300 p-3">
              <input
                type="radio"
                name="role"
                value={role}
                defaultChecked={role === current}
                className="mt-1 h-4 w-4 text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-700"
              />
              <span className="flex flex-col">
                <span className="font-semibold capitalize text-slate-900">{role}</span>
                <span className="text-sm text-slate-700">{describeRole(role)}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Button type="submit" size="lg">
          Sign in
        </Button>
        <Link href="/" className="text-sm text-blue-800 underline">
          Cancel
        </Link>
      </form>
    </main>
  );
}

function describeRole(role: "viewer" | "editor" | "publisher"): string {
  switch (role) {
    case "viewer":
      return "Can preview pages. Cannot edit or publish.";
    case "editor":
      return "Can preview and edit drafts. Cannot publish.";
    case "publisher":
      return "Full access: preview, edit, and publish releases.";
  }
}
