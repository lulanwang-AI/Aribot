import { z } from "zod";
import { ACTIVE_CAPABILITY_IDS } from "@shared/ari/capabilities";

export const AriRequestSchema = z.object({
  mode: z.enum(["ari", "er"]),
  // ACTIVE_CAPABILITY_IDS is a `const` tuple, so z.enum preserves the
  // precise capability id union here — no `as unknown as [string, ...]` cast.
  capability: z.enum(ACTIVE_CAPABILITY_IDS),
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
