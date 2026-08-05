import { createContext, useContext, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Stethoscope,
  Building2,
  BadgeCheck,
  Briefcase,
} from "lucide-react";

interface DoctorProfile {
  id: string;
  name: string;
  specialty: string;
  subspecialty: string;
  interests: string[];
  hospital: string;
  role: string;
  verified: boolean;
  avatarUrl: string;
  credential?: string;
  caseCount: number;
  commentCount: number;
  groupCount: number;
  eventCount: number;
  recentCases: { id: string; title: string; tags: string[]; createdAt: string }[];
  memberGroups: { id: string; name: string; topic: string }[];
}

interface ProfileContextType {
  openProfile: (userId: string) => void;
}

const ProfileContext = createContext<ProfileContextType>({ openProfile: () => {} });

export function useProfileSheet() {
  return useContext(ProfileContext);
}

export function ProfileSheetProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const openProfile = useCallback((id: string) => {
    setUserId(id);
    setOpen(true);
  }, []);

  return (
    <ProfileContext.Provider value={{ openProfile }}>
      {children}
      <DoctorProfileSheet userId={userId} open={open} onOpenChange={setOpen} />
    </ProfileContext.Provider>
  );
}

function DoctorProfileSheet({ userId, open, onOpenChange }: { userId: string | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: profile, isLoading } = useQuery<DoctorProfile>({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
    enabled: !!userId && open,
    staleTime: 30000,
  });

  const initials = profile?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2) || "?";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:w-[420px] overflow-y-auto" data-testid="sheet-doctor-profile">
        <SheetHeader>
          <SheetTitle className="text-left">Physician Profile</SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground text-sm">Loading profile...</div>
          </div>
        )}

        {profile && (
          <div className="space-y-5 mt-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16" data-testid="avatar-profile">
                <AvatarImage src={profile.avatarUrl} />
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-base font-bold truncate" data-testid="text-profile-name">{profile.name}</h2>
                  {profile.credential && (
                    <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20 font-semibold shrink-0" data-testid="badge-credential">
                      {profile.credential}
                    </Badge>
                  )}
                  {profile.verified && (
                    <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{profile.specialty}</span>
                </div>
                {profile.subspecialty && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Briefcase className="h-3 w-3 shrink-0" />
                    <span className="truncate">{profile.subspecialty}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{profile.hospital}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 rounded-md bg-muted/40" data-testid="stat-cases">
                <p className="text-lg font-bold">{profile.caseCount}</p>
                <p className="text-xs text-muted-foreground">Cases</p>
              </div>
              <div className="text-center p-2 rounded-md bg-muted/40" data-testid="stat-comments">
                <p className="text-lg font-bold">{profile.commentCount}</p>
                <p className="text-xs text-muted-foreground">Comments</p>
              </div>
              <div className="text-center p-2 rounded-md bg-muted/40" data-testid="stat-groups">
                <p className="text-lg font-bold">{profile.groupCount}</p>
                <p className="text-xs text-muted-foreground">Groups</p>
              </div>
              <div className="text-center p-2 rounded-md bg-muted/40" data-testid="stat-events">
                <p className="text-lg font-bold">{profile.eventCount}</p>
                <p className="text-xs text-muted-foreground">Events</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Interests & Expertise
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="text-xs" data-testid={`badge-interest-${interest}`}>
                    {interest}
                  </Badge>
                ))}
                {profile.interests.length === 0 && (
                  <p className="text-xs text-muted-foreground">No interests listed</p>
                )}
              </div>
            </div>

            <Separator />

          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface ClickableDoctorProps {
  userId: string;
  name: string;
  specialty?: string;
  credential?: string;
  avatarUrl?: string;
  showAvatar?: boolean;
  avatarSize?: "sm" | "md";
  className?: string;
}

export function ClickableDoctor({ userId, name, specialty, credential, avatarUrl, showAvatar = true, avatarSize = "sm", className = "" }: ClickableDoctorProps) {
  const { openProfile } = useProfileSheet();

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const sizeClass = avatarSize === "md" ? "h-8 w-8" : "h-6 w-6";
  const textSizeClass = avatarSize === "md" ? "text-sm" : "text-xs";

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer group ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        openProfile(userId);
      }}
      data-testid={`button-doctor-${userId}`}
    >
      {showAvatar && (
        <Avatar className={`${sizeClass} ring-2 ring-transparent group-hover:ring-primary/30 transition-all`}>
          {avatarUrl && <AvatarImage src={avatarUrl} />}
          <AvatarFallback className={`${textSizeClass === "text-sm" ? "text-xs" : "text-[10px]"} bg-primary/10 text-primary`}>
            {initials}
          </AvatarFallback>
        </Avatar>
      )}
      <span className={`${textSizeClass} font-medium text-foreground group-hover:text-primary transition-colors`}>
        {name}
      </span>
      {(credential || specialty) && (
        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border border-primary/20 font-semibold shrink-0">
          {credential || specialty}
        </Badge>
      )}
    </button>
  );
}
