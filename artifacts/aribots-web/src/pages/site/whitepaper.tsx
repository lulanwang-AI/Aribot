import { useLocation } from "wouter";
import { ArrowLeft, Shield, Brain, FileText, FlaskConical, ChevronRight, Stethoscope, Pill, BookOpen, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/site/SiteLayout";

export default function Whitepaper() {
  const [, setLocation] = useLocation();

  return (
    <SiteLayout
      theme="dark"
      title="Technical white paper | ARIbots"
      description="The ARIbots technical white paper: clinical AI architecture, verification, safety gates and the three connected workspaces."
    >

      <div className="max-w-4xl mx-auto px-6 py-16">

        <div className="mb-14">
          <div className="inline-flex items-center gap-2 bg-[#4A90D9]/10 border border-[#4A90D9]/25 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#4A90D9] animate-pulse" />
            <span className="text-[#4A90D9] text-sm font-medium tracking-wide">Clinical AI Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold leading-[1.15] tracking-tight mb-6">
            From Probability to Certainty: Agentic AI Architecture for Clinical Decision Support
          </h1>
          <p className="text-white/55 text-lg leading-relaxed max-w-2xl">
            How multi-agent AI orchestration transforms clinical reasoning validation, complex case management, and healthcare documentation.
          </p>

          <div className="mt-8 p-5 rounded-xl bg-white/4 border border-white/8">
            <p className="text-white/70 text-sm leading-relaxed italic">
              <strong className="text-white/90 not-italic">Abstract —</strong> Clinical decision support systems have historically operated as passive reference tools — surfacing alerts and contraindication warnings without deeply engaging in the clinical reasoning process. While these systems reduce certain categories of preventable errors, they fail to address the exponentially growing complexity of modern medicine: multi-morbidity presentations, rare disease interactions, genomic-informed therapeutics, and cognitive burden on clinicians. This paper presents a fundamentally different paradigm: an agentic AI architecture purpose-built for clinical environments where standard pattern matching is insufficient, deploying specialized AI agents that independently validate clinical reasoning chains, cross-reference multi-modal data sources, and provide transparent audit trails for every recommendation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
          {[
            { value: "93%", label: "Clinical Approval Rate" },
            { value: "96%", label: "Alert Override Reduction" },
            { value: "12M+", label: "Annual Diagnostic Errors (US)" },
            { value: "4", label: "Specialized AI Agents" },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl bg-white/4 border border-white/8 text-center">
              <div className="text-2xl font-bold text-[#4A90D9]">{stat.value}</div>
              <div className="text-white/45 text-xs mt-1 leading-snug">{stat.label}</div>
            </div>
          ))}
        </div>

        <section className="mb-14">
          <SectionHeading number="1" title="The Problem: Why Traditional CDS Falls Short" />
          <p className="text-white/65 leading-relaxed mb-6">
            Modern clinical environments face an unprecedented convergence of challenges that legacy clinical decision support systems were never designed to handle.
          </p>
          <div className="space-y-4">
            {[
              {
                title: "Cognitive Overload",
                body: "The average hospitalist manages 15–20 inpatients simultaneously. Each patient generates approximately 100 new data points per day across labs, imaging, vitals, nursing notes, and specialist consultations. Traditional CDS provides alerts without context prioritization, contributing to a documented 96% alert override rate.",
              },
              {
                title: "Diagnostic Complexity",
                body: "Approximately 12 million Americans experience a diagnostic error annually (National Academy of Medicine, 2015). Complex cases involving rare diseases, atypical presentations, or multi-system involvement are particularly vulnerable — precisely where CDS could provide the most value.",
              },
              {
                title: "Therapeutic Contradiction",
                body: "Patients with multiple comorbidities frequently require medications or interventions that conflict. Consider anticoagulation management in a patient with triple-positive antiphospholipid syndrome and a history of heparin-induced thrombocytopenia — standard pathways are contraindicated, requiring nuanced expertise that basic CDS tools cannot provide.",
              },
              {
                title: "Information Fragmentation",
                body: "Critical clinical data exists across disparate systems — EHRs, PACS imaging, laboratory information systems, genomic databases, and external registries. No single physician can synthesize all relevant data for complex cases in real time.",
              },
              {
                title: "Alert Fatigue",
                body: "When 90%+ of alerts are overridden, the system has become noise rather than signal. High-sensitivity, low-specificity alerting actively degrades clinical decision-making rather than supporting it.",
              },
            ].map((item) => (
              <div key={item.title} className="p-5 rounded-xl bg-white/4 border border-white/8">
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <SectionHeading number="2" title="Architecture: Agentic Clinical Intelligence" />
          <p className="text-white/65 leading-relaxed mb-8">
            The architecture departs from the monolithic model approach that characterizes most healthcare AI systems. Instead, it employs a multi-agent orchestration framework where specialized AI agents collaborate to validate, cross-reference, and synthesize clinical information.
          </p>

          <h3 className="text-lg font-semibold text-white mb-4">2.1 Multi-Agent Orchestration Layer</h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {[
              {
                icon: Brain,
                title: "Diagnostic Reasoning Agent",
                body: "Evaluates differential diagnoses against presented evidence, identifies reasoning gaps, and suggests additional workup when the evidence base is insufficient.",
              },
              {
                icon: Pill,
                title: "Pharmacotherapy Agent",
                body: "Performs deep medication reconciliation across all active prescriptions, evaluates drug-drug interactions at the molecular pathway level, and validates dosing against renal/hepatic function parameters.",
              },
              {
                icon: BookOpen,
                title: "Evidence Synthesis Agent",
                body: "Continuously cross-references clinical decisions against current literature, clinical trials, and institutional protocols. Reasons about evidence quality and real-world applicability.",
              },
              {
                icon: ClipboardList,
                title: "Documentation Agent",
                body: "Generates compliant clinical documentation — SOAP notes, referral letters, discharge summaries — that accurately reflects the clinical reasoning process.",
              },
            ].map((agent) => (
              <div key={agent.title} className="p-5 rounded-xl bg-[#4A90D9]/6 border border-[#4A90D9]/18">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#4A90D9]/15 flex items-center justify-center">
                    <agent.icon className="w-4 h-4 text-[#4A90D9]" />
                  </div>
                  <h4 className="font-semibold text-white text-sm">{agent.title}</h4>
                </div>
                <p className="text-white/55 text-sm leading-relaxed">{agent.body}</p>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold text-white mb-4">2.2 Three-Stage Validation Pipeline</h3>
          <div className="space-y-3 mb-10">
            {[
              {
                stage: "Stage 1",
                label: "Internal Consistency Check",
                desc: "The recommendation is evaluated against the patient's complete clinical context for logical consistency.",
              },
              {
                stage: "Stage 2",
                label: "Evidence Grounding",
                desc: "Each factual claim in the recommendation is traced to its source evidence with confidence scoring.",
              },
              {
                stage: "Stage 3",
                label: "Safety Boundary Check",
                desc: "The recommendation is evaluated against known contraindications, black-box warnings, and institutional safety protocols.",
              },
            ].map((step, i) => (
              <div key={step.stage} className="flex gap-4 p-5 rounded-xl bg-white/4 border border-white/8 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4A90D9]/15 border border-[#4A90D9]/30 flex items-center justify-center text-[#4A90D9] font-bold text-sm">
                  {i + 1}
                </div>
                <div>
                  <div className="text-xs text-[#4A90D9] font-medium mb-0.5">{step.stage}</div>
                  <div className="font-semibold text-white text-sm mb-1">{step.label}</div>
                  <p className="text-white/55 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold text-white mb-3">2.3 Transparent Reasoning Chains</h3>
          <p className="text-white/65 leading-relaxed">
            Unlike "black box" AI systems, the architecture exposes its complete reasoning chain for every recommendation. Physicians can inspect why a particular diagnostic pathway was suggested, what evidence supports it, and what alternative approaches were considered and rejected. This transparency is essential for clinical trust and medicolegal defensibility.
          </p>
        </section>

        <section className="mb-14">
          <SectionHeading number="3" title="Clinical Validation Methodology" />

          <h3 className="text-lg font-semibold text-white mb-4">3.1 Five-Dimensional Evaluation Framework</h3>
          <p className="text-white/65 leading-relaxed mb-5">
            Clinical AI cannot be evaluated on accuracy alone. A five-dimensional evaluation framework ensures comprehensive quality assessment:
          </p>
          <div className="space-y-3 mb-10">
            {[
              { label: "Diagnostic Accuracy", desc: "Concordance between AI-suggested differentials and final confirmed diagnoses." },
              { label: "Therapeutic Appropriateness", desc: "Expert panel evaluation of medication and intervention recommendations." },
              { label: "Safety Profile", desc: "Rate of potentially harmful recommendations across all system outputs." },
              { label: "Reasoning Quality", desc: "Assessment of the logical chain connecting evidence to conclusion." },
              { label: "Clinical Utility", desc: "Measured by time-to-decision reduction and physician cognitive load surveys." },
            ].map((dim) => (
              <div key={dim.label} className="flex gap-3 items-start p-4 rounded-lg bg-white/4 border border-white/8">
                <ChevronRight className="w-4 h-4 text-[#4A90D9] mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-white text-sm">{dim.label}</span>
                  <span className="text-white/55 text-sm"> — {dim.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold text-white mb-4">3.2 Complex Case Validation</h3>
          <p className="text-white/65 leading-relaxed mb-4">
            Standard CDS validation often uses straightforward clinical scenarios. Validation specifically targets complex, multi-morbidity cases where traditional CDS is known to fail:
          </p>
          <ul className="space-y-2 mb-10">
            {[
              "Autoimmune overlap syndromes with contradictory treatment requirements",
              "Oncology patients with renal impairment requiring dose-adjusted chemotherapy",
              "Rare coagulopathies (e.g., APS with HIT history) requiring non-standard anticoagulation strategies",
              "Pediatric patients with adult-onset disease presentations",
              "Polypharmacy patients (10+ concurrent medications) with emergent surgical needs",
            ].map((item) => (
              <li key={item} className="flex gap-3 items-start text-white/60 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4A90D9] mt-2 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          <h3 className="text-lg font-semibold text-white mb-3">3.3 Continuous Learning with Safety Rails</h3>
          <p className="text-white/65 leading-relaxed">
            Agents improve through physician feedback loops, but all learning is constrained by safety boundaries. No model update can relax contraindication rules, reduce safety check stringency, or modify regulatory compliance parameters. System improvement never compromises patient safety.
          </p>
        </section>

        <section className="mb-14">
          <SectionHeading number="4" title="Case Study: Complex Anticoagulation Management" />

          <div className="p-6 rounded-xl bg-white/4 border border-white/8 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="w-4 h-4 text-[#4A90D9]" />
              <span className="text-[#4A90D9] text-sm font-medium">Representative Case</span>
            </div>
            <p className="text-white/75 text-sm leading-relaxed">
              <strong className="text-white">Patient Profile:</strong> 62-year-old female presenting with acute left lower extremity deep vein thrombosis. Medical history significant for triple-positive antiphospholipid syndrome (APS), Factor V Leiden heterozygosity, and prior episode of heparin-induced thrombocytopenia (HIT).
            </p>
          </div>

          <h3 className="text-base font-semibold text-white mb-3">Clinical Challenge</h3>
          <p className="text-white/65 leading-relaxed mb-4">
            This patient requires therapeutic anticoagulation, but the standard pathways are systematically contraindicated:
          </p>
          <div className="space-y-2 mb-8">
            {[
              { drug: "Heparin / Enoxaparin", reason: "Contraindicated due to HIT history" },
              { drug: "Direct oral anticoagulants (DOACs)", reason: "Contraindicated in triple-positive APS per TRAPS trial data showing increased thrombotic events" },
              { drug: "Standard warfarin bridging", reason: "Requires heparin bridging, which is contraindicated" },
            ].map((item) => (
              <div key={item.drug} className="flex gap-3 items-start p-3 rounded-lg bg-red-500/8 border border-red-500/18">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold text-white">{item.drug}</span>
                  <span className="text-white/55"> — {item.reason}</span>
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-base font-semibold text-white mb-3">Multi-Agent Response</h3>
          <p className="text-white/65 leading-relaxed mb-4">
            The Pharmacotherapy Agent identified fondaparinux as the appropriate bridging anticoagulant — a synthetic Factor Xa inhibitor with negligible HIT cross-reactivity. The Evidence Synthesis Agent confirmed this recommendation against current ASH guidelines and institutional protocols. The system recommended:
          </p>
          <div className="space-y-2 mb-6">
            {[
              "Fondaparinux 7.5mg subcutaneous daily for acute bridging",
              "Transition to warfarin with an INR target of 2.5–3.5 (elevated target appropriate for triple-positive APS)",
              "Hydroxychloroquine 200mg daily as adjunctive therapy for APS",
              "Serial anti-Xa monitoring during the bridging period",
            ].map((rec) => (
              <div key={rec} className="flex gap-3 items-start p-3 rounded-lg bg-green-500/8 border border-green-500/18">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                <span className="text-white/70 text-sm">{rec}</span>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-xl bg-[#4A90D9]/8 border border-[#4A90D9]/20">
            <p className="text-white/75 text-sm leading-relaxed">
              <strong className="text-white">Outcome:</strong> A traditional CDS system would have flagged the DVT for anticoagulation and potentially issued a contraindication alert for heparin, but would not have navigated the complex pharmacologic decision tree to arrive at the fondaparinux bridging strategy. The multi-agent approach provided the treating physician with a validated, evidence-based treatment plan within minutes.
            </p>
          </div>
        </section>

        <section className="mb-14">
          <SectionHeading number="5" title="Regulatory & Compliance Framework" />
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: Shield,
                title: "HIPAA Compliance",
                body: "All patient data is encrypted at rest (AES-256) and in transit (TLS 1.3). AI inference operates within HIPAA-compliant compute environments. No patient data leaves institutional infrastructure.",
              },
              {
                icon: FlaskConical,
                title: "SOC 2 Type II Certified",
                body: "Infrastructure undergoes continuous SOC 2 Type II auditing, covering security, availability, processing integrity, confidentiality, and privacy trust service criteria.",
              },
              {
                icon: FileText,
                title: "FDA Regulatory Pathway",
                body: "Positioned as a clinical decision support tool under the 21st Century Cures Act — supporting rather than replacing physician decision-making. All recommendations are advisory with full reasoning transparency.",
              },
              {
                icon: ClipboardList,
                title: "Immutable Audit Trail",
                body: "Every interaction, recommendation, and physician response is logged with immutable timestamps, providing complete medicolegal defensibility and supporting institutional quality improvement.",
              },
            ].map((item) => (
              <div key={item.title} className="p-5 rounded-xl bg-white/4 border border-white/8">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#4A90D9]/12 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-[#4A90D9]" />
                  </div>
                  <h4 className="font-semibold text-white text-sm">{item.title}</h4>
                </div>
                <p className="text-white/55 text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
          <p className="text-white/55 text-sm leading-relaxed mt-6">
            <strong className="text-white/80">EHR Integration:</strong> Standard HL7 FHIR interfaces ensure compatibility with Epic, Cerner, MEDITECH, and other major platforms without requiring custom integration work.
          </p>
        </section>

        <section className="mb-14">
          <SectionHeading number="6" title="Future Directions" />
          <div className="space-y-4">
            {[
              {
                title: "Genomic Integration",
                body: "Deep integration with pharmacogenomic databases to provide patient-specific drug metabolism predictions, enabling truly personalized therapeutic recommendations.",
              },
              {
                title: "Imaging AI Synthesis",
                body: "Integration with radiology AI models to incorporate imaging findings directly into the clinical reasoning chain, moving beyond text-based radiology report parsing.",
              },
              {
                title: "Multi-Institutional Federated Learning",
                body: "Federated learning across institutional deployments, enabling the system to learn from diverse patient populations while maintaining strict data privacy boundaries. No raw patient data crosses institutional boundaries — only model weight updates that have passed differential privacy audits.",
              },
              {
                title: "Specialty Expansion",
                body: "Extension of specialty-specific agent configurations to cover all major medical specialties, including rare disease panels, transplant medicine, and complex surgical planning.",
              },
              {
                title: "Real-Time Clinical Trial Matching",
                body: "Automated identification of patients who meet eligibility criteria for active clinical trials, with AI-assisted consent documentation and regulatory compliance tracking.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-5 rounded-xl bg-white/4 border border-white/8">
                <ChevronRight className="w-4 h-4 text-[#4A90D9] mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">{item.title}</h4>
                  <p className="text-white/55 text-sm leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <SectionHeading number="7" title="Conclusion" />
          <div className="space-y-4 text-white/65 leading-relaxed">
            <p>
              The gap between what clinical decision support promises and what it delivers has persisted for decades. Alert fatigue, cognitive overload, and diagnostic complexity continue to challenge healthcare delivery despite billions invested in health IT infrastructure.
            </p>
            <p>
              The agentic AI architecture presented here represents a paradigm shift: from passive alerting to active clinical reasoning support. By deploying specialized AI agents that validate reasoning chains, synthesize multi-modal evidence, and provide transparent audit trails, this approach addresses the fundamental limitations of traditional CDS.
            </p>
            <p>
              Early deployment data demonstrates a 93% clinical approval rate — evidence that the system's recommendations align with expert physician judgment while adding measurable value in complex clinical scenarios.
            </p>
            <p>
              The path from probability to certainty in clinical AI requires more than larger models or more training data. It requires an architecture that mirrors the collaborative, multi-specialty reasoning process that defines excellent clinical care.
            </p>
          </div>
        </section>

        <div className="rounded-2xl bg-gradient-to-br from-[#4A90D9]/12 to-[#4A90D9]/4 border border-[#4A90D9]/25 p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to Transform Clinical Workflows?</h2>
          <p className="text-white/55 mb-6 max-w-md mx-auto text-sm leading-relaxed">
            See how ARI integrates with your institution's clinical infrastructure and supports your physicians in real time.
          </p>
          <Button
            onClick={() => setLocation("/")}
            className="bg-[#4A90D9] text-white hover:bg-[#5BA0E9] font-semibold px-8 py-5 text-base rounded-xl"
            data-testid="button-cta-join"
          >
            Join the Community
          </Button>
        </div>

      </div>
    </SiteLayout>
  );
}

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#4A90D9]/15 border border-[#4A90D9]/25 flex items-center justify-center text-[#4A90D9] font-bold text-sm">
        {number}
      </div>
      <h2 className="text-2xl font-bold text-white pt-0.5">{title}</h2>
    </div>
  );
}
