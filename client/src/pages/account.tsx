import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { resetAnalytics } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  Shield,
  BarChart3,
  Trash2,
  CheckCircle,
  User as UserIcon,
  Building,
  Stethoscope,
  GraduationCap,
} from "lucide-react";
import type { User } from "@shared/schema";

export default function Account() {
  const { data: user, isLoading } = useQuery<User>({ queryKey: ["/api/me"] });
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<User>) => {
      await apiRequest("PATCH", "/api/me", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "Settings updated" });
    },
  });

  if (isLoading || !user) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-account-title">
          <Settings className="h-5 w-5 text-primary" />
          Account Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <InfoField icon={UserIcon} label="Name" value={user.name} />
            <InfoField icon={Stethoscope} label="Specialty" value={user.specialty} />
            <InfoField icon={GraduationCap} label="Subspecialty" value={user.subspecialty} />
            <InfoField icon={Building} label="Hospital" value={user.hospital} />
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Interests</p>
            <div className="flex flex-wrap gap-1.5">
              {user.interests.map((interest) => (
                <Badge key={interest} variant="secondary" className="text-xs">{interest}</Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">{user.role}</Badge>
            {user.verified && (
              <Badge variant="default" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Compliance & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">PHI-Safe Mode</p>
              <p className="text-xs text-muted-foreground">
                When enabled, additional safeguards are applied to prevent sharing of Protected Health Information.
              </p>
            </div>
            <Switch
              checked={user.phiSafeMode}
              onCheckedChange={(v) => updateMutation.mutate({ phiSafeMode: v })}
              data-testid="switch-phi-safe-global"
            />
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            PHI-safe mode affects Aribot context sharing and adds stricter warnings when composing triage posts and comments.
            This setting is mirrored in the Aribot context bar.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Aribot tracks anonymous usage analytics locally in your browser to power trending topics and personalization.
            No data is sent to external servers.
          </p>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              resetAnalytics();
              toast({ title: "Analytics reset", description: "All local analytics data has been cleared." });
            }}
            data-testid="button-reset-analytics"
          >
            <Trash2 className="h-3 w-3 mr-1.5" />
            Reset Analytics Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoField({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="text-sm" data-testid={`text-${label.toLowerCase()}`}>{value}</p>
    </div>
  );
}
