import type { TestimonialProps } from "@/schemas/sectionValidation";

export default function Testimonial({ props }: { props: TestimonialProps }) {
  const { quote, authorName, authorRole, avatarUrl } = props;
  return (
    <section className="bg-slate-900 px-6 py-16 text-white sm:py-20" aria-label={`Testimonial from ${authorName}`}>
      <figure className="mx-auto max-w-3xl">
        <blockquote className="text-2xl font-medium leading-relaxed text-white sm:text-3xl">
          <p>&ldquo;{quote}&rdquo;</p>
        </blockquote>
        <figcaption className="mt-8 flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-12 w-12 rounded-full bg-slate-700 object-cover"
            />
          ) : null}
          <div>
            <p className="font-semibold text-white">{authorName}</p>
            {authorRole ? <p className="text-sm text-slate-300">{authorRole}</p> : null}
          </div>
        </figcaption>
      </figure>
    </section>
  );
}
