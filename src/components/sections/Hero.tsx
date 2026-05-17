import Link from "next/link";
import type { HeroProps } from "@/schemas/sectionValidation";
import { Button } from "@/components/ui/button";

/**
 * Hero section. Renders as <section> with a single h1 — page-level heading
 * hierarchy assumes one Hero at top of page (enforced by editor UX, not by render).
 */
export default function Hero({ props }: { props: HeroProps }) {
  const { title, subtitle, ctaLabel, ctaUrl, imageUrl, eyebrow } = props;
  return (
    <section
      className="relative bg-gradient-to-b from-slate-50 to-white px-6 py-20 sm:py-28"
      aria-labelledby={`hero-${title.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-6">
        {eyebrow ? (
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-800">{eyebrow}</p>
        ) : null}
        <h1
          id={`hero-${title.replace(/\s+/g, "-").toLowerCase()}`}
          className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl"
        >
          {title}
        </h1>
        {subtitle ? <p className="max-w-2xl text-lg text-slate-700">{subtitle}</p> : null}
        <Button asChild size="lg">
          <Link href={ctaUrl}>{ctaLabel}</Link>
        </Button>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="mt-8 w-full max-w-3xl rounded-lg shadow-lg motion-reduce:transition-none"
            loading="eager"
          />
        ) : null}
      </div>
    </section>
  );
}
