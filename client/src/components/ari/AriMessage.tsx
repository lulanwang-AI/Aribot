import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Copy as CopyIcon,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
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

const ER_DISCLAIMER =
  "ER MODE ACTIVE — RESPONSE NOT VERIFIED AGAINST LIVE SOURCES. CONFIRM BEFORE CLINICAL USE.";

export function AriMessage({ text, mode, streaming }: AriMessageProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const { blocks, trailingBuffer } = useMemo(
    () => parseAriStreamPartial(text + (text.endsWith("\n") ? "" : "\n")),
    [text]
  );

  const erHasDisclaimer = useMemo(() => {
    if (mode !== "er") return true;
    return blocks.some(
      (b) =>
        b.kind === "prose" &&
        b.text.toUpperCase().includes("ER MODE ACTIVE")
    );
  }, [blocks, mode]);

  // Group consecutive citations so we can render a single "Sources" heading.
  const grouped = useMemo(() => groupBlocks(blocks), [blocks]);

  function handleCopy() {
    const prose = extractProseOnly(blocks);
    const summary =
      mode === "er"
        ? `${prose}\n\n— Generated in ER Mode without source verification. Confirm before clinical use.`
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
        if (g.kind === "step") {
          return <StepRow key={i} block={g.block} />;
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

        {import.meta.env.DEV && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowRaw((v) => !v)}
            data-testid="button-ari-show-raw"
          >
            {showRaw ? (
              <EyeOff className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Eye className="mr-1.5 h-3.5 w-3.5" />
            )}
            {showRaw ? "Hide raw" : "Show raw response"}
          </Button>
        )}
      </div>

      {showRaw && import.meta.env.DEV && (
        <pre
          className="overflow-x-auto rounded border border-border bg-muted px-3 py-2 text-[11px] leading-snug"
          data-testid="ari-raw-response"
        >
          <code>{text}</code>
        </pre>
      )}
    </div>
  );
}

// ---- Block grouping ---------------------------------------------------------

type GroupedBlock =
  | { kind: "section"; block: AriSectionBlock }
  | { kind: "step"; block: AriStepBlock }
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
      out.push({ kind: "step", block: b });
      i += 1;
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

function StepRow({ block }: { block: AriStepBlock }) {
  const [open, setOpen] = useState(false);
  const dotColor =
    block.status === "complete"
      ? "bg-emerald-500"
      : block.status === "partial"
        ? "bg-amber-400"
        : "bg-muted-foreground/60";
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className="rounded-md border border-border bg-muted/30"
        data-testid={`ari-step-${block.stepNumber}`}
      >
        <CollapsibleTrigger
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50"
          data-testid={`button-ari-step-toggle-${block.stepNumber}`}
        >
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Retrieval trace
          </span>
          <span
            className={cn("inline-block h-2 w-2 rounded-full", dotColor)}
            aria-hidden="true"
          />
          <span className="font-medium">Step {block.stepNumber}</span>
          <span className="truncate text-muted-foreground">
            {block.description}
          </span>
          <ChevronDown
            className={cn(
              "ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border bg-card px-3 py-2 text-xs text-muted-foreground">
            <div className="mb-1 font-medium text-foreground">
              Status: {block.status.replace("_", " ")}
            </div>
            {block.partialResults ? (
              <pre className="whitespace-pre-wrap break-words font-sans">
                {block.partialResults}
              </pre>
            ) : (
              <div className="italic">No partial results recorded.</div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
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
          : "UNVERIFIED — confirm independently."}
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
        {blocks.map((c, i) => (
          <li
            key={i}
            className="flex flex-col gap-1 rounded border border-border bg-muted/40 px-3 py-2 text-xs"
            data-testid={`ari-citation-${i}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{c.source}</span>
              {c.evidenceClass && (
                <Badge variant="outline" className="text-[10px]">
                  {c.evidenceClass}
                </Badge>
              )}
            </div>
            {c.doiOrUrl ? (
              <a
                href={c.doiOrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 break-all text-primary hover:underline"
                data-testid={`link-ari-citation-${i}`}
              >
                {c.doiOrUrl}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ) : (
              <span className="text-muted-foreground">No URL provided</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProseBlock({ text, mode }: { text: string; mode: "ari" | "er" }) {
  // ER mode: render the disclaimer line as a yellow callout if it is the
  // first prose block — and only the first time we see it so we don't repeat.
  const isErDisclaimer =
    mode === "er" && text.toUpperCase().startsWith("ER MODE ACTIVE");
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
        <span>{text || ER_DISCLAIMER}</span>
      </div>
      {clientInjected && import.meta.env.DEV && (
        <div className="mt-1 text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300">
          (client-injected fallback)
        </div>
      )}
    </div>
  );
}
