"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { updateSectionProps } from "@/store/slices/draftPageSlice";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Per-section property editor. Edits are limited to the subset of props
 * called out in the brief (hero text, CTA label+URL), plus the equivalents
 * for the other section types. The Zod schema is the source of truth for
 * what is "required" — we mark required fields and surface inline errors
 * via aria-invalid + a hint, but we do NOT block keystrokes (we let the
 * publish-time validation handle blocking).
 */
export function SectionEditor() {
  const dispatch = useAppDispatch();
  const activeId = useAppSelector((s) => s.ui.activeSectionId);
  const section = useAppSelector((s) =>
    s.draftPage.draft?.sections.find((sec) => sec.id === activeId),
  );

  if (!section) {
    return (
      <div className="flex h-full flex-col items-start gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Section editor
        </h2>
        <p className="text-sm text-slate-700">
          Select a section from the list to edit its content.
        </p>
      </div>
    );
  }

  const update = (key: string, value: unknown) =>
    dispatch(updateSectionProps({ sectionId: section.id, props: { [key]: value } }));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => e.preventDefault()}
      aria-label={`Edit ${section.type} section`}
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
          {section.type}
        </p>
        <h2 className="text-lg font-semibold text-slate-900">{section.id}</h2>
      </header>

      {section.type === "hero" ? (
        <HeroFields section={section} update={update} />
      ) : null}
      {section.type === "featureGrid" ? (
        <FeatureGridFields section={section} update={update} />
      ) : null}
      {section.type === "testimonial" ? (
        <TestimonialFields section={section} update={update} />
      ) : null}
      {section.type === "cta" ? <CtaFields section={section} update={update} /> : null}
    </form>
  );
}

type FieldsProps = {
  section: { id: string; props: Record<string, unknown> };
  update: (key: string, value: unknown) => void;
};

function getString(props: Record<string, unknown>, key: string): string {
  const v = props[key];
  return typeof v === "string" ? v : "";
}

function FieldRow({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-red-700">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-600">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function HeroFields({ section, update }: FieldsProps) {
  const id = section.id;
  return (
    <>
      <FieldRow id={`${id}-title`} label="Title" required>
        <Input
          id={`${id}-title`}
          value={getString(section.props, "title")}
          onChange={(e) => update("title", e.target.value)}
          aria-required="true"
          aria-invalid={getString(section.props, "title").length === 0}
        />
      </FieldRow>
      <FieldRow id={`${id}-subtitle`} label="Subtitle">
        <Textarea
          id={`${id}-subtitle`}
          value={getString(section.props, "subtitle")}
          onChange={(e) => update("subtitle", e.target.value)}
        />
      </FieldRow>
      <FieldRow id={`${id}-ctaLabel`} label="CTA label" required>
        <Input
          id={`${id}-ctaLabel`}
          value={getString(section.props, "ctaLabel")}
          onChange={(e) => update("ctaLabel", e.target.value)}
          aria-required="true"
        />
      </FieldRow>
      <FieldRow id={`${id}-ctaUrl`} label="CTA URL" required hint="Must be a full https URL.">
        <Input
          id={`${id}-ctaUrl`}
          type="url"
          inputMode="url"
          value={getString(section.props, "ctaUrl")}
          onChange={(e) => update("ctaUrl", e.target.value)}
          aria-required="true"
        />
      </FieldRow>
    </>
  );
}

function FeatureGridFields({ section, update }: FieldsProps) {
  const id = section.id;
  return (
    <>
      <FieldRow id={`${id}-heading`} label="Heading" required>
        <Input
          id={`${id}-heading`}
          value={getString(section.props, "heading")}
          onChange={(e) => update("heading", e.target.value)}
          aria-required="true"
        />
      </FieldRow>
      <FieldRow id={`${id}-intro`} label="Intro">
        <Textarea
          id={`${id}-intro`}
          value={getString(section.props, "intro")}
          onChange={(e) => update("intro", e.target.value)}
        />
      </FieldRow>
      <p className="text-xs text-slate-600">
        Editing individual feature items is intentionally out of scope for this iteration — see
        README &quot;What is not included&quot;.
      </p>
    </>
  );
}

function TestimonialFields({ section, update }: FieldsProps) {
  const id = section.id;
  return (
    <>
      <FieldRow id={`${id}-quote`} label="Quote" required>
        <Textarea
          id={`${id}-quote`}
          value={getString(section.props, "quote")}
          onChange={(e) => update("quote", e.target.value)}
          aria-required="true"
        />
      </FieldRow>
      <FieldRow id={`${id}-authorName`} label="Author name" required>
        <Input
          id={`${id}-authorName`}
          value={getString(section.props, "authorName")}
          onChange={(e) => update("authorName", e.target.value)}
          aria-required="true"
        />
      </FieldRow>
      <FieldRow id={`${id}-authorRole`} label="Author role">
        <Input
          id={`${id}-authorRole`}
          value={getString(section.props, "authorRole")}
          onChange={(e) => update("authorRole", e.target.value)}
        />
      </FieldRow>
    </>
  );
}

function CtaFields({ section, update }: FieldsProps) {
  const id = section.id;
  return (
    <>
      <FieldRow id={`${id}-heading`} label="Heading" required>
        <Input
          id={`${id}-heading`}
          value={getString(section.props, "heading")}
          onChange={(e) => update("heading", e.target.value)}
          aria-required="true"
        />
      </FieldRow>
      <FieldRow id={`${id}-body`} label="Body">
        <Textarea
          id={`${id}-body`}
          value={getString(section.props, "body")}
          onChange={(e) => update("body", e.target.value)}
        />
      </FieldRow>
      <FieldRow id={`${id}-buttonLabel`} label="Button label" required>
        <Input
          id={`${id}-buttonLabel`}
          value={getString(section.props, "buttonLabel")}
          onChange={(e) => update("buttonLabel", e.target.value)}
          aria-required="true"
        />
      </FieldRow>
      <FieldRow id={`${id}-buttonUrl`} label="Button URL" required hint="Must be a full https URL.">
        <Input
          id={`${id}-buttonUrl`}
          type="url"
          inputMode="url"
          value={getString(section.props, "buttonUrl")}
          onChange={(e) => update("buttonUrl", e.target.value)}
          aria-required="true"
        />
      </FieldRow>
    </>
  );
}
