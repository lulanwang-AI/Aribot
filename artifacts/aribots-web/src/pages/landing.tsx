import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
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
  Microscope,
  ChevronRight,
  Bot,
  User,
  AlertTriangle,
  Heart,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Video,
  Newspaper,
  DollarSign,
  ArrowRight,
  Play,
  TrendingDown,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { Link } from "wouter";
import aribotLogoPath from "@assets/aribot-mark-primary-1024_1777274279204.png";
import doctorTelemedicineImg from "@assets/generated_images/doctor-telemedicine.png";
import doctorNewsImg from "@assets/generated_images/doctor-news.png";
import doctorIncomeImg from "@assets/generated_images/doctor-income.png";
import heroDoctorsImg from "@assets/hero-doctors-connect.png";
import teamChetChea from "@assets/team-chet-chea.jpg";
import teamDanaNguyen from "@assets/team-dana-nguyen.jpg";
import teamBrittaDenman from "@assets/team-britta-denman.png";
import teamOsas from "@assets/team-osas.jpg";
import teamLulan from "@assets/Lulan_Heashot_1776200296631.png";
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
      <div className="text-gray-600 mt-2 text-sm">{label}</div>
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

  const CONTACT_URL = "https://www.aribots.com/contact-8";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#111]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <button
          onClick={() => scrollTo("hero")}
          className="flex items-center gap-3"
          data-testid="link-navbar-logo"
        >
          <img src={aribotLogoPath} alt="ARIbots" className="h-9 w-9 rounded object-contain" />
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
          <a
            href={CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/80 hover:text-[#4A90D9] transition-colors"
            data-testid="link-nav-contact"
          >
            Contact
          </a>
          <Link
            href="/login"
            className="text-sm font-semibold px-5 py-2 bg-[#4A90D9] text-white rounded-full hover:bg-[#5BA0E9] transition-colors"
            data-testid="link-nav-login"
          >
            Login
          </Link>
          <Link
            href="/ari-amr"
            className="text-sm font-semibold px-5 py-2 border border-[#4A90D9]/50 text-[#7db8f0] rounded-full hover:bg-[#4A90D9]/10 transition-colors"
            data-testid="link-nav-ari-amr"
          >
            Ari AMR
          </Link>
        </div>

        <div className="md:hidden flex items-center gap-3">
          <Link
            href="/login"
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
          <Link
            href="/ari-amr"
            onClick={() => setMobileOpen(false)}
            className="block py-3 text-[#7db8f0] hover:text-white transition-colors text-sm font-semibold"
            data-testid="link-mobile-ari-amr"
          >
            Ari AMR
          </Link>
          <a
            href={CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block py-3 text-white/80 hover:text-[#4A90D9] transition-colors text-sm"
            data-testid="link-mobile-contact"
          >
            Contact
          </a>
        </div>
      )}
    </nav>
  );
}

