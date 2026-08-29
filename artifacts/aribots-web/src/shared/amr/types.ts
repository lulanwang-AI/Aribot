/**
 * Domain types for the stewardship engine.
 *
 * This file used to be a hand-maintained copy of the engine's types and it
 * drifted, which is exactly the failure a mirrored file invites. The web app
 * now compiles the engine source directly, so there is one definition and the
 * two artifacts cannot disagree.
 */
export type * from "@engine/types";

import type { StewardshipCase } from "@engine/types";

/** A case as the API returns it, with server-computed review timing attached. */
export interface StewardshipCaseView extends StewardshipCase {
  /** Hours until the 48-hour checkpoint. Negative once it has passed. */
  hoursToReview: number;
  reviewDue: boolean;
}
