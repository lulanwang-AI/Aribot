import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface SectionItem {
  name: string;
  desc: string;
}

interface Section {
  title: string;
  items: SectionItem[];
}

const SECTIONS: Section[] = [
  {
    title: "What the engine decides, not Ari",
    items: [
      {
        name: "Regimen, dose, duration",
        desc: "Computed from the knowledge base and the applicable antibiogram",
      },
      {
        name: "The 48 to 72 hour action",
        desc: "Stop, narrow, continue, escalate or switch to oral",
      },
      {
        name: "Monitoring plan",
        desc: "Levels and labs derived from the agents actually prescribed",
      },
    ],
  },
  {
    title: "Stewardship capabilities",
    items: [
      {
        name: "Empiric selection",
        desc: "What to start before cultures, weighted by regional resistance",
      },
      {
        name: "De-escalation and stopping",
        desc: "Reading a susceptibility panel and acting on it",
      },
      {
        name: "Dosing and monitoring",
        desc: "Renal and weight-based dosing, therapeutic drug monitoring",
      },
      {
        name: "Resistance patterns",
        desc: "How a regional or facility antibiogram changes the choice",
      },
      {
        name: "Source control",
        desc: "What has to be drained or removed, and when the clock starts",
      },
      {
        name: "Allergy assessment",
        desc: "Whether a recorded label genuinely rules out the best agent",
      },
    ],
  },
  {
    title: "Evidence sources",
    items: [
      { name: "PubMed", desc: "Peer-reviewed literature and society guidelines" },
      { name: "bioRxiv", desc: "Preprint biology and life sciences" },
      { name: "ChEMBL", desc: "Bioactivity, pharmacokinetics and pharmacology" },
      { name: "Clinical Trials", desc: "Registered and reported trial data" },
      { name: "Exa", desc: "Semantic search for full-text guidelines" },
    ],
  },
  {
    title: "Document parsing",
    items: [
      { name: "PDF", desc: "Culture and susceptibility reports, discharge summaries" },
      { name: "XLSX", desc: "Facility antibiogram tables and dosing worksheets" },
      { name: "DOCX", desc: "Local policy documents and care plans" },
      { name: "PPTX", desc: "Stewardship committee decks" },
    ],
  },
  {
    title: "Two modes",
    items: [
      {
        name: "Verified",
        desc: "Retrieves before stating a fact, and flags anything unconfirmed",
      },
      {
        name: "Rapid",
        desc: "Answers from the model alone and labels itself as unverified",
      },
    ],
  },
];

interface ExplainerSheetProps {
  trigger?: ReactNode;
}

export function ExplainerSheet({ trigger }: ExplainerSheetProps) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            size="sm"
            data-testid="button-ari-explainer"
            aria-label="What can Ari do?"
            title="What can Ari do?"
          >
            <Info className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">What Ari can do</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-lg"
        data-testid="sheet-ari-explainer"
      >
        <SheetHeader>
          <SheetTitle>What Ari can do</SheetTitle>
          <SheetDescription>
            Sources Ari draws from, file types it can read, and clinical
            workflows it supports.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-6">
          {SECTIONS.map((section) => (
            <section
              key={section.title}
              data-testid={`section-explainer-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h3>
              <ul className="flex flex-col gap-2">
                {section.items.map((item) => (
                  <li
                    key={item.name}
                    className="rounded-md border border-border bg-muted/30 px-3 py-2"
                  >
                    <div className="text-sm font-medium text-foreground">
                      {item.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.desc}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
