/**
 * Parser for Ari's structured block stream.
 *
 * The Ari system prompt instructs the model to interleave four JSON block
 * shapes with prose:
 *   - { "ari_section": "<capability>", "mode": "ari" | "er" }
 *   - { "ari_claim": "<text>", "verified": <bool>, "verification_source": "<text>" }
 *   - { "ari_citation": "<source>", "doi_or_url": "<url>", "evidence_class": "<class>" }
 *   - { "ari_step": <n>, "description": "<text>", "status": "complete|partial|no_result", "partial_results": "<text>" }
 *
 * Each JSON block lives on its own line. Everything else is prose.
 */

export type AriSectionBlock = {
  kind: "section";
  capability: string;
  mode: "ari" | "er";
};

export type AriClaimBlock = {
  kind: "claim";
  claim: string;
  verified: boolean;
  verificationSource: string;
};

export type AriCitationBlock = {
  kind: "citation";
  source: string;
  title: string;
  doiOrUrl: string;
  evidenceClass: string;
};

export type AriStepBlock = {
  kind: "step";
  stepNumber: number;
  description: string;
  status: "complete" | "partial" | "no_result";
  partialResults: string;
};

export type AriProseBlock = {
  kind: "prose";
  text: string;
};

export type AriBlock =
  | AriSectionBlock
  | AriClaimBlock
  | AriCitationBlock
  | AriStepBlock
  | AriProseBlock;

const KNOWN_KEYS = new Set([
  "ari_section",
  "ari_claim",
  "ari_citation",
  "ari_step",
]);

/**
 * Heuristic: a line that, after trimming, starts with `{` and ends with `}`
 * is a candidate for a structured block. We then attempt JSON.parse.
 */
function isCandidateJsonLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith("{") && t.endsWith("}");
}

function tryParseStructured(line: string): AriBlock | null {
  if (!isCandidateJsonLine(line)) return null;
  let parsed: any;
  try {
    parsed = JSON.parse(line.trim());
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  if (typeof parsed.ari_section === "string") {
    const mode: "ari" | "er" = parsed.mode === "er" ? "er" : "ari";
    return {
      kind: "section",
      capability: String(parsed.ari_section),
      mode,
    };
  }

  if (typeof parsed.ari_claim === "string") {
    return {
      kind: "claim",
      claim: parsed.ari_claim,
      verified: parsed.verified === true,
      verificationSource:
        typeof parsed.verification_source === "string"
          ? parsed.verification_source
          : "",
    };
  }

  if (typeof parsed.ari_citation === "string") {
    return {
      kind: "citation",
      source: parsed.ari_citation,
      title:
        typeof parsed.title === "string" ? parsed.title : "",
      doiOrUrl:
        typeof parsed.doi_or_url === "string" ? parsed.doi_or_url : "",
      evidenceClass:
        typeof parsed.evidence_class === "string"
          ? parsed.evidence_class
          : "",
    };
  }

  if (typeof parsed.ari_step === "number") {
    const status =
      parsed.status === "partial" || parsed.status === "no_result"
        ? parsed.status
        : "complete";
    return {
      kind: "step",
      stepNumber: parsed.ari_step,
      description:
        typeof parsed.description === "string" ? parsed.description : "",
      status,
      partialResults:
        typeof parsed.partial_results === "string"
          ? parsed.partial_results
          : "",
    };
  }

  // JSON parsed but isn't one of our known structured shapes — treat as prose.
  // Quick filter: contains a known key but in unexpected shape — still prose.
  for (const k of Array.from(KNOWN_KEYS)) {
    if (k in parsed) return null;
  }
  return null;
}

/**
 * Parse a fully-received Ari response into ordered blocks.
 *
 * Rules:
 * - Each line is independently inspected. Successful structured parses become
 *   their own block.
 * - Other lines are accumulated into a single prose block. Consecutive prose
 *   lines collapse with `\n` separators. Blank lines between blocks are
 *   discarded; blank lines inside a prose run preserve paragraph structure.
 * - Lines that look like JSON but fail to parse fall through to prose so the
 *   user can still see the (presumably corrupted) text.
 */
export function parseAriStream(fullText: string): AriBlock[] {
  const blocks: AriBlock[] = [];
  const lines = fullText.split("\n");

  let proseBuffer: string[] = [];
  let proseHadContent = false;

  const flushProse = () => {
    // Trim trailing blanks; keep interior blanks as paragraph breaks.
    while (proseBuffer.length && proseBuffer[proseBuffer.length - 1] === "") {
      proseBuffer.pop();
    }
    while (proseBuffer.length && proseBuffer[0] === "") {
      proseBuffer.shift();
    }
    if (proseBuffer.length === 0) {
      proseBuffer = [];
      proseHadContent = false;
      return;
    }
    blocks.push({ kind: "prose", text: proseBuffer.join("\n") });
    proseBuffer = [];
    proseHadContent = false;
  };

  for (const line of lines) {
    const structured = tryParseStructured(line);
    if (structured) {
      flushProse();
      blocks.push(structured);
      continue;
    }
    // Skip leading blanks until we have prose content.
    if (line.trim().length === 0 && !proseHadContent) {
      continue;
    }
    proseBuffer.push(line);
    if (line.trim().length > 0) proseHadContent = true;
  }
  flushProse();

  return blocks;
}

export interface PartialParseResult {
  blocks: AriBlock[];
  trailingBuffer: string;
}

/**
 * Parse a partial stream. Splits committed lines (everything before the last
 * `\n`) and parses them; the trailing fragment after the final newline is
 * returned as `trailingBuffer` and rendered as live-typing prose by the UI.
 *
 * Note: a fully-formed JSON line MUST end with `\n` to be parsed as a
 * structured block. Otherwise it stays in trailingBuffer until a newline
 * arrives — this prevents flickering between "looks like prose" and "looks
 * like JSON" while a block is mid-stream.
 */
export function parseAriStreamPartial(streamText: string): PartialParseResult {
  const lastNewline = streamText.lastIndexOf("\n");
  if (lastNewline === -1) {
    return { blocks: [], trailingBuffer: streamText };
  }
  const committed = streamText.slice(0, lastNewline);
  const trailing = streamText.slice(lastNewline + 1);
  return {
    blocks: parseAriStream(committed),
    trailingBuffer: trailing,
  };
}

/**
 * Convenience: pull just the prose text out of an assistant message for
 * clipboard / "Copy clinical summary" usage.
 */
export function extractProseOnly(blocks: AriBlock[]): string {
  return blocks
    .filter((b): b is AriProseBlock => b.kind === "prose")
    .map((b) => b.text)
    .join("\n\n")
    .trim();
}
