"use client";

import React from "react";

interface State {
  hasError: boolean;
  message?: string;
}

/**
 * Localized error boundary for an individual section. A crash in one section
 * (e.g. a renderer throwing on malformed runtime input) must not take down
 * the rest of the preview page. Renders inline fallback UI.
 */
export class SectionErrorBoundary extends React.Component<
  { sectionId: string; children: React.ReactNode },
  State
> {
  constructor(props: { sectionId: string; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : "Unknown error" };
  }

  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[SectionErrorBoundary:${this.props.sectionId}]`, error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <section
          role="alert"
          aria-live="polite"
          className="mx-auto my-4 max-w-5xl rounded-md border border-red-400 bg-red-50 px-6 py-4 text-red-900"
        >
          <p className="font-semibold">A section failed to render</p>
          <p className="mt-1 text-sm">
            Section <code className="rounded bg-red-100 px-1">{this.props.sectionId}</code>{" "}
            could not be displayed. The rest of the page is unaffected.
          </p>
        </section>
      );
    }
    return this.props.children;
  }
}
