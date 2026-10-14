import { SiteLayout } from "@/components/site/SiteLayout";
import { ActionLink, CtaBand, PageHero } from "@/components/site/PageBlocks";
import { FaqSection, OurVisionSection, TeamSection } from "@/components/site/sections";

export default function AboutPage() {
  return (
    <SiteLayout
      title="About | ARIbots"
      description="ARIbots is built by physicians for physicians: our vision, the team behind Ari, and answers to the questions clinicians ask us most."
    >
      <PageHero
        eyebrow="About ARIbots"
        title={
          <>
            Built by physicians,
            <br />
            <span className="text-[#75d4cf]">for physicians.</span>
          </>
        }
        lede="Ari started as a clinical question tool for an infectious disease practice. It grew into a platform because the questions never stop at the answer: they continue into the prescription, the record and the next encounter."
        actions={
          <>
            <ActionLink href="/request-demo" testId="link-about-demo">Talk to the team</ActionLink>
            <ActionLink href="/whitepaper" variant="outline" testId="link-about-whitepaper">Read the whitepaper</ActionLink>
          </>
        }
      />
      <OurVisionSection />
      <TeamSection />
      <FaqSection />
      <CtaBand
        title="Still have a question?"
        body="Clinicians, pharmacy leaders and compliance teams all ask different things. Send us yours."
        primary={{ label: "Request a demo", href: "/request-demo", testId: "link-about-cta-demo" }}
        secondary={{ label: "Security and compliance", href: "/security", testId: "link-about-cta-security" }}
      />
    </SiteLayout>
  );
}
