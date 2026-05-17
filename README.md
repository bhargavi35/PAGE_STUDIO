# Page Studio

> **Author:** Chella Bhargavi — SOFTWARE ENGINEER sprint submission.

A schema-driven landing page authoring environment with immutable, SemVer-bumped releases.

- **Authors** load a page from Contentful (or local fixtures), edit it in a WYSIWYG-lite studio, see a live preview, and publish a versioned snapshot.
- **The renderer is schema-driven**: every section is validated by Zod before render, and a typed registry is the single source of truth for which sections exist.
- **WCAG 2.2 AAA-oriented**: visible focus, skip link, keyboard operability, reduced-motion respect, fully labelled forms, axe-enforced in CI.

---

## Quick start

```bash
npm install
npm run dev           # http://localhost:3000
```

The app ships with two fixture pages (`home`, `launch`) so it runs end-to-end without Contentful credentials. To use real Contentful, copy `.env.example` to `.env.local` and fill in the four `CONTENTFUL_*` vars.

### Useful scripts

| Command               | What it does                                            |
| --------------------- | ------------------------------------------------------- |
| `npm run dev`         | Dev server                                              |
| `npm run build`       | Production build                                        |
| `npm run start`       | Serve the production build                              |
| `npm test`            | Vitest unit tests (schema + SemVer)                     |
| `npm run typecheck`   | `tsc --noEmit` across `src/` + `tests/`                 |
| `npm run lint`        | ESLint                                                  |
| `npm run test:e2e`    | Playwright (boots a prod server, runs e2e + axe)        |
| `npm run format`      | Prettier write                                          |

### Try it locally

1. `npm run dev`
2. Open `http://localhost:3000` — choose a page.
3. Click **Open studio** on `home`. You'll be redirected to `/403` because the default role is `viewer`.
4. Hit **Switch role** → choose `publisher` → sign in. You're back in the studio.
5. Edit the hero title. The SemVer **bump indicator** in the header switches to `patch`. Add a section → `minor`. Remove one → `major`.
6. Click **Publish**. A JSON snapshot appears at `releases/home/<version>.json`.
7. Visit `/preview/home` — you'll see the new content.

---

## Architecture overview

```
src/
├─ app/                      # Next.js App Router routes
│  ├─ page.tsx               # Landing — lists available slugs
│  ├─ preview/[slug]/        # Public schema-driven renderer
│  ├─ studio/[slug]/         # Authenticated authoring shell
│  ├─ login/                 # Dev role switcher
│  ├─ 403/                   # Forbidden page (RBAC blocks land here)
│  ├─ api/publish/route.ts   # POST publish endpoint (publisher-only)
│  └─ actions/publish.ts     # Server Action variant of publish
├─ components/
│  ├─ sectionRegistry.ts     # Single typed registry of section components
│  ├─ SectionRenderer.tsx    # Validates + dispatches a Section to its renderer
│  ├─ SectionErrorBoundary   # Localized fallback for crashed sections
│  ├─ sections/              # Hero, FeatureGrid, Testimonial, Cta, UnsupportedSection
│  ├─ studio/                # StudioShell + SectionList + SectionEditor + PublishBar
│  └─ ui/                    # shadcn-style primitives (Button, Input, Label, ...)
├─ lib/
│  ├─ auth/session.ts        # Cookie-based role lookup + permission matrix
│  ├─ contentful/contentfulClient.ts  # The ONLY file that knows Contentful types
│  ├─ fixtures/              # Local pages used when Contentful is unconfigured
│  └─ publish/
│     ├─ semver.ts           # Deterministic calculateSemVerBump + applyBump
│     ├─ changelog.ts        # Human-readable diff summaries
│     └─ releaseStore.ts     # FS-backed immutable snapshot store
├─ schemas/sectionValidation.ts  # Zod schemas + discriminated union
├─ store/                    # Redux Toolkit store + slices + persist middleware
├─ types/page.ts             # Domain types (Page, Section, Role, Release)
└─ middleware.ts             # Route + API RBAC enforcement
```

### Schema-driven render flow

1. The Contentful adapter (`contentfulClient.ts`) fetches a page and runs a transformer that strips all Contentful types — what leaves the adapter is a plain `Page` (`src/types/page.ts`).
2. `<SectionRenderer>` runs each section through `validateSection()` (Zod). On failure it returns `<UnsupportedSection>` with a readable reason. On success it dispatches to the matching registry component.
3. The registry (`sectionRegistry.ts`) is typed `Record<SectionType, ComponentType<...>>` — **removing an entry fails the TypeScript build**.
4. Each section is wrapped in `<SectionErrorBoundary>` so a runtime crash in one section does **not** take down the rest of the page.

