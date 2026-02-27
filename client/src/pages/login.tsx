import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Lock, Mail, ShieldCheck } from "lucide-react";

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem("aribot_authenticated", "true");
      onLogin();
    }, 600);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
              <Bot className="h-7 w-7" />
            </div>
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-login-title">Aribot Portal</h1>
          <p className="text-sm text-muted-foreground">Clinical AI Community for Physicians</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-center">Doctor Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email or Username</label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="dr.chen@hospital.org"
                    className="pl-9"
                    data-testid="input-email"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pl-9"
                    data-testid="input-password"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed" data-testid="text-disclaimer">
            For licensed clinicians only. Not for patient use. Content is not medical advice — verify with primary sources and institutional protocols.
          </p>
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          By signing in, you confirm that you are a licensed medical professional.
        </p>
      </div>
    </div>
  );
}
