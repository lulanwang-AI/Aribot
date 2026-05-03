import { useEffect, useState } from "react";
import { detectPHI, redactPHI, type PHIFinding } from "@/lib/phi";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldAlert, Check, X } from "lucide-react";

interface PHIWarningPanelProps {
  text: string;
  onRedact: (redactedText: string) => void;
}

export function PHIWarningPanel({ text, onRedact }: PHIWarningPanelProps) {
  const [findings, setFindings] = useState<PHIFinding[]>([]);

  useEffect(() => {
    if (text.trim().length > 0) {
      setFindings(detectPHI(text));
    } else {
      setFindings([]);
    }
  }, [text]);

  if (findings.length === 0) return null;

  function handleAutoRedact() {
    const redacted = redactPHI(text, findings);
    onRedact(redacted);
    setFindings([]);
  }

  return (
    <div className="rounded-md bg-destructive/5 p-3 space-y-2" data-testid="panel-phi-warning">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
        <p className="text-sm font-medium text-destructive">
          Potential PHI Detected
        </p>
      </div>
      <div className="space-y-1">
        {findings.map((f, i) => (
          <div
            key={`${f.start}-${i}`}
            className="flex items-start gap-2 text-xs"
            data-testid={`phi-finding-${i}`}
          >
            <AlertTriangle className="h-3 w-3 text-destructive/70 mt-0.5 shrink-0" />
            <div>
              <span className="font-medium">{f.type}:</span>{" "}
              <code className="bg-destructive/10 px-1 rounded text-destructive">
                {f.match}
              </code>
            </div>
          </div>
        ))}
      </div>
      <Button
        size="sm"
        variant="destructive"
        onClick={handleAutoRedact}
        data-testid="button-auto-redact"
      >
        <X className="h-3 w-3 mr-1.5" />
        Auto-Redact All
      </Button>
      <p className="text-xs text-muted-foreground">
        Heuristic detection only. Review redacted text before submitting. This tool does not guarantee complete PHI removal.
      </p>
    </div>
  );
}

export function PostingRulesBanner() {
  return (
    <div className="rounded-md bg-primary/5 p-3 space-y-1" data-testid="banner-posting-rules">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm font-medium">Posting Rules</p>
      </div>
      <p className="text-xs text-muted-foreground">
        No patient identifiers: names, DOB, MRN, exact address, phone, email, unique photos, or any information that could identify a specific patient.
      </p>
    </div>
  );
}
