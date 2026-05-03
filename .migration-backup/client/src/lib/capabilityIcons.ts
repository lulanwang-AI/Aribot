import {
  Bandage,
  Calculator,
  ClipboardList,
  Pill,
  PillBottle,
  Plus,
  Receipt,
  ScanLine,
  Siren,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { AriCapabilityId } from "@shared/ari/capabilities";

export const CAPABILITY_ICONS: Record<AriCapabilityId, LucideIcon> = {
  antibiotic_stewardship: Pill,
  wound_skin: Bandage,
  pharmacy: PillBottle,
  ventilator: Wind,
  calculators: Calculator,
  clinical_protocols: ClipboardList,
  er_triage: Siren,
  cms_billing: Receipt,
  rad_onc_imaging: ScanLine,
};

export function getCapabilityIcon(id: AriCapabilityId): LucideIcon {
  return CAPABILITY_ICONS[id] ?? Plus;
}
