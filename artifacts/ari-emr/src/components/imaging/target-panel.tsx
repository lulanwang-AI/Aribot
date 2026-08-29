import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Temporarily remove collapsible until React hooks issue is resolved
import { ChevronDown, ChevronRight, Target, X, Edit2, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Measurement } from "@/shared/schema";

interface TargetPanelProps {
  studyId: string | null;
  onGenerateReport: () => void;
}

const ANATOMICAL_LABELS = [
  "Lung",
  "Lymph Node", 
  "Liver",
  "Kidney",
  "Bone",
  "Soft Tissue",
  "Brain",
  "Adrenal",
  "Spleen",
  "Other"
];

export default function TargetPanel({ studyId, onGenerateReport }: TargetPanelProps) {
  const [targetsOpen, setTargetsOpen] = useState(true);
  const [nonTargetsOpen, setNonTargetsOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const queryClient = useQueryClient();

  const { data: measurements = [] } = useQuery<Measurement[]>({
    queryKey: ["/api/studies", studyId, "measurements"],
    enabled: !!studyId,
  });

  const updateMeasurementMutation = useMutation({
    mutationFn: (data: { id: string; updates: Partial<Measurement> }) =>
      apiRequest("PATCH", `/api/measurements/${data.id}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studies", studyId, "measurements"] });
      setEditingId(null);
      setEditLabel("");
    },
  });

  const deleteMeasurementMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/measurements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studies", studyId, "measurements"] });
    },
  });

  const targets = measurements.filter(m => m.category === "target");
  const nonTargets = measurements.filter(m => m.category === "non-target");

  const handleEditStart = (measurement: Measurement) => {
    setEditingId(measurement.id);
    setEditLabel(measurement.label || "");
  };

  const handleEditSave = (id: string) => {
    updateMeasurementMutation.mutate({
      id,
      updates: { label: editLabel },
    });
  };

  const handleCategoryChange = (id: string, newCategory: string) => {
    updateMeasurementMutation.mutate({
      id,
      updates: { category: newCategory },
    });
  };

  const handleDelete = (id: string) => {
    deleteMeasurementMutation.mutate(id);
  };

  const MeasurementItem = ({ measurement }: { measurement: Measurement }) => (
    <div className="border border-slate-200 rounded-lg p-3 space-y-2">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {editingId === measurement.id ? (
            <div className="flex items-center space-x-2">
              <Select value={editLabel} onValueChange={setEditLabel}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Select label" />
                </SelectTrigger>
                <SelectContent>
                  {ANATOMICAL_LABELS.map(label => (
                    <SelectItem key={label} value={label}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleEditSave(measurement.id)}
                disabled={updateMeasurementMutation.isPending}
              >
                Save
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-slate-900">
                {measurement.label || "No description"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditStart(measurement)}
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            </div>
          )}
          
          <div className="text-xs text-slate-600 mt-1">
            {measurement.length}
            {measurement.width && ` × ${measurement.width}`}
            <span className="ml-2 text-slate-400">
              Slice {measurement.sliceNumber}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <Select 
            value={measurement.category} 
            onValueChange={(value) => handleCategoryChange(measurement.id, value)}
          >
            <SelectTrigger className="h-6 w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="target">Target</SelectItem>
              <SelectItem value="non-target">Non-Target</SelectItem>
              <SelectItem value="new">New</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(measurement.id)}
            disabled={deleteMeasurementMutation.isPending}
          >
            <X className="w-3 h-3 text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="w-80">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Lesion Tracking</CardTitle>
        <Button 
          onClick={onGenerateReport}
          className="w-full bg-medical-blue hover:bg-blue-700"
          disabled={measurements.length === 0}
        >
          <FileText className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Targets Section */}
        <div>
          <button 
            onClick={() => setTargetsOpen(!targetsOpen)}
            className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded"
          >
            <div className="flex items-center space-x-2">
              {targetsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Target className="w-4 h-4 text-red-500" />
              <span className="font-medium">Targets</span>
              <Badge variant={targets.length >= 5 ? "destructive" : "secondary"}>
                {targets.length}/5
              </Badge>
            </div>
          </button>
          {targetsOpen && (
            <div className="space-y-2 mt-2">
              {targets.length === 0 ? (
                <div className="text-sm text-slate-500 p-3 text-center border-2 border-dashed border-slate-200 rounded-lg">
                  No target lesions measured
                </div>
              ) : (
                targets.map(measurement => (
                  <MeasurementItem key={measurement.id} measurement={measurement} />
                ))
              )}
            </div>
          )}
        </div>

        {/* Non-Targets Section */}
        <div>
          <button 
            onClick={() => setNonTargetsOpen(!nonTargetsOpen)}
            className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded"
          >
            <div className="flex items-center space-x-2">
              {nonTargetsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Target className="w-4 h-4 text-orange-500" />
              <span className="font-medium">Non-Targets</span>
              <Badge variant="secondary">
                {nonTargets.length}
              </Badge>
            </div>
          </button>
          {nonTargetsOpen && (
            <div className="space-y-2 mt-2">
              {nonTargets.length === 0 ? (
                <div className="text-sm text-slate-500 p-3 text-center border-2 border-dashed border-slate-200 rounded-lg">
                  No non-target lesions measured
                </div>
              ) : (
                nonTargets.map(measurement => (
                  <MeasurementItem key={measurement.id} measurement={measurement} />
                ))
              )}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {measurements.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-sm text-slate-700">
              <div className="flex justify-between">
                <span>Total measurements:</span>
                <span className="font-medium">{measurements.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Target lesions:</span>
                <span className="font-medium text-red-600">{targets.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Non-target lesions:</span>
                <span className="font-medium text-orange-600">{nonTargets.length}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}