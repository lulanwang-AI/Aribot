import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, CheckCircle2, Circle, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { TrainingModule } from "@shared/schema";

export default function Training() {
  const { data: modules, isLoading } = useQuery<TrainingModule[]>({ queryKey: ["/api/training"] });
  const [expanded, setExpanded] = useState<string | null>(null);

  const completeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/training/${id}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/training"] }),
  });

  if (isLoading) return <div className="p-6 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  const totalModules = modules?.length || 0;
  const completedModules = modules?.filter(m => m.completedBy.includes("u1")).length || 0;
  const overallProgress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto" data-testid="page-training">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-training-title">
          <BookOpen className="h-5 w-5 text-primary" />
          Training
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Complete modules to improve your skills with the platform.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{completedModules} of {totalModules} modules</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {modules?.map(mod => {
          const isComplete = mod.completedBy.includes("u1");
          const isExpanded = expanded === mod.id;
          return (
            <Card key={mod.id} className="overflow-hidden" data-testid={`training-module-${mod.id}`}>
              <button
                className="w-full text-left p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(isExpanded ? null : mod.id)}
              >
                <div className="mt-0.5">
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold">{mod.title}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">
                        <Clock className="h-3 w-3 mr-1" />
                        {mod.duration}
                      </Badge>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{mod.description}</p>
                </div>
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 pl-12 space-y-2 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Outline</p>
                  <ol className="space-y-1.5">
                    {mod.outline.map((step, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  {!isComplete && (
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={(e) => { e.stopPropagation(); completeMutation.mutate(mod.id); }}
                      disabled={completeMutation.isPending}
                      data-testid={`button-complete-${mod.id}`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Mark Complete
                    </Button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
