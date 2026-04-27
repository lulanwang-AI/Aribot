import { z } from "zod";
import { ACTIVE_CAPABILITIES } from "./config";

export const AriRequestSchema = z.object({
  mode: z.enum(["ari", "er"]),
  capability: z.enum(ACTIVE_CAPABILITIES as unknown as [string, ...string[]]),
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
