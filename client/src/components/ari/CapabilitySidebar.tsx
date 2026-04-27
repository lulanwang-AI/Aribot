import {
  Pill,
  Activity,
  Calculator,
  Stethoscope,
  AlertTriangle,
  FileText,
  Scan,
  Bandage,
  Microscope,
  type LucideIcon,
} from "lucide-react";
import {
  ARI_CAPABILITIES,
  type AriCapability,
  type AriCapabilityId,
} from "@shared/ari/capabilities";
import { cn } from "@/lib/utils";

const CAPABILITY_ICONS: Record<AriCapabilityId, LucideIcon> = {
  pharmacy: Pill,
  ventilator: Activity,
  calculators: Calculator,
  clinical_protocols: Stethoscope,
  er_triage: AlertTriangle,
  cms_billing: FileText,
  rad_onc_imaging: Scan,
  wound_skin: Bandage,
  antibiotic_stewardship: Microscope,
};

interface CapabilitySidebarProps {
  selected: AriCapabilityId;
  onSelect: (id: AriCapabilityId) => void;
}

export function CapabilitySidebar({ selected, onSelect }: CapabilitySidebarProps) {
  return (
    <nav
      aria-label="Ari capabilities"
      className="flex flex-col gap-2 p-3"
      data-testid="sidebar-ari-capabilities"
    >
      <div className="px-2 pt-1 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Capability
      </div>
      {ARI_CAPABILITIES.map((cap, idx) => (
        <CapabilityCard
          key={cap.id}
          capability={cap}
          icon={CAPABILITY_ICONS[cap.id]}
          selected={cap.id === selected}
          shortcutNumber={idx + 1}
          onClick={() => onSelect(cap.id)}
        />
      ))}
    </nav>
  );
}

interface CapabilityCardProps {
  capability: AriCapability;
  icon: LucideIcon;
  selected: boolean;
  shortcutNumber: number;
  onClick: () => void;
}

function CapabilityCard({
  capability,
  icon: Icon,
  selected,
  shortcutNumber,
  onClick,
}: CapabilityCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      data-testid={`button-capability-${capability.id}`}
      className={cn(
        "group flex w-full items-start gap-3 rounded-md border bg-card p-3 text-left transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary ring-2 ring-primary"
          : "border-border"
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-5 w-5 shrink-0",
          selected ? "text-primary" : "text-muted-foreground"
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">
            {capability.displayName}
          </span>
          <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
            ⌘{shortcutNumber}
          </kbd>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {capability.shortDescription}
        </p>
      </div>
    </button>
  );
}
