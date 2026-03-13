import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertDemoRequestSchema, type InsertDemoRequest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Zap,
  Brain,
  Shield,
  Stethoscope,
  Activity,
  FileSearch,
  Pill,
  TrendingUp,
  MessageSquare,
  BarChart3,
  Database,
  Lock,
  Users,
  Lightbulb,
  Cpu,
  ChevronDown,
  Menu,
  X,
  Star,
  Globe,
  BookOpen,
  FileText,
  FlaskConical,
  Scale,
  ChevronRight,
  Bot,
  User,
  AlertTriangle,
  Heart,
} from "lucide-react";
import { Link } from "wouter";
import aribotLogoPath from "@assets/20260226140824_1772181173123.png";
import heroDoctorsImg from "@assets/hero-doctors-connect.png";
import teamChetChea from "@assets/team-chet-chea.jpg";
import teamDanaNguyen from "@assets/team-dana-nguyen.jpg";
import teamBrittaDenman from "@assets/team-britta-denman.png";
import teamOsas from "@assets/team-osas.jpg";
import teamAnupam from "@assets/team-anupam.jpg";
import teamMichaelStewart from "@assets/team-michael-stewart.png";
import teamDoherty from "@assets/team-doherty.jpg";
import teamCranshaw from "@assets/team-cranshaw.jpg";
import teamCollinsworth from "@assets/team-collinsworth.jpg";
import teamBlair from "@assets/team-blair.png";
import featureNlpImg from "@assets/feature-nlp.png";
import featurePredictiveImg from "@assets/feature-predictive.png";
import featureEhrImg from "@assets/feature-ehr.png";
import featureSecurityImg from "@assets/feature-security.png";

function DotsCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let nodes: { x: number; y: number; vx: number; vy: number }[] = [];

    function resize() {
      if (!canvas || !ctx) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    function initNodes() {
      if (!canvas) return;
      const count = Math.min(50, Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 12000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      }));
    }

    function animate() {
      if (!canvas || !ctx) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      });

      const maxDist = 140;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.15;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(74,144,217,${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(74,144,217,0.4)";
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    }

    function handleResize() { resize(); initNodes(); }

    resize();
    initNodes();
    animate();
    window.addEventListener("resize", handleResize);
    return () => { cancelAnimationFrame(animationId); window.removeEventListener("resize", handleResize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" data-testid="canvas-dots" />;
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, isVisible };
}

function AnimatedCounter({ target, label, suffix = "" }: { target: number; label: string; suffix?: string }) {
  const { ref, isVisible } = useInView();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    let start = 0;
    const duration = 2000;
    const startTime = performance.now();
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.floor(eased * target);
      setCount(start);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [isVisible, target]);

  return (
    <div ref={ref} className="text-center" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="text-4xl md:text-5xl font-bold text-[#4A90D9]">
        {count}{suffix}
      </div>
      <div className="text-white/70 mt-2 text-sm">{label}</div>
    </div>
  );
}

