import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionHeading, Pill, DecisionSupportNotice } from "@/components/amr/primitives";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { amrApi } from "@/lib/amr";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/hooks/use-theme";
import type { User } from "@shared/schema";
import { Building2, LogOut, Moon, ShieldCheck, Sun } from "lucide-react";
import { useMemo, useState } from "react";

export default function Account() {
  const { toast } = useToast();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const { data: user, isLoading } = useQuery<User>({ queryKey: ["/api/me"] });
  const { data: reference } = useQuery({
    queryKey: ["amr", "reference"],
    queryFn: () => amrApi.reference(),
  });

  const [draft, setDraft] = useState<Partial<User>>({});
  /** Draft value if the field has been edited, otherwise the saved value. */
  function text(key: "name" | "specialty" | "hospital" | "ward" | "regionId"): string {
    return draft[key] ?? user?.[key] ?? "";
  }

  const save = useMutation({
    mutationFn: (payload: Partial<User>) => apiRequest("PATCH", "/api/me", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      setDraft({});
      toast({ title: "Profile updated" });
    },
    onError: (err: Error) =>
      toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  const regionsByArea = useMemo(() => {
    const grouped = new Map<string, NonNullable<typeof reference>["regions"]>();
    for (const region of reference?.regions ?? []) {
      const list = grouped.get(region.area) ?? [];
      list.push(region);
      grouped.set(region.area, list);
    }
    return [...grouped.entries()];
  }, [reference]);

  if (isLoading || !user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-6 lg:px-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-64 w-full rounded-xl" />
      </div>
    );
  }

  const dirty = Object.keys(draft).length > 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your profile and the default antibiogram applied to new assessments.
        </p>
      </header>

      <div className="space-y-5">
        <section className="rounded-xl border border-card-border bg-card p-5">
          <SectionHeading title="Clinician" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium">
                Name
              </Label>
              <Input
                id="name"
                data-testid="input-name"
                value={text("name")}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="specialty" className="text-xs font-medium">
                Specialty
              </Label>
              <Input
                id="specialty"
                data-testid="input-specialty"
                value={text("specialty")}
                onChange={(e) => setDraft((d) => ({ ...d, specialty: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hospital" className="text-xs font-medium">
                Facility
              </Label>
              <Input
                id="hospital"
                data-testid="input-hospital"
                value={text("hospital")}
                onChange={(e) => setDraft((d) => ({ ...d, hospital: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ward" className="text-xs font-medium">
                Ward or unit
              </Label>
              <Input
                id="ward"
                data-testid="input-ward"
                value={text("ward")}
                onChange={(e) => setDraft((d) => ({ ...d, ward: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Pill className="border-primary/30 bg-primary/10 text-primary">
              <ShieldCheck className="h-2.5 w-2.5" />
              {user.credential}
            </Pill>
            {user.verified && (
              <Pill className="border-susceptible/25 bg-susceptible-soft text-susceptible">
                Licence verified
              </Pill>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-card-border bg-card p-5">
          <SectionHeading
            title="Default antibiogram"
            description="Applied to new assessments unless travel history overrides it."
          />
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="region" className="text-xs font-medium">
              Region
            </Label>
            <Select
              value={text("regionId") || "us_northeast"}
              onValueChange={(next) => setDraft((d) => ({ ...d, regionId: next }))}
            >
              <SelectTrigger id="region" data-testid="select-default-region">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {regionsByArea.map(([area, regions]) => (
                  <SelectGroup key={area}>
                    <SelectLabel>{area}</SelectLabel>
                    {regions.map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.name}
                        {region.facilityData ? " (facility data)" : ""}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Building2 className="mt-px h-3.5 w-3.5 shrink-0" />
            Regions without facility data use the shipped illustrative profile. Load your own
            CLSI-interpreted antibiogram before clinical use.
          </p>
        </section>

        <section className="rounded-xl border border-card-border bg-card p-5">
          <SectionHeading title="Preferences" />
          <div className="mt-4 space-y-2.5">
            <label className="flex cursor-pointer items-center justify-between rounded-md border border-border/60 px-3 py-2.5">
              <span>
                <span className="block text-xs font-medium text-foreground">
                  Protected health information safe mode
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Warns before identifiers are typed into a free-text field.
                </span>
              </span>
              <Switch
                checked={draft.phiSafeMode ?? user?.phiSafeMode ?? true}
                data-testid="switch-phi-safe-mode"
                onCheckedChange={(checked) => setDraft((d) => ({ ...d, phiSafeMode: checked }))}
              />
            </label>

            <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2.5">
              <span>
                <span className="block text-xs font-medium text-foreground">Appearance</span>
                <span className="block text-[11px] text-muted-foreground">
                  Ward displays are often dimmed overnight.
                </span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="button-toggle-theme"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="mr-1.5 h-3.5 w-3.5" />
                    Light
                  </>
                ) : (
                  <>
                    <Moon className="mr-1.5 h-3.5 w-3.5" />
                    Dark
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            disabled={!dirty || save.isPending}
            data-testid="button-save-profile"
            onClick={() => save.mutate(draft)}
          >
            {save.isPending ? "Saving" : "Save changes"}
          </Button>
          <Button type="button" variant="outline" onClick={signOut} data-testid="button-sign-out">
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>

        <DecisionSupportNotice
          lines={[
            `Knowledge base ${reference?.knowledgeBaseVersion ?? "loading"}. Recommendations are reproducible for a given intake and antibiogram.`,
            "Clinical decision support for licensed clinicians. It informs but does not replace clinical judgement.",
          ]}
        />
      </div>
    </div>
  );
}
