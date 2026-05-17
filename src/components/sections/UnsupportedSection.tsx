/**
 * Renders when a section type is not present in the registry OR when validation
 * fails for a section. Never throws — keeps the rest of the page rendering.
 * Visible only when NEXT_PUBLIC_SHOW_UNSUPPORTED_NOTICE is "true" or in dev,
 * to avoid leaking implementation detail to end users in production.
 */
export default function UnsupportedSection({
  reason,
  rawType,
  rawId,
}: {
  reason: string;
  rawType?: string;
  rawId?: string;
}) {
  const showNotice =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_SHOW_UNSUPPORTED_NOTICE === "true";
  if (!showNotice) {
    return null;
  }
  return (
    <section
      role="alert"
      className="mx-auto my-4 max-w-5xl rounded-md border border-amber-400 bg-amber-50 px-6 py-4 text-amber-900"
    >
      <p className="font-semibold">Unsupported section</p>
      <p className="mt-1 text-sm">
        {rawType ? <code className="rounded bg-amber-100 px-1">{rawType}</code> : "Unknown type"}
        {rawId ? <> (id: <code className="rounded bg-amber-100 px-1">{rawId}</code>)</> : null}
      </p>
      <p className="mt-1 text-sm">{reason}</p>
    </section>
  );
}
