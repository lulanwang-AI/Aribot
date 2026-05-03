import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const LICENSE_OPTIONS = [
  { value: "MD", label: "MD — Doctor of Medicine" },
  { value: "DO", label: "DO — Doctor of Osteopathic Medicine" },
  { value: "NP", label: "NP — Nurse Practitioner" },
  { value: "PA", label: "PA — Physician Assistant" },
  { value: "RN", label: "RN — Registered Nurse" },
  { value: "PharmD", label: "PharmD — Pharmacist" },
  { value: "OTHER", label: "Other licensed clinician" },
];

interface MeResponse {
  user: { id: string; email?: string; username?: string; licenseType?: string; acceptedAriTermsAt?: number | null };
  onboarded: boolean;
}

export default function AribotOnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const meQuery = useQuery<MeResponse>({
    queryKey: ["/api/ari/me"],
  });

  const [licenseType, setLicenseType] = useState<string>("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseState, setLicenseState] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // If we're already onboarded, bounce straight to the chat surface.
  useEffect(() => {
    if (meQuery.data?.onboarded) {
      setLocation("/aribot");
    }
  }, [meQuery.data?.onboarded, setLocation]);

  const submit = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/ari/onboarding", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licenseType,
          licenseNumber: licenseNumber || undefined,
          licenseState: licenseState || undefined,
          termsAccepted,
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.message || `Onboarding failed (${r.status}).`);
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ari/me"] });
      toast({ title: "Welcome to Ari." });
      setLocation("/aribot");
    },
    onError: (err: any) => setSubmitError(err?.message || "Onboarding failed."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!licenseType) {
      setSubmitError("License type is required.");
      return;
    }
    if (!termsAccepted) {
      setSubmitError("You must acknowledge the terms.");
      return;
    }
    submit.mutate();
  }

  if (meQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex min-h-full max-w-xl flex-col px-4 py-10"
      data-testid="page-ari-onboarding"
    >
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Ari clinical access</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ari is for licensed clinicians only. We need your license type to
          tailor responses and to bind every clinical session to an identified
          clinician.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="license-type">License type *</Label>
          <Select value={licenseType} onValueChange={setLicenseType}>
            <SelectTrigger id="license-type" data-testid="select-license-type">
              <SelectValue placeholder="Select your license type" />
            </SelectTrigger>
            <SelectContent>
              {LICENSE_OPTIONS.map((o) => (
                <SelectItem
                  key={o.value}
                  value={o.value}
                  data-testid={`option-license-${o.value}`}
                >
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="license-number">License number (optional)</Label>
            <Input
              id="license-number"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              data-testid="input-license-number"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="license-state">State (optional)</Label>
            <Input
              id="license-state"
              value={licenseState}
              onChange={(e) => setLicenseState(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="CA"
              data-testid="input-license-state"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          We'll verify these later for full feature access.
        </p>

        <div className="rounded-md border border-border bg-muted/30 p-3">
          <label className="flex items-start gap-3 text-sm" data-testid="label-terms">
            <Checkbox
              checked={termsAccepted}
              onCheckedChange={(v) => setTermsAccepted(v === true)}
              className="mt-0.5"
              data-testid="checkbox-terms"
            />
            <span>
              I acknowledge that Ari provides clinical decision support, not
              clinical decisions. I am responsible for verifying any
              recommendation before acting on it. I will not enter patient
              identifiers (names, MRNs, DOBs, addresses, phone numbers) into
              Ari.
            </span>
          </label>
        </div>

        {submitError && (
          <p
            className="text-sm text-destructive"
            role="alert"
            data-testid="text-onboarding-error"
          >
            {submitError}
          </p>
        )}

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            type="button"
            onClick={() => setLocation("/home")}
            data-testid="button-onboarding-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submit.isPending}
            data-testid="button-onboarding-submit"
          >
            {submit.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Continue to Ari
          </Button>
        </div>
      </form>
    </div>
  );
}
