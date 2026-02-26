import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import type { User, TriagePost, NewsItem, MedEvent } from "@shared/schema";
import { seedAnalytics, recordEvent } from "@/lib/analytics";
import { useEffect } from "react";

export default function Home() {
  const { data: user, isLoading: userLoading } = useQuery<User>({ queryKey: ["/api/me"] });
  const { data: posts } = useQuery<(TriagePost & { author: { name: string; specialty: string } | null })[]>({ queryKey: ["/api/triage"] });
  const { data: news } = useQuery<NewsItem[]>({ queryKey: ["/api/news"] });
  const { data: events } = useQuery<MedEvent[]>({ queryKey: ["/api/events"] });

  useEffect(() => {
    seedAnalytics();
    recordEvent("page_view", { section: "home" });
  }, []);

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

  const upcomingEvents = events?.slice(0, 3) || [];
  const recentPosts = posts?.slice(0, 3) || [];
  const recentNews = news?.slice(0, 3) || [];

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

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Recent Triage Cases</CardTitle>
            <Link href="/triage">
              <Button size="sm" variant="outline" data-testid="link-view-triage">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentPosts.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No cases yet</p>
            )}
            {recentPosts.map((post) => (
              <Link key={post.id} href={`/triage/${post.id}`}>
                <div className="p-3 rounded-md hover-elevate cursor-pointer space-y-1" data-testid={`card-post-${post.id}`}>
                  <p className="text-sm font-medium leading-snug">{post.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" /> {post.likes.length}
                    </span>
                    <span>{post.author?.name}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(post.createdAt)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Latest News</CardTitle>
            <Link href="/news">
              <Button size="sm" variant="outline" data-testid="link-view-news">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentNews.map((item) => (
              <div key={item.id} className="p-3 rounded-md hover-elevate cursor-pointer space-y-1" data-testid={`card-news-${item.id}`}>
                <p className="text-sm font-medium leading-snug">{item.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.source}</span>
                  <span>{formatTimeAgo(item.publishedAt)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold">Upcoming Events</CardTitle>
          <Link href="/events">
            <Button size="sm" variant="outline" data-testid="link-view-events">
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="p-3 rounded-md bg-muted/30 space-y-1" data-testid={`card-event-${event.id}`}>
                <p className="text-sm font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
                <p className="text-xs text-muted-foreground">{event.location}</p>
                <Badge variant="secondary" className="text-xs mt-1">{event.type}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Link href="/aribot">
          <Button data-testid="button-open-aribot">
            <Bot className="h-4 w-4 mr-2" />
            Open Aribot AI Assistant
          </Button>
        </Link>
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

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
