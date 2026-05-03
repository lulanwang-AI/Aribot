import { useState, useEffect } from "react";
import { getTrending, getRising } from "@/lib/analytics";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, BarChart3, ChevronDown, ChevronUp, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrendingPanelProps {
  className?: string;
}

export function TrendingPanel({ className }: TrendingPanelProps) {
  const [trending, setTrending] = useState<{ topTags: Array<{ tag: string; count: number }>; topSpecialties: Array<{ specialty: string; count: number }> }>({ topTags: [], topSpecialties: [] });
  const [rising, setRising] = useState<Array<{ tag: string; current: number; previous: number; delta: number }>>([]);

  useEffect(() => {
    setTrending(getTrending(7));
    setRising(getRising(7));
  }, []);

  return (
    <div className={`space-y-4 ${className || ""}`}>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-primary" />
          Trending Topics
        </h3>
        <div className="space-y-1">
          {trending.topTags.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">No trending data yet</p>
          )}
          {trending.topTags.map((item, i) => (
            <div
              key={item.tag}
              className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover-elevate"
              data-testid={`trending-tag-${i}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium text-muted-foreground w-4 shrink-0">
                  {i + 1}
                </span>
                <span className="text-xs truncate">{item.tag}</span>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                {item.count}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {rising.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-orange-500" />
            Rising
          </h3>
          <div className="space-y-1">
            {rising.map((item, i) => (
              <div
                key={item.tag}
                className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover-elevate"
                data-testid={`rising-tag-${i}`}
              >
                <span className="text-xs truncate">{item.tag}</span>
                <div className="flex items-center gap-1 text-xs text-green-600 shrink-0">
                  <ChevronUp className="h-3 w-3" />
                  +{item.delta}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4 text-primary" />
          Active Specialties
        </h3>
        <div className="space-y-1">
          {trending.topSpecialties.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">No activity data yet</p>
          )}
          {trending.topSpecialties.map((item, i) => (
            <div
              key={item.specialty}
              className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md"
              data-testid={`specialty-rank-${i}`}
            >
              <span className="text-xs truncate">{item.specialty}</span>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 rounded-full bg-primary/20 w-16">
                  <div
                    className="h-1.5 rounded-full bg-primary"
                    style={{
                      width: `${Math.min(100, (item.count / (trending.topSpecialties[0]?.count || 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-4 text-right">{item.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TrendingDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(!open)}
        className="w-full justify-between"
        data-testid="button-trending-toggle"
      >
        <span className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" />
          Trending
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </Button>
      {open && (
        <div className="mt-2 p-3 bg-card rounded-md">
          <TrendingPanel />
        </div>
      )}
    </div>
  );
}
