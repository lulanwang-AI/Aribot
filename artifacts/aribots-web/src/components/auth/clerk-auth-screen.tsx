import { SignIn, SignUp } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { BRAND_NAME, BrandMark } from "@/components/brand-mark";
import aribotLogoPath from "@assets/aribot-mark-primary-1024_1777274279204.png";

export interface ClerkAuthScreenProps {
  mode: "sign-in" | "sign-up";
  product: "aribots" | "amr";
  basePath: string;
  onDemoLogin?: () => void;
  onBack?: () => void;
}

const clerkElements = {
  rootBox: "w-full mx-auto",
  cardBox: "w-full shadow-none",
  card: "w-full bg-card border border-border shadow-md rounded-2xl p-6 sm:p-8",
  headerTitle: "text-2xl font-semibold tracking-tight text-foreground",
  headerSubtitle: "text-sm text-muted-foreground",
  socialButtonsBlockButton: "h-10 bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors",
  socialButtonsBlockButtonText: "font-medium",
  dividerLine: "bg-border",
  dividerText: "text-xs font-medium text-muted-foreground px-2",
  formFieldInput: "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  formFieldLabel: "text-sm font-medium text-foreground mb-1.5",
  formButtonPrimary: "h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors shadow-sm",
  footerActionText: "text-sm text-muted-foreground",
  footerActionLink: "text-sm text-primary hover:text-primary/90 font-medium ml-1",
  identityPreview: "border border-border bg-muted/50 rounded-lg px-4 py-3 mt-4",
  identityPreviewText: "text-sm font-medium text-foreground",
  identityPreviewEditButton: "text-primary hover:text-primary/90",
  formFieldWarningText: "text-xs text-destructive",
  formFieldErrorText: "text-xs text-destructive",
  alertText: "text-sm text-destructive",
  alert: "bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3",
};

export function ClerkAuthScreen({
  mode,
  product,
  basePath,
  onDemoLogin,
  onBack,
}: ClerkAuthScreenProps) {
  const [demoLoading, setDemoLoading] = useState(false);
  const isAmr = product === "amr";
  
  // Set fallback URLs per product specifications
  const fallbackRedirectUrl = isAmr ? "/dashboard" : "/aribot";
  
  // Cross-link routing logic preserving product query parameter
  const signUpUrl = `${basePath}/sign-up${isAmr ? "?product=amr" : ""}`;
  const signInUrl = `${basePath}/sign-in${isAmr ? "?product=amr" : ""}`;

  async function enterDemo() {
    if (!onDemoLogin) return;
    setDemoLoading(true);
    try {
      await onDemoLogin();
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className={`min-h-[100dvh] flex flex-col md:flex-row bg-background w-full ${isAmr ? "amr-public-theme" : ""}`}>
      {/* Visual / Branding Side (Hidden on Mobile) */}
      <div className="relative hidden md:flex flex-col justify-between w-1/2 max-w-2xl bg-muted/30 overflow-hidden border-r border-border">
        {/* Abstract Background Gradient */}
        <div 
          className={`absolute inset-0 pointer-events-none ${
            isAmr 
              ? "bg-[radial-gradient(ellipse_60rem_80rem_at_0%_0%,hsl(var(--primary)/0.15),transparent_70%)]"
              : "bg-[radial-gradient(ellipse_60rem_80rem_at_0%_0%,hsl(var(--primary)/0.10),transparent_70%)]"
          }`} 
        />
        
        {/* Content */}
        <div className="relative z-10 p-10 lg:p-14 flex flex-col h-full">
          <div>
            {isAmr ? (
              <div className="flex items-center gap-3">
                <BrandMark size="lg" className="rounded-xl shadow-sm" />
                <span className="text-xl font-semibold tracking-tight text-foreground">{BRAND_NAME}</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <img 
                  src={aribotLogoPath} 
                  alt="ARIbots" 
                  className="h-10 w-10 rounded-xl shadow-sm object-contain bg-primary/10 p-1 ring-1 ring-primary/20" 
                />
                <span className="text-xl font-bold tracking-tight text-foreground">ARIbots</span>
              </div>
            )}
          </div>
          
          <div className="mt-auto mb-12">
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-foreground mb-4 leading-tight">
              {isAmr ? (
                <>Antimicrobial decision support<br />for licensed clinicians.</>
              ) : (
                <>Empowering medicine<br />with advanced AI.</>
              )}
            </h1>
            <p className="text-muted-foreground text-sm lg:text-base max-w-md leading-relaxed">
              {isAmr 
                ? "Access evidence-based stewardship guidance, hospital formularies, and antibiograms in one unified clinical workspace."
                : "Your intelligent clinical companion for triage, pre-charting, and evidence-based medical research."
              }
            </p>
          </div>
          
          <div className="flex items-start gap-3 p-4 rounded-xl bg-background/50 backdrop-blur border border-border/50 max-w-md shadow-sm">
             <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
             <p className="text-xs text-muted-foreground leading-relaxed">
               For licensed clinicians only. Not for patient use. Content is not medical advice — verify with primary sources and institutional protocols.
             </p>
          </div>
        </div>
      </div>

      {/* Auth Side */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative">
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="md:hidden flex flex-col items-center mb-8 text-center mt-4">
          {isAmr ? (
            <BrandMark size="lg" className="rounded-xl shadow-sm mb-3" />
          ) : (
            <img 
              src={aribotLogoPath} 
              alt="ARIbots" 
              className="h-14 w-14 rounded-xl shadow-sm object-contain bg-primary/10 p-1.5 ring-1 ring-primary/20 mb-3" 
            />
          )}
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isAmr ? BRAND_NAME : "ARIbots"}
          </h1>
        </div>

        <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
          {mode === "sign-in" ? (
            <SignIn 
              routing="path" 
              path={`${basePath}/sign-in`}
              signUpUrl={signUpUrl}
              fallbackRedirectUrl={fallbackRedirectUrl}
              appearance={{ elements: clerkElements }}
            />
          ) : (
            <SignUp 
              routing="path" 
              path={`${basePath}/sign-up`}
              signInUrl={signInUrl}
              fallbackRedirectUrl={fallbackRedirectUrl}
              appearance={{ elements: clerkElements }}
            />
          )}

          {mode === "sign-in" && (
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-sm" data-testid="demo-access-card">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-foreground">Shared demo account</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Explore seeded stewardship cases and reference data.
                  </p>
                  <div className="pt-2 flex flex-col gap-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground/80 w-16">Email:</span>
                      <code className="bg-background px-1.5 py-0.5 rounded border border-border/50 text-primary font-mono shadow-sm" data-testid="text-demo-email">
                        demo@aribots.local
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground/80 w-16">Password:</span>
                      <code className="bg-background px-1.5 py-0.5 rounded border border-border/50 text-primary font-mono shadow-sm" data-testid="text-demo-password">
                        demo
                      </code>
                    </div>
                  </div>
                </div>
                {onDemoLogin && (
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    className="shrink-0 w-full sm:w-auto bg-background/50 hover:bg-background border-primary/20 hover:border-primary/40 transition-all text-primary mt-2 sm:mt-0" 
                    onClick={enterDemo}
                    disabled={demoLoading}
                    data-testid="button-enter-demo"
                  >
                    {demoLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Opening demo…
                      </>
                    ) : (
                      "Enter demo"
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {onBack && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-2 px-4 rounded-full hover:bg-muted"
              >
                Back to {isAmr ? "overview" : "overview"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
