import type { FeatureGridProps } from "@/schemas/sectionValidation";

export default function FeatureGrid({ props }: { props: FeatureGridProps }) {
  const { heading, intro, features } = props;
  return (
    <section className="bg-white px-6 py-16 sm:py-20" aria-labelledby={`grid-${heading.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="mx-auto max-w-5xl">
        <h2
          id={`grid-${heading.replace(/\s+/g, "-").toLowerCase()}`}
          className="text-3xl font-bold tracking-tight text-slate-900"
        >
          {heading}
        </h2>
        {intro ? <p className="mt-3 max-w-2xl text-base text-slate-700">{intro}</p> : null}
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <li
              key={`${feature.title}-${idx}`}
              className="rounded-lg border border-slate-200 bg-slate-50 p-6"
            >
              {feature.icon ? (
                <span aria-hidden="true" className="mb-3 inline-block text-2xl">
                  {feature.icon}
                </span>
              ) : null}
              <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-700">{feature.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
