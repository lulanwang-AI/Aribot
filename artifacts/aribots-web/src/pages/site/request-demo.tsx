import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHero } from "@/components/site/PageBlocks";
import { DemoFormSection } from "@/components/site/sections";

export default function RequestDemoPage() {
  return (
    <SiteLayout
      title="Request a demo | ARIbots"
      description="Request a walkthrough of ARIbots AI, Ari AMR or Ari EMR with a clinician on our team. Verified physicians and medical students welcome."
    >
      <PageHero
        eyebrow="Request a demo"
        title={
          <>
            See Ari on
            <br />
            <span className="text-[#75d4cf]">your own workflows.</span>
          </>
        }
        lede="Tell us who you are and what your service handles. A clinician on our team will walk you through the workspace that fits, using your kinds of questions, antibiograms and chart work."
      />
      <DemoFormSection />
    </SiteLayout>
  );
}