function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  function scrollTo(id: string) {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  const links = [
    { label: "Home", id: "hero" },
    { label: "Features", id: "capabilities" },
    { label: "Reviews", id: "testimonials" },
    { label: "Team", id: "team" },
    { label: "FAQ", id: "faq" },
    { label: "Join the Community", id: "demo" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#111]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <button
          onClick={() => scrollTo("hero")}
          className="flex items-center gap-3"
          data-testid="link-navbar-logo"
        >
          <div className="relative w-10 h-10">
            <svg viewBox="0 0 40 40" className="w-10 h-10">
              <polygon
                points="20,2 36,11 36,29 20,38 4,29 4,11"
                fill="none"
                stroke="#4A90D9"
                strokeWidth="2"
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center text-[#4A90D9] text-[8px] font-bold leading-tight">
              <span>ARI</span>
              <span>bots</span>
            </span>
          </div>
        </button>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <button
              key={l.label}
              onClick={() => scrollTo(l.id)}
              className="text-sm text-white/80 hover:text-[#4A90D9] transition-colors"
              data-testid={`link-nav-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {l.label}
            </button>
          ))}
          <Link
            href="/"
            className="text-sm font-semibold px-5 py-2 bg-[#4A90D9] text-white rounded-full hover:bg-[#5BA0E9] transition-colors"
            data-testid="link-nav-login"
          >
            Login
          </Link>
        </div>

        <div className="md:hidden flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-semibold px-4 py-1.5 bg-[#4A90D9] text-white rounded-full hover:bg-[#5BA0E9] transition-colors"
            data-testid="link-mobile-login"
          >
            Login
          </Link>
          <button
            className="text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#111]/95 border-t border-white/10 px-4 pb-4">
          {links.map((l) => (
            <button
              key={l.label}
              onClick={() => scrollTo(l.id)}
              className="block w-full text-left py-3 text-white/80 hover:text-[#4A90D9] transition-colors text-sm"
              data-testid={`link-mobile-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}

function AribotMockup() {
  const messages = [
    { role: "user", text: "What's the latest evidence on SGLT2 inhibitors for HFpEF?" },
    { role: "assistant", text: "Recent trials including EMPEROR-Preserved show Empagliflozin reduces HF hospitalization by 21% in HFpEF patients. ACC/AHA 2022 guidelines now give a Class IIa recommendation. Key benefit appears independent of ejection fraction." },
    { role: "user", text: "Any contraindications I should watch for?" },
    { role: "assistant", text: "Avoid in eGFR <20, active UTI, or DKA. Monitor for genital mycotic infections and volume depletion, especially in elderly patients on loop diuretics." },
  ];

  return (
    <div className="relative w-full max-w-[520px] mx-auto">
      <div
        className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
        style={{ background: "linear-gradient(135deg, #181c24 0%, #1a1f2e 100%)" }}
        data-testid="mockup-aribot"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#13161d]">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex items-center gap-2 ml-3">
            <img src={aribotLogoPath} alt="ARIbots" className="w-5 h-5 object-contain" />
            <span className="text-white/70 text-xs font-medium tracking-wide">ARIbots — Clinical AI Assistant</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-[10px] font-medium">Live</span>
          </div>
        </div>

        <div className="p-4 space-y-3 h-[340px] overflow-hidden">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-[#4A90D9]/20 border border-[#4A90D9]/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-[#4A90D9]" />
                </div>
              )}
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Stethoscope className="w-3.5 h-3.5 text-white/70" />
                </div>
              )}
              <div
                className={`rounded-xl px-3 py-2 text-xs leading-relaxed max-w-[78%] ${
                  msg.role === "user"
                    ? "bg-[#4A90D9]/20 border border-[#4A90D9]/30 text-white/90 text-right"
                    : "bg-white/5 border border-white/10 text-white/80"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#4A90D9]/20 border border-[#4A90D9]/40 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-[#4A90D9]" />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A90D9] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A90D9] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A90D9] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
            <input
              readOnly
              value="Ask a clinical question…"
              className="flex-1 bg-transparent text-white/30 text-xs outline-none cursor-default"
            />
            <div className="w-6 h-6 rounded-lg bg-[#4A90D9] flex items-center justify-center">
              <ChevronRight className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div className="flex gap-2 mt-2.5 flex-wrap">
            {["Evidence-based", "HIPAA Safe", "Specialist-reviewed"].map((tag) => (
              <span key={tag} className="text-[9px] bg-[#4A90D9]/10 border border-[#4A90D9]/20 text-[#4A90D9]/80 rounded-full px-2 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute -inset-px rounded-2xl pointer-events-none"
        style={{ boxShadow: "0 0 60px rgba(74,144,217,0.12), 0 0 120px rgba(74,144,217,0.06)" }} />
    </div>
  );
}

function HeroSection() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-[#0e1117]" />
      <DotsCanvas />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-screen lg:min-h-0 lg:py-32">

          <div className="flex flex-col justify-center order-1 lg:order-1">
            <div className="inline-flex items-center gap-2 bg-[#4A90D9]/10 border border-[#4A90D9]/25 rounded-full px-4 py-1.5 mb-8 w-fit">
              <span className="w-2 h-2 rounded-full bg-[#4A90D9] animate-pulse" />
              <span className="text-[#4A90D9] text-sm font-medium tracking-wide">Doctor-Only Platform</span>
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]"
              data-testid="text-hero-headline"
            >
              Empowering
              <br />
              Medicine with{" "}
              <span className="text-[#4A90D9]">AI</span>
            </h1>

            <p className="mt-6 text-lg text-white/60 leading-relaxed max-w-md" data-testid="text-hero-tagline">
              The clinical AI community built by physicians, for physicians. Evidence-based answers, peer collaboration, and intelligent decision support — all in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-10">
              <Button
                onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
                className="bg-[#4A90D9] text-white hover:bg-[#5BA0E9] font-semibold px-8 py-6 text-base rounded-xl"
                data-testid="button-hero-cta"
              >
                Join the Community
              </Button>
              <Button
                onClick={() => document.getElementById("capabilities")?.scrollIntoView({ behavior: "smooth" })}
                variant="outline"
                className="border-white/20 text-white/80 hover:bg-white/5 hover:border-white/30 font-medium px-8 py-6 text-base rounded-xl bg-transparent"
                data-testid="button-hero-learn"
              >
                See How It Works
              </Button>
            </div>

            <div className="flex items-center gap-6 mt-10 pt-10 border-t border-white/8">
              {[
                { value: "10K+", label: "Physicians" },
                { value: "50+", label: "Specialties" },
                { value: "HIPAA", label: "Compliant" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-xl font-bold text-[#4A90D9]">{stat.value}</div>
                  <div className="text-white/40 text-xs mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center order-2 lg:order-2">
            <AribotMockup />
          </div>

        </div>
      </div>
    </section>
  );
}

function MeetAriSection() {
  const { ref, isVisible } = useInView();
  const features = [
    {
      icon: Zap,
      title: "EFFICIENT",
      description: "Optimize clinical outcomes and healthcare efficiency. Designed by clinicians for clinicians to streamline every step of the care process.",
    },
    {
      icon: Brain,
      title: "SMART",
      description: "Deliver prompt, accurate treatment with AI-powered clinical decision support. Leverage real-time data analysis for better patient outcomes.",
    },
    {
      icon: Shield,
      title: "SECURE",
      description: "HIPAA-compliant data security ensuring patient information is protected at every level. Built with enterprise-grade encryption and access controls.",
    },
  ];

  return (
    <section id="meet-ari" className="py-24 bg-[#1a1a1a]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4" data-testid="text-meet-ari-title">
          meet <span className="text-[#4A90D9]">ARI</span>
        </h2>
        <div
          ref={ref}
          className={`grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group bg-[#222] border border-white/10 rounded-2xl p-8 hover:border-[#4A90D9]/50 transition-all duration-500 hover:-translate-y-1"
              style={{ transitionDelay: `${i * 150}ms` }}
              data-testid={`card-feature-${f.title.toLowerCase()}`}
            >
              <div className="w-14 h-14 rounded-xl bg-[#4A90D9]/10 flex items-center justify-center mb-6 group-hover:bg-[#4A90D9]/20 transition-colors">
                <f.icon className="w-7 h-7 text-[#4A90D9]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
              <p className="text-white/60 leading-relaxed text-sm">{f.description}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-20">
          <AnimatedCounter target={40} suffix="%" label="Reduce mortality rates" />
          <AnimatedCounter target={30} suffix="%" label="Shorten hospital stays" />
          <AnimatedCounter target={25} suffix="%" label="Lower healthcare costs" />
        </div>
      </div>
    </section>
  );
}

function HowAriWorksSection() {
  const { ref, isVisible } = useInView();
  const [activeTab, setActiveTab] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const CYCLE_MS = 5000;

  useEffect(() => {
    if (paused) return;
    const start = performance.now();
    let rafId: number;
    function tick(now: number) {
      const elapsed = ((now - start) % CYCLE_MS) / CYCLE_MS;
      setProgress(elapsed * 100);
      if (now - start >= CYCLE_MS) {
        setActiveTab((t) => (t + 1) % 5);
        return;
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [activeTab, paused]);

  const scenarios = [
    {
      icon: Stethoscope,
      tabLabel: "Clinical Decision Support",
      step: "Step 1",
      description: "ARI analyzes patient data in real-time, providing evidence-based clinical recommendations to support physician decision-making at the point of care.",
      doctor: "Dr. Chen",
      query: "65-year-old male presenting with acute chest pain, elevated troponin (0.8 ng/mL), ST depression in leads V4-V6. History of type 2 diabetes and hypertension. What's the recommended workup and initial management?",
      ariLabel: "Based on ACC/AHA Guidelines",
      ariSummary: "This presentation is consistent with NSTEMI. Recommended initial management:",
      ariHighlight: "NSTEMI",
      ariPoints: [
        { icon: Heart, title: "Dual antiplatelet therapy", detail: "Aspirin 325mg + P2Y12 inhibitor (ticagrelor preferred given diabetes)" },
        { icon: Activity, title: "Anticoagulation", detail: "Enoxaparin or UFH per institutional protocol" },
        { icon: Stethoscope, title: "Cardiology consult", detail: "For early invasive strategy (cath within 24h per GRACE score)" },
      ],
      sources: "ACC/AHA 2024 NSTEMI Guidelines, UpToDate, Cochrane Reviews",
    },
    {
      icon: Activity,
      tabLabel: "Real-Time Triage",
      step: "Step 2",
      description: "Instant severity scoring and prioritization of patients based on presenting symptoms, vital signs, and clinical indicators for optimal resource allocation.",
      doctor: "Dr. Rodriguez",
      query: "Multiple trauma patients arriving from a motor vehicle accident. Patient A: GCS 8, BP 85/60, HR 130. Patient B: GCS 14, open fracture right tibia. Patient C: GCS 15, mild whiplash. Prioritize and assign acuity levels.",
      ariLabel: "Based on ESI Triage Algorithm",
      ariSummary: "Triage assessment complete. Priority ranking:",
      ariHighlight: "ESI Level 1",
      ariPoints: [
        { icon: AlertTriangle, title: "Patient A — ESI Level 1 (Critical)", detail: "Hemodynamic instability, altered consciousness. Immediate resuscitation bay, activate trauma team." },
        { icon: Activity, title: "Patient B — ESI Level 2 (Emergent)", detail: "Open fracture requires urgent orthopedic intervention. Assess neurovascular status, IV antibiotics." },
        { icon: Stethoscope, title: "Patient C — ESI Level 4 (Less Urgent)", detail: "Stable vitals, minor injury. Cervical spine clearance, analgesia, discharge with follow-up." },
      ],
      sources: "ESI Triage Handbook v4, ATLS 10th Edition, WHO Emergency Care Guidelines",
    },
    {
      icon: FileSearch,
      tabLabel: "Differential Diagnosis",
      step: "Step 3",
      description: "AI-powered analysis generates comprehensive differential diagnoses ranked by probability, helping physicians explore all possibilities efficiently.",
      doctor: "Dr. Patel",
      query: "32-year-old female with 3-week history of fatigue, unintentional weight loss (8 lbs), night sweats, and a persistent dry cough. CBC shows lymphocytopenia. Chest X-ray reveals bilateral hilar lymphadenopathy. Generate differential diagnoses.",
      ariLabel: "Based on Clinical Pattern Analysis",
      ariSummary: "Differential diagnoses ranked by probability:",
      ariHighlight: "Sarcoidosis",
      ariPoints: [
        { icon: FileSearch, title: "Sarcoidosis (72% probability)", detail: "Bilateral hilar lymphadenopathy with systemic symptoms in young female is classic. Recommend ACE level, calcium, and biopsy." },
        { icon: FileSearch, title: "Lymphoma (18% probability)", detail: "B-symptoms present. Consider LDH, flow cytometry, and CT chest/abdomen/pelvis for staging." },
        { icon: FileSearch, title: "Tuberculosis (7% probability)", detail: "Night sweats and lymphadenopathy overlap. Recommend QuantiFERON-TB Gold and sputum AFB." },
      ],
      sources: "UpToDate, NICE Guidelines, Cochrane Systematic Reviews",
    },
    {
      icon: Pill,
      tabLabel: "Treatment Plans",
      step: "Step 4",
      description: "Recommendations grounded in the latest medical literature, clinical guidelines, and institutional protocols for personalized treatment strategies.",
      doctor: "Dr. Nakamura",
      query: "55-year-old male with newly diagnosed type 2 diabetes, HbA1c 8.2%, BMI 34, eGFR 62 mL/min, and known heart failure with reduced EF (35%). Recommend first-line therapy considering comorbidities.",
      ariLabel: "Based on ADA Standards of Care 2024",
      ariSummary: "Tailored treatment plan considering cardiac and renal comorbidities:",
      ariHighlight: "SGLT2i + Metformin",
      ariPoints: [
        { icon: Pill, title: "SGLT2 inhibitor (empagliflozin 10mg)", detail: "First-line for HFrEF + CKD benefit. Proven cardiovascular and renal protection (EMPEROR-Reduced)." },
        { icon: Pill, title: "Metformin 500mg BID (titrate)", detail: "Safe at eGFR > 30. Start low given renal function. Monitor B12 annually." },
        { icon: AlertTriangle, title: "Avoid: TZDs, sulfonylureas", detail: "TZDs contraindicated in HF. Sulfonylureas increase hypoglycemia risk and weight gain." },
      ],
      sources: "ADA Standards of Care 2024, KDIGO CKD Guidelines, ESC Heart Failure Guidelines",
    },
    {
      icon: TrendingUp,
      tabLabel: "Learning from Outcomes",
      step: "Step 5",
      description: "ARI continuously improves by learning from real clinical outcomes, refining its algorithms to deliver increasingly accurate and relevant insights.",
      doctor: "Dr. Thompson",
      query: "Review outcomes from the last 30 days for sepsis protocol adherence in the ICU. Show me where ARI's recommendations diverged from actual physician decisions and the resulting patient outcomes.",
      ariLabel: "Based on Outcomes Analytics Engine",
      ariSummary: "30-day ICU sepsis outcomes review:",
      ariHighlight: "87% concordance",
      ariPoints: [
        { icon: TrendingUp, title: "Protocol adherence: 92% (+4% from prior month)", detail: "ARI-guided antibiotic escalation timing improved from 3.2h to 1.8h average." },
        { icon: BarChart3, title: "Mortality reduction: 18% → 14%", detail: "Cases following ARI vasopressor recommendations showed improved MAP stabilization." },
        { icon: Lightbulb, title: "Model update: Lactate threshold refined", detail: "Based on 847 outcomes, ARI adjusted lactate clearance threshold from 2.0 to 1.8 mmol/L." },
      ],
      sources: "Institutional Outcomes Database, Surviving Sepsis Campaign 2024, Meta-Analysis Pool",
    },
  ];

  const active = scenarios[activeTab];

  return (
    <section id="how-it-works" className="py-24 bg-[#111]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4" data-testid="text-how-works-title">
          How <span className="text-[#4A90D9]">ARI</span> Works
        </h2>
        <p className="text-center text-white/50 mb-12 max-w-2xl mx-auto">
          See ARI's AI-powered clinical workflow in action across real scenarios
        </p>

        <div ref={ref} className={`transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>

          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {scenarios.map((s, i) => (
              <button
                key={i}
                onClick={() => { setActiveTab(i); setPaused(true); }}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden ${
                  activeTab === i
                    ? "bg-[#4A90D9] text-white shadow-[0_0_20px_rgba(74,144,217,0.3)]"
                    : "bg-[#1a1a1a] text-white/60 border border-white/10 hover:border-[#4A90D9]/40 hover:text-white"
                }`}
                data-testid={`tab-step-${i + 1}`}
              >
                {activeTab === i && !paused && (
                  <span
                    className="absolute bottom-0 left-0 h-0.5 bg-white/40 transition-none"
                    style={{ width: `${progress}%` }}
                  />
                )}
                <s.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{s.tabLabel}</span>
                <span className="sm:hidden">{s.step}</span>
              </button>
            ))}
            {paused && (
              <button
                onClick={() => setPaused(false)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs text-white/40 border border-white/10 hover:text-white/70 transition-colors"
                data-testid="button-resume-cycle"
              >
                <Activity className="w-3.5 h-3.5" /> Auto
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div
              key={`desc-${activeTab}`}
              className="lg:col-span-2 bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 animate-[fadeSlideUp_0.4s_ease-out]"
              data-testid={`step-${activeTab + 1}`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-full bg-[#4A90D9]/15 border border-[#4A90D9]/30 flex items-center justify-center">
                  <active.icon className="w-5 h-5 text-[#4A90D9]" />
                </div>
                <div>
                  <span className="text-[#4A90D9] text-[10px] font-bold uppercase tracking-widest block">{active.step} of 5</span>
                  <h3 className="text-base font-semibold text-white leading-tight">{active.tabLabel}</h3>
                </div>
              </div>
              <p className="text-white/55 text-sm leading-relaxed">{active.description}</p>

              <div className="flex gap-1.5 mt-8">
                {scenarios.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveTab(i); setPaused(true); }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      activeTab === i ? "bg-[#4A90D9] w-6" : "bg-white/15 w-3 hover:bg-white/30"
                    }`}
                    data-testid={`dot-step-${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-3 bg-[#1a1a1a] border-b border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-white/40 text-xs ml-2 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" /> ARI Clinical Assistant
                  </span>
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-[#4A90D9]/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4A90D9] animate-pulse" />
                    {active.ariHighlight}
                  </span>
                </div>

                <div className="p-5 space-y-4 min-h-[320px]" key={activeTab} data-testid="card-platform-snapshot">
                  <div className="flex gap-3 justify-end animate-[fadeSlideUp_0.35s_ease-out]">
                    <div className="max-w-[85%] bg-[#4A90D9]/10 border border-[#4A90D9]/20 rounded-2xl rounded-tr-sm px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3.5 h-3.5 text-[#4A90D9]" />
                        <span className="text-[#4A90D9] text-xs font-medium">{active.doctor}</span>
                      </div>
                      <p className="text-white/80 text-sm">{active.query}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 animate-[fadeSlideUp_0.45s_ease-out_0.15s_both]">
                    <div className="max-w-[90%] bg-[#1a1a1a] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-3.5 h-3.5 text-[#4A90D9]" />
                        <span className="text-[#4A90D9] text-xs font-medium">ARI</span>
                        <span className="text-white/30 text-xs">· {active.ariLabel}</span>
                      </div>
                      <p className="text-white/80 text-sm mb-3">{active.ariSummary}</p>
                      <div className="space-y-2.5 text-sm text-white/70">
                        {active.ariPoints.map((pt, j) => (
                          <div
                            key={j}
                            className="flex items-start gap-2 animate-[fadeSlideUp_0.4s_ease-out_both]"
                            style={{ animationDelay: `${0.3 + j * 0.18}s` }}
                          >
                            <div className="w-5 h-5 rounded-md bg-[#4A90D9]/15 flex items-center justify-center shrink-0 mt-0.5">
                              <pt.icon className="w-3 h-3 text-[#4A90D9]" />
                            </div>
                            <span><span className="text-white/90 font-medium">{pt.title}</span> — {pt.detail}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-xs text-white/25 animate-[fadeSlideUp_0.4s_ease-out_0.7s_both]">
                        <FileText className="w-3 h-3 shrink-0" />
                        <span>{active.sources}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}

function OurVisionSection() {
  const { ref, isVisible } = useInView();
  const cards = [
    {
      icon: Lightbulb,
      title: "OUR STORY",
      description:
        "Our CEO, Dr. Chet Chea, a practicing physician and Director of Infectious Disease at Vibra Hospitals, believes that integrating modern technology is essential to advancing medical science, enhancing patient care, and empowering clinicians in the pursuit of novel cures and treatments.",
    },
    {
      icon: Users,
      title: "OUR TALENTS",
      description:
        "Our multidisciplinary team of clinicians, engineers, and advisors has developed a breakthrough innovation that bridges the gap between technology and medicine.",
    },
    {
      icon: Cpu,
      title: "OUR TECHNOLOGY",
      description:
        "Built on cutting-edge AI and machine learning frameworks, our platform processes complex clinical data in real-time. Specifications available upon request.",
    },
  ];

  return (
    <section id="vision" className="py-24 bg-[#111]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16" data-testid="text-vision-title">
          OUR <span className="text-[#4A90D9]">VISION</span>
        </h2>

        <div
          ref={ref}
          className={`grid grid-cols-1 md:grid-cols-3 gap-8 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          {cards.map((card, i) => (
            <div
              key={card.title}
              className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 text-center hover:border-[#4A90D9]/30 transition-all duration-500"
              style={{ transitionDelay: `${i * 150}ms` }}
              data-testid={`card-vision-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="w-16 h-16 rounded-full bg-[#4A90D9]/10 flex items-center justify-center mx-auto mb-6">
                <card.icon className="w-8 h-8 text-[#4A90D9]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-4">{card.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const { ref, isVisible } = useInView();
  const testimonials = [
    {
      name: "Dr. Sarah Chen",
      specialty: "Cardiologist",
      hospital: "Johns Hopkins Hospital",
      rating: 5,
      quote: "ARI has transformed how I approach complex cardiac cases. The evidence-based recommendations are remarkably accurate and save me hours of literature review.",
    },
    {
      name: "Dr. James Rodriguez",
      specialty: "Emergency Medicine",
      hospital: "Massachusetts General Hospital",
      rating: 5,
      quote: "In the ER, every second counts. ARI's real-time triage support has helped us reduce diagnostic errors by over 30% in our department.",
    },
    {
      name: "Dr. Priya Patel",
      specialty: "Oncologist",
      hospital: "Mayo Clinic",
      rating: 5,
      quote: "The drug interaction checks alone have prevented several potential adverse events. ARI is like having an expert colleague available 24/7.",
    },
    {
      name: "Dr. Michael Thompson",
      specialty: "Neurologist",
      hospital: "Cleveland Clinic",
      rating: 4,
      quote: "ARI's differential diagnosis feature is incredibly thorough. It consistently surfaces possibilities that even experienced clinicians might overlook.",
    },
    {
      name: "Dr. Emily Nakamura",
      specialty: "Infectious Disease",
      hospital: "Stanford Health Care",
      rating: 5,
      quote: "During the latest outbreak response, ARI helped us stay on top of rapidly evolving guidelines from WHO and CDC in real-time. Invaluable tool.",
    },
    {
      name: "Dr. David Okafor",
      specialty: "Pulmonologist",
      hospital: "UCLA Medical Center",
      rating: 5,
      quote: "The integration with our EHR is seamless. ARI fits naturally into our workflow without adding friction. My team adopted it within days.",
    },
  ];

  return (
    <section id="testimonials" className="py-24 bg-[#1a1a1a]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4" data-testid="text-testimonials-title">
          What <span className="text-[#4A90D9]">Physicians</span> Say
        </h2>
        <p className="text-center text-white/50 mb-16 max-w-2xl mx-auto">
          Trusted by leading clinicians at top hospitals worldwide
        </p>

        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`bg-[#222] border border-white/10 rounded-2xl p-6 hover:border-[#4A90D9]/30 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: `${i * 100}ms` }}
              data-testid={`card-testimonial-${i}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#4A90D9]/20 flex items-center justify-center text-[#4A90D9] font-bold text-sm shrink-0">
                  {t.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{t.name}</div>
                  <div className="text-white/50 text-xs">{t.specialty} · {t.hospital}</div>
                </div>
              </div>
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }, (_, j) => (
                  <Star
                    key={j}
                    className={`w-4 h-4 ${j < t.rating ? "text-[#4A90D9] fill-[#4A90D9]" : "text-white/20"}`}
                  />
                ))}
              </div>
              <p className="text-white/70 text-sm leading-relaxed italic">"{t.quote}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CapabilitiesSection() {
  const { ref, isVisible } = useInView();
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const evidenceSources = [
    { id: "who", label: "WHO Guidelines", icon: Globe },
    { id: "cdc", label: "CDC Recommendations", icon: Shield },
    { id: "nice", label: "NICE Guidelines", icon: Scale },
    { id: "cochrane", label: "Cochrane Reviews", icon: BookOpen },
    { id: "uptodate", label: "UpToDate", icon: FileText },
    { id: "clinical-trials", label: "Clinical Trial Data", icon: FlaskConical },
    { id: "novel-research", label: "Novel Research / Preprints", icon: Lightbulb },
  ];

  const features = [
    {
      icon: MessageSquare,
      title: "Natural Language Processing",
      description: "Advanced NLP understands clinical notes, lab reports, and patient narratives in natural language, extracting key medical information automatically.",
      image: featureNlpImg,
    },
    {
      icon: BarChart3,
      title: "Predictive Analytics",
      description: "Machine learning models predict patient deterioration, readmission risk, and treatment response to enable proactive clinical interventions.",
      image: featurePredictiveImg,
    },
    {
      icon: Database,
      title: "EHR Integration",
      description: "Seamless integration with existing Electronic Health Record systems, pulling relevant patient data without disrupting established clinical workflows.",
      image: featureEhrImg,
    },
    {
      icon: Lock,
      title: "HIPAA-Compliant Security",
      description: "End-to-end encryption, role-based access controls, and comprehensive audit trails ensure full HIPAA compliance and patient data protection.",
      image: featureSecurityImg,
    },
  ];


  return (
    <section id="capabilities" className="py-24 bg-[#111]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4" data-testid="text-capabilities-title">
          ARI <span className="text-[#4A90D9]">Capabilities</span> & AI in Healthcare
        </h2>
        <p className="text-center text-white/50 mb-16 max-w-2xl mx-auto">
          Powered by 7 configurable evidence sources, advanced AI, and built for clinical safety
        </p>

        <div
          ref={ref}
          className={`transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group relative bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden transition-all duration-500 hover:border-[#4A90D9]/50 hover:shadow-[0_0_30px_rgba(74,144,217,0.12)] cursor-pointer"
                style={{ transitionDelay: `${i * 80}ms` }}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
                data-testid={`card-capability-${f.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={f.image}
                    alt={f.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/60 to-transparent" />
                  <div className={`absolute inset-0 bg-[#4A90D9]/10 transition-opacity duration-500 ${hoveredFeature === i ? "opacity-100" : "opacity-0"}`} />
                </div>
                <div className="p-6 relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${hoveredFeature === i ? "bg-[#4A90D9] shadow-[0_0_15px_rgba(74,144,217,0.4)]" : "bg-[#4A90D9]/10"}`}>
                      <f.icon className={`w-5 h-5 transition-colors duration-500 ${hoveredFeature === i ? "text-white" : "text-[#4A90D9]"}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 mb-16">
            <h3 className="text-xl font-semibold text-white mb-6">Evidence Sources</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {evidenceSources.map((src) => {
                const isActive = activeSource === src.id;
                return (
                  <button
                    key={src.id}
                    onClick={() => setActiveSource(isActive ? null : src.id)}
                    className={`relative p-4 rounded-xl border text-left transition-all duration-300 group cursor-pointer ${
                      isActive
                        ? "bg-[#4A90D9]/15 border-[#4A90D9]/60 shadow-[0_0_20px_rgba(74,144,217,0.2)] scale-[1.02]"
                        : "bg-[#222] border-white/10 hover:border-[#4A90D9]/40 hover:shadow-[0_0_15px_rgba(74,144,217,0.1)] hover:scale-[1.01]"
                    }`}
                    data-testid={`toggle-source-${src.id}`}
                  >
                    <div className={`text-xs font-medium transition-colors duration-300 ${isActive ? "text-[#4A90D9]" : "text-white/70"}`}>
                      {src.label}
                    </div>
                    {isActive && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#4A90D9] animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

function CommunitySection() {
  const hospitals = [
    "Massachusetts General Hospital", "Johns Hopkins Hospital", "Mayo Clinic",
    "Cleveland Clinic", "UCLA Medical Center", "Cedars-Sinai Medical Center",
    "UCSF Medical Center", "Stanford Health Care", "NYU Langone Health",
    "Mount Sinai Hospital", "NewYork-Presbyterian Hospital", "Duke University Hospital",
    "Brigham and Women's Hospital", "Northwestern Memorial Hospital", "Penn Medicine",
    "Emory University Hospital", "Vanderbilt University Medical Center", "Michigan Medicine",
    "Houston Methodist", "UT Southwestern Medical Center",
  ];

  const duplicated = [...hospitals, ...hospitals];

  return (
    <section id="community" className="py-24 bg-[#1a1a1a] overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16" data-testid="text-community-title">
          Our <span className="text-[#4A90D9]">Community</span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <AnimatedCounter target={12500} suffix="+" label="Active Physicians" />
          <AnimatedCounter target={350} suffix="+" label="Partner Hospitals" />
          <AnimatedCounter target={40} suffix="+" label="Specialties Supported" />
          <AnimatedCounter target={28} suffix="" label="Countries" />
        </div>
      </div>

      <div className="relative" data-testid="marquee-hospitals">
        <div className="flex animate-marquee whitespace-nowrap">
          {duplicated.map((h, i) => (
            <span
              key={`${h}-${i}`}
              className="mx-6 text-white/30 text-sm font-medium inline-block"
            >
              {h}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </section>
  );
}

function TeamSection() {
  const { ref, isVisible } = useInView();
  const team = [
    {
      name: "Chet Chea, MD",
      title: "CEO & Co-Founder",
      bio: "Director of Infectious Disease at Vibra Hospitals. Nearly 15 years treating complex infections. Champion of physician-led innovation.",
      image: teamChetChea,
      initials: "CC",
    },
    {
      name: "Dana Nguyen, JD",
      title: "COO & Co-Founder",
      bio: "Former IP attorney at Greenberg Traurig. Background in engineering and law, representing Fortune 500 companies.",
      image: teamDanaNguyen,
      initials: "DN",
    },
    {
      name: "Britta Denman, DO",
      title: "Medical Director",
      bio: "Infectious disease specialist, former Chief of Staff at Capital Medical Center. Founded Medica XXI nonprofit.",
      image: teamBrittaDenman,
      initials: "BD",
    },
    {
      name: "Osas Nosa-Idahosa, PharmD",
      title: "Clinical Pharmacist",
      bio: "Director of Pharmacy with expertise in pharmacokinetics, chemotherapy, critical care, and pain management.",
      image: teamOsas,
      initials: "ON",
    },
    {
      name: "Anupam Acharya",
      title: "Engineer",
      bio: "5+ years leading tech startups. Built $2M+ revenue verticals. Strong product and business management experience.",
      image: teamAnupam,
      initials: "AA",
    },
    {
      name: "Michael Stewart, MD",
      title: "General Surgeon",
      bio: "Distinguished by clinical precision in diagnosis and patient-centered surgical strategies. Trained at Marshall University.",
      image: teamMichaelStewart,
      initials: "MS",
    },
    {
      name: "Deborah Doherty, MD",
      title: "Physical Medicine & Rehabilitation",
      bio: "Stanford-trained specialist in complex brain injury rehabilitation. Published authority in neurorehabilitation.",
      image: teamDoherty,
      initials: "DD",
    },
    {
      name: "John Cranshaw, MD",
      title: "Internal Medicine",
      bio: "Seasoned internist in San Francisco with nearly 30 years of experience. Trained at Harvard and Stanford.",
      image: teamCranshaw,
      initials: "JC",
    },
    {
      name: "Ken Collinsworth, MD",
      title: "Cardiologist",
      bio: "30+ years of cardiovascular expertise. Fellowship trained at Stanford and UCSF. Dedicated to comprehensive care.",
      image: teamCollinsworth,
      initials: "KC",
    },
    {
      name: "Donald Blair, MD",
      title: "Mentor & Advisor",
      bio: "Over 50 years practicing internal medicine and infectious disease. Mentor to CEO Dr. Chea during his fellowship.",
      image: teamBlair,
      initials: "DB",
    },
  ];

  return (
    <section id="team" className="py-24 bg-[#111]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4" data-testid="text-team-title">
          Meet the <span className="text-[#4A90D9]">Team</span>
        </h2>
        <p className="text-center text-white/50 mb-16 max-w-2xl mx-auto">
          Built by physicians and engineers passionate about transforming healthcare
        </p>

        <div
          ref={ref}
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          {team.map((member, i) => (
            <div
              key={member.name}
              className="group bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 text-center hover:border-[#4A90D9]/30 transition-all duration-500 hover:-translate-y-1"
              style={{ transitionDelay: `${i * 80}ms` }}
              data-testid={`card-team-${member.initials.toLowerCase()}`}
            >
              <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden border-2 border-white/10 group-hover:border-[#4A90D9]/50 transition-colors duration-500">
                <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-white font-semibold text-lg">{member.name}</h3>
              <p className="text-[#4A90D9] text-sm font-medium mt-1">{member.title}</p>
              <p className="text-white/50 text-sm mt-3 leading-relaxed">{member.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { ref, isVisible } = useInView();

  const faqs = [
    {
      q: "Is ARI HIPAA compliant?",
      a: "Yes. ARI is built with enterprise-grade security from the ground up. All patient data is encrypted at rest and in transit, with role-based access controls, comprehensive audit trails, and full HIPAA compliance certification. We undergo regular third-party security audits.",
    },
    {
      q: "What EHR systems does ARI integrate with?",
      a: "ARI integrates seamlessly with major EHR platforms including Epic, Cerner, Meditech, Allscripts, and athenahealth via FHIR and HL7 interfaces. Our team handles the integration process to minimize disruption to your existing workflows.",
    },
    {
      q: "How does ARI learn from outcomes?",
      a: "ARI uses de-identified outcome data to continuously refine its clinical models. When a treatment pathway leads to positive outcomes, ARI strengthens that recommendation pattern. All learning happens on aggregated, de-identified data — never on individual patient records.",
    },
    {
      q: "Is ARI a replacement for physician judgment?",
      a: "Absolutely not. ARI is a clinical decision support tool designed to augment — not replace — physician expertise. It surfaces evidence, generates differentials, and flags interactions, but every clinical decision remains with the treating physician.",
    },
    {
      q: "What specialties does ARI support?",
      a: "ARI supports over 40 medical specialties including Cardiology, Oncology, Neurology, Emergency Medicine, Internal Medicine, Infectious Disease, Pulmonology, Endocrinology, and many more. Our evidence models are specialty-aware and tuned to each discipline.",
    },
    {
      q: "How do I get started?",
      a: "Getting started is easy. Schedule a demo through our form below, and our team will walk you through ARI's capabilities, discuss your institution's needs, and set up a pilot program. Most teams are onboarded within two weeks.",
    },
  ];

  return (
    <section id="faq" className="py-24 bg-[#1a1a1a]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4" data-testid="text-faq-title">
          Frequently Asked <span className="text-[#4A90D9]">Questions</span>
        </h2>
        <p className="text-center text-white/50 mb-12">
          Everything you need to know about ARI
        </p>

        <div
          ref={ref}
          className={`space-y-3 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className="bg-[#222] border border-white/10 rounded-xl overflow-hidden hover:border-[#4A90D9]/20 transition-colors"
                data-testid={`faq-item-${i}`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                  data-testid={`button-faq-${i}`}
                >
                  <span className="text-white font-medium text-sm pr-4">{faq.q}</span>
                  <ChevronRight
                    className={`w-5 h-5 text-[#4A90D9] shrink-0 transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-96" : "max-h-0"}`}
                >
                  <p className="px-5 pb-5 text-white/60 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DemoFormSection() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<InsertDemoRequest>({
    resolver: zodResolver(insertDemoRequestSchema),
    defaultValues: {
      name: "",
      email: "",
      organization: "",
      role: "",
      message: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertDemoRequest) => {
      const res = await apiRequest("POST", "/api/demo-requests", data);
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Success!", description: "Your demo request has been submitted. We'll be in touch soon." });
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    },
  });

  function onSubmit(data: InsertDemoRequest) {
    mutation.mutate(data);
  }

  return (
    <section id="demo" className="py-24 bg-[#1a1a1a]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4" data-testid="text-demo-title">
          JOIN THE <span className="text-[#4A90D9]">COMMUNITY</span>
        </h2>
        <p className="text-center text-white/50 mb-12">
          Please fill your contact details below
        </p>

        {submitted ? (
          <div className="text-center py-16 bg-[#222] rounded-2xl border border-[#4A90D9]/30" data-testid="text-demo-success">
            <div className="w-16 h-16 rounded-full bg-[#4A90D9]/20 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-[#4A90D9]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Message Received!</h3>
            <p className="text-white/60">We'll get back to you shortly.</p>
            <Button
              onClick={() => setSubmitted(false)}
              className="mt-6 bg-[#4A90D9] text-white hover:bg-[#5BA0E9]"
              data-testid="button-submit-another"
            >
              Submit Another Request
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Dr. Jane Smith"
                        className="bg-[#222] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#4A90D9]/50"
                        data-testid="input-demo-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="jane@hospital.org"
                        className="bg-[#222] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#4A90D9]/50"
                        data-testid="input-demo-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Organization</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Memorial Hospital"
                        className="bg-[#222] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#4A90D9]/50"
                        data-testid="input-demo-organization"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Role</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Chief Medical Officer"
                        className="bg-[#222] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#4A90D9]/50"
                        data-testid="input-demo-role"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Message (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Tell us about your needs..."
                        rows={4}
                        className="bg-[#222] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#4A90D9]/50 resize-none"
                        data-testid="input-demo-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-[#4A90D9] text-white hover:bg-[#5BA0E9] font-semibold py-6 text-lg"
                disabled={mutation.isPending}
                data-testid="button-submit-demo"
              >
                {mutation.isPending ? "Sending..." : "SEND"}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-8 bg-[#111] border-t border-white/5">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <img src={aribotLogoPath} alt="ARIbots" className="h-8 w-8 rounded object-contain" />
          <span className="text-white font-semibold">ARI bots</span>
        </div>
        <p className="text-white/40 text-sm">
          © {new Date().getFullYear()} ARI bots. All rights reserved. Empowering medicine with AI.
        </p>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="bg-[#111] min-h-screen">
      <LandingNavbar />
      <HeroSection />
      <MeetAriSection />
      <HowAriWorksSection />
      <CapabilitiesSection />
      <TestimonialsSection />
      <CommunitySection />
      <TeamSection />
      <OurVisionSection />
      <FaqSection />
      <DemoFormSection />
      <Footer />
    </div>
  );
}
