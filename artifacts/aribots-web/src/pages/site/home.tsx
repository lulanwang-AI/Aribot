import { Link } from "wouter";
import { FileSearch, Lock, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ComplianceBadges } from "@/components/site/ComplianceBadges";
import { CtaBand } from "@/components/site/PageBlocks";
import {
  ApplicationsSection,
  CommunitySection,
  HeroSection,
  MeetAriSection,
  TestimonialsSection,
} from "@/components/site/sections";

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: "Identifiers never reach the model",
    body: "A PHI guard screens every Ari request for names, record numbers, dates of birth and contact details before anything is sent, and treats uploads as data rather than instructions.",
  },
  {
    icon: FileSearch,
    title: "An audit trail without the transcript",
    body: "Every Ari call is logged with a hash of the question, the capability, latency and outcome. The text of the question is never stored in the audit log.",
  },
  {
    icon: Lock,
    title: "Access decided on the server",
    body: "Every workspace route sits behind sign-in, administrator actions are checked server-side, and sessions live in the database rather than in one server's memory.",
  },
];

function TrustStrip() {
  return (
    <section id="trust" className="py-20 bg-gray-100">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.6fr] lg:items-center">
          <div>
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4A90D9]">Built for clinical data</span>
            <h2 className="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">HIPAA compliant. SOC 2 compliant.</h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              Compliance is a property of how the system is built, not a badge on a page. These are three of the controls that are on by default.
            </p>
            <div className="mt-6 text-gray-900">
              <ComplianceBadges size="md" />
            </div>
            <Link href="/security" className="mt-6 inline-flex text-sm font-semibold text-[#4A90D9] hover:underline" data-testid="link-trust-security">
              How we protect clinical data →
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {TRUST_POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.title} className="rounded-2xl border border-gray-200 bg-white p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4A90D9]/10 text-[#4A90D9]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-gray-900">{point.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{point.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <SiteLayout
      title="ARIbots | One clinical system. Three ways in."
      description="ARIbots connects clinical intelligence, antimicrobial stewardship and the longitudinal patient record for physicians, pharmacists and care teams."
    >
      <HeroSection />
      <ApplicationsSection />
      <TrustStrip />
      <MeetAriSection />
      <TestimonialsSection />
      <CommunitySection />
      <CtaBand
        title="See Ari on your own workflows"
        body="A short walkthrough with a clinician on our team, using the questions, antibiograms and chart work your service handles every day."
        primary={{ label: "Request a demo", href: "/request-demo", testId: "link-home-request-demo" }}
        secondary={{ label: "Read the whitepaper", href: "/whitepaper", testId: "link-home-whitepaper" }}
      />
    </SiteLayout>
  );
}
