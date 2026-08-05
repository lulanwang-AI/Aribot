import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/**
 * Lazily construct the Anthropic client. The API key is only required when an
 * Ari clinical workflow is actually invoked, so the rest of the API server
 * (auth, community, news, etc.) can run without it.
 */
function getAnthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is required for Ari clinical workflows. Ari will not start without it."
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const anthropic: Anthropic = new Proxy({} as Anthropic, {
  get(_target, prop, receiver) {
    const real = getAnthropic();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
