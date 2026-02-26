import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { recordEvent } from "@/lib/analytics";
import {
  CalendarDays,
  MapPin,
  Users,
  CheckCircle,
  Plus,
  Clock,
} from "lucide-react";
import type { MedEvent } from "@shared/schema";

export default function Events() {
  const { data: events, isLoading } = useQuery<MedEvent[]>({
    queryKey: ["/api/events"],
  });

  useEffect(() => {
    recordEvent("page_view", { section: "events" });
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-events-title">
          <CalendarDays className="h-5 w-5 text-primary" />
          Events
        </h1>
        <p className="text-sm text-muted-foreground">
          Conferences, grand rounds, and continuing education
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      )}

      <div className="space-y-4">
        {events?.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: MedEvent }) {
  const hasRsvpd = event.rsvps.includes("u1");
  const eventDate = new Date(event.date);
  const isPast = eventDate < new Date();

  const rsvpMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/events/${event.id}/${hasRsvpd ? "unrsvp" : "rsvp"}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      if (!hasRsvpd) {
        recordEvent("event_rsvp", { type: event.type, tags: [event.type] });
      }
    },
  });

  return (
    <Card data-testid={`card-event-${event.id}`}>
      <CardContent className="p-5">
        <div className="flex gap-4">
          <div className="hidden sm:flex flex-col items-center justify-center shrink-0 w-14 h-14 rounded-md bg-primary/10 text-primary">
            <span className="text-lg font-bold leading-none">
              {eventDate.getDate()}
            </span>
            <span className="text-xs uppercase">
              {eventDate.toLocaleDateString("en-US", { month: "short" })}
            </span>
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold">{event.title}</h3>
              <Badge variant="secondary" className="text-xs shrink-0">
                {event.type}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {event.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {eventDate.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.location}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {event.rsvps.length} attending
              </span>
            </div>
            <div className="pt-1">
              {isPast ? (
                <Badge variant="secondary" className="text-xs">Past event</Badge>
              ) : hasRsvpd ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => rsvpMutation.mutate()}
                  disabled={rsvpMutation.isPending}
                  data-testid={`button-unrsvp-${event.id}`}
                >
                  <CheckCircle className="h-3 w-3 mr-1.5 text-green-500" />
                  Attending
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => rsvpMutation.mutate()}
                  disabled={rsvpMutation.isPending}
                  data-testid={`button-rsvp-${event.id}`}
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  RSVP
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
