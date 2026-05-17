import Link from "next/link";
import type { CtaProps } from "@/schemas/sectionValidation";
import { Button } from "@/components/ui/button";

export default function Cta({ props }: { props: CtaProps }) {
  const { heading, body, buttonLabel, buttonUrl } = props;
  return (
    <section className="bg-blue-700 px-6 py-16 text-white sm:py-20" aria-labelledby="cta-heading">
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-4 sm:items-center sm:text-center">
        <h2 id="cta-heading" className="text-3xl font-bold tracking-tight">
          {heading}
        </h2>
        {body ? <p className="max-w-2xl text-lg text-blue-50">{body}</p> : null}
        <Button asChild size="lg" variant="secondary" className="mt-2">
          <Link href={buttonUrl}>{buttonLabel}</Link>
        </Button>
      </div>
    </section>
  );
}