---

## Redux slice responsibilities

The studio has three slices, each owning one concern:

| Slice         | Owns                                                                                      | Lifetime                  |
| ------------- | ----------------------------------------------------------------------------------------- | ------------------------- |
| `draftPage`   | The page being edited + the "original" baseline used for diffing. `isDirty` flag.         | Until publish or reload   |
| `ui`          | `activeSectionId`, loading + error flags for transient editor UI                          | Per-session, never persisted |
| `publish`     | Publish status (`idle/pending/success/noop/error`), last release info, in-memory history  | Per-session               |

**Persistence.** A small middleware (`localStorageMiddleware.ts`) snapshots `draftPage` to `localStorage` (keyed by slug) on every `draftPage/*` action — so a reload doesn't lose work. On studio mount, the persisted draft is re-parsed through `PageSchema` before adoption; if the schema has changed since the draft was saved, we drop the stale draft.

**Immutability.** RTK uses Immer under the hood, so all reducers can read in mutation-style without producing actual mutations. We additionally `structuredClone` the page on hydration so the "original" baseline can never share references with the live draft.

---

## Contentful model + adapter

The adapter expects two content types:

**`page`**

| Field    | Type                         | Notes                  |
| -------- | ---------------------------- | ---------------------- |
| pageId   | Short text (required)        |                        |
| slug     | Short text (required, slug)  |                        |
| title    | Short text (required)        |                        |
| sections | Array → Reference to section | Ordered                |

**`section`**

| Field     | Type               | Notes                                                  |
| --------- | ------------------ | ------------------------------------------------------ |
| sectionId | Short text         | Maps to `Section.id`                                   |
| type      | Short text         | One of: `hero`, `featureGrid`, `testimonial`, `cta`    |
| props     | JSON object        | Section-specific payload — validated by Zod at render  |

`fetchPageBySlug(slug, previewMode)` returns a domain `Page` or `null`. Internally it picks the Delivery or Preview client by `previewMode`, calls `getEntries`, and runs an explicit `transformPage`/`transformSection` pair. **No Contentful types reach the renderer or store.**

If `CONTENTFUL_SPACE_ID` or both tokens are missing, the adapter falls back to `loadFixturePage` so the app remains usable for local dev and e2e tests.

---

## Publish + SemVer logic

### Bump rules (deterministic; see `src/lib/publish/semver.ts`)

| Condition                                                                       | Bump  |
| ------------------------------------------------------------------------------- | ----- |
| Deep-equal payloads                                                             | none  |
| Existing section's text/prop value changed (or reorder, or title)               | patch |
| New section added, OR an optional prop appeared on a section                    | minor |
| Section removed, OR a section's `type` changed, OR a required prop disappeared  | major |

Precedence is **major > minor > patch > none**. The calculation:

- introspects the Zod schema for each section type to decide which props are "required" (so a Hero losing its `ctaUrl` is correctly classified as major);
- uses a stable JSON serializer for deep equality, so key-ordering noise never produces spurious patch bumps;
- is pure and side-effect free — `calculateSemVerBump(a, b)` is fully memoizable.

### Publish flow

1. Studio POSTs `{ slug, draft }` to `/api/publish` (or invokes the Server Action `publishDraftAction`).
2. Middleware blocks the request unless `ps_role=publisher`.
3. The handler re-checks role (defense-in-depth), then validates the draft against `PageSchema`.
4. The latest release snapshot is loaded from `releases/<slug>/latest.json` and used as the diff baseline.
5. If the draft is byte-equal to the latest snapshot, the response is `{ status: "noop" }` — **idempotent publish, no new version**.
6. Otherwise the bump is computed server-side, `applyBump(latestVersion, bump)` produces the next version, and `writeRelease` writes `releases/<slug>/<version>.json` atomically (tmp + rename) plus updates `latest.json`.
7. The studio's PublishBar reads the response, marks the draft as the new baseline, and clears the localStorage cache.

> **Vercel note.** The filesystem release store is committed to the repo so reviewers can see published artefacts. On Vercel's serverless runtime, filesystem writes outside `/tmp` are ephemeral — a production rollout would swap `releaseStore.ts` for blob storage (S3 / Vercel Blob / a DB). The interface (`writeRelease`, `getReleaseHistory`, `getLatestRelease`) is small and explicit to make that swap mechanical.

---

## RBAC

Three roles: `viewer`, `editor`, `publisher`. The permission matrix lives in `src/lib/auth/session.ts`:

