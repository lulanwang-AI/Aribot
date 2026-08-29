import { useState } from "react";
import { SignIn, SignUp } from "@clerk/react";
import { dark } from "@clerk/themes";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ClerkAuthScreenProps {
  mode: "sign-in" | "sign-up";
  basePath: string;
  onDemoLogin: () => void | Promise<void>;
  onBack: () => void;
}

export function ClerkAuthScreen({
  mode,
  basePath,
  onDemoLogin,
  onBack,
}: ClerkAuthScreenProps) {
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    try {
      await onDemoLogin();
    } finally {
      setIsDemoLoading(false);
    }
  };

  const clerkAppearance = {
    baseTheme: dark,
    variables: {
      colorPrimary: "hsl(198, 85%, 52%)",
      colorBackground: "transparent",
      colorForeground: "hsl(210, 35%, 96%)",
      colorInput: "hsl(216, 28%, 20%)",
      colorBorder: "hsl(216, 28%, 18%)",
      borderRadius: "0.5rem",
    },
    elements: {
      rootBox: "w-full",
      cardBox: "w-full shadow-none",
      card: "w-full bg-card/90 border border-white/10 shadow-2xl backdrop-blur-xl rounded-3xl mx-auto",
      headerTitle: "text-2xl font-bold tracking-tight text-white",
      headerSubtitle: "text-sm text-muted-foreground",
      logoBox: "hidden",
      socialButtonsBlockButton: "border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors",
      socialButtonsBlockButtonText: "font-medium",
      dividerLine: "bg-white/10",
      dividerText: "text-muted-foreground",
      formFieldLabel: "text-xs font-medium text-white/70",
      formFieldInput: "border-white/10 bg-white/5 text-white transition-colors focus:border-primary focus:ring-1 focus:ring-primary",
      formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-none",
      footerActionText: "text-muted-foreground",
      footerActionLink: "text-primary hover:text-primary/90 transition-colors",
      identityPreview: "border-white/10 bg-white/5",
      identityPreviewText: "text-white",
      identityPreviewEditButtonIcon: "text-muted-foreground hover:text-white transition-colors",
      formFieldInputShowPasswordButton: "text-muted-foreground hover:text-white transition-colors",
    },
  };

  return (
    <div className="dark min-h-[100dvh] bg-background text-foreground selection:bg-primary/30 font-inter">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-48 -right-24 h-96 w-96 rounded-full bg-teal-500/10 blur-[120px]" />
      </div>

      <main className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2 shadow-xl">
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-teal-400/15 text-primary">
                <KeyRound className="h-7 w-7" />
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-400">Ari EMR</p>
          </div>

          {mode === "sign-in" ? (
            <SignIn
              routing="path"
              path={`${basePath}/sign-in`}
              signUpUrl={`${basePath}/sign-up`}
              fallbackRedirectUrl={`${basePath}/workspace`}
              appearance={clerkAppearance}
            />
          ) : (
            <SignUp
              routing="path"
              path={`${basePath}/sign-up`}
              signInUrl={`${basePath}/sign-in`}
              fallbackRedirectUrl={`${basePath}/workspace`}
              appearance={clerkAppearance}
            />
          )}

          {mode === "sign-in" && (
            <div className="mt-6 flex items-start gap-3 rounded-3xl border border-teal-400/20 bg-teal-400/5 p-5 shadow-lg backdrop-blur-xl transition-all hover:bg-teal-400/10" data-testid="demo-access-card">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">Shared demo account</p>
                <p className="mt-1 text-xs leading-relaxed text-teal-100/70">
                  Explore the seeded patient, imaging, scheduling, billing, and clinical AI experience.
                </p>
                <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-xl border border-teal-400/20 bg-black/20 px-3 py-2">
                    <span className="block text-[10px] uppercase tracking-wider text-teal-200/50">Email</span>
                    <code className="mt-0.5 block text-teal-200" data-testid="text-demo-email">demo@aribots.local</code>
                  </div>
                  <div className="rounded-xl border border-teal-400/20 bg-black/20 px-3 py-2">
                    <span className="block text-[10px] uppercase tracking-wider text-teal-200/50">Password</span>
                    <code className="mt-0.5 block text-teal-200" data-testid="text-demo-password">demo</code>
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="mt-4 w-full rounded-xl border-teal-400/25 bg-transparent text-teal-200 hover:bg-teal-400/20 hover:text-white" 
                  onClick={handleDemoLogin} 
                  disabled={isDemoLoading} 
                  data-testid="button-enter-demo"
                >
                  {isDemoLoading ? "Opening demo…" : "Enter demo account"}
                  {!isDemoLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          <button 
            type="button" 
            onClick={onBack} 
            className="mt-8 block w-full text-center text-xs text-muted-foreground transition-colors hover:text-white" 
            data-testid="button-emr-back"
          >
            Back to Ari EMR overview
          </button>
        </div>
      </main>
    </div>
  );
}
