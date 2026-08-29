import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Copy as CopyIcon,
  Check,
  Loader2,
  XCircle,
  Activity,
  Volume2,
  Square as SquareIcon,
} from "lucide-react";
import { speakText, stopActivePlayback, type TtsHandle } from "@/lib/ariVoice";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  parseAriStreamPartial,
  extractProseOnly,
  type AriBlock,
  type AriCitationBlock,
  type AriClaimBlock,
  type AriSectionBlock,
  type AriStepBlock,
} from "@shared/ari/blocks";
import {
  ARI_CAPABILITIES,
  isActiveCapability,
} from "@shared/ari/capabilities";

interface AriMessageProps {
  text: string;
  mode: "ari" | "er";
  streaming?: boolean;
}

// Must match the sentence the system prompt instructs Ari to emit first in
// rapid mode. If one changes, the other has to change with it.
const RAPID_MODE_DISCLAIMER =
  "RAPID MODE - NOT VERIFIED AGAINST LIVE SOURCES. CONFIRM BEFORE ACTING.";
const RAPID_MODE_SENTINEL = "RAPID MODE";

export function AriMessage({ text, mode, streaming }: AriMessageProps) {
  const [copied, setCopied] = useState(false);
  const [speechState, setSpeechState] = useState<
    "idle" | "loading" | "playing"
  >("idle");
  const speechHandleRef = useRef<TtsHandle | null>(null);
  const { toast } = useToast();

  const { blocks, trailingBuffer } = useMemo(
    () => parseAriStreamPartial(text + (text.endsWith("\n") ? "" : "\n")),
    [text]
  );

  // Stop playback if the message unmounts mid-speech.
  useEffect(() => {
    return () => {
      speechHandleRef.current?.stop();
      speechHandleRef.current = null;
    };
  }, []);

  async function handleListen() {
    if (speechState === "playing") {
      speechHandleRef.current?.stop();
      speechHandleRef.current = null;
      setSpeechState("idle");
      return;
    }
    if (speechState === "loading") return;

    const prose = extractProseOnly(blocks).trim();
    if (!prose) {
      toast({
        title: "Nothing to read aloud",
        description: "This response has no narrative text yet.",
      });
      return;
    }

    // Cap to keep playback short and to stay within the server's per-request
    // character cap (4000). 3500 leaves headroom for the trailing reminder.
    const spoken =
      prose.length > 3500 ? prose.slice(0, 3500) + " (truncated)" : prose;

    try {
      stopActivePlayback();
      setSpeechState("loading");
      const handle = await speakText(spoken);
      speechHandleRef.current = handle;
      setSpeechState("playing");
      handle.ended
        .catch(() => {
          /* error already surfaced */
        })
        .finally(() => {
          if (speechHandleRef.current === handle) {
            speechHandleRef.current = null;
            setSpeechState("idle");
          }
        });
    } catch (err: any) {
      setSpeechState("idle");
      speechHandleRef.current = null;
      toast({
        title: "Voice playback failed",
        description: err?.message || "Unable to synthesize speech.",
        variant: "destructive",
      });
    }
  }

  const erHasDisclaimer = useMemo(() => {
    if (mode !== "er") return true;
    return blocks.some(
      (b) =>
        b.kind === "prose" &&
        b.text.toUpperCase().includes(RAPID_MODE_SENTINEL)
    );
  }, [blocks, mode]);

  // Group consecutive citations so we can render a single "Sources" heading.
  const grouped = useMemo(() => groupBlocks(blocks), [blocks]);

  function handleCopy() {
    const prose = extractProseOnly(blocks);
    const summary =
      mode === "er"
        ? `${prose}\n\n- Generated in rapid mode without source verification. Confirm before clinical use.`
        : prose;
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <div className="space-y-3" data-testid="ari-message-root">
      {mode === "er" && !erHasDisclaimer && (
        <ErDisclaimerCallout clientInjected />
      )}

      {grouped.map((g, i) => {
        if (g.kind === "section") {
          return mode === "ari" ? (
            <SectionPill key={i} block={g.block} />
          ) : null;
        }
        if (g.kind === "steps") {
          return (
            <StepsPanel
              key={i}
              steps={g.blocks}
              streaming={!!streaming}
            />
          );
        }
        if (g.kind === "claim") {
          return (
            <ClaimRow
              key={i}
              block={g.block}
              followingProse={g.followingProse}
            />
          );
        }
        if (g.kind === "citations") {
          return <CitationGroup key={i} blocks={g.blocks} />;
        }
        if (g.kind === "prose") {
          return <ProseBlock key={i} text={g.text} mode={mode} />;
        }
        return null;
      })}

      {streaming && trailingBuffer.length > 0 && (
        <div
          className="text-sm leading-relaxed text-muted-foreground"
          data-testid="ari-trailing-buffer"
        >
          {trailingBuffer}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleListen}
          disabled={speechState === "loading" || streaming}
          data-testid="button-ari-listen"
          aria-pressed={speechState === "playing"}
          aria-label={
            speechState === "playing"
              ? "Stop voice playback"
              : "Listen to this response"
          }
        >
          {speechState === "loading" ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : speechState === "playing" ? (
            <SquareIcon className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <Volume2 className="mr-1.5 h-3.5 w-3.5" />
          )}
          {speechState === "loading"
            ? "Loading…"
            : speechState === "playing"
              ? "Stop"
              : "Listen"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          data-testid="button-ari-copy-summary"
        >
          {copied ? (
            <Check className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <CopyIcon className="mr-1.5 h-3.5 w-3.5" />
          )}
          {mode === "er" ? "Copy ER protocol notes" : "Copy clinical summary"}
        </Button>
      </div>
    </div>
  );
}

// ---- Block grouping ---------------------------------------------------------

type GroupedBlock =
  | { kind: "section"; block: AriSectionBlock }
  | { kind: "steps"; blocks: AriStepBlock[] }
  | { kind: "claim"; block: AriClaimBlock; followingProse: string | null }
  | { kind: "citations"; blocks: AriCitationBlock[] }
  | { kind: "prose"; text: string };

function groupBlocks(blocks: AriBlock[]): GroupedBlock[] {
  const out: GroupedBlock[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.kind === "section") {
      out.push({ kind: "section", block: b });
      i += 1;
    } else if (b.kind === "step") {
      const group: AriStepBlock[] = [b];
      let j = i + 1;
      while (j < blocks.length && blocks[j].kind === "step") {
        group.push(blocks[j] as AriStepBlock);
        j += 1;
      }
      out.push({ kind: "steps", blocks: group });
      i = j;
    } else if (b.kind === "claim") {
      const next = blocks[i + 1];
      if (next && next.kind === "prose") {
        out.push({
          kind: "claim",
          block: b,
          followingProse: next.text,
        });
        i += 2;
      } else {
        out.push({ kind: "claim", block: b, followingProse: null });
        i += 1;
      }
    } else if (b.kind === "citation") {
      const group: AriCitationBlock[] = [b];
      let j = i + 1;
      while (j < blocks.length && blocks[j].kind === "citation") {
        group.push(blocks[j] as AriCitationBlock);
        j += 1;
      }
      out.push({ kind: "citations", blocks: group });
      i = j;
    } else if (b.kind === "prose") {
      out.push({ kind: "prose", text: b.text });
      i += 1;
    } else {
      i += 1;
    }
  }
  return out;
}

// ---- Renderers --------------------------------------------------------------

function SectionPill({ block }: { block: AriSectionBlock }) {
  const cap = isActiveCapability(block.capability)
    ? ARI_CAPABILITIES.find((c) => c.id === block.capability)
    : undefined;
  const display = cap?.displayName || block.capability;
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary"
      data-testid="ari-section-pill"
    >
      Ari · {display}
    </div>
  );
}