- `canPreview` — all roles
- `canEdit` — editor + publisher (gates `/studio/*`)
- `canPublish` — publisher only (gates `/api/publish` + the `publishDraftAction` Server Action)

Enforcement happens at the edge (`src/middleware.ts`) for both the route and the API; the API handler **and** the Server Action also re-check the role. UI affordances (disabled buttons, read-only banners) reflect the permission state but are never the only line of defense.

The login page (`/login`) writes a `ps_role` cookie. This is intentionally simple — production would replace this single function with a real session lookup; everything else continues to call `getCurrentRole()`.

---

## Accessibility approach

WCAG 2.2 AAA-oriented:

- **Skip link** at the top of every page (`.skip-to-content`).
- **Visible focus**: global `:focus-visible` outline (3px solid blue + offset), buttons + inputs use ringed focus.
- **Heading hierarchy**: each page has exactly one `<h1>`; sections use `<h2>`/`<h3>` consistently; every `<section>` has an accessible name via `aria-label` or `aria-labelledby`.
- **Keyboard operability**: all studio actions (select section, reorder, add, remove, edit, publish) are reachable and operable without a mouse.
- **Reduced motion**: a global media query short-circuits all transitions/animations when `prefers-reduced-motion: reduce` is set.
- **Forms**: every input has a `<Label htmlFor>`; required fields are marked with both visual `*` and `aria-required="true"`; errors surface via `role="alert"`.
- **Colour contrast**: text is slate-900 on white (≈19:1 — AAA passes at 7:1) or white on blue-700 (≈8.6:1 — AAA passes at 7:1).

### Accessibility evidence

`tests/e2e/a11y.spec.ts` runs axe-core against `/`, `/preview/home`, `/preview/launch`, and `/login`, with WCAG 2.0/2.1/2.2 A+AA + best-practice tags enabled. Results are written to `a11y-report.json` (uploaded as a CI artefact by `.github/workflows/ci.yml`). **Any critical or serious violation fails the suite.**

---

## What is not included (and why)

- **Feature item editing** in the studio's FeatureGrid editor. The schema supports an array of `{ title, description, icon? }` items, but the studio only exposes editing of the section's `heading` + `intro` — an array editor with drag-reorder + per-item delete was scoped out to keep this iteration shippable. Items still render in `/preview` from whatever the source page or draft contains.
- **Drag-and-drop reorder**. The studio uses ↑/↓ buttons, which are keyboard-native and pass axe out of the box. A `dnd-kit`-based drag UI would need its own accessible-by-keyboard fallback to clear AAA — flagged but not built.
- **Image uploads**. Hero/Testimonial accept an optional `imageUrl` (any URL), but there's no upload widget. Production would integrate Contentful's media library.
- **Production-grade release persistence**. See "Vercel note" above — the FS store is fine for the brief's "immutable snapshot" requirement and for reviewer visibility, but production should use blob storage.
- **Auth integration with a real IdP**. The cookie-based role switcher is dev-only.
- **Live collaborative editing**. One author per slug at a time; the localStorage persistence is per-browser.

---

## Deployment (Vercel)

1. `vercel link` in the project root.
2. Set the Contentful env vars in the Vercel project settings (Production + Preview environments).
3. `vercel --prod` (or push to `main` if you connected the Git integration).

The release store falls back to a no-op snapshot on Vercel's serverless filesystem — flagged above. Local dev produces real JSON in `releases/<slug>/<version>.json`.

---

## Submission

Built and submitted by **Chella Bhargavi**.

Sprint scope completed end-to-end against the brief:

- ✅ Schema-driven renderer + typed registry (Zod, exhaustive over `SectionType`)
- ✅ Real Contentful adapter with isolated transformer + local fixture fallback
- ✅ Studio editor (add / reorder / edit props) backed by 3 Redux Toolkit slices with `localStorage` draft persistence
- ✅ RBAC enforced in middleware + API handler + Server Action (viewer / editor / publisher)
- ✅ Deterministic SemVer engine + idempotent publish writing immutable JSON snapshots to `releases/<slug>/<version>.json`
- ✅ Unit tests (Vitest) covering the SemVer matrix and schema validation — 25/25 passing
- ✅ Playwright + `@axe-core/playwright` e2e suite emitting `a11y-report.json`; CI fails on critical / serious violations
- ✅ GitHub Actions CI (lint / typecheck / test / build / e2e + axe)
- ✅ WCAG 2.2 AAA-oriented: skip link, visible focus, heading hierarchy, reduced-motion respect, fully labelled forms, AAA-contrast palette

