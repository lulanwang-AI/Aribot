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
} from "lucide-react";
import aribotLogoPath from "@assets/20260226140824_1772181173123.png";

function NeuralNetworkCanvas() {
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
      const count = Math.min(80, Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 8000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
      }));
    }

    function animate() {
      if (!canvas || !ctx) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > w) node.vx *= -1;
        if (node.y < 0 || node.y > h) node.vy *= -1;
      });

      const maxDist = 150;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.3;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(200, 241, 53, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      nodes.forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(200, 241, 53, 0.6)";
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    }

    function handleResize() {
      resize();
      initNodes();
    }

    resize();
    initNodes();
    animate();

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      data-testid="canvas-neural-network"
    />
  );
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
      <div className="text-4xl md:text-5xl font-bold text-[#c8f135]">
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
    { label: "Team", id: "vision" },
    { label: "Request Demo", id: "demo" },
    { label: "Contact", id: "demo" },
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
                stroke="#c8f135"
                strokeWidth="2"
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center text-[#c8f135] text-[8px] font-bold leading-tight">
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
              className="text-sm text-white/80 hover:text-[#c8f135] transition-colors"
              data-testid={`link-nav-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <button
          className="md:hidden text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
          data-testid="button-mobile-menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#111]/95 border-t border-white/10 px-4 pb-4">
          {links.map((l) => (
            <button
              key={l.label}
              onClick={() => scrollTo(l.id)}
              className="block w-full text-left py-3 text-white/80 hover:text-[#c8f135] transition-colors text-sm"
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

function HeroSection() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[#111]" />
      <NeuralNetworkCanvas />
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <h1
          className="text-4xl sm:text-5xl md:text-7xl font-bold text-white tracking-tight leading-tight"
          data-testid="text-hero-headline"
        >
          EMPOWERING{" "}
          <br className="hidden sm:block" />
          MEDICINE WITH{" "}
          <br className="hidden sm:block" />
          AI
        </h1>
        <p className="mt-6 text-lg md:text-xl text-white/70" data-testid="text-hero-tagline">
          ~ built by physicians for physicians
        </p>
        <Button
          onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
          className="mt-10 bg-[#c8f135] text-black hover:bg-[#d4f85a] font-semibold px-8 py-6 text-lg rounded-full"
          data-testid="button-hero-cta"
        >
          Request Demo
        </Button>
        <div className="mt-16 animate-bounce">
          <ChevronDown className="w-8 h-8 text-white/50 mx-auto" />
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
          meet <span className="text-[#c8f135]">ARI</span>
        </h2>
        <div
          ref={ref}
          className={`grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group bg-[#222] border border-white/10 rounded-2xl p-8 hover:border-[#c8f135]/50 transition-all duration-500 hover:-translate-y-1"
              style={{ transitionDelay: `${i * 150}ms` }}
              data-testid={`card-feature-${f.title.toLowerCase()}`}
            >
              <div className="w-14 h-14 rounded-xl bg-[#c8f135]/10 flex items-center justify-center mb-6 group-hover:bg-[#c8f135]/20 transition-colors">
                <f.icon className="w-7 h-7 text-[#c8f135]" />
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
  const steps = [
    {
      icon: Stethoscope,
      title: "Clinical Decision Support",
      description: "ARI analyzes patient data in real-time, providing evidence-based clinical recommendations to support physician decision-making at the point of care.",
    },
    {
      icon: Activity,
      title: "Real-Time Triage Assessment",
      description: "Instant severity scoring and prioritization of patients based on presenting symptoms, vital signs, and clinical indicators for optimal resource allocation.",
    },
    {
      icon: FileSearch,
      title: "Differential Diagnosis Generation",
      description: "AI-powered analysis generates comprehensive differential diagnoses ranked by probability, helping physicians explore all possibilities efficiently.",
    },
    {
      icon: Pill,
      title: "Evidence-Based Treatment Plans",
      description: "Recommendations grounded in the latest medical literature, clinical guidelines, and institutional protocols for personalized treatment strategies.",
    },
    {
      icon: TrendingUp,
      title: "Continuous Learning from Outcomes",
      description: "ARI continuously improves by learning from real clinical outcomes, refining its algorithms to deliver increasingly accurate and relevant insights.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#111]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4" data-testid="text-how-works-title">
          How <span className="text-[#c8f135]">ARI</span> Works
        </h2>
        <p className="text-center text-white/50 mb-16 max-w-2xl mx-auto">
          A step-by-step breakdown of ARI's AI-powered clinical workflow
        </p>

        <div ref={ref} className="space-y-6">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className={`flex items-start gap-6 bg-[#1a1a1a] border border-white/5 rounded-xl p-6 transition-all duration-700 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"}`}
              style={{ transitionDelay: `${i * 100}ms` }}
              data-testid={`step-${i + 1}`}
            >
              <div className="shrink-0 w-12 h-12 rounded-full bg-[#c8f135]/10 flex items-center justify-center">
                <step.icon className="w-6 h-6 text-[#c8f135]" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[#c8f135] text-xs font-bold uppercase tracking-wider">Step {i + 1}</span>
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                </div>
                <p className="text-white/60 text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AiInHealthcareSection() {
  const { ref, isVisible } = useInView();
  const capabilities = [
    {
      icon: MessageSquare,
      title: "Natural Language Processing",
      description: "Advanced NLP understands clinical notes, lab reports, and patient narratives in natural language, extracting key medical information automatically.",
    },
    {
      icon: BarChart3,
      title: "Predictive Analytics",
      description: "Machine learning models predict patient deterioration, readmission risk, and treatment response to enable proactive clinical interventions.",
    },
    {
      icon: Database,
      title: "EHR Integration",
      description: "Seamless integration with existing Electronic Health Record systems, pulling relevant patient data without disrupting established clinical workflows.",
    },
    {
      icon: Lock,
      title: "HIPAA-Compliant Security",
      description: "End-to-end encryption, role-based access controls, and comprehensive audit trails ensure full HIPAA compliance and patient data protection.",
    },
  ];

  return (
    <section id="ai-healthcare" className="py-24 bg-[#1a1a1a]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16" data-testid="text-ai-healthcare-title">
          AI in <span className="text-[#c8f135]">Healthcare</span>
        </h2>

        <div
          ref={ref}
          className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          {capabilities.map((cap, i) => (
            <div
              key={cap.title}
              className="flex gap-5 p-6 bg-[#222] border border-white/10 rounded-2xl hover:border-[#c8f135]/30 transition-all duration-500"
              style={{ transitionDelay: `${i * 100}ms` }}
              data-testid={`card-capability-${cap.title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="shrink-0 w-12 h-12 rounded-xl bg-[#c8f135]/10 flex items-center justify-center">
                <cap.icon className="w-6 h-6 text-[#c8f135]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">{cap.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{cap.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
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
        "Our CEO, a practicing physician and Director of Infectious Disease at Vibra Hospitals, believes that integrating modern technology is essential to advancing medical science, enhancing patient care, and empowering clinicians in the pursuit of novel cures and treatments.",
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
          OUR <span className="text-[#c8f135]">VISION</span>
        </h2>

        <div
          ref={ref}
          className={`grid grid-cols-1 md:grid-cols-3 gap-8 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          {cards.map((card, i) => (
            <div
              key={card.title}
              className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 text-center hover:border-[#c8f135]/30 transition-all duration-500"
              style={{ transitionDelay: `${i * 150}ms` }}
              data-testid={`card-vision-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="w-16 h-16 rounded-full bg-[#c8f135]/10 flex items-center justify-center mx-auto mb-6">
                <card.icon className="w-8 h-8 text-[#c8f135]" />
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
          SCHEDULE A <span className="text-[#c8f135]">DEMO</span>
        </h2>
        <p className="text-center text-white/50 mb-12">
          Please fill your contact details below
        </p>

        {submitted ? (
          <div className="text-center py-16 bg-[#222] rounded-2xl border border-[#c8f135]/30" data-testid="text-demo-success">
            <div className="w-16 h-16 rounded-full bg-[#c8f135]/20 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-[#c8f135]" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Message Received!</h3>
            <p className="text-white/60">We'll get back to you shortly.</p>
            <Button
              onClick={() => setSubmitted(false)}
              className="mt-6 bg-[#c8f135] text-black hover:bg-[#d4f85a]"
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
                        className="bg-[#222] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#c8f135]/50"
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
                        className="bg-[#222] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#c8f135]/50"
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
                        className="bg-[#222] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#c8f135]/50"
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
                        className="bg-[#222] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#c8f135]/50"
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
                        className="bg-[#222] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#c8f135]/50 resize-none"
                        data-testid="input-demo-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-[#c8f135] text-black hover:bg-[#d4f85a] font-semibold py-6 text-lg"
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
      <AiInHealthcareSection />
      <OurVisionSection />
      <DemoFormSection />
      <Footer />
    </div>
  );
}
