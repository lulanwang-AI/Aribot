import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { recordEvent } from "@/lib/analytics";
import { CalendarDays, MapPin, Users, CheckCircle, Plus, Clock, Search, Building, Gauge } from "lucide-react";
import type { MedEvent } from "@shared/schema";

export default function Events() {
  const { data: events, isLoading } = useQuery<MedEvent[]>({ queryKey: ["/api/events"] });
  const [search, setSearch] = useState("");

  useEffect(() => { recordEvent("page_view", { section: "events" }); }, []);

  const filtered = events?.filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.type.toLowerCase().includes(search.toLowerCase())
  );

  const upcoming = filtered?.filter(e => new Date(e.date) >= new Date()) || [];
  const past = filtered?.filter(e => new Date(e.date) < new Date()) || [];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" data-testid="page-events">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-events-title">
          <CalendarDays className="h-5 w-5 text-primary" />
          Events
        </h1>
        <p className="text-sm text-muted-foreground">Conferences, grand rounds, labs, meetings, and coffee breaks</p>
      </div>

      <div className="relative mb-5">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search events..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-events" />
      </div>

      {isLoading && <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-40" />)}</div>}

      {upcoming.length > 0 && (
        <div className="space-y-4 mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</h2>
          {upcoming.map(event => <EventCard key={event.id} event={event} />)}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Past</h2>
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
      {event.imageUrl && (
        <div className="h-36 w-full overflow-hidden">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <CardContent className="p-5">
        <div className="flex gap-4">
          <div className="hidden sm:flex flex-col items-center justify-center shrink-0 w-16 h-16 rounded-lg bg-primary/10 text-primary">
            <span className="text-xl font-bold leading-none">{eventDate.getDate()}</span>
            <span className="text-[11px] uppercase mt-0.5">{eventDate.toLocaleDateString("en-US", { month: "short" })}</span>
            <span className="text-[9px] opacity-60">{eventDate.getFullYear()}</span>
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
                  {attendeePreview.map((rId, i) => (
                    <Avatar key={i} className="h-6 w-6 border-2 border-background">
                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                        {rId.slice(1, 3).toUpperCase()}
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

              <div>
                {isPast ? (
                  <Badge variant="secondary" className="text-xs">Past event</Badge>
                ) : hasRsvpd ? (
                  <Button size="sm" variant="outline" onClick={() => rsvpMutation.mutate()} disabled={rsvpMutation.isPending} data-testid={`button-unrsvp-${event.id}`}>
                    <CheckCircle className="h-3 w-3 mr-1.5 text-green-500" />
                    Attending
                  </Button>
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
