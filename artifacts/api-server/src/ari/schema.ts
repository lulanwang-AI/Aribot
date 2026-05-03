import { z } from "zod";
import { ACTIVE_CAPABILITY_IDS } from "./capabilities";

export const AriRequestSchema = z.object({
  mode: z.enum(["ari", "er"]),
  // Capability is optional. When omitted the model auto-infers the closest
  // capability from the query per the system prompt. ACTIVE_CAPABILITY_IDS
  // is a `const` tuple, so z.enum preserves the precise capability id union.
  capability: z.enum(ACTIVE_CAPABILITY_IDS).nullable().optional(),
  query: z.string().min(1).max(8000),
  attachments: z
    .array(
      z.object({
        type: z.enum(["image", "pdf", "document"]),
        mediaType: z.string(),
        data: z.string(),
        filename: z.string(),
      })
    )
    .optional(),
});

export type AriRequest = z.infer<typeof AriRequestSchema>;
export type AriAttachment = NonNullable<AriRequest["attachments"]>[number];
