import { useState } from "react";
import { ArrowRight, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-access";
import { apiRequest } from "@/lib/queryClient";

export default function LoginPage({
  onLogin,
  onNavigateToLanding,
}: {
  onLogin: () => void;
  onNavigateToLanding: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function signIn(nextEmail: string, nextPassword: string) {
    setErrorMessage(null);
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/login", {
        email: nextEmail,
        password: nextPassword,
      });
      onLogin();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign-in failed.";
      setErrorMessage(message.replace(/^\d+:\s*/, ""));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void signIn(email, password);
  }

  function enterDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    void signIn(DEMO_EMAIL, DEMO_PASSWORD);
  }

  return (
    <div className="dark min-h-[100dvh] bg-background text-foreground selection:bg-primary/30 font-inter">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-48 -right-24 h-96 w-96 rounded-full bg-teal-500/10 blur-[120px]" />
      </div>

      <main className="relative z-10 flex min-h-[100dvh] items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2 shadow-xl">
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-teal-400/15 text-primary">
                <KeyRound className="h-7 w-7" />
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-400">Ari EMR</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Enter the clinical demo</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Explore the seeded patient, imaging, scheduling, billing, and clinical AI experience.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-card/90 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-teal-400/20 bg-teal-400/5 p-4" data-testid="demo-access-card">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">Shared demo account</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  This workspace uses sample data. No real patient information should be entered.
                </p>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
                    <span className="block text-[10px] uppercase tracking-wider text-white/40">Email</span>
                    <code className="text-teal-200" data-testid="text-demo-email">{DEMO_EMAIL}</code>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
                    <span className="block text-[10px] uppercase tracking-wider text-white/40">Password</span>
                    <code className="text-teal-200" data-testid="text-demo-password">{DEMO_PASSWORD}</code>
                  </div>
                </div>
                <Button type="button" variant="outline" className="mt-3 w-full border-teal-400/25 bg-transparent text-teal-200 hover:bg-teal-400/10 hover:text-white" onClick={enterDemo} disabled={loading} data-testid="button-enter-demo">
                  {loading ? "Opening demo…" : "Enter demo account"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-medium text-white/70">Email</span>
                <Input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="username"
                  placeholder={DEMO_EMAIL}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  data-testid="input-emr-email"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-medium text-white/70">Password</span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <Input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter demo password"
                    className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/30"
                    data-testid="input-emr-password"
                  />
                </div>
              </label>
            </div>

            {errorMessage && (
              <p role="alert" className="mt-4 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs text-red-200" data-testid="text-emr-login-error">
                {errorMessage}
              </p>
            )}

            <Button type="submit" className="mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading} data-testid="button-emr-signin">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
              Demo access is for product evaluation only. Clinical decisions require qualified professional review.
            </p>
          </form>

          <button type="button" onClick={onNavigateToLanding} className="mt-5 block w-full text-center text-xs text-muted-foreground transition-colors hover:text-white" data-testid="button-emr-back-to-landing">
            Back to Ari EMR overview
          </button>
        </div>
      </main>
    </div>
  );
}