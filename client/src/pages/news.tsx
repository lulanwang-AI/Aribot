import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { recordEvent } from "@/lib/analytics";
import { Newspaper, Search, ExternalLink, Clock, BookOpen } from "lucide-react";
import type { NewsItem } from "@shared/schema";

const SOURCES = ["All", "NEJM", "The Lancet", "JAMA", "BMJ", "Nature Medicine"];
const SPECIALTIES = ["All", "Cardiology", "Oncology", "Neurology", "Emergency Medicine", "Radiology", "Pediatrics", "Internal Medicine", "Surgery", "Infectious Disease"];

export default function News() {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("All");
  const [specialty, setSpecialty] = useState("All");

  const queryParams = new URLSearchParams();
  if (source !== "All") queryParams.set("source", source);
  if (specialty !== "All") queryParams.set("specialty", specialty.toLowerCase().replace(/ /g, "-"));
  if (search) queryParams.set("search", search);
  const qs = queryParams.toString();

  const { data: news, isLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/news", qs],
    queryFn: () => fetch(`/api/news${qs ? `?${qs}` : ""}`).then(r => r.json()),
  });

  useEffect(() => {
    recordEvent("page_view", { section: "news" });
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" data-testid="page-news">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-news-title">
          <Newspaper className="h-5 w-5 text-primary" />
          Medical News
        </h1>
        <p className="text-sm text-muted-foreground">
          Latest research from NEJM, The Lancet, JAMA, BMJ, and Nature Medicine
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-news"
          />
        </div>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-44" data-testid="select-source">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={specialty} onValueChange={setSpecialty}>
          <SelectTrigger className="w-48" data-testid="select-specialty">
            <SelectValue placeholder="Specialty" />
          </SelectTrigger>
          <SelectContent>
            {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}</div>}

      {!isLoading && news?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Newspaper className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No articles match your filters</p>
        </div>
      )}

      <div className="space-y-3">
        {news?.map(item => <NewsCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <Card className="hover-elevate cursor-pointer" onClick={() => recordEvent("news_click", { tags: item.tags })} data-testid={`card-news-${item.id}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold leading-snug">{item.title}</h3>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{item.summary}</p>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
            ))}
            {item.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{item.tags.length - 3}</span>}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
            <Badge variant="outline" className="text-[10px] font-medium">{item.source}</Badge>
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {item.readingTime} min
            </span>
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
