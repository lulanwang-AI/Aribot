import { BookOpenCheck, Cpu, Database, FileSearch, ShieldCheck, Users } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ActionLink, CtaBand, FeatureGrid, PageHero } from "@/components/site/PageBlocks";
import { AriSystemFlow, HowAriWorksSection, WhatAriKnowsSection } from "@/components/site/sections";

const GUARANTEES = [
  {
    icon: Cpu,
    title: "One model, one setting",
    body: "Every Ari surface, from the assistant to EMR note drafting, runs on Anthropic's Claude through a single shared model setting. There is no second AI vendor to govern.",
  },
  {
    icon: BookOpenCheck,
    title: "Claims you can trace",
    body: "In Ari mode each clinical fact arrives as a structured claim with its verification source, and each citation is a clickable title, not a bare link in prose.",
  },
  {
    icon: ShieldCheck,
    title: "A PHI guard in front of the model",
    body: "Requests that carry names, record numbers, dates of birth or contact details are stopped before they leave the server, with guidance on how to rephrase.",
  },
  {
    icon: FileSearch,
    title: "Audit by default",
    body: "Ari calls, EMR data access and security events are written to the database as they happen. The Ari audit log stores a hash of each question, never its text.",
  },
  {
    icon: Database,
    title: "State that survives a redeploy",
    body: "Sessions, stewardship cases, demo requests and the EMR record live in Postgres, shared by every running instance of the service.",
  },
  {
    icon: Users,
    title: "Roles the server enforces",
    body: "The interface adapts to physicians, students and administrators, but administrator actions are checked against the signed-in account on the server.",
  },
];

export default function PlatformPage() {
  return (
    <SiteLayout
      title="Platform | ARIbots"
      description="How ARIbots connects clinical intelligence, antimicrobial stewardship and the patient record on one Anthropic-powered platform with a PHI guard and audit trail."
    >
      <PageHero
        eyebrow="The Ari platform"
        title={
          <>
            Three workspaces.
            <br />
            <span className="text-[#75d4cf]">One connected care operation.</span>
          </>
        }
        lede="ARIbots AI answers the clinical question, Ari AMR protects the next prescribing decision, and Ari EMR carries the patient's story forward. They share one AI model, one sign-in and one set of safeguards."
        actions={
          <>
            <ActionLink href="/products/aribots" testId="link-platform-aribots">Explore the workspaces</ActionLink>
            <ActionLink href="/whitepaper" variant="outline" testId="link-platform-whitepaper">Read the whitepaper</ActionLink>
          </>
        }
        aside={<AriSystemFlow />}
      />
      <HowAriWorksSection />
      <FeatureGrid
        id="guarantees"
        eyebrow="What the platform guarantees"
        title="Safeguards that are on for every workspace"
        body="These are not configuration options. They are how the services are built, and they apply the same way to the web apps, the mobile apps and the EMR."
        items={GUARANTEES}
      />
      <WhatAriKnowsSection />
      <CtaBand
        title="Pick the workspace your team lives in"
        body="Start with one product. The shared thread between them is there when you need it."
        primary={{ label: "ARIbots AI", href: "/products/aribots", testId: "link-platform-cta-aribots" }}
        secondary={{ label: "Ari AMR", href: "/products/ari-amr", testId: "link-platform-cta-amr" }}
      />
    </SiteLayout>
  );
}
