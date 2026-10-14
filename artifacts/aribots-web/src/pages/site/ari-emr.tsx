import {
  CalendarDays,
  ClipboardList,
  FileText,
  Inbox,
  Receipt,
  ScanLine,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ActionLink, AudienceSection, CtaBand, FeatureGrid, PageHero, StepsSection } from "@/components/site/PageBlocks";

const FEATURES = [
  {
    icon: Stethoscope,
    title: "Patient charts",
    body: "Problems, medications, allergies, vitals and orders on one longitudinal record, with status and severity visible at a glance.",
  },
  {
    icon: CalendarDays,
    title: "Scheduling",
    body: "Appointments by provider, department and visit type, from check-in through completion, with no-shows and cancellations tracked.",
  },
  {
    icon: FileText,
    title: "Encounters and notes with Ari",
    body: "Draft a SOAP note from the encounter and chart, turn a dictated narrative into structured sections, and summarise, expand or restructure text without inventing facts.",
  },
  {
    icon: ScanLine,
    title: "Imaging and DICOM",
    body: "Upload and parse DICOM studies, browse sample studies, and render volumes in three dimensions alongside the chart they belong to.",
  },
  {
    icon: ClipboardList,
    title: "Orders and results",
    body: "Labs, imaging, procedures and referrals with priority, status and resulted summaries that flow straight into the note.",
  },
  {
    icon: Receipt,
    title: "Billing, claims and payments",
    body: "Charges with suggested CPT and ICD-10 codes drawn from the documentation, claims by status, payer coverage and a collections summary.",
  },
  {
    icon: Users,
    title: "Patient relationship management",
    body: "Engagement status, communications history, outreach campaigns, care tasks and referrals, so follow-up is a workflow rather than a memory.",
  },
  {
    icon: Inbox,
    title: "In-basket",
    body: "Results, messages and tasks in one queue with unread counts, routed to the clinician who needs to act.",
  },
  {
    icon: ShieldCheck,
    title: "Audit and compliance",
    body: "Every request is written to the audit log, every chart view to the data access log, with security events and compliance reports available to the compliance officer.",
  },
];

const STEPS = [
  { step: "Step 1", title: "Check in", body: "The visit appears on the schedule with the reason, provider and location; status moves from scheduled to checked in." },
  { step: "Step 2", title: "Review the chart", body: "Active problems, current medications, allergies, the latest vitals and recent results are one screen, and Ari can answer questions about them." },
  { step: "Step 3", title: "Document with Ari", body: "Dictate or type, let Ari structure the SOAP note from the chart context, then edit and sign. Ari marks where clinician input is still needed." },
  { step: "Step 4", title: "Code, bill, follow up", body: "Ari suggests codes from an allowed library and the documentation; charges and claims are filed; follow-up lands in the in-basket and the CRM." },
];

const AUDIENCES = [
  {
    role: "Clinicians",
    gets: "A chart that is fast to read and a note that is fast to finish, with Ari doing the restructuring and never the diagnosing.",
  },
  {
    role: "Practice and revenue managers",
    gets: "Scheduling, charges, claims, payer coverage and collections in one place, with code suggestions grounded in what was actually documented.",
  },
  {
    role: "Compliance officers",
    gets: "Audit logs, per-patient data access logs, security events and compliance reports that are generated from the same database the care team works in.",
  },
];

export default function AriEmrProductPage() {
  return (
    <SiteLayout
      title="Ari EMR | The record that carries the story forward"
      description="Ari EMR is the operational record: patient charts, scheduling, encounters and Ari-assisted notes, DICOM imaging, billing, CRM, in-basket and audit logging."
    >
      <PageHero
        eyebrow="Ari EMR"
        title={
          <>
            Carry the story
            <br />
            <span className="text-[#75d4cf]">forward.</span>
          </>
        }
        lede="The operational record for patient charts, imaging, appointments, care operations, reporting and billing, so what the team learns in one encounter is still there in the next."
        actions={
          <>
            <ActionLink href="/ari-emr/" external testId="link-emr-open">Open Ari EMR</ActionLink>
            <ActionLink href="/request-demo" variant="outline" testId="link-emr-demo">Request a demo</ActionLink>
          </>
        }
      />
      <FeatureGrid
        id="features"
        eyebrow="What is in the record"
        title="Everything an encounter needs, and what comes after it"
        body="Built as one application on one database, so the chart, the schedule, the bill and the audit trail always agree."
        items={FEATURES}
      />
      <StepsSection
        id="workflow"
        eyebrow="An encounter in Ari EMR"
        title="From check-in to follow-up"
        body="Ari assists at the documentation and coding steps. The clinician reviews and signs; the system records who did what."
        steps={STEPS}
      />
      <AudienceSection
        id="audience"
        title="One record, three jobs"
        audiences={AUDIENCES}
      />
      <CtaBand
        title="Open the EMR"
        body="Sign in with your clinician account or the shared demo account, or book a walkthrough with our team."
        primary={{ label: "Open Ari EMR", href: "/ari-emr/", external: true, testId: "link-emr-cta-open" }}
        secondary={{ label: "Request a demo", href: "/request-demo", testId: "link-emr-cta-demo" }}
      />
    </SiteLayout>
  );
}
