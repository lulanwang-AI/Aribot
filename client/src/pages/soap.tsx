import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatientStore } from "@/store/patientStore";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Sparkles, Loader2, AlertTriangle, CheckCircle2,
  RefreshCw, ArrowRight, PenLine, User, Shield
} from "lucide-react";

type SoapKey = "S" | "O" | "A" | "P";

const SECTION_META: Record<SoapKey, { label: string; description: string; color: string }> = {
  S: { label: "Subjective", description: "Patient-reported symptoms, history of present illness", color: "bg-blue-500" },
  O: { label: "Objective", description: "Physical exam findings, vitals, lab results", color: "bg-green-500" },
  A: { label: "Assessment", description: "Clinical impression, differential diagnoses", color: "bg-amber-500" },
  P: { label: "Plan", description: "Treatment plan, follow-up, patient education", color: "bg-purple-500" },
};

function ConfidenceTag({ level }: { level: string }) {
  const colors: Record<string, string> = {
    high: "bg-green-100 text-green-700 border-green-200",
    moderate: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${colors[level] || colors.moderate}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)} confidence
    </Badge>
  );
}

function SoapSectionCard({
  sectionKey,
  value,
  originalValue,
  isEdited,
  confidence,
  signed,
  requiresEdit,
  onEdit,
  onRegenerate,
  isRegenerating,
}: {
  sectionKey: SoapKey;
  value: string;
  originalValue: string;
  isEdited: boolean;
  confidence: string;
  signed: boolean;
  requiresEdit: boolean;
  onEdit: (text: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}) {
  const meta = SECTION_META[sectionKey];
  const wordCount = value ? value.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <Card className={`relative ${requiresEdit && !isEdited && value ? "ring-2 ring-red-400 border-red-300" : !isEdited && value ? "ring-1 ring-blue-200 bg-blue-50/30" : ""}`} data-testid={`soap-card-${sectionKey}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-lg ${meta.color} text-white flex items-center justify-center text-sm font-bold`}>
              {sectionKey}
            </span>
            <div>
              <CardTitle className="text-base">{meta.label}</CardTitle>
              <p className="text-xs text-muted-foreground">{meta.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {confidence && <ConfidenceTag level={confidence} />}
            {requiresEdit && !isEdited && value && !signed && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-red-600 border-red-300 bg-red-50 gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" /> Edit Required
              </Badge>
            )}
            {isEdited && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 border-green-200 gap-0.5">
                <PenLine className="h-2.5 w-2.5" /> Edited
              </Badge>
            )}
          </div>
        </div>
        {requiresEdit && !isEdited && value && !signed && (
          <div className="mt-2 p-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Physician review and edit required before signing.
          </div>
        )}
        {confidence === "low" && value && (
          <div className="mt-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Review carefully — AI confidence is low for this section.
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          value={value}
          onChange={(e) => onEdit(e.target.value)}
          rows={14}
          className={`text-sm leading-relaxed min-h-[200px] ${requiresEdit && !isEdited && value ? "border-red-300 focus-visible:ring-red-400" : !isEdited && value ? "bg-blue-50/40" : "bg-background"}`}
          placeholder={`AI-generated ${meta.label.toLowerCase()} will appear here...`}
          disabled={signed}
          data-testid={`textarea-soap-${sectionKey}`}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{wordCount} words</span>
          {!signed && value && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 gap-1"
              onClick={onRegenerate}
              disabled={isRegenerating}
              data-testid={`button-regen-${sectionKey}`}
            >
              {isRegenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Regenerate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SoapNote() {
  const [, setLocation] = useLocation();
  const store = usePatientStore();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState<SoapKey | null>(null);
  const [confidence, setConfidence] = useState<Record<SoapKey, string>>({
    S: "", O: "", A: "", P: "",
  });

  const hasDraft = !!(store.soapDraft.S || store.soapDraft.O || store.soapDraft.A || store.soapDraft.P);
  const canSign = hasDraft && (store.soapEdited.A || store.soapEdited.P);

  async function generateSoap() {
    setGenerating(true);
    try {
      const res = await fetch("/api/soap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: store.name,
          dob: store.dob,
          sex: store.sex,
          chiefComplaint: store.chiefComplaint,
          vitals: store.vitals,
          medications: store.medications,
          allergies: store.allergies,
          pmh: store.pmh,
          psh: store.psh,
          specialty: store.specialty,
          encounterPrimer: store.encounterPrimer,
          chatTranscript: store.chatMessages.map(m => `${m.role}: ${m.content}`).join("\n"),
        }),
      });
      const json = await res.json();
      store.setSoap({ S: json.S, O: json.O, A: json.A, P: json.P });
      setConfidence(json.confidence || { S: "moderate", O: "moderate", A: "moderate", P: "moderate" });
      toast({ title: "SOAP note generated" });
    } catch {
      toast({ title: "Failed to generate SOAP note", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  async function regenerateSection(section: SoapKey) {
    setRegenerating(section);
    try {
      const res = await fetch("/api/soap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: store.name,
          dob: store.dob,
          sex: store.sex,
          chiefComplaint: store.chiefComplaint,
          vitals: store.vitals,
          medications: store.medications,
          allergies: store.allergies,
          pmh: store.pmh,
          psh: store.psh,
          specialty: store.specialty,
          encounterPrimer: store.encounterPrimer,
          chatTranscript: store.chatMessages.map(m => `${m.role}: ${m.content}`).join("\n"),
          regenerateSection: section,
        }),
      });
      const json = await res.json();
      if (json[section]) {
        store.updateSoapSection(section, json[section]);
        if (json.confidence?.[section]) {
          setConfidence(prev => ({ ...prev, [section]: json.confidence[section] }));
        }
      }
      toast({ title: `${SECTION_META[section].label} section regenerated` });
    } catch {
      toast({ title: "Failed to regenerate section", variant: "destructive" });
    } finally {
      setRegenerating(null);
    }
  }

  function handleEdit(section: SoapKey, text: string) {
    store.updateSoapSection(section, text);
    if (text !== store.soapOriginal[section]) {
      store.markSectionEdited(section);
    }
  }

  function handleSign() {
    store.signSoap();
    toast({ title: "SOAP note signed and finalized" });
    setLocation("/visit-summary");
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-soap-title">
            <FileText className="h-6 w-6 text-primary" />
            SOAP Note
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {store.name ? `Patient: ${store.name}` : "AI-drafted clinical note with inline editing"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {store.soapSigned && (
            <Badge className="gap-1 bg-green-100 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3" /> Signed
            </Badge>
          )}
        </div>
      </div>

      {!hasDraft && !generating && (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold">Generate SOAP Note</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                ARI will generate a complete SOAP note draft from pre-charting data and your chat conversation.
                You must review and edit before signing.
              </p>
            </div>
            <Button onClick={generateSoap} className="gap-2" data-testid="button-generate-soap">
              <Sparkles className="h-4 w-4" /> Generate SOAP Note
            </Button>
          </CardContent>
        </Card>
      )}

      {generating && (
        <div className="space-y-4">
          {(["S", "O", "A", "P"] as SoapKey[]).map(k => (
            <Card key={k}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <Skeleton className="h-5 w-28" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {hasDraft && !generating && (
        <>
          <div className="space-y-4">
            {(["S", "O", "A", "P"] as SoapKey[]).map(k => (
              <SoapSectionCard
                key={k}
                sectionKey={k}
                value={store.soapDraft[k]}
                originalValue={store.soapOriginal[k]}
                isEdited={store.soapEdited[k]}
                confidence={confidence[k]}
                signed={store.soapSigned}
                requiresEdit={k === "A" || k === "P"}
                onEdit={(text) => handleEdit(k, text)}
                onRegenerate={() => regenerateSection(k)}
                isRegenerating={regenerating === k}
              />
            ))}
          </div>

          <Separator />

          {!store.soapSigned && (
            <div className="space-y-3">
              {!canSign && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2" data-testid="text-sign-warning">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>You must review and edit the <strong>Assessment</strong> or <strong>Plan</strong> section before you can sign this note.</span>
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={handleSign}
                  disabled={!canSign}
                  className="gap-2"
                  data-testid="button-sign-soap"
                >
                  <PenLine className="h-4 w-4" /> Sign Note
                </Button>
              </div>
            </div>
          )}

          {store.soapSigned && (
            <div className="flex justify-end">
              <Button onClick={() => setLocation("/visit-summary")} className="gap-2" data-testid="button-go-summary">
                Continue to Visit Summary <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
