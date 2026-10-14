import Anthropic from "@anthropic-ai/sdk";

// All Ari surfaces, including the managed agent, use this single model setting.
export const ARI_MODEL_ID = "claude-sonnet-4-6";
export const aiAvailable = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY);
let client: Anthropic | undefined;

export function getAnthropic(): Anthropic {
  if (!aiAvailable()) throw new Error("ANTHROPIC_API_KEY is required for clinical AI.");
  return client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export const anthropic: Anthropic = new Proxy({} as Anthropic, {
  get(_target, prop) {
    const real = getAnthropic();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

interface CompletionOptions {
  system: string;
  messages: Anthropic.MessageParam[];
  temperature?: number;
  maxTokens?: number;
}

export async function completeText(options: CompletionOptions): Promise<string> {
  const response = await anthropic.messages.create({
    model: ARI_MODEL_ID,
    system: options.system,
    messages: options.messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 3000,
  });
  if (response.stop_reason === "max_tokens") throw new InvalidModelJSONError("Model output was truncated.");
  const text = response.content.flatMap((block) => block.type === "text" ? [block.text] : []).join("");
  if (!text.trim()) throw new Error("Anthropic returned no text.");
  return text;
}

export async function* streamText(options: CompletionOptions): AsyncGenerator<string> {
  const stream = await anthropic.messages.create({
    model: ARI_MODEL_ID,
    system: options.system,
    messages: options.messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 2048,
    stream: true,
  });
  try {
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  } finally {
    stream.controller.abort();
  }
}

export class InvalidModelJSONError extends Error {}

// Handles bare JSON, markdown fences and prose around a JSON object without
// repairing or inventing clinical data.
export function parseModelJSON(text: string): Record<string, any> {
  const candidates = [text.trim(), ...Array.from(text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi), (m) => m[1].trim())];
  for (let start = 0; start < text.length; start++) {
    if (text[start] !== "{") continue;
    let depth = 0, quoted = false, escaped = false;
    for (let i = start; i < text.length; i++) {
      const char = text[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === "{") depth++;
      else if (char === "}" && --depth === 0) {
        candidates.push(text.slice(start, i + 1));
        break;
      }
    }
  }
  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
    } catch { /* Try the next extracted JSON object. */ }
  }
  throw new InvalidModelJSONError("Model response did not contain a valid JSON object.");
}

export async function completeJSON(options: CompletionOptions): Promise<Record<string, any>> {
  return parseModelJSON(await completeText({
    ...options,
    system: `${options.system}\nReturn only the requested valid JSON object, with no markdown or commentary.`,
  }));
}
