import { getAgent } from "./data/agents";
import { hoursToReview, isReviewDue, listCases } from "./store";
import type { StewardshipCase } from "./types";

export interface StewardshipMetrics {
  activeCases: number;
  /** Past the 48 hour checkpoint with no review recorded. */
  reviewsDue: number;
  /** Past the far end of the 48 to 72 hour window with no review recorded. */
  reviewsOverdue: number;
  reviewsCompleted: number;
  /** Percent of completed reviews that stopped or narrowed therapy. */
  deEscalationRate: number;
  stopRate: number;
  ivToPoEligible: number;
  /**
   * Days of therapy summed across every case, counted against the regimen each
   * case is currently on. It is a current-regimen exposure figure rather than a
   * full historical days-of-therapy denominator, which would need per-agent
   * start and stop times on the timeline.
   */
  daysOfTherapy: number;
  /** Days of therapy on agents scoring 4 or 5 for collateral damage. */
  broadSpectrumDays: number;
  broadSpectrumShare: number;
  restrictedAgentCases: number;
  acceptanceRate: number;
  agentUsage: { agentId: string; name: string; cases: number; tier: string }[];
  syndromeMix: { syndromeId: string; name: string; cases: number }[];
  coverageGapAlerts: {
    caseId: string;
    patientLabel: string;
    message: string;
    severity: "high" | "medium";
  }[];
}

function activeAgentIds(record: StewardshipCase): string[] {
  if (record.targeted?.regimen.length) return record.targeted.regimen.map((a) => a.agentId);
  const selected = record.empiric?.regimens.find((r) => r.id === record.selectedRegimenId);
  const fallback = selected ?? record.empiric?.regimens[0];
  return fallback?.agents.map((a) => a.agentId) ?? [];
}

export function computeMetrics(): StewardshipMetrics {
  const all = listCases();
  const active = all.filter((c) => !["completed", "stopped"].includes(c.status));
  const reviewed = all.filter((c) => c.targeted);

  // change_for_reliability is deliberately excluded: it drops agents but widens
  // spectrum, and counting it here would flatter the headline metric.
  const deEscalated = reviewed.filter((c) =>
    ["de_escalate", "stop", "switch_iv_to_po"].includes(c.targeted!.action),
  );
  const stopped = reviewed.filter((c) => c.targeted!.action === "stop");

  const agentCounts = new Map<string, number>();
  let daysOfTherapy = 0;
  let broadSpectrumDays = 0;
  let restrictedAgentCases = 0;

  // Exposure is counted across every case, open or closed. Restricting it to
  // active cases would make a completed 14 day carbapenem course vanish from
  // the broad-spectrum share the moment it finished, which is precisely the
  // exposure a stewardship programme exists to measure.
  for (const record of all) {
    const agentIds = activeAgentIds(record);
    const days = Math.max(1, record.daysOfTherapy);
    let hasRestricted = false;

    for (const agentId of agentIds) {
      agentCounts.set(agentId, (agentCounts.get(agentId) ?? 0) + 1);
      const agent = getAgent(agentId);
      daysOfTherapy += days;
      if (agent.collateralDamageScore >= 4) broadSpectrumDays += days;
      if (agent.restricted) hasRestricted = true;
    }
    if (hasRestricted) restrictedAgentCases += 1;
  }

  const syndromeCounts = new Map<string, { name: string; cases: number }>();
  for (const record of all) {
    const entry = syndromeCounts.get(record.syndromeId) ?? { name: record.syndromeName, cases: 0 };
    entry.cases += 1;
    syndromeCounts.set(record.syndromeId, entry);
  }

  const coverageGapAlerts: StewardshipMetrics["coverageGapAlerts"] = [];
  for (const record of all) {
    if (record.targeted?.action === "escalate") {
      coverageGapAlerts.push({
        caseId: record.id,
        patientLabel: record.patientLabel,
        message: `Isolate is not covered by the current regimen - ${record.targeted.headline}`,
        severity: "high",
      });
    }
    const pastCheckpointHours = -hoursToReview(record);
    if (isReviewDue(record) && pastCheckpointHours >= 24) {
      coverageGapAlerts.push({
        caseId: record.id,
        patientLabel: record.patientLabel,
        message: `Past the 72 hour end of the review window on ${record.syndromeName.toLowerCase()}, ${pastCheckpointHours} hours beyond the 48 hour checkpoint`,
        severity: "high",
      });
    }
    const preferred = record.empiric?.regimens[0];
    if (preferred && record.selectedRegimenId && record.selectedRegimenId !== preferred.id && !record.targeted) {
      coverageGapAlerts.push({
        caseId: record.id,
        patientLabel: record.patientLabel,
        message: `Started a broader regimen than recommended (${preferred.label} was preferred)`,
        severity: "medium",
      });
    }
  }

  const decided = all.filter((c) => c.decision);
  const accepted = decided.filter((c) => c.decision!.outcome === "accepted");

  return {
    activeCases: active.length,
    reviewsDue: all.filter(isReviewDue).length,
    reviewsOverdue: all.filter((c) => isReviewDue(c) && hoursToReview(c) <= -24).length,
    reviewsCompleted: reviewed.length,
    deEscalationRate: reviewed.length ? Math.round((deEscalated.length / reviewed.length) * 100) : 0,
    stopRate: reviewed.length ? Math.round((stopped.length / reviewed.length) * 100) : 0,
    ivToPoEligible: all.filter((c) => c.targeted?.ivToPo.eligible).length,
    daysOfTherapy,
    broadSpectrumDays,
    broadSpectrumShare: daysOfTherapy ? Math.round((broadSpectrumDays / daysOfTherapy) * 100) : 0,
    restrictedAgentCases,
    acceptanceRate: decided.length ? Math.round((accepted.length / decided.length) * 100) : 0,
    agentUsage: [...agentCounts.entries()]
      .map(([agentId, cases]) => {
        const agent = getAgent(agentId);
        return { agentId, name: agent.name, cases, tier: agent.tier };
      })
      .sort((a, b) => b.cases - a.cases),
    syndromeMix: [...syndromeCounts.entries()]
      .map(([syndromeId, entry]) => ({ syndromeId, ...entry }))
      .sort((a, b) => b.cases - a.cases),
    coverageGapAlerts,
  };
}
