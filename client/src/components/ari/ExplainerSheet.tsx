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
    title: "Evidence Sources",
    items: [
      { name: "PubMed", desc: "NEJM, JAMA, Cochrane & peer-reviewed lit" },
      { name: "bioRxiv", desc: "Preprint biology & life sciences" },
      { name: "Open Targets", desc: "Drug-target & disease associations" },
      { name: "Consensus", desc: "Synthesis across literature" },
      { name: "Scholar Gateway", desc: "Broad academic search" },
      { name: "Exa", desc: "Semantic search for full-text guidelines" },
    ],
  },
  {
    title: "Drug & Decision Tools",
    items: [
      { name: "ChEMBL", desc: "Bioactivity, PK/PD, pharmacology" },
      { name: "ICD-10 Codes", desc: "Clinical-term → diagnosis code mapping" },
      { name: "CMS Coverage", desc: "Medicare/Medicaid coverage lookups" },
      { name: "NPI Registry", desc: "US licensed-provider lookup" },
    ],
  },
  {
    title: "Hugging Face — Biomedical AI",
    items: [
      {
        name: "Triage Models",
        desc: "Acuity scoring, ESI prediction from free text",
      },
      {
        name: "Clinical NLP",
        desc: "NER, med extraction, discharge parsing",
      },
      {
        name: "Drug Interaction & PK/PD",
        desc: "ML-based interaction prediction",
      },
      {
        name: "Protein & Molecular",
        desc: "ESMFold/AlphaFold-style structure tools",
      },
      {
        name: "Medical Imaging AI",
        desc: "Radiology & pathology assist",
      },
    ],
  },
  {
    title: "Document Parsing",
    items: [
      { name: "PDF", desc: "Labs, discharge, radiology, RT plan reports" },
      { name: "XLSX", desc: "PK worksheets, dosing tables, DVH data" },
      { name: "DOCX", desc: "Care plans, protocols, RT summaries" },
      { name: "PPTX", desc: "Grand rounds & protocol decks" },
    ],
  },
  {
    title: "Clinical Capabilities",
    items: [
      {
        name: "Antibiotic Stewardship",
        desc: "IDSA empiric/targeted regimens, resistance",
      },
      { name: "Wound & Skin", desc: "Photo analysis, NPUAP staging, plans" },
      {
        name: "Pharmacy",
        desc: "Dosing, renal/hepatic, PK, TPN, chemo banding",
      },
      { name: "Ventilator Mgmt", desc: "ARDSNet, weaning, RSBI/SBT" },
      {
        name: "Medical Calculators",
        desc: "MDCalc-style scores & formulas",
      },
      {
        name: "Clinical Protocols",
        desc: "DKA, HHS, CIWA, sepsis, hypertensive emerg.",
      },
      {
        name: "ER Triage",
        desc: "ESI 1–5, time-sensitive Dx, AI-assisted acuity",
      },
      {
        name: "Oncology & Rare Disease",
        desc: "Open Targets + NCCN targeted therapy",
      },
      { name: "Billing & Coverage", desc: "ICD-10 + CMS policy support" },
    ],
  },
  {
    title: "Radiation Oncology",
    items: [
      {
        name: "Imaging Review",
        desc: "X-ray/CT/MRI; GTV/CTV/PTV-relevant findings",
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
            <Info className="mr-1.5 h-4 w-4" />
            What Ari can do
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