function AribotMockup() {
  const messages = [
    { role: "user", text: "What's the latest evidence on SGLT2 inhibitors for HFpEF?" },
    { role: "assistant", text: "Recent trials including EMPEROR-Preserved show Empagliflozin reduces HF hospitalization by 21% in HFpEF patients. ACC/AHA 2022 guidelines now give a Class IIa recommendation." },
    { role: "user", text: "Any contraindications I should watch for?" },
    { role: "assistant", text: "Avoid in eGFR <20, active UTI, or DKA. Monitor for genital mycotic infections and volume depletion, especially in elderly patients on loop diuretics." },
  ];

  type Step =
    | { type: "show"; msgIdx: number; delay: number }
    | { type: "typing"; delay: number }
    | { type: "pause"; delay: number }
    | { type: "reset"; delay: number };

  const sequence: Step[] = [
    { type: "show",   msgIdx: 0, delay: 700  },
    { type: "typing",            delay: 1600 },
    { type: "show",   msgIdx: 1, delay: 500  },
    { type: "show",   msgIdx: 2, delay: 1100 },
    { type: "typing",            delay: 1800 },
    { type: "show",   msgIdx: 3, delay: 500  },
    { type: "pause",             delay: 3200 },
    { type: "reset",             delay: 150  },
  ];

  const [step, setStep] = useState(0);
  const [shown, setShown] = useState<number[]>([]);
  const [typing, setTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step >= sequence.length) {
      setStep(0);
      return;
    }
    const current = sequence[step];
    const timer = setTimeout(() => {
      if (current.type === "show") {
        setTyping(false);
        setShown(prev => [...prev, current.msgIdx]);
      } else if (current.type === "typing") {
        setTyping(true);
      } else if (current.type === "reset") {
        setShown([]);
        setTyping(false);
      }
      setStep(s => s + 1);
    }, current.delay);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown, typing]);

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

        <div ref={chatRef} className="p-4 h-[320px] overflow-y-auto flex flex-col gap-3" style={{ scrollbarWidth: "none" }}>
          {shown.map((msgIdx) => {
            const msg = messages[msgIdx];
            return (
              <div
                key={msgIdx}
                className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                style={{ animation: "chatBubbleIn 0.35s ease-out both" }}
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
            );
          })}

          {typing && (
            <div
              className="flex gap-2.5"
              style={{ animation: "chatBubbleIn 0.25s ease-out both" }}
            >
              <div className="w-7 h-7 rounded-full bg-[#4A90D9]/20 border border-[#4A90D9]/40 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-[#4A90D9]" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4A90D9]" style={{ animation: "typingDot 1.2s ease-in-out infinite", animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#4A90D9]" style={{ animation: "typingDot 1.2s ease-in-out infinite", animationDelay: "200ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#4A90D9]" style={{ animation: "typingDot 1.2s ease-in-out infinite", animationDelay: "400ms" }} />
              </div>
            </div>
          )}

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

      <style>{`
        @keyframes chatBubbleIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function HeroSection() {
  const [, setLocation] = useLocation();
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden bg-[#0e1117]">
      <div className="absolute inset-0 bg-[#0e1117]" />
      <DotsCanvas />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-screen lg:min-h-0 lg:py-32">

          <div className="flex flex-col justify-center order-1 lg:order-1">
            <div className="inline-flex items-center gap-2 bg-[#4A90D9]/10 border border-[#4A90D9]/25 rounded-full px-4 py-1.5 mb-8 w-fit">
              <span className="w-2 h-2 rounded-full bg-[#4A90D9] animate-pulse" />
              <span className="text-[#4A90D9] text-sm font-medium tracking-wide">Doctor-Powered Platform</span>
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
                onClick={() => setLocation("/whitepaper")}
                variant="outline"
                className="border-white/20 text-white/80 hover:bg-white/5 hover:border-white/30 font-medium px-8 py-6 text-base rounded-xl bg-transparent"
                data-testid="button-hero-learn"
              >
                See How It Works
              </Button>
            </div>

            <div className="flex items-center gap-6 mt-10 pt-10 border-t border-white/8">
              {[
                { value: "100%", label: "Identity Verified" },
                { value: "HIPAA", label: "& SOC 2 Compliant" },
                { value: "Zero", label: "Pharma Influence" },
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
  const { ref: srcRef, isVisible: srcVisible } = useInView();
  const [activeSource, setActiveSource] = useState<string | null>(null);

  const evidenceSources = [
    {
      id: "who", label: "WHO Guidelines", icon: Globe,
      volume: "2,400+", volumeLabel: "Guidelines & Recommendations",
      stats: [
        { value: "194", label: "Member countries covered" },
        { value: "45+", label: "Health topic areas" },
        { value: "Quarterly", label: "Update frequency" },
      ],
      description: "Real-time access to WHO clinical guidelines spanning infectious disease, maternal health, nutrition, and non-communicable diseases — covering global and regional health standards.",
    },
    {
      id: "cdc", label: "CDC Recommendations", icon: Shield,
      volume: "1,800+", volumeLabel: "Clinical Recommendations",
      stats: [
        { value: "500+", label: "Vaccine & immunization protocols" },
        { value: "12", label: "Disease surveillance categories" },
        { value: "Weekly", label: "MMWR update cadence" },
      ],
      description: "Comprehensive CDC guidance on infectious disease, vaccines, chronic conditions, and occupational health — integrated with live MMWR updates and emerging outbreak alerts.",
    },
    {
      id: "nice", label: "NICE Guidelines", icon: Scale,
      volume: "1,200+", volumeLabel: "Evidence-Based Guidelines",
      stats: [
        { value: "600+", label: "Technology appraisals" },
        { value: "50+", label: "Clinical specialties" },
        { value: "GRADE", label: "Evidence rating standard" },
      ],
      description: "UK National Institute for Health and Care Excellence guidelines, including health technology assessments and quality standards applicable across international clinical practice.",
    },
    {
      id: "cochrane", label: "Cochrane Reviews", icon: BookOpen,
      volume: "8,500+", volumeLabel: "Systematic Reviews",
      stats: [
        { value: "30,000+", label: "Included clinical trials" },
        { value: "98%", label: "GRADE-rated evidence" },
        { value: "Gold", label: "Standard for meta-analysis" },
      ],
      description: "The world's most trusted body of systematic reviews and meta-analyses. ARI uses Cochrane as the highest-confidence evidence tier for clinical recommendations.",
    },
    {
      id: "uptodate", label: "UpToDate", icon: FileText,
      volume: "11,000+", volumeLabel: "Clinical Topics",
      stats: [
        { value: "7,000+", label: "Physician authors & editors" },
        { value: "50+", label: "Medical specialties" },
        { value: "Daily", label: "Content update cadence" },
      ],
      description: "Physician-authored, evidence-based clinical content covering diagnosis, treatment, and prevention across all major specialties — the most widely used point-of-care resource worldwide.",
    },
    {
      id: "clinical-trials", label: "Clinical Trial Data", icon: FlaskConical,
      volume: "450,000+", volumeLabel: "Registered Trials",
      stats: [
        { value: "200+", label: "Countries with active trials" },
        { value: "Real-time", label: "Enrollment status tracking" },
        { value: "Phase I–IV", label: "All trial phases indexed" },
      ],
      description: "Live integration with ClinicalTrials.gov and the EU Clinical Trials Registry. ARI surfaces eligible trials for your patients and tracks status changes automatically.",
    },
    {
      id: "novel-research", label: "Novel Research / Preprints", icon: Lightbulb,
      volume: "3M+", volumeLabel: "Preprints Indexed",
      stats: [
        { value: "medRxiv", label: "Primary medical preprint server" },
        { value: "bioRxiv", label: "Biological sciences coverage" },
        { value: "AI-filtered", label: "Quality scoring applied" },
      ],
      description: "Pre-publication research from medRxiv, bioRxiv, and SSRN — AI-scored for methodology quality so ARI surfaces emerging evidence without overweighting unvalidated findings.",
    },
    {
      id: "meta-analyses", label: "Meta-Analyses & Systematic Reviews", icon: Microscope,
      volume: "120,000+", volumeLabel: "Systematic Reviews",
      stats: [
        { value: "PRISMA", label: "Compliance standard" },
        { value: "Network", label: "Meta-analyses included" },
        { value: "PubMed", label: "Primary index source" },
      ],
      description: "Broad corpus of peer-reviewed systematic reviews and network meta-analyses from PubMed and EMBASE, parsed for PICO structure and integrated into ARI's reasoning chain.",
    },
  ];

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
    <section id="meet-ari" className="py-12 md:py-24 bg-gray-100 -mt-px">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4" data-testid="text-meet-ari-title">
          meet <span className="text-[#4A90D9]">ARI</span>
        </h2>
        <div
          ref={ref}
          className={`grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mt-8 md:mt-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group bg-white border border-gray-200 rounded-2xl p-5 md:p-8 hover:border-[#4A90D9]/50 hover:shadow-md transition-all duration-500 hover:-translate-y-1"
              style={{ transitionDelay: `${i * 150}ms` }}
              data-testid={`card-feature-${f.title.toLowerCase()}`}
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-[#4A90D9]/10 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-[#4A90D9]/20 transition-colors">
                <f.icon className="w-6 h-6 md:w-7 md:h-7 text-[#4A90D9]" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3">{f.title}</h3>
              <p className="text-gray-600 leading-relaxed text-sm">{f.description}</p>
            </div>
          ))}
        </div>

        <div
          ref={srcRef}
          className={`mt-10 md:mt-20 transition-all duration-1000 delay-200 ${srcVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <p className="text-center text-gray-400 text-xs uppercase tracking-widest mb-4 md:mb-6 font-medium">
            Powered by 8 trusted evidence sources
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
            {evidenceSources.map((src, i) => {
              const isActive = activeSource === src.id;
              return (
                <button
                  key={src.id}
                  onClick={() => setActiveSource(isActive ? null : src.id)}
                  className={`group relative flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl border text-left transition-all duration-300 ${
                    isActive
                      ? "bg-[#4A90D9]/10 border-[#4A90D9]/60 shadow-[0_0_20px_rgba(74,144,217,0.10)]"
                      : "bg-white border-gray-200 hover:border-[#4A90D9]/40 hover:bg-[#4A90D9]/5"
                  }`}
                  style={{ transitionDelay: `${i * 40}ms` }}
                  data-testid={`source-${src.id}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 ${
                    isActive ? "bg-[#4A90D9]/20" : "bg-white group-hover:bg-[#4A90D9]/10"
                  }`}>
                    <src.icon className={`w-3.5 h-3.5 transition-colors duration-300 ${isActive ? "text-[#4A90D9]" : "text-gray-400 group-hover:text-[#4A90D9]"}`} />
                  </div>
                  <span className={`text-xs font-medium leading-snug transition-colors duration-300 ${isActive ? "text-[#4A90D9]" : "text-gray-600 group-hover:text-gray-800"}`}>
                    {src.label}
                  </span>
                  {isActive && (
                    <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#4A90D9] animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {(() => {
            const active = evidenceSources.find(s => s.id === activeSource);
            if (!active) return (
              <p className="text-center text-gray-400 text-xs mt-6 italic">Select a source above to explore its data integration</p>
            );
            return (
              <div className="mt-5 rounded-2xl border border-[#4A90D9]/25 bg-white p-5 md:p-7 transition-all duration-300 animate-in fade-in slide-in-from-top-2" data-testid="source-detail-panel">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#4A90D9]/10 flex items-center justify-center shrink-0">
                    <active.icon className="w-5 h-5 text-[#4A90D9]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-3xl font-bold text-[#4A90D9]">{active.volume}</span>
                      <span className="text-gray-500 text-sm font-medium">{active.volumeLabel}</span>
                    </div>
                    <h4 className="text-gray-900 font-semibold mt-0.5">{active.label}</h4>
                  </div>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">{active.description}</p>
                <div className="grid grid-cols-3 gap-3">
                  {active.stats.map(stat => (
                    <div key={stat.label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                      <div className="text-base font-bold text-gray-800">{stat.value}</div>
                      <div className="text-xs text-gray-400 mt-0.5 leading-snug">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </section>
  );
}

function PhysicianFeaturesSection() {
  const features = [
    {
      id: "telemedicine",
      tag: "Telemedicine",
      tagColor: "bg-[#4A90D9]/10 text-[#4A90D9] border-[#4A90D9]/20",
      accentColor: "#4A90D9",
      icon: Video,
      headline: "See patients from anywhere",
      description:
        "Conduct secure, HIPAA-compliant video visits directly through ARIbots. Connect with patients in real-time, review notes, and complete encounters — all without switching platforms.",
      bullets: [
        "One-click HD video consultations",
        "Integrated EHR & note-taking",
        "Prescription & referral support",
      ],
      cta: "Launch a Visit",
      image: doctorTelemedicineImg,
      imageAlt: "Doctor conducting telemedicine visit",
      imageRight: false,
    },
    {
      id: "news",
      tag: "Medical News AI",
      tagColor: "bg-violet-100 text-violet-600 border-violet-200",
      accentColor: "#6366f1",
      icon: Newspaper,
      headline: "Stay ahead of clinical research",
      description:
        "AI-curated medical news from top journals, FDA updates, and clinical guidelines — delivered in a personalized feed tailored to your specialty and interests.",
      bullets: [
        "Specialty-matched article feed",
        "FDA, CDC & WHO alerts in real-time",
        "Save & share with peers instantly",
      ],
      cta: "Explore the Feed",
      image: doctorNewsImg,
      imageAlt: "Doctor reading medical news on tablet",
      imageRight: true,
    },
    {
      id: "income",
      tag: "Earn Extra Income",
      tagColor: "bg-emerald-100 text-emerald-600 border-emerald-200",
      accentColor: "#10b981",
      icon: DollarSign,
      headline: "Turn your expertise into income",
      description:
        "Participate in paid physician surveys, clinical research studies, expert panel discussions, and telemedicine sessions — on your own schedule, from anywhere.",
      bullets: [
        "Paid surveys & research panels",
        "Consulting & expert opinion work",
        "Flexible hours, instant payouts",
      ],
      cta: "See Opportunities",
      image: doctorIncomeImg,
      imageAlt: "Doctor smiling at financial growth on smartphone",
      imageRight: false,
    },
  ];

  return (
    <section id="physician-features" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-[#4A90D9]/10 border border-[#4A90D9]/25 rounded-full px-4 py-1.5 mb-5">
            <Sparkles className="h-3.5 w-3.5 text-[#4A90D9]" />
            <span className="text-[#4A90D9] text-sm font-medium">Built for the Modern Physician</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Everything you need,{" "}
            <span className="text-[#4A90D9]">in one place</span>
          </h2>
          <p className="mt-4 text-gray-500 text-lg max-w-2xl mx-auto">
            ARIbots gives physicians the tools to practice smarter, stay informed, and earn more — all within a trusted doctor-powered community.
          </p>
        </div>

        <div className="flex flex-col gap-24">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.id}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center`}
                data-testid={`feature-${f.id}`}
              >
                {/* Image */}
                <div className={`relative ${f.imageRight ? "lg:order-2" : "lg:order-1"}`}>
                  <div
                    className="absolute -inset-4 rounded-3xl opacity-30 blur-2xl"
                    style={{ background: `radial-gradient(ellipse at center, ${f.accentColor}33 0%, transparent 70%)` }}
                  />
                  <div className="relative rounded-2xl overflow-hidden shadow-xl ring-1 ring-gray-200">
                    <img
                      src={f.image}
                      alt={f.imageAlt}
                      className="w-full h-72 lg:h-96 object-cover"
                      data-testid={`img-feature-${f.id}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                  </div>
                </div>

                {/* Text */}
                <div className={f.imageRight ? "lg:order-1" : "lg:order-2"}>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${f.tagColor} mb-5`}
                    data-testid={`tag-feature-${f.id}`}
                  >
                    <Icon className="h-3 w-3" />
                    {f.tag}
                  </span>

                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug mb-4">
                    {f.headline}
                  </h3>

                  <p className="text-gray-500 text-base leading-relaxed mb-7">
                    {f.description}
                  </p>

                  <ul className="space-y-2.5 mb-8">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <CheckCircle2
                          className="h-4 w-4 shrink-0 mt-0.5"
                          style={{ color: f.accentColor }}
                        />
                        {b}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
                    className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                    style={{ background: f.accentColor }}
                    data-testid={`cta-feature-${f.id}`}
                  >
                    {f.cta}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
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
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4" data-testid="text-how-works-title">
          How <span className="text-[#4A90D9]">ARI</span> Works
        </h2>
        <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">
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
                    : "bg-gray-100 text-gray-600 border border-gray-200 hover:border-[#4A90D9]/40 hover:text-gray-900"
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
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs text-gray-400 border border-gray-200 hover:text-gray-600 transition-colors"
                data-testid="button-resume-cycle"
              >
                <Activity className="w-3.5 h-3.5" /> Auto
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div
              key={`desc-${activeTab}`}
              className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 animate-[fadeSlideUp_0.4s_ease-out] shadow-sm"
              data-testid={`step-${activeTab + 1}`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-full bg-[#4A90D9]/15 border border-[#4A90D9]/30 flex items-center justify-center">
                  <active.icon className="w-5 h-5 text-[#4A90D9]" />
                </div>
                <div>
                  <span className="text-[#4A90D9] text-[10px] font-bold uppercase tracking-widest block">{active.step} of 5</span>
                  <h3 className="text-base font-semibold text-gray-900 leading-tight">{active.tabLabel}</h3>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{active.description}</p>

              <div className="flex gap-1.5 mt-8">
                {scenarios.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveTab(i); setPaused(true); }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      activeTab === i ? "bg-[#4A90D9] w-6" : "bg-gray-300 w-3 hover:bg-gray-400"
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
        "Our CEO, Dr. Chet Chea (Anucheat Chea, MD), is a board-certified Infectious Disease specialist in Kentfield, CA with 21 years of clinical experience treating HIV/AIDS, sepsis, antimicrobial resistance, and complex infections. A graduate of Ross University School of Medicine, Dr. Chea believes that integrating modern AI technology is essential to advancing medical science, enhancing patient care, and empowering clinicians in the pursuit of better outcomes.",
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
    <section id="vision" className="py-24 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16" data-testid="text-vision-title">
          OUR <span className="text-[#4A90D9]">VISION</span>
        </h2>

        <div
          ref={ref}
          className={`grid grid-cols-1 md:grid-cols-3 gap-8 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          {cards.map((card, i) => (
            <div
              key={card.title}
              className="bg-white border border-gray-200 rounded-2xl p-8 text-center hover:border-[#4A90D9]/40 hover:shadow-md transition-all duration-500"
              style={{ transitionDelay: `${i * 150}ms` }}
              data-testid={`card-vision-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="w-16 h-16 rounded-full bg-[#4A90D9]/10 flex items-center justify-center mx-auto mb-6">
                <card.icon className="w-8 h-8 text-[#4A90D9]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">{card.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{card.description}</p>
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
      gradient: "from-[#4A90D9] to-[#357abd]",
    },
    {
      name: "Dr. James Rodriguez",
      specialty: "Emergency Medicine",
      hospital: "Massachusetts General Hospital",
      rating: 5,
      quote: "In the ER, every second counts. ARI's real-time triage support has helped us reduce diagnostic errors by over 30% in our department.",
      gradient: "from-[#6366f1] to-[#4f46e5]",
    },
    {
      name: "Dr. Priya Patel",
      specialty: "Oncologist",
      hospital: "Mayo Clinic",
      rating: 5,
      quote: "The drug interaction checks alone have prevented several potential adverse events. ARI is like having an expert colleague available 24/7.",
      gradient: "from-[#ec4899] to-[#be185d]",
    },
    {
      name: "Dr. Michael Thompson",
      specialty: "Neurologist",
      hospital: "Cleveland Clinic",
      rating: 4,
      quote: "ARI's differential diagnosis feature is incredibly thorough. It consistently surfaces possibilities that even experienced clinicians might overlook.",
      gradient: "from-[#0ea5e9] to-[#0284c7]",
    },
    {
      name: "Dr. Emily Nakamura",
      specialty: "Infectious Disease",
      hospital: "Stanford Health Care",
      rating: 5,
      quote: "During the latest outbreak response, ARI helped us stay on top of rapidly evolving guidelines from WHO and CDC in real-time. Invaluable tool.",
      gradient: "from-[#14b8a6] to-[#0f766e]",
    },
    {
      name: "Dr. David Okafor",
      specialty: "Pulmonologist",
      hospital: "UCLA Medical Center",
      rating: 5,
      quote: "The integration with our EHR is seamless. ARI fits naturally into our workflow without adding friction. My team adopted it within days.",
      gradient: "from-[#f59e0b] to-[#d97706]",
    },
  ];

  return (
    <section id="testimonials" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4" data-testid="text-testimonials-title">
          What <span className="text-[#4A90D9]">Physicians</span> Say
        </h2>
        <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
          Trusted by leading clinicians at top hospitals worldwide
        </p>

        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`bg-white border border-gray-200 rounded-2xl p-6 hover:border-[#4A90D9]/40 hover:shadow-md transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: `${i * 100}ms` }}
              data-testid={`card-testimonial-${i}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-full shrink-0 bg-gradient-to-br ${t.gradient} flex items-center justify-center ring-2 ring-gray-100 shadow-md`}
                  data-testid={`avatar-${t.name.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <span className="text-white font-bold text-sm tracking-wide">
                    {t.name.split(" ").filter(w => w !== "Dr.").map(w => w[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div>
                  <div className="text-gray-900 font-semibold text-sm">{t.name}</div>
                  <div className="text-gray-500 text-xs">{t.specialty} · {t.hospital}</div>
                </div>
              </div>
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }, (_, j) => (
                  <Star
                    key={j}
                    className={`w-4 h-4 ${j < t.rating ? "text-[#4A90D9] fill-[#4A90D9]" : "text-gray-200"}`}
                  />
                ))}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed italic">"{t.quote}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CapabilitiesSection() {
  const { ref, isVisible } = useInView();
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

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
    <section id="capabilities" className="py-24 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4" data-testid="text-capabilities-title">
          ARI <span className="text-[#4A90D9]">Capabilities</span> & AI in Healthcare
        </h2>
        <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
          Advanced AI built for clinical safety, seamlessly integrated into your workflow
        </p>

        <div
          ref={ref}
          className={`transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group relative bg-white border border-gray-200 rounded-2xl overflow-hidden transition-all duration-500 hover:border-[#4A90D9]/50 hover:shadow-lg cursor-pointer"
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
                  <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/20 to-transparent" />
                  <div className={`absolute inset-0 bg-[#4A90D9]/10 transition-opacity duration-500 ${hoveredFeature === i ? "opacity-100" : "opacity-0"}`} />
                </div>
                <div className="p-6 relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${hoveredFeature === i ? "bg-[#4A90D9] shadow-[0_0_15px_rgba(74,144,217,0.4)]" : "bg-[#4A90D9]/10"}`}>
                      <f.icon className={`w-5 h-5 transition-colors duration-500 ${hoveredFeature === i ? "text-white" : "text-[#4A90D9]"}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}

function WhatAriKnowsSection() {
  const { ref, isVisible } = useInView();

  const categories = [
    {
      icon: BookOpen,
      title: "Evidence & Literature",
      items: [
        { name: "PubMed", desc: "NEJM, JAMA, Cochrane & peer-reviewed lit" },
        { name: "bioRxiv", desc: "Preprint biology & life sciences" },
        { name: "Open Targets", desc: "Drug-target & disease associations" },
        { name: "Consensus", desc: "Synthesis across literature" },
        { name: "Scholar Gateway", desc: "Broad academic search" },
        { name: "Exa", desc: "Semantic search for full-text guidelines" },
      ],
    },
    {
      icon: Pill,
      title: "Drug & Decision Tools",
      items: [
        { name: "ChEMBL", desc: "Bioactivity, PK/PD, pharmacology" },
        { name: "ICD-10 Codes", desc: "Clinical-term → diagnosis code mapping" },
        { name: "CMS Coverage", desc: "Medicare/Medicaid coverage lookups" },
        { name: "NPI Registry", desc: "US licensed-provider lookup" },
      ],
    },
    {
      icon: Cpu,
      title: "Hugging Face — Biomedical AI",
      items: [
        { name: "Triage Models", desc: "Acuity scoring, ESI prediction from free text" },
        { name: "Clinical NLP", desc: "NER, med extraction, discharge parsing" },
        { name: "Drug Interaction & PK/PD", desc: "ML-based interaction prediction" },
        { name: "Protein & Molecular", desc: "ESMFold/AlphaFold-style structure tools" },
        { name: "Medical Imaging AI", desc: "Radiology & pathology assist" },
      ],
    },
    {
      icon: FileText,
      title: "Document Parsing",
      items: [
        { name: "PDF", desc: "Labs, discharge, radiology, RT plan reports" },
        { name: "XLSX", desc: "PK worksheets, dosing tables, DVH data" },
        { name: "DOCX", desc: "Care plans, protocols, RT summaries" },
        { name: "PPTX", desc: "Grand rounds & protocol decks" },
      ],
    },
    {
      icon: Stethoscope,
      title: "Clinical Capabilities",
      items: [
        { name: "Antibiotic Stewardship", desc: "IDSA empiric/targeted regimens, resistance" },
        { name: "Wound & Skin", desc: "Photo analysis, NPUAP staging, plans" },
        { name: "Pharmacy", desc: "Dosing, renal/hepatic, PK, TPN, chemo banding" },
        { name: "Ventilator Mgmt", desc: "ARDSNet, weaning, RSBI/SBT" },
        { name: "Medical Calculators", desc: "MDCalc-style scores & formulas" },
        { name: "Clinical Protocols", desc: "DKA, HHS, CIWA, sepsis, hypertensive emerg." },
        { name: "ER Triage", desc: "ESI 1–5, time-sensitive Dx, AI-assisted acuity" },
        { name: "Oncology & Rare Disease", desc: "Open Targets + NCCN targeted therapy" },
        { name: "Billing & Coverage", desc: "ICD-10 + CMS policy support" },
      ],
    },
    {
      icon: Activity,
      title: "Radiation Oncology",
      items: [
        { name: "Imaging Review", desc: "X-ray/CT/MRI; GTV/CTV/PTV-relevant findings" },
      ],
    },
  ];

  return (
    <section
      id="what-ari-knows"
      className="py-24 bg-white"
      data-testid="section-what-ari-knows"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4A90D9]/30 bg-[#4A90D9]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#4A90D9]">
            <Sparkles className="h-3.5 w-3.5" /> New in ARI v3.0
          </span>
        </div>
        <h2
          className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4"
          data-testid="text-what-ari-knows-title"
        >
          What <span className="text-[#4A90D9]">ARI</span> Knows
        </h2>
        <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
          Live integrations across literature, drug data, biomedical AI, and
          clinical capabilities — every answer cited, every source explicit.
        </p>

        <div
          ref={ref}
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.title}
                className="group relative bg-white border border-gray-200 rounded-2xl p-6 transition-all duration-500 hover:border-[#4A90D9]/50 hover:shadow-lg"
                style={{ transitionDelay: `${i * 80}ms` }}
                data-testid={`card-knows-${cat.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#4A90D9]/10 flex items-center justify-center transition-all duration-500 group-hover:bg-[#4A90D9] group-hover:shadow-[0_0_15px_rgba(74,144,217,0.4)]">
                    <Icon className="w-5 h-5 text-[#4A90D9] transition-colors duration-500 group-hover:text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
                    {cat.title}
                  </h3>
                </div>
                <ul className="space-y-3">
                  {cat.items.map((item) => (
                    <li
                      key={item.name}
                      className="flex flex-col gap-0.5"
                      data-testid={`item-knows-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    >
                      <span className="text-sm font-semibold text-gray-900">
                        {item.name}
                      </span>
                      <span className="text-xs text-gray-500 leading-relaxed">
                        {item.desc}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
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
    <section id="community" className="py-24 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16" data-testid="text-community-title">
          Our <span className="text-[#4A90D9]">Community</span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <AnimatedCounter target={100} suffix="%" label="Physicians NPI-Verified" />
          <AnimatedCounter target={98} suffix="%" label="HIPAA Compliance Score" />
          <AnimatedCounter target={500} suffix="+" label="Peer-Reviewed Notes Shared" />
          <AnimatedCounter target={40} suffix="+" label="Clinical Specialties Covered" />
        </div>
      </div>

      <div className="relative" data-testid="marquee-hospitals">
        <div className="flex animate-marquee whitespace-nowrap">
          {duplicated.map((h, i) => (
            <span
              key={`${h}-${i}`}
              className="mx-6 text-gray-400 text-sm font-medium inline-block"
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
      bio: "Board-certified Infectious Disease specialist in Kentfield, CA. 21 years of clinical experience treating HIV/AIDS, sepsis, and complex infections. Graduate of Ross University School of Medicine.",
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
      name: "Lulan Wang, Ph.D.",
      title: "AI Engineer",
      bio: "Ph.D. from UCLA with expertise in artificial intelligence and deep AI research, bringing engineering experience to clinical applications.",
      image: teamLulan,
      initials: "LW",
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
    <section id="team" className="py-24 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4" data-testid="text-team-title">
          Meet the <span className="text-[#4A90D9]">Team</span>
        </h2>
        <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
          Built by physicians and engineers passionate about transforming healthcare
        </p>

        <div
          ref={ref}
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          {team.map((member, i) => (
            <div
              key={member.name}
              className="group bg-white border border-gray-200 rounded-2xl p-6 text-center hover:border-[#4A90D9]/40 hover:shadow-md transition-all duration-500 hover:-translate-y-1"
              style={{ transitionDelay: `${i * 80}ms` }}
              data-testid={`card-team-${member.initials.toLowerCase()}`}
            >
              <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden border-2 border-gray-200 group-hover:border-[#4A90D9]/50 transition-colors duration-500">
                <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-gray-900 font-semibold text-lg">{member.name}</h3>
              <p className="text-[#4A90D9] text-sm font-medium mt-1">{member.title}</p>
              <p className="text-gray-500 text-sm mt-3 leading-relaxed">{member.bio}</p>
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
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4" data-testid="text-faq-title">
          Frequently Asked <span className="text-[#4A90D9]">Questions</span>
        </h2>
        <p className="text-center text-gray-500 mb-12">
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
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-[#4A90D9]/30 hover:shadow-sm transition-colors"
                data-testid={`faq-item-${i}`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                  data-testid={`button-faq-${i}`}
                >
                  <span className="text-gray-900 font-medium text-sm pr-4">{faq.q}</span>
                  <ChevronRight
                    className={`w-5 h-5 text-[#4A90D9] shrink-0 transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-96" : "max-h-0"}`}
                >
                  <p className="px-5 pb-5 text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type MemberType = "physician" | "nurse" | "medstudent" | "other";

const MEMBER_TYPES: { id: MemberType; label: string; sub: string; icon: ReactNode; badge?: string }[] = [
  {
    id: "physician",
    label: "Physician",
    sub: "MD · DO · MBBS",
    icon: <Stethoscope className="w-5 h-5" />,
    badge: "NPI required",
  },
  {
    id: "nurse",
    label: "Nurse / NP / PA",
    sub: "RN · NP · PA-C · CRNA",
    icon: <Heart className="w-5 h-5" />,
  },
  {
    id: "medstudent",
    label: "Medical Student",
    sub: "MS1 – MS4 · Intern · Resident",
    icon: <GraduationCap className="w-5 h-5" />,
  },
  {
    id: "other",
    label: "Other Provider",
    sub: "Pharmacist · PT · Allied Health",
    icon: <Users className="w-5 h-5" />,
  },
];

function DemoFormSection() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [memberType, setMemberType] = useState<MemberType>("physician");
  const [npiNumber, setNpiNumber] = useState("");
  const [npiStatus, setNpiStatus] = useState<"idle" | "verifying" | "verified" | "failed">("idle");
  const [npiData, setNpiData] = useState<{ name: string; credential: string; taxonomy: string } | null>(null);
  const [school, setSchool] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  const isPhysician = memberType === "physician";
  const isMedStudent = memberType === "medstudent";
  const canSubmit = isPhysician ? npiStatus === "verified" : true;

  function handleTypeChange(t: MemberType) {
    setMemberType(t);
    setNpiNumber("");
    setNpiStatus("idle");
    setNpiData(null);
  }

  async function verifyNpi() {
    if (npiNumber.length !== 10 || !/^\d+$/.test(npiNumber)) {
      toast({ title: "Invalid NPI", description: "NPI must be exactly 10 digits.", variant: "destructive" });
      return;
    }
    setNpiStatus("verifying");
    try {
      const res = await fetch(`https://npiregistry.cms.hhs.gov/api/?number=${npiNumber}&version=2.1`);
      const data = await res.json();
      if (data.result_count > 0) {
        const result = data.results[0];
        const cred = (result.basic?.credential || "").trim();
        const isPhysicianCred = /^(MD|DO|MBBS|MBBCh|MBBChB)/i.test(cred);
        const enumType = result.enumeration_type;
        const status = result.basic?.status;
        if (enumType === "NPI-1" && status === "A" && isPhysicianCred) {
          const primaryTax = result.taxonomies?.find((t: { primary: boolean }) => t.primary) || result.taxonomies?.[0];
          setNpiData({
            name: `${result.basic.first_name} ${result.basic.last_name}, ${cred}`,
            credential: cred,
            taxonomy: primaryTax?.desc || "Physician",
          });
          setNpiStatus("verified");
          toast({ title: "NPI Verified ✓", description: `Verified: ${result.basic.first_name} ${result.basic.last_name}, ${cred}` });
        } else {
          setNpiStatus("failed");
          toast({ title: "Verification Failed", description: "This NPI does not belong to an active MD/DO physician.", variant: "destructive" });
        }
      } else {
        setNpiStatus("failed");
        toast({ title: "NPI Not Found", description: "No provider found with this NPI number.", variant: "destructive" });
      }
    } catch {
      setNpiStatus("failed");
      toast({ title: "Error", description: "Could not reach NPI registry. Please try again.", variant: "destructive" });
    }
  }

  const form = useForm<InsertDemoRequest>({
    resolver: zodResolver(insertDemoRequestSchema),
    defaultValues: { name: "", email: "", organization: "", role: "", message: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertDemoRequest) => {
      const res = await apiRequest("POST", "/api/demo-requests", data);
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Application received!", description: "We'll review your request and be in touch soon." });
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    },
  });

  function onSubmit(data: InsertDemoRequest) {
    mutation.mutate({ ...data, role: data.role || memberType });
  }

  const namePlaceholder =
    memberType === "physician" ? "Dr. Jane Smith" :
    memberType === "nurse" ? "Jane Smith, RN" :
    memberType === "medstudent" ? "Jane Smith (MS3)" :
    "Jane Smith";

  const orgPlaceholder =
    memberType === "medstudent" ? "University of California – SF School of Medicine" :
    "Memorial Hospital / Health System";

  const rolePlaceholder =
    memberType === "physician" ? "Cardiologist, Hospitalist, etc." :
    memberType === "nurse" ? "ICU Nurse, ER NP, PA-C, etc." :
    memberType === "medstudent" ? "MS1, MS2, MS3, PGY-1 Resident, etc." :
    "Pharmacist, Physical Therapist, etc.";

  return (
    <section id="demo" className="py-24 bg-gray-100">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4" data-testid="text-demo-title">
          JOIN THE <span className="text-[#4A90D9]">COMMUNITY</span>
        </h2>
        <p className="text-center text-gray-500 mb-8">
          ARIbots welcomes physicians, nurses, NPs, PAs, medical students, and allied health professionals.
        </p>

        {submitted ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#4A90D9]/30 shadow-sm" data-testid="text-demo-success">
            <div className="w-16 h-16 rounded-full bg-[#4A90D9]/10 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-[#4A90D9]" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Application Received!</h3>
            <p className="text-gray-600">We'll review your request and be in touch shortly.</p>
            <Button
              onClick={() => { setSubmitted(false); setMemberType("physician"); }}
              className="mt-6 bg-[#4A90D9] text-white hover:bg-[#5BA0E9]"
              data-testid="button-submit-another"
            >
              Submit Another Request
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

              {/* Member type selector */}
              <div className="grid grid-cols-2 gap-3" data-testid="member-type-selector">
                {MEMBER_TYPES.map(mt => (
                  <button
                    key={mt.id}
                    type="button"
                    onClick={() => handleTypeChange(mt.id)}
                    data-testid={`btn-member-type-${mt.id}`}
                    className={`relative flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                      memberType === mt.id
                        ? "border-[#4A90D9] bg-[#4A90D9]/5"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <span className={`mt-0.5 shrink-0 ${memberType === mt.id ? "text-[#4A90D9]" : "text-gray-400"}`}>
                      {mt.icon}
                    </span>
                    <span>
                      <span className={`block text-sm font-semibold ${memberType === mt.id ? "text-[#4A90D9]" : "text-gray-800"}`}>
                        {mt.label}
                      </span>
                      <span className="block text-xs text-gray-500 mt-0.5">{mt.sub}</span>
                    </span>
                    {mt.badge && (
                      <span className="absolute top-2 right-2 text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                        {mt.badge}
                      </span>
                    )}
                    {memberType === mt.id && (
                      <CheckCircle2 className="absolute bottom-2 right-2 w-4 h-4 text-[#4A90D9]" />
                    )}
                  </button>
                ))}
              </div>

              {/* NPI block — physicians only */}
              {isPhysician && (
                <div className={`rounded-xl border p-4 transition-colors ${npiStatus === "verified" ? "bg-green-50 border-green-300" : npiStatus === "failed" ? "bg-red-50 border-red-300" : "bg-blue-50 border-blue-200"}`}>
                  <label className="text-gray-700 font-medium text-sm block mb-1">
                    NPI Number <span className="text-red-500">*</span>
                    <span className="text-gray-400 font-normal ml-2 text-xs">Required for MD / DO verification</span>
                  </label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={npiNumber}
                      onChange={(e) => {
                        setNpiNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
                        setNpiStatus("idle");
                        setNpiData(null);
                      }}
                      placeholder="10-digit NPI number"
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[#4A90D9]/40 font-mono tracking-wider"
                      maxLength={10}
                      data-testid="input-npi-number"
                    />
                    <Button
                      type="button"
                      onClick={verifyNpi}
                      disabled={npiNumber.length !== 10 || npiStatus === "verifying"}
                      className="shrink-0 bg-[#4A90D9] text-white hover:bg-[#357abd] disabled:opacity-50"
                      data-testid="button-verify-npi"
                    >
                      {npiStatus === "verifying" ? "Verifying…" : "Verify"}
                    </Button>
                  </div>
                  {npiStatus === "verified" && npiData && (
                    <div className="mt-2 flex items-center gap-2 text-green-700 text-xs" data-testid="text-npi-verified">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Verified: <strong>{npiData.name}</strong> · {npiData.taxonomy}</span>
                    </div>
                  )}
                  {npiStatus === "failed" && (
                    <div className="mt-2 flex items-center gap-2 text-red-600 text-xs" data-testid="text-npi-failed">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>Verification failed. Only active MD/DO providers are accepted.</span>
                    </div>
                  )}
                  {npiStatus === "idle" && (
                    <p className="mt-2 text-gray-400 text-xs">
                      Don't know your NPI? Look it up at{" "}
                      <a href="https://npiregistry.cms.hhs.gov" target="_blank" rel="noopener noreferrer" className="text-[#4A90D9] hover:underline">
                        npiregistry.cms.hhs.gov
                      </a>
                    </p>
                  )}
                </div>
              )}

              {/* Nurse / NP / PA — optional license */}
              {memberType === "nurse" && (
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                  <label className="text-gray-700 font-medium text-sm block mb-1">
                    License / Certification Number
                    <span className="text-gray-400 font-normal ml-2 text-xs">Optional — RN, NP, PA, or CRNA license</span>
                  </label>
                  <Input
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. RN1234567 or NPI (if applicable)"
                    className="mt-2 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-purple-300"
                    data-testid="input-license-number"
                  />
                  <p className="mt-2 text-purple-600 text-xs">No NPI? No problem — your work email will be used for identity verification.</p>
                </div>
              )}

              {/* Medical student — school + year */}
              {isMedStudent && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-amber-600" />
                    Medical School Details
                  </p>
                  <div>
                    <label className="text-gray-600 text-xs font-medium block mb-1">School Name</label>
                    <Input
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="e.g. Harvard Medical School"
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-amber-300"
                      data-testid="input-med-school"
                    />
                  </div>
                  <div>
                    <label className="text-gray-600 text-xs font-medium block mb-1">Expected Graduation Year</label>
                    <Input
                      value={gradYear}
                      onChange={(e) => setGradYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="e.g. 2027"
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-amber-300"
                      maxLength={4}
                      data-testid="input-grad-year"
                    />
                  </div>
                  <p className="text-amber-700 text-xs">Medical students get full access. No NPI required — your .edu email is used for verification.</p>
                </div>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Full Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={namePlaceholder}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[#4A90D9]/40"
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
                    <FormLabel className="text-gray-700 font-medium">
                      Work / School Email
                      {isMedStudent && <span className="text-amber-600 font-normal ml-1 text-xs">(.edu preferred)</span>}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder={isMedStudent ? "jane@med.ucsf.edu" : "jane@hospital.org"}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[#4A90D9]/40"
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
                    <FormLabel className="text-gray-700 font-medium">
                      {isMedStudent ? "Medical School" : "Hospital / Organization"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={orgPlaceholder}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[#4A90D9]/40"
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
                    <FormLabel className="text-gray-700 font-medium">
                      {memberType === "physician" ? "Specialty" : "Role / Year"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={rolePlaceholder}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[#4A90D9]/40"
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
                    <FormLabel className="text-gray-700 font-medium">Message (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Tell us about yourself and how you plan to use ARIbots..."
                        rows={4}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[#4A90D9]/40 resize-none"
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
                disabled={mutation.isPending || !canSubmit}
                data-testid="button-submit-demo"
              >
                {mutation.isPending ? "Sending..." : "REQUEST ACCESS"}
              </Button>
              {isPhysician && npiStatus !== "verified" && (
                <p className="text-center text-gray-400 text-xs">Verify your NPI number above to submit</p>
              )}
              {!isPhysician && (
                <p className="text-center text-gray-400 text-xs">
                  Your application will be reviewed within 1–2 business days.
                </p>
              )}
            </form>
          </Form>
        )}
      </div>
    </section>
  );
}

function Footer() {
  const CONTACT_URL = "https://www.aribots.com/contact-8";
  return (
    <footer className="py-12 bg-[#111] border-t border-white/5">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src={aribotLogoPath} alt="ARIbots" className="h-8 w-8 rounded object-contain" />
              <span className="text-white font-semibold text-lg">ARI bots</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed">
              Empowering clinicians with AI-driven clinical decision support — built by physicians, for physicians.
            </p>
          </div>

          <div>
            <h4 className="text-white/70 text-xs uppercase tracking-widest font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {[
                { label: "Features", id: "capabilities" },
                { label: "Reviews", id: "testimonials" },
                { label: "Team", id: "team" },
                { label: "FAQ", id: "faq" },
              ].map((item) => (
                <li key={item.label}>
                  <button
                    onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" })}
                    className="text-white/40 hover:text-[#4A90D9] text-sm transition-colors"
                    data-testid={`link-footer-${item.id}`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white/70 text-xs uppercase tracking-widest font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 mb-5">
              <li className="flex items-center gap-2 text-white/50 text-sm">
                <Phone className="w-3.5 h-3.5 text-[#4A90D9] shrink-0" />
                <a href="tel:4152289933" className="hover:text-[#4A90D9] transition-colors">415.228.9933</a>
              </li>
              <li className="flex items-center gap-2 text-white/50 text-sm">
                <Mail className="w-3.5 h-3.5 text-[#4A90D9] shrink-0" />
                <a href="mailto:info@aribots.com" className="hover:text-[#4A90D9] transition-colors">info@aribots.com</a>
              </li>
            </ul>
            <div className="flex items-center gap-3 mb-5">
              {[
                { href: "https://www.facebook.com/aribots", label: "Facebook", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
                { href: "https://www.twitter.com/aribots", label: "Twitter / X", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
                { href: "https://www.linkedin.com/company/aribots", label: "LinkedIn", path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
                { href: "https://www.instagram.com/aribots", label: "Instagram", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#4A90D9]/20 hover:border-[#4A90D9]/40 transition-colors group"
                  data-testid={`link-social-${s.label.toLowerCase()}`}
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white/40 group-hover:fill-[#4A90D9] transition-colors">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
            <a
              href={CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4A90D9]/10 border border-[#4A90D9]/30 text-[#4A90D9] text-xs font-medium hover:bg-[#4A90D9]/20 transition-colors"
              data-testid="link-footer-contact"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Send Us a Message
            </a>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 text-center">
          <p className="text-white/30 text-xs">
            © {new Date().getFullYear()} ARI bots. All rights reserved. Empowering medicine with AI.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="bg-gray-100 min-h-screen">
      <LandingNavbar />
      <HeroSection />
      <MeetAriSection />
      <PhysicianFeaturesSection />
      <HowAriWorksSection />
      <CapabilitiesSection />
      <WhatAriKnowsSection />
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
