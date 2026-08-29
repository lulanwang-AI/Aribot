import {
  FlaskConical,
  Gauge,
  Globe2,
  Plus,
  ShieldAlert,
  TrendingDown,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { AriCapabilityId } from "@shared/ari/capabilities";

export const CAPABILITY_ICONS: Record<AriCapabilityId, LucideIcon> = {
  empiric_selection: FlaskConical,
  de_escalation: TrendingDown,
  dosing_monitoring: Gauge,
  resistance_patterns: Globe2,
  source_control: Wrench,
  allergy_assessment: ShieldAlert,
};

export function getCapabilityIcon(id: AriCapabilityId): LucideIcon {
  return CAPABILITY_ICONS[id] ?? Plus;
}
