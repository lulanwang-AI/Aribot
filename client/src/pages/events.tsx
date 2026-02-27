import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { recordEvent } from "@/lib/analytics";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CalendarDays, MapPin, Users, CheckCircle, Plus, Clock, Search, Building, Gauge, X, Ticket, ChevronDown } from "lucide-react";
import type { MedEvent } from "@shared/schema";
import { useMemo } from "react";

type EnrichedEvent = MedEvent & {
  rsvpAvatars?: { id: string; name: string; avatarUrl: string }[];
};

const DATE_FILTERS = [
  { value: "all", label: "Any Date" },
  { value: "today", label: "Today" },
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
  { value: "next-month", label: "Next Month" },
];

export default function Events() {
  const { data: events, isLoading } = useQuery<EnrichedEvent[]>({ queryKey: ["/api/events"] });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => { recordEvent("page_view", { section: "events" }); }, []);

  const eventTypes = useMemo(() => {
    if (!events) return [];
    const types = [...new Set(events.map(e => e.type))].sort();
    return types;
  }, [events]);

  const eventLocations = useMemo(() => {
    if (!events) return [];
    const locs = [...new Set(events.map(e => e.location))].sort();
    return locs;
  }, [events]);

  const filtered = useMemo(() => {
    if (!events) return [];
    const now = new Date();
    return events.filter(e => {
      if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.type.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (locationFilter !== "all" && e.location !== locationFilter) return false;
      if (dateFilter !== "all") {
        const eventDate = new Date(e.date);
        if (dateFilter === "today") {
          if (eventDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === "this-week") {
          const weekEnd = new Date(now);
          weekEnd.setDate(weekEnd.getDate() + 7);
          if (eventDate < now || eventDate > weekEnd) return false;
        } else if (dateFilter === "this-month") {
          if (eventDate.getMonth() !== now.getMonth() || eventDate.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === "next-month") {
          const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
          if (eventDate < nextMonth || eventDate > nextMonthEnd) return false;
        }
      }
      return true;
    });
  }, [events, search, typeFilter, locationFilter, dateFilter]);

  const hasActiveFilters = typeFilter !== "all" || locationFilter !== "all" || dateFilter !== "all";

  const myEvents = filtered.filter(e => e.rsvps.includes("u1") && new Date(e.date) >= new Date());
  const upcoming = filtered.filter(e => !e.rsvps.includes("u1") && new Date(e.date) >= new Date());
  const past = filtered.filter(e => new Date(e.date) < new Date());

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" data-testid="page-events">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-events-title">
          <CalendarDays className="h-5 w-5 text-primary" />
          Events
        </h1>
        <p className="text-sm text-muted-foreground">Conferences, grand rounds, labs, meetings, and coffee breaks</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search events..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-events" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40" data-testid="select-event-type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {eventTypes.map(t => (
              <SelectItem key={t} value={t}>{t.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-36" data-testid="select-event-date">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            {DATE_FILTERS.map(d => (
              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-48" data-testid="select-event-location">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {eventLocations.map(l => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setTypeFilter("all"); setLocationFilter("all"); setDateFilter("all"); }} data-testid="button-clear-filters">
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {isLoading && <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-40" />)}</div>}

      {!isLoading && myEvents.length === 0 && upcoming.length === 0 && past.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No events match your filters</p>
        </div>
      )}

      {myEvents.length > 0 && (
        <Collapsible defaultOpen className="mb-8">
          <CollapsibleTrigger className="flex items-center gap-2 w-full group" data-testid="toggle-your-events">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Your Events ({myEvents.length})
            </h2>
            <ChevronDown className="h-4 w-4 text-primary transition-transform group-data-[state=closed]:-rotate-90" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {myEvents.map(event => <EventCard key={event.id} event={event} />)}
          </CollapsibleContent>
        </Collapsible>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-4 mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Upcoming ({upcoming.length})</h2>
          {upcoming.map(event => <EventCard key={event.id} event={event} />)}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Past ({past.length})</h2>
          {past.map(event => <EventCard key={event.id} event={event} />)}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: MedEvent }) {
  const hasRsvpd = event.rsvps.includes("u1");
  const eventDate = new Date(event.date);
  const isPast = eventDate < new Date();
  const capacityPercent = event.capacity > 0 ? Math.round((event.rsvps.length / event.capacity) * 100) : 0;
  const isNearCapacity = capacityPercent >= 80;

  const rsvpMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/events/${event.id}/${hasRsvpd ? "unrsvp" : "rsvp"}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      if (!hasRsvpd) recordEvent("event_rsvp", { type: event.type, tags: [event.type] });
    },
  });

  const attendeePreview = event.rsvps.slice(0, 5);
  const typeLabel = event.type.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <Card data-testid={`card-event-${event.id}`} className={`overflow-hidden ${isPast ? "opacity-70" : ""}`}>
      <CardContent className="p-5">
        <div className="flex gap-4">
          <div className="hidden sm:block shrink-0 w-24 h-24 rounded-lg overflow-hidden relative">
            {event.imageUrl ? (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-primary/10" />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">
              <span className="text-2xl font-bold leading-none drop-shadow-sm">{eventDate.getDate()}</span>
              <span className="text-[11px] uppercase mt-0.5 drop-shadow-sm">{eventDate.toLocaleDateString("en-US", { month: "short" })}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold">{event.title}</h3>
              <Badge variant="secondary" className="text-[10px] shrink-0">{typeLabel}</Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {eventDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.location}
              </span>
              {event.hostHospital && (
                <span className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {event.hostHospital}
                </span>
              )}
            </div>

            {event.hostGroup && (
              <p className="text-[11px] text-muted-foreground">Hosted by: {event.hostGroup}</p>
            )}

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  {(event.rsvpAvatars || attendeePreview.map(id => ({ id, name: id, avatarUrl: "" }))).map((a, i) => (
                    <Avatar key={i} className="h-6 w-6 border-2 border-background" title={a.name}>
                      <AvatarImage src={a.avatarUrl} />
                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                        {a.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {event.rsvps.length > 5 && (
                    <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] text-muted-foreground font-medium">
                      +{event.rsvps.length - 5}
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">{event.rsvps.length}</span>
                  {event.capacity > 0 && <span> / {event.capacity}</span>}
                  <span className="ml-1">attending</span>
                  {isNearCapacity && !isPast && (
                    <Badge variant="destructive" className="text-[9px] ml-2 py-0">
                      <Gauge className="h-2.5 w-2.5 mr-0.5" />
                      {capacityPercent}% full
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isPast ? (
                  <Badge variant="secondary" className="text-xs">Past event</Badge>
                ) : hasRsvpd ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => rsvpMutation.mutate()} disabled={rsvpMutation.isPending} data-testid={`button-unrsvp-${event.id}`}>
                      <CheckCircle className="h-3 w-3 mr-1.5 text-green-500" />
                      Attending
                    </Button>
                    <Button size="sm" variant="secondary" data-testid={`button-ticket-${event.id}`}>
                      <Ticket className="h-3 w-3 mr-1.5" />
                      Ticket
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => rsvpMutation.mutate()} disabled={rsvpMutation.isPending} data-testid={`button-rsvp-${event.id}`}>
                    <Plus className="h-3 w-3 mr-1.5" />
                    RSVP
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
