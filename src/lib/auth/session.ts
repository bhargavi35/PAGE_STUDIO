import { cookies } from "next/headers";
import type { Role } from "@/types/page";

/**
 * Header/cookie-based mock auth. Production swap: replace `getCurrentRole`
 * with a real session lookup (e.g. NextAuth getServerSession) — every other
 * call site (middleware, server actions, pages) consumes Role and continues
 * to work unchanged.
 *
 * The cookie is intentionally non-httpOnly so the dev "switch role" UI on
 * /login can write it from the client; for production you'd flip it to
 * httpOnly + signed.
 */

export const ROLE_COOKIE = "ps_role";
export const ALL_ROLES: Role[] = ["viewer", "editor", "publisher"];

export function isRole(v: string | undefined): v is Role {
  return v !== undefined && (ALL_ROLES as string[]).includes(v);
}

export async function getCurrentRole(): Promise<Role> {
  const store = await cookies();
  const raw = store.get(ROLE_COOKIE)?.value;
  return isRole(raw) ? raw : "viewer";
}

/** Permission matrix. The only place that maps actions -> required roles. */
export const PERMISSIONS = {
  canPreview: ["viewer", "editor", "publisher"] satisfies Role[],
  canEdit: ["editor", "publisher"] satisfies Role[],
  canPublish: ["publisher"] satisfies Role[],
} as const;

export function can(role: Role, action: keyof typeof PERMISSIONS): boolean {
  return (PERMISSIONS[action] as readonly Role[]).includes(role);
}

/** Reads role from a Request (used in middleware where `cookies()` isn't available). */
export function roleFromRequestCookies(cookieHeader: string | null): Role {
  if (!cookieHeader) return "viewer";
  const match = cookieHeader.split(/;\s*/).find((c) => c.startsWith(`${ROLE_COOKIE}=`));
  if (!match) return "viewer";
  const value = decodeURIComponent(match.split("=")[1] ?? "");
  return isRole(value) ? value : "viewer";
}