function StepsPanel({
  steps,
  streaming,
}: {
  steps: AriStepBlock[];
  streaming: boolean;
}) {
  // Auto-collapse the trace once Ari is done. While streaming, keep it open so
  // the clinician can watch each callback land in real time.
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (!streaming) setOpen(false);
  }, [streaming]);

  const lastStepNum = steps[steps.length - 1]?.stepNumber ?? 0;
  const allComplete = steps.every((s) => s.status === "complete");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className="overflow-hidden rounded-md border border-border bg-card"
        data-testid="ari-steps-panel"
      >
        <CollapsibleTrigger
          className="flex w-full items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 text-left text-xs hover:bg-muted/60"
          data-testid="button-ari-steps-toggle"
        >
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground">
            {streaming
              ? `Working through your question - Step ${lastStepNum}`
              : `Reasoning steps · ${steps.length}`}
          </span>
          {streaming && (
            <Loader2
              className="h-3 w-3 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          )}
          {!streaming && allComplete && (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          )}
          <ChevronDown
            className={cn(
              "ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ol className="flex flex-col">
            {steps.map((s, idx) => {
              const isLast = idx === steps.length - 1;
              const isInFlight = streaming && isLast;
              return (
                <StepItem
                  key={s.stepNumber}
                  step={s}
                  inFlight={isInFlight}
                />
              );
            })}
          </ol>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function StepItem({
  step,
  inFlight,
}: {
  step: AriStepBlock;
  inFlight: boolean;
}) {
  const StatusIcon = inFlight
    ? Loader2
    : step.status === "complete"
      ? CheckCircle2
      : step.status === "partial"
        ? AlertTriangle
        : XCircle;
  const iconColor = inFlight
    ? "text-primary"
    : step.status === "complete"
      ? "text-emerald-600"
      : step.status === "partial"
        ? "text-amber-500"
        : "text-muted-foreground";

  return (
    <li
      className="flex gap-3 border-b border-border px-3 py-2 last:border-b-0"
      data-testid={`ari-step-${step.stepNumber}`}
    >
      <div className="flex flex-col items-center pt-0.5">
        <StatusIcon
          className={cn(
            "h-4 w-4 shrink-0",
            iconColor,
            inFlight && "animate-spin"
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 text-xs">
          <span className="font-semibold text-foreground">
            Step {step.stepNumber}
          </span>
          <span className="font-medium text-foreground">
            {step.description}
          </span>
        </div>
        {step.partialResults && (
          <p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground">
            {step.partialResults}
          </p>
        )}
        {!step.partialResults && step.status === "no_result" && (
          <p className="mt-1 text-xs italic text-muted-foreground">
            No result returned for this step.
          </p>
        )}
      </div>
    </li>
  );
}

function ClaimRow({
  block,
  followingProse,
}: {
  block: AriClaimBlock;
  followingProse: string | null;
}) {
  const verified = block.verified;
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2",
        verified
          ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/30"
          : "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40"
      )}
      data-testid={verified ? "ari-claim-verified" : "ari-claim-unverified"}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-sm leading-relaxed",
            verified
              ? "text-emerald-900 dark:text-emerald-100"
              : "text-amber-900 dark:text-amber-100"
          )}
        >
          {block.claim}
        </p>
        <Badge
          variant={verified ? "secondary" : "destructive"}
          className={cn(
            "shrink-0 gap-1 text-[11px] font-semibold uppercase tracking-wide",
            verified
              ? "bg-emerald-600 text-white hover:bg-emerald-600"
              : "bg-amber-500 text-white hover:bg-amber-500"
          )}
        >
          {verified ? (
            <>
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </>
          ) : (
            <>
              <AlertTriangle className="h-3 w-3" />
              Unverified
            </>
          )}
        </Badge>
      </div>
      <div
        className={cn(
          "mt-1 text-[11px]",
          verified
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-amber-700 dark:text-amber-300"
        )}
      >
        {verified
          ? `Verified via ${block.verificationSource || "primary source"}`
          : "UNVERIFIED - confirm independently."}
      </div>
      {followingProse && (
        <div className="mt-2 border-t border-current/10 pt-2 text-sm leading-relaxed opacity-90">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {followingProse}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

function CitationGroup({ blocks }: { blocks: AriCitationBlock[] }) {
  return (
    <div
      className="rounded-md border border-border bg-card p-3"
      data-testid="ari-citation-group"
    >
      <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Sources
      </div>
      <ul className="space-y-2">
        {blocks.map((c, i) => {
          const linkLabel = c.title?.trim() || c.source || c.doiOrUrl;
          return (
            <li
              key={i}
              className="flex flex-col gap-1 rounded border border-border bg-muted/40 px-3 py-2 text-xs"
              data-testid={`ari-citation-${i}`}
            >
              {c.doiOrUrl ? (
                <a
                  href={c.doiOrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-1 text-sm font-medium text-primary hover:underline"
                  data-testid={`link-ari-citation-${i}`}
                >
                  <span className="break-words">{linkLabel}</span>
                  <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span className="text-sm font-medium text-foreground">
                  {linkLabel}
                </span>
              )}
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                {c.title && c.source && c.title !== c.source && (
                  <span data-testid={`text-ari-citation-source-${i}`}>
                    {c.source}
                  </span>
                )}
                {c.evidenceClass && (
                  <Badge variant="outline" className="text-[10px]">
                    {c.evidenceClass}
                  </Badge>
                )}
                {c.doiOrUrl && (
                  <span className="break-all text-[11px] opacity-70">
                    {c.doiOrUrl}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProseBlock({ text, mode }: { text: string; mode: "ari" | "er" }) {
  // ER mode: render the disclaimer line as a yellow callout if it is the
  // first prose block - and only the first time we see it so we don't repeat.
  const isErDisclaimer =
    mode === "er" && text.toUpperCase().startsWith(RAPID_MODE_SENTINEL);
  if (isErDisclaimer) {
    return <ErDisclaimerCallout text={text} />;
  }
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert" data-testid="ari-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

function ErDisclaimerCallout({
  text,
  clientInjected,
}: {
  text?: string;
  clientInjected?: boolean;
}) {
  return (
    <div
      role="alert"
      className="rounded-md border border-amber-400 bg-amber-100 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-200"
      data-testid="ari-er-disclaimer"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>{text || RAPID_MODE_DISCLAIMER}</span>
      </div>
      {clientInjected && import.meta.env.DEV && (
        <div className="mt-1 text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300">
          (client-injected fallback)
        </div>
      )}
    </div>
  );
}
