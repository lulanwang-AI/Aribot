import { ArrowRight, Brain, Database, Menu, Shield, Stethoscope, Users, X, type LucideIcon } from "lucide-react";
import { useState } from "react";

import "./_group.css";

const links = ["Home", "Applications", "Features", "Reviews", "Team", "FAQ", "Plan with Ari"];

function Mark() {
  return <span className="uup-mark" aria-hidden="true"><i /><i /><i /></span>;
}

type Stage = { name: string; label: string; color: string; detail: string; note: string; icon: LucideIcon };
const stages: Stage[] = [
  { name: "ARIbots", label: "Understand", icon: Brain, color: "#75d4cf", detail: "Patient context + evidence", note: "A complex case enters the system." },
  { name: "Ari AMR", label: "Steward", icon: Shield, color: "#eab55c", detail: "Resistance + therapy review", note: "The team checks risk, spectrum, and local patterns." },
  { name: "Ari EMR", label: "Carry forward", icon: Database, color: "#d99476", detail: "Record + continuity", note: "The decision and its context stay with the patient record." },
];

function SystemFlow() {
  const [active, setActive] = useState(1);
  const current = stages[active];
  const Icon = current.icon;
  return <div className="uup-flow">
    <div className="uup-flow-head"><span><Mark /><b><small>ARI PLATFORM</small>Clinical context, connected</b></span><em><i /> live system view</em></div>
    <div className="uup-flow-body">
      <div className="uup-stages">{stages.map((stage, index) => {
        const StageIcon = stage.icon;
        return <div className="uup-stage-wrap" key={stage.name}>
          <button className={active === index ? "active" : ""} onClick={() => setActive(index)} aria-label={`Show ${stage.name} workflow`}>
            <span style={{ color: stage.color }}><StageIcon /></span><b>{stage.name}<small>{stage.label}</small></b>
          </button>{index < 2 && <i className="uup-connector" />}
        </div>;
      })}</div>
      <div className="uup-current">
        <div><p style={{ color: current.color }}>{current.name} / {current.label}</p><h3>{current.detail}</h3></div><Icon style={{ color: current.color }} />
        <p className="uup-note">{current.note}</p>
        {["Context assembled", "Evidence and signals linked", "Next step ready for review"].map((item, index) => <div className="uup-step" key={item}><span style={{ color: current.color }}>0{index + 1}</span>{item}</div>)}
      </div>
      <div className="uup-thread">One patient thread <i /> Many care perspectives</div>
    </div>
  </div>;
}

const apps = [
  { name: "ARIbots", eyebrow: "Think with the evidence", text: "Clinical intelligence for the questions that move care forward: evidence synthesis, reasoning, collaboration, triage, and shared context for multidisciplinary teams.", cta: "Open ARIbots", icon: Users, color: "#75d4cf" },
  { name: "Ari AMR", eyebrow: "Protect the next decision", text: "A stewardship workspace for resistance surveillance, antibiograms, case review, formulary guidance, and responsible therapy decisions.", cta: "Explore Ari AMR", icon: Shield, color: "#eab55c" },
  { name: "Ari EMR", eyebrow: "Carry the story forward", text: "The operational record for patient charts, imaging, appointments, care operations, reporting, and billing—so the care story stays available beyond one encounter.", cta: "Open Ari EMR", icon: Stethoscope, color: "#d99476" },
];

export function UnifiedPlatform() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <main className="uup">
    <nav className="uup-nav"><div className="uup-nav-inner"><a href="#unified-hero"><Mark /></a><div className="uup-nav-links">{links.map(link => <a key={link} href="#applications">{link}</a>)}<a href="#sign-in">Sign in</a><a className="uup-book" href="#demo">Book a product demo</a></div><div className="uup-mobile"><a href="#demo">Book demo</a><button onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button></div></div>{menuOpen && <div className="uup-mobile-menu">{links.map(link => <a key={link} href="#applications" onClick={() => setMenuOpen(false)}>{link}</a>)}<a href="#sign-in">Sign in</a></div>}</nav>
    <section className="uup-hero" id="unified-hero"><div className="uup-hero-inner">
      <div className="uup-copy"><div className="uup-eyebrow"><i /> Connected clinical infrastructure</div><h1>One clinical<br />system. <span>Three ways in.</span></h1><p>Ari connects the context around care: clinical intelligence, antimicrobial stewardship, and the longitudinal patient record. Give every team the right workspace, with a shared thread from question to action to continuity.</p><div className="uup-actions"><a href="#applications">Explore the platform</a><a href="#whitepaper">Read the whitepaper</a></div><div className="uup-stats"><div><b>3</b><small>connected workspaces</small></div><div><b>1</b><small>shared patient thread</small></div><div><b>24/7</b><small>access to context</small></div></div></div>
      <SystemFlow />
    </div></section>
    <section className="uup-apps" id="applications"><div className="uup-apps-inner"><header><small>ONE ARI PLATFORM</small><h2>Three workspaces. One connected care operation.</h2><p>Start where your work lives today. Ari keeps intelligence, stewardship, and the medical record in conversation—without forcing every role into the same interface.</p></header><div className="uup-app-grid">{apps.map(app => { const AppIcon = app.icon; return <a className="uup-app" style={{ borderTopColor: app.color }} href="#applications" key={app.name}><div><span><AppIcon /></span><ArrowRight /></div><small>{app.eyebrow}</small><h3>{app.name}</h3><p>{app.text}</p><b>{app.cta} <ArrowRight /></b></a>; })}</div></div></section>
  </main>;
}