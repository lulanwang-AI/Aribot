import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import type { Timepoint } from "@/shared/schema";

interface TimepointSelectorProps {
  patientId: string | null;
  currentTimepoint: Timepoint | null;
  onTimepointChange: (timepoint: Timepoint) => void;
}

export default function TimepointSelector({
  patientId,
  currentTimepoint,
  onTimepointChange,
}: TimepointSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: timepoints = [] } = useQuery<Timepoint[]>({
    queryKey: ["/api/patients", patientId, "timepoints"],
    enabled: !!patientId,
  });

  // Sort timepoints by date
  const sortedTimepoints = [...timepoints].sort((a, b) => 
    new Date(a.studyDate).getTime() - new Date(b.studyDate).getTime()
  );

  const handlePrevious = () => {
    if (selectedIndex > 0) {
      const newIndex = selectedIndex - 1;
      setSelectedIndex(newIndex);
      onTimepointChange(sortedTimepoints[newIndex]);
    }
  };

  const handleNext = () => {
    if (selectedIndex < sortedTimepoints.length - 1) {
      const newIndex = selectedIndex + 1;
      setSelectedIndex(newIndex);
      onTimepointChange(sortedTimepoints[newIndex]);
    }
  };

  const handleTimepointSelect = (timepointId: string) => {
    const index = sortedTimepoints.findIndex(tp => tp.id === timepointId);
    if (index !== -1) {
      setSelectedIndex(index);
      onTimepointChange(sortedTimepoints[index]);
    }
  };

  if (!patientId || timepoints.length === 0) {
    return null;
  }

  const currentSelected = sortedTimepoints[selectedIndex];
  const baseline = sortedTimepoints.find(tp => tp.isBaseline);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Calendar className="w-4 h-4 text-medical-blue" />
          <span className="text-sm font-medium text-slate-700">Study Timeline:</span>
          
          {/* Timepoint Selector */}
          <Select 
            value={currentSelected?.id || ""} 
            onValueChange={handleTimepointSelect}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select timepoint" />
            </SelectTrigger>
            <SelectContent>
              {sortedTimepoints.map((timepoint, index) => (
                <SelectItem key={timepoint.id} value={timepoint.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{timepoint.description}</span>
                    <div className="flex items-center space-x-2 ml-2">
                      {timepoint.isBaseline && (
                        <Badge variant="secondary" className="text-xs">
                          Baseline
                        </Badge>
                      )}
                      <span className="text-xs text-slate-500">
                        {timepoint.studyDate}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={selectedIndex === 0}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Previous</span>
          </Button>
          
          <span className="text-sm text-slate-600 px-2">
            {selectedIndex + 1} of {sortedTimepoints.length}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={selectedIndex === sortedTimepoints.length - 1}
          >
            <span className="hidden sm:inline mr-1">Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Current Selection Info */}
      {currentSelected && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div>
                <span className="text-slate-600">Current: </span>
                <span className="font-medium text-slate-900">
                  {currentSelected.description}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Date: </span>
                <span className="font-medium text-slate-900">
                  {currentSelected.studyDate}
                </span>
              </div>
            </div>
            
            {baseline && currentSelected.id !== baseline.id && (
              <div className="text-slate-600">
                <span>vs Baseline: </span>
                <span className="font-medium text-slate-700">
                  {baseline.studyDate}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}