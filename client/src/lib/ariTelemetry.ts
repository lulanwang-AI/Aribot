/**
 * Stub telemetry hooks for the Ari surface. The real telemetry pipeline can
 * wire in later — for now we just log to console so we can verify the events
 * are firing at the right moments.
 */

export interface ErModeSessionEvent {
  capability: string;
  durationMs: number;
  messageCount: number;
}

export function logErModeSession(event: ErModeSessionEvent): void {
  // eslint-disable-next-line no-console
  console.info("[ari/telemetry] er_mode_session", event);
}
