import { useQuery } from "@tanstack/react-query";
import { SuggestedPrompts } from "@/components/context-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Copy, User as UserIcon, Shield, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { recordEvent } from "@/lib/analytics";
import { useEffect, useState } from "react";
import type { User } from "@shared/schema";

export default function Aribot() {
  const { data: user, isLoading } = useQuery<User>({ queryKey: ["/api/me"] });
  const { toast } = useToast();
  const [useProfile, setUseProfile] = useState(true);
  const [phiSafe, setPhiSafe] = useState(true);

  useEffect(() => {
    recordEvent("page_view", { section: "aribot" });
    recordEvent("chat_opened", { specialty: user?.specialty });
  }, [user?.specialty]);

  useEffect(() => {
    if (user) setPhiSafe(user.phiSafeMode);
  }, [user]);

  function handleCopyContext() {
    if (!user) return;
    const ctx = buildContextBlock(user, phiSafe);
    navigator.clipboard.writeText(ctx);
    toast({ title: "Context copied", description: "Paste it into Aribot to personalize your session." });
  }

  if (isLoading || !user) {
    return (
      <div className="flex h-full">
        <Skeleton className="flex-1" />
        <Skeleton className="w-72" />
      </div>
    );
  }

  return (
    <div className="flex h-full" data-testid="page-aribot">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 min-h-0 p-3">
          <iframe
            src="https://udify.app/chatbot/oFFtZasRPIbLOTGb"
            className="w-full h-full rounded-md border bg-background"
            style={{ minHeight: "400px" }}
            allow="microphone"
            title="Aribot Chat"
            data-testid="iframe-aribot-chat"
          />
        </div>

        <div className="border-t bg-card p-3 flex items-center gap-3 flex-wrap" data-testid="panel-profile-bar">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <UserIcon className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate" data-testid="text-context-name">{user.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {user.specialty} · {user.hospital}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-[11px] cursor-pointer">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">Profile</span>
              <Switch
                checked={useProfile}
                onCheckedChange={setUseProfile}
                className="scale-75"
                data-testid="switch-use-profile"
              />
            </label>
            <label className="flex items-center gap-1 text-[11px] cursor-pointer">
              <Shield className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">PHI-safe</span>
              <Switch
                checked={phiSafe}
                onCheckedChange={setPhiSafe}
                className="scale-75"
                data-testid="switch-phi-safe"
              />
            </label>
          </div>

          {useProfile && user.interests.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {user.interests.slice(0, 3).map((interest) => (
                <Badge key={interest} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {interest}
                </Badge>
              ))}
              {user.interests.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{user.interests.length - 3}</span>
              )}
            </div>
          )}

          <Button size="sm" variant="default" onClick={handleCopyContext} className="ml-auto h-7 text-xs" data-testid="button-copy-context">
            <Copy className="h-3 w-3 mr-1" />
            Copy Context
          </Button>
        </div>
      </div>

      <div className="w-72 border-l bg-card/50 flex flex-col shrink-0 hidden lg:flex" data-testid="panel-suggested-prompts">
        <div className="p-3 border-b">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Bot className="h-4 w-4 text-primary" />
            Aribot Assistant
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1">
            Copy your context or a prompt, then paste it into the chat.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SuggestedPrompts user={user} />
        </div>
      </div>
    </div>
  );
}

function buildContextBlock(user: User, phiSafe: boolean): string {
  return `CLINICIAN PROFILE CONTEXT (for personalization)
- Specialty: ${user.specialty}
- Subspecialty: ${user.subspecialty}
- Practice setting: Academic Medical Center
- Hospital/Health system: ${user.hospital}
- Interests: ${user.interests.join(", ")}
- Preferences:
  - Evidence-first, cite primary sources when possible
  - Use concise clinician-facing bullets
  - Ask clarifying questions when needed
- Safety:
  - Do not include any patient identifiers
  - PHI-safe mode enabled: ${phiSafe}`;
}
