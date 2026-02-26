import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingPanel, TrendingDrawer } from "@/components/trending-panel";
import { recordEvent } from "@/lib/analytics";
import {
  Newspaper,
  Search,
  ExternalLink,
  Clock,
} from "lucide-react";
import type { NewsItem } from "@shared/schema";

export default function News() {
  const [search, setSearch] = useState("");
  const { data: news, isLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/news"],
  });

  useEffect(() => {
    recordEvent("page_view", { section: "news" });
  }, []);

  const filtered = news?.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
      n.source.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-news-title">
          <Newspaper className="h-5 w-5 text-primary" />
          Medical News
        </h1>
        <p className="text-sm text-muted-foreground">
          Latest research, guidelines, and clinical updates
        </p>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search news by title, source, or tag..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-news"
          />
        </div>
      </div>

      <TrendingDrawer />

      <div className="flex gap-6 mt-4">
        <div className="flex-1 space-y-3">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-36" />
              ))}
            </div>
          )}
          {!isLoading && filtered?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No news found</p>
            </div>
          )}
          {filtered?.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>

        <div className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-4 bg-card rounded-md p-4">
            <TrendingPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  function handleClick() {
    recordEvent("news_click", { tags: item.tags, specialty: item.tags[0] });
  }

  return (
    <Card
      className="hover-elevate cursor-pointer"
      onClick={handleClick}
      data-testid={`card-news-${item.id}`}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug">{item.title}</h3>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {item.summary}
        </p>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <span className="font-medium">{item.source}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(item.publishedAt)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
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
