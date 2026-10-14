import { Activity, Cpu, Database, EyeOff, FileSearch, KeyRound, Lock, ShieldCheck, UserCheck } from "lucide-react";
import { SiteLayout, CONTACT_URL } from "@/components/site/SiteLayout";
import { ComplianceBadges, HipaaBadge, Soc2Badge } from "@/components/site/ComplianceBadges";
import { ActionLink, CtaBand, FeatureGrid, PageHero, SectionIntro } from "@/components/site/PageBlocks";

const DATA_HANDLING = [
  {
    icon: EyeOff,
    title: "A PHI guard in front of every Ari request",
    body: "Names, medical record numbers, social security numbers, dates of birth, phone numbers and long digit runs are detected on the server and the request is refused with guidance to rephrase. Uploaded documents are passed to the model as data, never as instructions.",
  },
  {
    icon: FileSearch,
    title: "Audit without the transcript",
    body: "The Ari audit log records who asked, which capability, how long it took and whether it succeeded, together with a one-way hash of the question. The question text itself is never written to the log.",
  },
  {
    icon: ShieldCheck,
    title: "Redaction before memory",
    body: "When Ari is allowed to remember verified clinical claims, each entry is redacted a second time on the way in, and a write is abandoned entirely if more than a third of it had to be removed.",
  },
  {
    icon: KeyRound,
    title: "Sign-in on every workspace route",
    body: "Each API route behind the web apps, the mobile apps and the EMR requires an authenticated session. Only the public liveness check and the demo request form are open.",
  },
  {
    icon: UserCheck,
    title: "Roles decided by the server",
    body: "Administrator actions are checked against the signed-in account on the server. The interface can preview a different role, but it cannot grant one.",
  },
  {
    icon: Database,
    title: "Sessions and records in the database",
    body: "Sign-in sessions, stewardship cases, demo requests, audit entries and the EMR record live in Postgres, shared by every running instance and kept across deployments.",
  },
  {
    icon: Lock,
    title: "Encrypted in transit",
    body: "All public endpoints are served over HTTPS. Session cookies are HttpOnly and marked secure in production.",
  },
  {
    icon: Cpu,
    title: "One AI vendor",
    body: "Every clinical AI feature runs on Anthropic's Claude through a single model setting on the server. The browser never holds an AI credential and there is no second provider to review.",
  },
  {
    icon: Activity,
    title: "Operational status you can read",
    body: "Signed-in administrators can see which integrations are configured and whether the database is answering, without any secret value ever being shown.",
  },
];

const EMR_CONTROLS = [
  { title: "Audit logs", body: "Every EMR API request is logged with action, resource type, outcome and timing." },
  { title: "Data access logs", body: "Each view of a patient's record is recorded against that patient, with the access type and purpose." },
  { title: "Security events", body: "Failed sign-ins and other security-relevant events are captured with severity and a resolution trail." },
  { title: "Compliance reports", body: "Access and activity reports can be generated over a date range for review and archival." },
];

function ComplianceSection() {
  return (
    <section id="compliance" className="py-24 bg-white">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <SectionIntro
          eyebrow="Compliance"
          title="HIPAA compliant and SOC 2 compliant"
          body="ARIbots operates a HIPAA compliance program covering administrative, technical and physical safeguards for protected health information, and maintains SOC 2 compliance over the security, availability and confidentiality of the platform."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-900" data-testid="card-hipaa">
            <HipaaBadge className="h-14" />
            <h3 className="mt-6 text-xl font-semibold">HIPAA</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Protected health information is minimised before it reaches any AI model, logged by reference rather than content, and reachable only through authenticated, role-checked routes. Business associate documentation is available to customers on request.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-900" data-testid="card-soc2">
            <Soc2Badge className="h-14" />
            <h3 className="mt-6 text-xl font-semibold">SOC 2</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Controls over access, change management, monitoring and data handling are documented and operated continuously. Our compliance report is available to customers and prospects under a non-disclosure agreement.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmrControlsSection() {
  return (
    <section id="emr-controls" className="py-24 bg-gray-100">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <SectionIntro
          eyebrow="In the EMR"
          title="Compliance records generated where the care happens"
          body="Ari EMR writes its own audit, access and security records to the same database the care team works in, so reports reflect what actually happened."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {EMR_CONTROLS.map((c) => (
            <div key={c.title} className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="text-base font-semibold text-gray-900">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function SecurityPage() {
  return (
    <SiteLayout
      title="Security and compliance | ARIbots"
      description="How ARIbots protects clinical data: HIPAA and SOC 2 compliance, a PHI guard before any AI call, hash-only audit logging, server-enforced roles and encrypted transport."
    >
      <PageHero
        eyebrow="Security and compliance"
        title={
          <>
            Clinical data,
            <br />
            <span className="text-[#75d4cf]">handled like clinical data.</span>
          </>
        }
        lede="ARIbots is HIPAA compliant and SOC 2 compliant. More importantly, the controls behind those words are built into every request the platform handles."
        actions={
          <>
            <ActionLink href={CONTACT_URL} external testId="link-security-docs">Request compliance documentation</ActionLink>
            <ActionLink href="/whitepaper" variant="outline" testId="link-security-whitepaper">Read the technical whitepaper</ActionLink>
          </>
        }
        aside={
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white">
            <ComplianceBadges size="lg" className="justify-center" />
            <p className="mt-6 text-center text-sm text-white/60">Badges link to the controls described on this page.</p>
          </div>
        }
      />
      <ComplianceSection />
      <FeatureGrid
        id="data-handling"
        eyebrow="How clinical data is handled"
        title="Nine controls that are always on"
        body="Each of these is implemented in the platform's code paths, not configured per customer."
        items={DATA_HANDLING}
      />
      <EmrControlsSection />
      <CtaBand
        title="Need the paperwork?"
        body="We share our compliance documentation with prospective customers under a non-disclosure agreement, and can walk your security team through the architecture."
        primary={{ label: "Contact us", href: CONTACT_URL, external: true, testId: "link-security-cta-contact" }}
        secondary={{ label: "Request a demo", href: "/request-demo", testId: "link-security-cta-demo" }}
      />
    </SiteLayout>
  );
}
