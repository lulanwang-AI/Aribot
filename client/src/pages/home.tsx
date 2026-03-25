import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClickableDoctor } from "@/components/doctor-profile-sheet";
import {
  Stethoscope,
  Newspaper,
  Users,
  CalendarDays,
  Bot,
  ArrowRight,
  Heart,
  MessageSquare,
  Clock,
  MapPin,
  Building,
  CheckCircle,
  Plus,
} from "lucide-react";
import type { User, TriagePost, NewsItem, MedEvent } from "@shared/schema";
import { seedAnalytics, recordEvent } from "@/lib/analytics";
import { useEffect, useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Home() {
  const { data: user, isLoading: userLoading } = useQuery<User>({ queryKey: ["/api/me"] });
  const { data: posts } = useQuery<(TriagePost & { author: { name: string; specialty: string } | null; commentCount: number })[]>({ queryKey: ["/api/triage"] });
  const { data: news } = useQuery<NewsItem[]>({ queryKey: ["/api/news"] });
  const { data: events } = useQuery<MedEvent[]>({ queryKey: ["/api/events"] });

  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  useEffect(() => {
    seedAnalytics();
    recordEvent("page_view", { section: "home" });
  }, []);

  const calendarEvents = useMemo(() => {
    if (!events) return new Map<string, MedEvent[]>();
    const map = new Map<string, MedEvent[]>();
    events.forEach(e => {
      const dateKey = new Date(e.date).toISOString().split("T")[0];
      const existing = map.get(dateKey) || [];
      existing.push(e);
      map.set(dateKey, existing);
    });
    return map;
  }, [events]);

  if (userLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const upcomingEvents = events?.filter(e => new Date(e.date) >= new Date()).slice(0, 5) || [];

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold" data-testid="text-welcome">
          Welcome back, {user?.name?.split(" ").slice(1).join(" ") || "Doctor"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {user?.specialty} · {user?.hospital}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Stethoscope} label="Active Cases" value={posts?.length || 0} href="/triage" color="text-blue-500" />
        <StatCard icon={Newspaper} label="News Articles" value={news?.length || 0} href="/news" color="text-emerald-500" />
        <StatCard icon={Users} label="Your Groups" value={5} href="/groups" color="text-violet-500" />
        <StatCard icon={CalendarDays} label="Upcoming Events" value={upcomingEvents.length} href="/events" color="text-amber-500" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              My Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} data-testid="button-prev-month">&lt;</Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} data-testid="button-next-month">&gt;</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-0.5">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} className="text-[10px] font-medium text-muted-foreground text-center py-1">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} className="h-16" />;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayEvents = calendarEvents.get(dateStr) || [];
                const isToday = dateStr === todayStr;
                return (
                  <div
                    key={dateStr}
                    className={`h-16 p-0.5 rounded-md border text-xs ${isToday ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/30"}`}
                    data-testid={`calendar-day-${day}`}
                  >
                    <span className={`text-[11px] font-medium ${isToday ? "text-primary" : ""}`}>{day}</span>
                    <div className="space-y-0.5 mt-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map(ev => {
                        const attending = ev.rsvps.includes("u1");
                        return (
                          <Link key={ev.id} href="/events">
                            <div
                              className={`text-[9px] leading-tight px-0.5 py-px rounded truncate cursor-pointer ${attending ? "bg-green-500/20 text-green-700 dark:text-green-400 font-medium" : "bg-primary/10 text-primary"}`}
                              title={`${ev.title}${attending ? " (Attending)" : ""}`}
                              data-testid={`calendar-event-${ev.id}`}
                            >
                              {attending && "● "}{ev.title.length > 12 ? ev.title.slice(0, 12) + "…" : ev.title}
                            </div>
                          </Link>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <span className="text-[9px] text-muted-foreground px-0.5">+{dayEvents.length - 2} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 pt-2 border-t">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-sm bg-green-500/20 border border-green-500/30" />
                Attending
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-sm bg-primary/10 border border-primary/20" />
                Other events
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Upcoming Events</CardTitle>
            <Link href="/events">
              <Button size="sm" variant="outline" data-testid="link-view-events">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingEvents.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No upcoming events</p>
            )}
            {upcomingEvents.map((event) => (
              <UpcomingEventCard key={event.id} event={event} />
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Link href="/aribot">
          <Button data-testid="button-open-aribot">
            <Bot className="h-4 w-4 mr-2" />
            Open Aribots AI Assistant
          </Button>
        </Link>
      </div>
    </div>
  );
}

function UpcomingEventCard({ event }: { event: MedEvent }) {
  const hasRsvpd = event.rsvps.includes("u1");
  const eventDate = new Date(event.date);

  const rsvpMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/events/${event.id}/${hasRsvpd ? "unrsvp" : "rsvp"}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  return (
    <div className="p-3 rounded-md bg-muted/30 space-y-1.5" data-testid={`card-event-${event.id}`}>
      <p className="text-sm font-medium leading-snug">{event.title}</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {eventDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {event.location}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-[10px]">{event.type.replace(/-/g, " ")}</Badge>
        {hasRsvpd ? (
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => rsvpMutation.mutate()} disabled={rsvpMutation.isPending}>
            <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
            Going
          </Button>
        ) : (
          <Button size="sm" className="h-6 text-xs" onClick={() => rsvpMutation.mutate()} disabled={rsvpMutation.isPending}>
            <Plus className="h-3 w-3 mr-1" />
            RSVP
          </Button>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, href, color }: { icon: any; label: string; value: number; href: string; color: string }) {
  return (
    <Link href={href}>
      <Card className="hover-elevate cursor-pointer">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
