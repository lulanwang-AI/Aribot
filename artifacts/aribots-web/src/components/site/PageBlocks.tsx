import type { ComponentType, ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

/**
 * Building blocks for the inner public pages. They follow the visual language
 * of the landing sections: a dark hero band, light alternating sections (the
 * landing-shell styles supply the alternation), and a dark call-to-action
 * panel inside a light section.
 */

export function PageHero({
  eyebrow,
  title,
  lede,
  actions,
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  lede: string;
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section id="hero" className="relative overflow-hidden bg-[#0e1117] py-20 md:py-28" data-testid="page-hero">
      <div
        className={`relative z-10 mx-auto w-full px-6 lg:px-8 ${
          aside ? "grid max-w-7xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center" : "max-w-7xl"
        }`}
      >
        <div className={aside ? undefined : "mx-auto max-w-3xl text-center"}>
          <div className={`inline-flex items-center gap-2 rounded-full border border-[#4A90D9]/25 bg-[#4A90D9]/10 px-4 py-1.5 mb-6 ${aside ? "w-fit" : "mx-auto w-fit"}`}>
            <span className="h-2 w-2 rounded-full bg-[#4A90D9] animate-pulse" />
            <span className="text-sm font-medium tracking-wide text-[#75d4cf]">{eyebrow}</span>
          </div>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl" data-testid="text-page-title">
            {title}
          </h1>
          <p className={`mt-6 max-w-xl text-lg leading-relaxed text-white/60 ${aside ? "" : "mx-auto"}`} data-testid="text-page-lede">
            {lede}
          </p>
          {actions && (
            <div className={`mt-9 flex flex-col gap-3 sm:flex-row sm:items-center ${aside ? "" : "sm:justify-center"}`}>
              {actions}
            </div>
          )}
        </div>
        {aside && <div className="flex items-center justify-center">{aside}</div>}
      </div>
    </section>
  );
}

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#4A90D9] px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#5BA0E9]";
const outlineButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-transparent px-7 py-3.5 text-base font-medium text-white/80 transition-colors hover:border-white/30 hover:bg-white/5";

/** Button-styled link. `external` renders a plain anchor (full navigation). */
export function ActionLink({
  href,
  children,
  variant = "primary",
  external = false,
  testId,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "outline";
  external?: boolean;
  testId?: string;
}) {
  const className = variant === "primary" ? primaryButton : outlineButton;
  if (external) {
    return (
      <a href={href} className={className} data-testid={testId}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} data-testid={testId}>
      {children}
    </Link>
  );
}

export function SectionIntro({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4A90D9]">{eyebrow}</span>}
      <h2 className="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">{title}</h2>
      {body && <p className="mt-4 text-base leading-relaxed text-gray-600 md:text-lg">{body}</p>}
    </div>
  );
}

export type Feature = { icon: ComponentType<{ className?: string }>; title: string; body: string };

export function FeatureGrid({
  id,
  eyebrow,
  title,
  body,
  items,
  columns = 3,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  body?: string;
  items: Feature[];
  columns?: 2 | 3;
}) {
  return (
    <section id={id} className="py-24 bg-white">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <SectionIntro eyebrow={eyebrow} title={title} body={body} />
        <div className={`mt-14 grid gap-6 ${columns === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
                data-testid={`feature-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4A90D9]/10 text-[#4A90D9]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export type Step = { step: string; title: string; body: string };

export function StepsSection({
  id,
  eyebrow,
  title,
  body,
  steps,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  body?: string;
  steps: Step[];
}) {
  return (
    <section id={id} className="py-24 bg-gray-100">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <SectionIntro eyebrow={eyebrow} title={title} body={body} />
        <ol className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.step} className="relative rounded-2xl border border-gray-200 bg-white p-6">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4A90D9]">{s.step}</span>
              <h3 className="mt-3 text-lg font-semibold text-gray-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function AudienceSection({
  id,
  title,
  body,
  audiences,
}: {
  id: string;
  title: string;
  body?: string;
  audiences: { role: string; gets: string }[];
}) {
  return (
    <section id={id} className="py-24 bg-white">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <SectionIntro eyebrow="Who it is for" title={title} body={body} />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {audiences.map((a) => (
            <div key={a.role} className="border-l-2 border-[#4A90D9]/50 pl-5">
              <h3 className="text-base font-semibold text-gray-900">{a.role}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{a.gets}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaBand({
  id = "cta",
  title,
  body,
  primary,
  secondary,
}: {
  id?: string;
  title: string;
  body: string;
  primary: { label: string; href: string; external?: boolean; testId?: string };
  secondary?: { label: string; href: string; external?: boolean; testId?: string };
}) {
  return (
    <section id={id} className="py-20 bg-gray-100">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[#102f3c] px-8 py-14 text-center md:px-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(117,212,207,0.16),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(234,181,92,0.10),transparent_35%)]" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{title}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/60 md:text-lg">{body}</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ActionLink href={primary.href} external={primary.external} testId={primary.testId ?? "link-cta-primary"}>
                {primary.label}
                <ArrowRight className="h-4 w-4" />
              </ActionLink>
              {secondary && (
                <ActionLink href={secondary.href} external={secondary.external} variant="outline" testId={secondary.testId ?? "link-cta-secondary"}>
                  {secondary.label}
                </ActionLink>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
