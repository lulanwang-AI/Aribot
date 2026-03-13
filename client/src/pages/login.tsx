import { useState } from "react";
import aribotLogoPath from "@assets/20260226140824_1772181173123.png";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Mail, ShieldCheck } from "lucide-react";

const BG_IMAGE_URL = "https://static.wixstatic.com/media/43c038_4ad81e81714f4860b60080b8f9a15a16~mv2_d_5773_3331_s_4_2.jpg/v1/fill/w_1920,h_1080,al_c,q_85,usm_0.66_1.00_0.01,blur_3,enc_auto/43c038_4ad81e81714f4860b60080b8f9a15a16~mv2_d_5773_3331_s_4_2.jpg";

export default function Login({ onLogin, onNavigateToLanding }: { onLogin: () => void; onNavigateToLanding?: () => void }) {
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
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${BG_IMAGE_URL})` }}
      />
      <div className="absolute inset-0 bg-[#5f6360]/80 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <img src={aribotLogoPath} alt="ARIbots" className="h-16 w-16 rounded-xl shadow-lg object-contain ring-2 ring-white/20" />
          </div>
          <h1 className="text-2xl font-bold text-white" data-testid="text-login-title">ARIbots</h1>
          <p className="text-sm text-white/70">EMPOWERING MEDICINE WITH AI</p>
        </div>

        <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-center text-white">Doctor Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">Email or Username</label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                  <Input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="dr.chen@hospital.org"
                    className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"
                    data-testid="input-email"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"
                    data-testid="input-password"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-white text-[#5f6360] hover:bg-white/90 font-semibold" disabled={loading} data-testid="button-login">
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15">
          <ShieldCheck className="h-4 w-4 text-white/60 shrink-0 mt-0.5" />
          <p className="text-[11px] text-white/60 leading-relaxed" data-testid="text-disclaimer">
            For licensed clinicians only. Not for patient use. Content is not medical advice — verify with primary sources and institutional protocols.
          </p>
        </div>

        <p className="text-center text-[10px] text-white/50">
          By signing in, you confirm that you are a licensed medical professional.
        </p>

        {onNavigateToLanding && (
          <button
            onClick={onNavigateToLanding}
            className="block w-full text-center text-sm text-white/60 hover:text-white transition-colors mt-2"
            data-testid="link-learn-more"
          >
            Learn More about ARI bots →
          </button>
        )}
      </div>
    </div>
  );
}
