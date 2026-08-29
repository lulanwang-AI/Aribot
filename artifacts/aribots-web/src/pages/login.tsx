import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, Loader2 } from "lucide-react";
import { BRAND_NAME, BrandMark } from "@/components/brand-mark";

export default function Login({
  onLogin,
  onNavigateToLanding,
}: {
  onLogin: () => void;
  onNavigateToLanding?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/login", {
        email: email || "clinician@example.org",
        password: password || "demo",
      });
      onLogin();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed.";
      setErrorMessage(message.replace(/^\d+:\s*/, ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60rem_40rem_at_50%_-10%,hsl(var(--primary)/0.18),transparent_70%)]"
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mb-3 flex justify-center">
            <BrandMark size="lg" className="rounded-xl shadow-sm" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground" data-testid="text-login-title">
            {BRAND_NAME}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Antimicrobial decision support for licensed clinicians
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-card-border bg-card p-6 shadow-sm"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium">
              Work email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="clinician@hospital.org"
              data-testid="input-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              data-testid="input-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="flex items-start gap-1.5 rounded-md border border-resistant/30 bg-resistant-soft p-2 text-[11px] leading-snug text-foreground"
              data-testid="text-login-error"
            >
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0 text-resistant" />
              {errorMessage}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading} data-testid="button-signin">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in
              </>
            ) : (
              "Sign in"
            )}
          </Button>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            Access is limited to licensed physicians, pharmacists and nurses. Recommendations are
            advisory and the prescriber remains responsible for every order.
          </p>
        </form>

        {onNavigateToLanding && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onNavigateToLanding}
              data-testid="button-back-to-landing"
              className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Back to the overview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
