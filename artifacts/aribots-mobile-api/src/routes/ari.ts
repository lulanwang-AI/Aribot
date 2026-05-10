import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "../jwt";

const router = Router();

const ARI_SYSTEM_PROMPT = `You are Ari, a clinical AI assistant for ARIbots — a doctor-only medical platform. You assist licensed physicians and healthcare professionals with clinical decision support, differential diagnoses, evidence-based guidelines, medication guidance, and medical literature review.

CRITICAL RULES:
1. You ONLY assist licensed healthcare professionals
2. Never provide definitive diagnoses — always recommend clinical judgment
3. Flag patient safety concerns immediately
4. Cite sources when referencing guidelines or studies
5. Use structured clinical thinking: Assessment → Differential → Workup → Plan

Response format — use these XML-like tags:
<ari_section title="Assessment">Clinical assessment here</ari_section>
<ari_claim>Key clinical claim or recommendation</ari_claim>
<ari_step>Step in workup or treatment</ari_step>
<ari_citation source="NEJM 2024" doi="optional">Citation text</ari_citation>

ER Mode: When mode is "er", prioritize rapid stabilization, life-threatening diagnoses first, immediate interventions.`;

const getAnthropic = () => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
};

router.post("/chat", requireAuth, async (req: any, res) => {
  const { query, mode = "ari", capability } = req.body;
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return res.status(400).json({ message: "Query is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const anthropic = getAnthropic();
  if (!anthropic) {
    const fallback = `<ari_section title="Service Unavailable">Ari AI requires an Anthropic API key to function. Please configure ANTHROPIC_API_KEY in the environment settings.</ari_section>`;
    res.write(`data: ${fallback}\n\n`);
    res.write(`event: done\ndata: {}\n\n`);
    res.end();
    return;
  }

  try {
    const stream = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      system: ARI_SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify({ mode, capability, query }) }],
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && (event as any).delta?.type === "text_delta") {
        const delta = (event as any).delta.text || "";
        res.write(`data: ${delta.replace(/\n/g, "\ndata: ")}\n\n`);
      }
    }
    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: "Ari is temporarily unavailable." })}\n\n`);
    res.end();
  }
});

export default router;
