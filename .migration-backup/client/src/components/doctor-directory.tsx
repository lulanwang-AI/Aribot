import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle, Trophy, Building, MapPin } from "lucide-react";
import type { User } from "@shared/schema";

const SPECIALTIES = [
  "All", "Cardiology", "Oncology", "Neurology", "Emergency Medicine",
  "Radiology", "Pediatrics", "Internal Medicine", "Surgery", "Infectious Disease",
  "Dermatology", "Psychiatry", "Orthopedics", "Anesthesiology"
];

interface DoctorDirectoryProps {
  onSelect?: (user: User) => void;
  selectable?: boolean;
  compact?: boolean;
}

export function DoctorDirectory({ onSelect, selectable, compact }: DoctorDirectoryProps) {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [sort, setSort] = useState("name");

  const qs = new URLSearchParams();
  if (search) qs.set("q", search);
  if (specialty !== "All") qs.set("specialty", specialty);
  if (sort === "ranking") qs.set("sort", "ranking");
  const queryStr = qs.toString();

  const { data: doctors, isLoading } = useQuery<User[]>({
    queryKey: ["/api/doctors", queryStr],
    queryFn: () => fetch(`/api/doctors${queryStr ? `?${queryStr}` : ""}`).then(r => r.json()),
  });

  return (
    <div className="space-y-3" data-testid="doctor-directory">
      <div className={`flex flex-wrap gap-2 ${compact ? "" : "mb-2"}`}>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search doctors..."
            className={`pl-9 ${compact ? "h-8 text-xs" : ""}`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-doctors"
          />
        </div>
        <Select value={specialty} onValueChange={setSpecialty}>
          <SelectTrigger className={`w-40 ${compact ? "h-8 text-xs" : ""}`} data-testid="select-doctor-specialty">
            <SelectValue placeholder="Specialty" />
          </SelectTrigger>
          <SelectContent>
            {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className={`w-32 ${compact ? "h-8 text-xs" : ""}`} data-testid="select-doctor-sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="ranking">Ranking</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>}

      <div className={`space-y-1.5 ${compact ? "max-h-[400px]" : ""} overflow-y-auto`}>
        {doctors?.map(doc => (
          <DoctorCard key={doc.id} doctor={doc} compact={compact} selectable={selectable} onSelect={onSelect} />
        ))}
        {!isLoading && doctors?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No doctors found</p>
        )}
      </div>
    </div>
  );
}

function DoctorCard({ doctor, compact, selectable, onSelect }: {
  doctor: User; compact?: boolean; selectable?: boolean; onSelect?: (u: User) => void;
}) {
  const initials = doctor.name.split(" ").map(n => n[0]).join("").slice(0, 2);
  const rankColor = doctor.rankingScore >= 80 ? "text-amber-500" : doctor.rankingScore >= 60 ? "text-blue-500" : "text-muted-foreground";

  return (
    <Card
      className={`p-3 flex items-center gap-3 ${selectable ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}`}
      onClick={() => selectable && onSelect?.(doctor)}
      data-testid={`doctor-card-${doctor.id}`}
    >
      <Avatar className={compact ? "h-8 w-8" : "h-10 w-10"}>
        <AvatarImage src={doctor.avatarUrl} />
        <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`${compact ? "text-xs" : "text-sm"} font-medium truncate`}>{doctor.name}</p>
          {doctor.credential && (
            <span className="text-[9px] font-semibold px-1.5 py-0 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0" data-testid={`credential-${doctor.id}`}>
              {doctor.credential}
            </span>
          )}
          {doctor.verified && <CheckCircle className="h-3 w-3 text-primary shrink-0" />}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
          <span>{doctor.specialty}</span>
          {!compact && (
            <>
              <span className="flex items-center gap-0.5"><Building className="h-2.5 w-2.5" />{doctor.hospital}</span>
              <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{doctor.city}, {doctor.state}</span>
            </>
          )}
        </div>
      </div>
      <div className={`flex items-center gap-1 shrink-0 ${rankColor}`}>
        <Trophy className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold">{doctor.rankingScore}</span>
      </div>
      {selectable && (
        <Button size="sm" variant="outline" className="shrink-0 text-xs" data-testid={`button-select-${doctor.id}`}>
          Select
        </Button>
      )}
    </Card>
  );
}
