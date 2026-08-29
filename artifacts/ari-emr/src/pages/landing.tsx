import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, ShieldCheck, Zap, Stethoscope, Microscope, Brain, ArrowUpRight } from "lucide-react";
import logoUrl from "@assets/aribot-mark-primary-1024_1785138240677.png";
import heroAbstractUrl from "@/assets/hero-abstract.png";

export default function LandingPage() {
  useEffect(() => {
    document.title = "Ari EMR | Clinical Records and Imaging by ARIbots";
    const description =
      "Ari EMR brings patient charts, medical imaging, clinical AI, scheduling, billing, and practice operations into one clinician-focused workspace.";
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
    document
      .querySelector<HTMLMetaElement>('meta[property="og:description"]')
      ?.setAttribute("content", description);
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  };

  return (
    <div className="dark min-h-[100dvh] bg-background text-foreground selection:bg-primary/30 font-inter">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[50%] bg-teal-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Navigation */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12 md:py-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white shadow-lg p-1.5 flex items-center justify-center">
            <img src={logoUrl} alt="ARI Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight tracking-tight">Ari EMR</div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-white/50 font-semibold">by ARIbots</div>
          </div>
        </div>
        <nav className="flex items-center gap-6">
          <a
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-white transition-colors"
            data-testid="link-emr-back-to-hub"
          >
            Back to ARIbots
          </a>
          <Link href="/workspace" className="hidden sm:flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-medium text-sm transition-all duration-300 border border-primary/20 hover:border-primary cursor-pointer" data-testid="link-emr-header-workspace">
            Clinical Workspace
            <ArrowRight className="w-4 h-4" />
          </Link>
        </nav>
      </header>

      <main className="relative z-10 px-6 md:px-12 pt-20 pb-32">
        {/* Hero Section */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="max-w-4xl mx-auto text-center mt-12 md:mt-24"
        >
          <motion.div variants={item} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-teal-400 mb-8 tracking-wide uppercase">
            <Zap className="w-3.5 h-3.5 fill-teal-400/20" />
            Next-generation clinical intelligence
          </motion.div>
          
          <motion.h1 variants={item} className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">
            Clarity at the <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-300 to-primary">Point of Care.</span>
          </motion.h1>
          
          <motion.p variants={item} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
            A calm, precise, and secure workspace built for modern practitioners. Seamlessly integrate advanced medical imaging, patient records, and real-time AI assistance into your clinical workflow.
          </motion.p>
          
          <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/workspace" className="flex items-center justify-center h-12 px-8 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-[0_0_40px_-10px_rgba(var(--primary),0.5)] cursor-pointer text-base" data-testid="link-emr-open-workspace">
              Open Workspace
              <ArrowUpRight className="w-4 h-4 ml-2 opacity-70" />
            </Link>
            <a href="/" className="flex items-center justify-center h-12 px-8 rounded-full bg-white/5 text-white font-medium hover:bg-white/10 transition-colors border border-white/10 text-base" data-testid="link-emr-learn-aribots">
              Learn about ARIbots
            </a>
          </motion.div>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-6xl mx-auto mt-40 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <motion.div variants={item} className="group relative p-8 rounded-3xl bg-card border border-white/5 hover:border-white/10 transition-colors overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
              <Stethoscope className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Intelligent Records</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Unified patient charts that synthesize encounters, vitals, and problems into an actionable narrative. Zero clutter, complete clarity.
            </p>
          </motion.div>

          <motion.div variants={item} className="group relative p-8 rounded-3xl bg-card border border-white/5 hover:border-white/10 transition-colors overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-6 border border-teal-500/20">
              <Microscope className="w-6 h-6 text-teal-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Advanced Imaging</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Native DICOM integration with interactive 3D visualization. Analyze scans directly within the patient context without switching apps.
            </p>
          </motion.div>

          <motion.div variants={item} className="group relative p-8 rounded-3xl bg-card border border-white/5 hover:border-white/10 transition-colors overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
              <Brain className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Clinical AI</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The ARI platform actively assists with diagnosis suggestions, note drafting, and cross-referencing patient history in real-time.
            </p>
          </motion.div>
        </motion.div>

        {/* Dashboard Preview Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-6xl mx-auto mt-32 rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl relative"
        >
          {/* Mac window controls */}
          <div className="h-10 border-b border-white/10 bg-white/5 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          
          <div className="relative aspect-[16/9] md:aspect-[21/9]">
            {/* The generated image goes here */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
            <img 
              src={heroAbstractUrl}
              alt="ARI Platform Interface" 
              className="w-full h-full object-cover opacity-80"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            {/* Decorative data overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 mix-blend-screen pointer-events-none">
                <div className="w-full max-w-4xl grid grid-cols-3 gap-8 p-12 opacity-30">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-24 border border-white/20 rounded-xl bg-white/5 p-4 flex flex-col justify-end">
                      <div className="w-1/2 h-2 bg-white/20 rounded-full mb-2" />
                      <div className="w-3/4 h-2 bg-white/10 rounded-full" />
                    </div>
                  ))}
                </div>
            </div>
          </div>
        </motion.div>
        
        {/* Trust markers */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="mt-32 max-w-4xl mx-auto flex flex-col items-center border-t border-white/5 pt-16"
        >
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mb-8">
            <ShieldCheck className="w-5 h-5 text-emerald-400/70" />
            <span>Built for modern compliance standards</span>
          </div>
        </motion.div>
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-black/20 py-8 text-center text-sm text-white/40 mt-auto">
        <p>© {new Date().getFullYear()} ARIbots. All rights reserved. EMR Platform Demo.</p>
      </footer>
    </div>
  );
}
