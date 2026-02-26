import { useQuery } from "@tanstack/react-query";
import { ContextBar, SuggestedPrompts } from "@/components/context-bar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Copy, ExternalLink, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { recordEvent } from "@/lib/analytics";
import { useEffect } from "react";
import type { User } from "@shared/schema";

export default function Aribot() {
  const { data: user, isLoading } = useQuery<User>({ queryKey: ["/api/me"] });
  const { toast } = useToast();

  useEffect(() => {
    recordEvent("page_view", { section: "aribot" });
    recordEvent("chat_opened", { specialty: user?.specialty });
  }, [user?.specialty]);

  if (isLoading || !user) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-aribot-title">
          <Bot className="h-5 w-5 text-primary" />
          Aribot AI Assistant
        </h1>
        <p className="text-sm text-muted-foreground">
          Your personalized clinical AI assistant. Copy your context and paste it into the chat for tailored responses.
        </p>
      </div>

      <ContextBar user={user} />

      <SuggestedPrompts user={user} />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="bg-card rounded-md overflow-hidden" data-testid="panel-aribot-chat">
            <div className="flex items-center justify-between gap-1 p-3 border-b">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">Aribot Chat</span>
              </div>
              <Button size="sm" variant="outline" data-testid="button-open-external">
                <ExternalLink className="h-3 w-3 mr-1.5" />
                Open in new tab
              </Button>
            </div>
            <div className="h-[500px] flex flex-col items-center justify-center p-6 text-center space-y-4 bg-muted/20">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-lg font-semibold">Aribot is Ready</h3>
                <p className="text-sm text-muted-foreground">
                  This panel will display the Dify chatbot iframe when configured. For now, use the Context Helper panel to copy your personalized context and suggested prompts.
                </p>
                <p className="text-xs text-muted-foreground">
                  To connect: Set the DIFY_CHATBOT_URL environment variable with your Dify embed URL.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4" data-testid="panel-context-helper">
          <div className="bg-card rounded-md p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-primary" />
              Context Helper
            </h3>
            <p className="text-xs text-muted-foreground">
              Since the chatbot runs in an iframe, direct context injection isn't possible.
              Use the button below to copy your structured context, then paste it as your first message in Aribot.
            </p>
            <Button
              className="w-full"
              onClick={() => {
                const ctx = buildContextBlock(user);
                navigator.clipboard.writeText(ctx);
                toast({ title: "Context copied", description: "Paste it as your first message in Aribot." });
              }}
              data-testid="button-helper-copy"
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy Full Context Block
            </Button>
          </div>

          <div className="bg-card rounded-md p-4 space-y-3">
            <h3 className="text-sm font-semibold">Quick Paste Area</h3>
            <p className="text-xs text-muted-foreground">
              Draft your question here, then copy and paste it into the Aribot chat:
            </p>
            <Textarea
              placeholder="Type your question here..."
              className="min-h-[120px] text-sm"
              data-testid="input-quick-paste"
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                const el = document.querySelector('[data-testid="input-quick-paste"]') as HTMLTextAreaElement;
                if (el?.value) {
                  navigator.clipboard.writeText(el.value);
                  toast({ title: "Copied", description: "Paste it into Aribot." });
                }
              }}
              data-testid="button-copy-question"
            >
              <Copy className="h-3 w-3 mr-1.5" />
              Copy Question
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildContextBlock(user: User): string {
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
  - PHI-safe mode enabled: ${user.phiSafeMode}`;
}
