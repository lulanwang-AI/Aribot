import { Link } from "wouter";
import { QrCode, Smartphone, Globe, KeyRound } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ActionLink, CtaBand, PageHero, SectionIntro, StepsSection } from "@/components/site/PageBlocks";

type MobileAppStatus = "available" | "in-development";

/**
 * The mobile apps and where to try them. The AMR and EMR apps are being built
 * next; flip `status` and add `webPreview` when each one ships.
 */
const MOBILE_APPS: {
  name: string;
  productHref: string;
  summary: string;
  features: string[];
  status: MobileAppStatus;
  webPreview?: string;
}[] = [
  {
    name: "ARIbots mobile",
    productHref: "/products/aribots",
    summary: "Ari in your pocket: ask, dictate, read aloud, and keep up with triage cases, news, groups, events and messages.",
    features: ["Ari chat with Ari and ER modes", "Voice dictation and read-aloud", "Triage cases, news, groups and events", "Clinical workflow: pre-charting, consult, SOAP, summary"],
    status: "available",
    webPreview: "/aribots-mobile/",
  },
  {
    name: "Ari AMR mobile",
    productHref: "/products/ari-amr",
    summary: "The stewardship worklist for the ward round: cases due for review, the antibiogram and the formulary without going back to a desk.",
    features: ["Dashboard and review worklist", "Case intake and 48 to 72 hour review", "Antibiogram by region", "Formulary and guidance"],
    status: "in-development",
  },
  {
    name: "Ari EMR mobile",
    productHref: "/products/ari-emr",
    summary: "The chart, the schedule and the in-basket on a phone, with Ari drafting notes from what you dictate between rooms.",
    features: ["Patients and charts", "Today's schedule", "Encounters and Ari-assisted notes", "In-basket"],
    status: "in-development",
  },
];

const TEST_STEPS = [
  { step: "Step 1", title: "Open the web preview", body: "Each app also ships as a web build on this domain, so the fastest check is to open its preview link on your phone's browser." },
  { step: "Step 2", title: "Install Expo Go", body: "For the native experience install Expo Go from the App Store or Google Play. It runs development builds without an app-store release." },
  { step: "Step 3", title: "Scan the QR code", body: "The project workspace prints a QR code for each mobile app when its development server starts. Scan it in Expo Go." },
  { step: "Step 4", title: "Sign in with the demo account", body: "Use the shared demo credentials shown on the sign-in screen. Data is the same demo dataset the web apps use." },
];

function StatusBadge({ status }: { status: MobileAppStatus }) {
  return status === "available" ? (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Available to test</span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">In development</span>
  );
}

function AppsSection() {
  return (
    <section id="apps" className="py-24 bg-white">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <SectionIntro
          eyebrow="Three apps"
          title="One app per workspace, the same account across all of them"
          body="Each mobile app is brand-matched to its web workspace and talks to the same API and database, so a case started on the ward is the same case at the desk."
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {MOBILE_APPS.map((app) => (
            <div key={app.name} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6" data-testid={`mobile-app-${app.name.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4A90D9]/10 text-[#4A90D9]">
                  <Smartphone className="h-5 w-5" />
                </div>
                <StatusBadge status={app.status} />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-gray-900">{app.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{app.summary}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-gray-700">
                {app.features.map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-[#4A90D9]">•</span>{f}</li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3 pt-2">
                {app.webPreview ? (
                  <a href={app.webPreview} className="inline-flex items-center gap-2 rounded-xl bg-[#4A90D9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5BA0E9]" data-testid={`link-mobile-preview-${app.name.toLowerCase().replace(/\s+/g, "-")}`}>
                    <Globe className="h-4 w-4" /> Open web preview
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500"><QrCode className="h-4 w-4" /> Preview coming with the next release</span>
                )}
                <Link href={app.productHref} className="inline-flex items-center rounded-xl px-3 py-2 text-sm font-semibold text-[#4A90D9] hover:underline">About the workspace →</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function MobilePage() {
  return (
    <SiteLayout
      title="Mobile apps | ARIbots"
      description="ARIbots mobile apps for iOS and Android: Ari chat with voice, triage and news, the stewardship worklist and the EMR chart, testable in Expo Go or as web previews."
    >
      <PageHero
        eyebrow="Mobile"
        title={
          <>
            The same clinical system,
            <br />
            <span className="text-[#75d4cf]">in your pocket.</span>
          </>
        }
        lede="Native apps for iOS and Android built with Expo, brand-matched to the web workspaces and signed in to the same account and data. Every app can be tested on a phone before it reaches an app store."
        actions={
          <>
            <ActionLink href="/aribots-mobile/" external testId="link-mobile-hero-preview">Try the ARIbots web preview</ActionLink>
            <ActionLink href="#how-to-test" variant="outline" testId="link-mobile-hero-how">How to test on a phone</ActionLink>
          </>
        }
        aside={
          <div className="grid grid-cols-2 gap-4 text-white/80">
            {[{ icon: Smartphone, label: "iOS and Android" }, { icon: QrCode, label: "Expo Go test builds" }, { icon: Globe, label: "Web previews on this domain" }, { icon: KeyRound, label: "Same sign-in as the web" }].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <Icon className="h-6 w-6 text-[#75d4cf]" />
                  <p className="mt-3 text-sm font-medium">{item.label}</p>
                </div>
              );
            })}
          </div>
        }
      />
      <AppsSection />
      <StepsSection id="how-to-test" eyebrow="Testing" title="How to test a build on your phone" steps={TEST_STEPS} />
      <CtaBand
        title="Want the apps on your hospital's devices?"
        body="Tell us which workspace your team needs on mobile first. We can walk you through a test build on a call."
        primary={{ label: "Request a demo", href: "/request-demo", testId: "link-mobile-cta-demo" }}
        secondary={{ label: "Platform overview", href: "/platform", testId: "link-mobile-cta-platform" }}
      />
    </SiteLayout>
  );
}
