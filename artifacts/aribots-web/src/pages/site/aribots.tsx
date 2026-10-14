import { SiteLayout } from "@/components/site/SiteLayout";
import { ActionLink, AudienceSection, CtaBand, PageHero } from "@/components/site/PageBlocks";
import {
  AribotMockup,
  CapabilitiesSection,
  CommunitySection,
  MeetAriSection,
  PhysicianFeaturesSection,
} from "@/components/site/sections";

const AUDIENCES = [
  {
    role: "Attending and consulting physicians",
    gets: "Evidence synthesis with traceable citations, differential reasoning, calculators and protocol lookups, plus a community of verified peers for the cases that need another set of eyes.",
  },
  {
    role: "Residents and advanced practice clinicians",
    gets: "The same Ari capabilities with depth tuned to the signed-in licence, an ER mode for protocol answers under time pressure, and triage discussion threads kept free of identifiers.",
  },
  {
    role: "Pharmacists and nurses",
    gets: "Pharmacokinetic detail and renal and hepatic adjustments for pharmacists, workflow-centred framing for nurses, and a shared record of what the team asked and decided.",
  },
];

export default function AribotsProductPage() {
  return (
    <SiteLayout
      title="ARIbots AI | Clinical intelligence for physicians"
      description="ARIbots AI is the clinical intelligence workspace: Ari answers with verified citations, nine clinical capabilities, voice, uploads and a doctor-only community."
    >
      <PageHero
        eyebrow="ARIbots AI"
        title={
          <>
            Think with the evidence,
            <br />
            <span className="text-[#75d4cf]">not around it.</span>
          </>
        }
        lede="Ari is a clinical assistant built by Dr. Chet Chea for licensed clinicians. Ask in plain language, attach a report or an image, speak instead of typing, and get an answer whose every claim shows where it came from."
        actions={
          <>
            <ActionLink href="/sign-in" testId="link-aribots-signin">Open ARIbots</ActionLink>
            <ActionLink href="/request-demo" variant="outline" testId="link-aribots-demo">Request a demo</ActionLink>
          </>
        }
        aside={<AribotMockup />}
      />
      <MeetAriSection />
      <PhysicianFeaturesSection />
      <CapabilitiesSection />
      <AudienceSection
        id="audience"
        title="Built for the people who sign the order"
        body="Ari tailors depth and terminology to the licence on the account. The safety gates do not change with the role."
        audiences={AUDIENCES}
      />
      <CommunitySection />
      <CtaBand
        title="Ask Ari your next question"
        body="Sign in with your clinician account, or walk through the workspace with our team first."
        primary={{ label: "Sign in to ARIbots", href: "/sign-in", testId: "link-aribots-cta-signin" }}
        secondary={{ label: "Request a demo", href: "/request-demo", testId: "link-aribots-cta-demo" }}
      />
    </SiteLayout>
  );
}
