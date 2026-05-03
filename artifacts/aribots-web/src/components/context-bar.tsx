import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  User as UserIcon,
  Info,
  Copy,
  Sparkles,
  Shield,
  ClipboardCheck,
} from "lucide-react";
import type { User } from "@shared/schema";

interface ContextBarProps {
  user: User;
  onPhiToggle?: (value: boolean) => void;
}

export function ContextBar({ user, onPhiToggle }: ContextBarProps) {
  const [useContext, setUseContext] = useState(true);
  const [phiSafe, setPhiSafe] = useState(user.phiSafeMode);
  const { toast } = useToast();

  const contextBlock = `CLINICIAN PROFILE CONTEXT (for personalization)
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

  function handleCopyContext() {
    navigator.clipboard.writeText(contextBlock);
    toast({ title: "Context copied", description: "Paste it into Aribot to personalize your session." });
  }

  return (
    <div className="bg-card rounded-md p-3 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <UserIcon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-context-name">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.specialty} · {user.hospital}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-muted-foreground whitespace-nowrap">Use profile</span>
            <Switch
              checked={useContext}
              onCheckedChange={setUseContext}
              data-testid="switch-use-profile"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Shield className="h-3 w-3 text-primary" />
            <span className="text-muted-foreground whitespace-nowrap">PHI-safe</span>
            <Switch
              checked={phiSafe}
              onCheckedChange={(v) => {
                setPhiSafe(v);
                onPhiToggle?.(v);
              }}
              data-testid="switch-phi-safe"
            />
          </label>
        </div>
      </div>

      {useContext && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {user.interests.slice(0, 4).map((interest) => (
            <Badge key={interest} variant="secondary" className="text-xs" data-testid={`badge-interest-${interest}`}>
              {interest}
            </Badge>
          ))}
          {user.interests.length > 4 && (
            <span className="text-xs text-muted-foreground">+{user.interests.length - 4} more</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="default" onClick={handleCopyContext} data-testid="button-copy-context">
          <Copy className="h-3 w-3 mr-1.5" />
          Copy Context
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" data-testid="button-whats-shared">
              <Info className="h-3 w-3 mr-1.5" />
              What's being shared?
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Context Shared with Aribot</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                When you copy and paste the context into Aribot, the following information is shared to personalize your experience:
              </p>
              <div className="bg-muted/50 rounded-md p-3 space-y-1.5">
                <div className="flex justify-between gap-1"><span className="font-medium">Specialty:</span><span className="text-muted-foreground">{user.specialty}</span></div>
                <div className="flex justify-between gap-1"><span className="font-medium">Subspecialty:</span><span className="text-muted-foreground">{user.subspecialty}</span></div>
                <div className="flex justify-between gap-1"><span className="font-medium">Hospital:</span><span className="text-muted-foreground">{user.hospital}</span></div>
                <div><span className="font-medium">Interests:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {user.interests.map(i => <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>)}
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 rounded-md p-3 space-y-1">
                <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Preferences</p>
                <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                  <li>Evidence-first, cite primary sources</li>
                  <li>Concise clinician-facing bullets</li>
                  <li>Ask clarifying questions when needed</li>
                </ul>
              </div>
              <div className="bg-muted/50 rounded-md p-3 space-y-1">
                <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Safety</p>
                <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                  <li>No patient identifiers included</li>
                  <li>PHI-safe mode: {phiSafe ? "Enabled" : "Disabled"}</li>
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">
                No patient data, login credentials, or personal health information is ever shared. Only your professional profile context is used.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

interface SuggestedPromptsProps {
  user: User;
}

export function SuggestedPrompts({ user }: SuggestedPromptsProps) {
  const { toast } = useToast();

  const prompts = generatePrompts(user);

  function handleCopyPrompt(prompt: string) {
    navigator.clipboard.writeText(prompt);
    toast({ title: "Prompt copied", description: "Paste it into the Aribot chat." });
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Suggested Prompts
      </h3>
      <div className="grid grid-cols-1 gap-1.5">
        {prompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleCopyPrompt(prompt)}
            className="text-left text-xs p-2.5 rounded-md bg-muted/50 text-muted-foreground transition-colors hover-elevate cursor-pointer"
            data-testid={`button-prompt-${i}`}
          >
            <ClipboardCheck className="h-3 w-3 inline mr-1.5 text-primary/60" />
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function generatePrompts(user: User): string[] {
  const { specialty, subspecialty, interests } = user;
  const prompts: string[] = [];

  prompts.push(`Summarize the latest NEJM trials in ${specialty.toLowerCase()}`);
  prompts.push(`What are the current guidelines for ${subspecialty.toLowerCase()} management?`);

  if (interests[0]) prompts.push(`Evidence-based approach to ${interests[0].toLowerCase()}`);
  if (interests[1]) prompts.push(`Differential diagnosis framework for ${interests[1].toLowerCase()}`);

  prompts.push(`Compare treatment approaches: latest RCT evidence in ${specialty.toLowerCase()}`);

  if (interests[2]) prompts.push(`Summarize recent advances in ${interests[2].toLowerCase()}`);

  prompts.push(`Key pharmacology updates relevant to ${specialty.toLowerCase()} practice`);
  prompts.push(`What clinical decision tools are recommended for ${subspecialty.toLowerCase()}?`);

  return prompts.slice(0, 8);
}
