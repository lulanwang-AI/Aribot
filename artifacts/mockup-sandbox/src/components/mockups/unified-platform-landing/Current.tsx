import {
  ArrowRight,
  Bot,
  ChevronRight,
  Menu,
  Shield,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import "./_group.css";

const navLinks = ["Home", "Applications", "Features", "Reviews", "Team", "FAQ", "Join the Community"];

function AriMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`upl-mark ${small ? "upl-mark--small" : ""}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function AssistantMockup() {
  return (
    <div className="upl-chat-shell">
      <div className="upl-chat">
        <div className="upl-chat-header">
          <span className="upl-window-controls"><i /><i /><i /></span>
          <span className="upl-chat-title"><AriMark small /> ARIbots — Clinical AI Assistant</span>
          <span className="upl-live"><i /> Live</span>
        </div>
        <div className="upl-messages">
          <div className="upl-message upl-message--user">
            <span>What's the latest evidence on SGLT2 inhibitors for HFpEF?</span>
            <b><Stethoscope /></b>
          </div>
          <div className="upl-message upl-message--assistant">
            <b><Bot /></b>
            <span>Recent trials including EMPEROR-Preserved show Empagliflozin reduces HF hospitalization by 21% in HFpEF patients. ACC/AHA 2022 guidelines now give a Class IIa recommendation.</span>
          </div>
          <div className="upl-message upl-message--user">
            <span>Any contraindications I should watch for?</span>
            <b><Stethoscope /></b>
          </div>
          <div className="upl-message upl-message--assistant">
            <b><Bot /></b>
            <span>Avoid in eGFR &lt;20, active UTI, or DKA. Monitor for genital mycotic infections and volume depletion, especially in elderly patients on loop diuretics.</span>
          </div>
        </div>
        <div className="upl-chat-input">
          <span>Ask a clinical question…</span>
          <button aria-label="Send question"><ChevronRight /></button>
        </div>
        <div className="upl-tags"><span>Evidence-based</span><span>HIPAA Safe</span><span>Specialist-reviewed</span></div>
      </div>
    </div>
  );
}

export function Current() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <main className="upl">
      <nav className="upl-nav">
        <div className="upl-nav-inner">
          <a href="#hero" className="upl-logo" aria-label="ARIbots home"><AriMark /></a>
          <div className="upl-nav-links">
            {navLinks.map((link) => <a key={link} href={`#${link.toLowerCase().replaceAll(" ", "-")}`}>{link}</a>)}
            <a href="#sign-in">Sign in</a>
            <a className="upl-demo-link" href="#demo">Book a product demo</a>
          </div>
          <div className="upl-mobile-actions">
            <a href="#demo">Book demo</a>
            <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
          </div>
        </div>
        {menuOpen && <div className="upl-mobile-menu">{navLinks.map((link) => <a key={link} href={`#${link.toLowerCase().replaceAll(" ", "-")}`} onClick={() => setMenuOpen(false)}>{link}</a>)}<a href="#sign-in">Sign in</a></div>}
      </nav>

      <section className="upl-hero" id="hero">
        <div className="upl-dots" aria-hidden="true" />
        <div className="upl-hero-inner">
          <div className="upl-copy">
            <div className="upl-eyebrow"><i /> Doctor-Powered Platform</div>
            <h1>Empowering<br />Medicine with <em>AI</em></h1>
            <p>The clinical AI community built by physicians, for physicians. Evidence-based answers, peer collaboration, and intelligent decision support — all in one place.</p>
            <div className="upl-hero-actions">
              <a className="upl-primary" href="#demo">Join the Community</a>
              <a className="upl-secondary" href="#how-it-works">See How It Works</a>
            </div>
            <div className="upl-trust">
              <div><strong>100%</strong><span>Identity Verified</span></div>
              <div><strong>HIPAA</strong><span>&amp; SOC 2 Compliant</span></div>
              <div><strong>Zero</strong><span>Pharma Influence</span></div>
            </div>
          </div>
          <AssistantMockup />
        </div>
      </section>

      <section className="upl-apps" id="applications">
        <div className="upl-apps-inner">
          <header>
            <small>ONE CLINICAL ECOSYSTEM</small>
            <h2>Choose the Ari application built for your workflow</h2>
            <p>ARIbots connects clinicians, Ari AMR supports antimicrobial stewardship, and Ari EMR brings patient records and imaging into a dedicated workspace.</p>
          </header>
          <div className="upl-app-grid">
            <Application icon={<Users />} eyebrow="Clinical community" name="ARIbots" text="The physician network and AI assistant for evidence-based answers, peer collaboration, news, triage, telemedicine, and professional groups." cta="Open ARIbots" />
            <Application icon={<Shield />} eyebrow="Antimicrobial stewardship" name="Ari AMR" text="The dedicated antimicrobial resistance workspace for case intake, antibiograms, formulary review, guidance, and clinical decision support." cta="Explore Ari AMR" />
            <Application icon={<Stethoscope />} eyebrow="Electronic medical record" name="Ari EMR" text="The clinician-facing patient record and imaging platform for charts, appointments, DICOM review, care operations, reporting, and billing." cta="Open Ari EMR" />
          </div>
        </div>
      </section>
    </main>
  );
}

function Application({ icon, eyebrow, name, text, cta }: { icon: ReactNode; eyebrow: string; name: string; text: string; cta: string }) {
  return <a href="#applications" className="upl-app-card">
    <div className="upl-app-card-top"><span className="upl-app-icon">{icon}</span><ArrowRight /></div>
    <small>{eyebrow}</small>
    <h3>{name}</h3>
    <p>{text}</p>
    <strong>{cta} <ArrowRight /></strong>
  </a>;
}