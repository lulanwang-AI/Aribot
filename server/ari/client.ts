import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error(
    "ANTHROPIC_API_KEY is required for Ari clinical workflows. Ari will not start without it."
  );
}

export const anthropic = new Anthropic({ apiKey });
