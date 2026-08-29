import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, RotateCcw, Box } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import MeasurementToolbar from "./measurement-toolbar";
import type { ImagingStudy, InsertMeasurement } from "@/shared/schema";

interface ImageViewerProps {
  study: ImagingStudy | null;
  height?: string;
  showToolbar?: boolean;
}

const ANATOMICAL_LABELS = [
  "Lung", "Lymph Node", "Liver", "Kidney", "Bone", 
  "Soft Tissue", "Brain", "Adrenal", "Spleen", "Other"
];

export default function ImageViewer({ study, height = "600px", showToolbar = true }: ImageViewerProps) {
  const [currentSlice, setCurrentSlice] = useState(60);
  const [viewMode, setViewMode] = useState<"2D" | "3D">("2D");
  const [activeTool, setActiveTool] = useState("pan");
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [labelMenuPosition, setLabelMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pendingMeasurement, setPendingMeasurement] = useState<any>(null);
  const [zoom, setZoom] = useState(1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const queryClient = useQueryClient();

  const createMeasurementMutation = useMutation({
    mutationFn: (measurementData: InsertMeasurement) =>
      apiRequest("POST", "/api/measurements", measurementData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studies", study?.id, "measurements"] });
    },
  });

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!study || !["measure", "target"].includes(activeTool)) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPoint({ x, y });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!study || !isDrawing || !startPoint) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate distance
    const distance = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
    const lengthMm = (distance * 0.3).toFixed(1); // Mock pixel to mm conversion

    // Create pending measurement
    const measurement = {
      studyId: study.id,
      x1: Math.round(startPoint.x),
      y1: Math.round(startPoint.y),
      x2: Math.round(x),
      y2: Math.round(y),
      length: `${lengthMm} mm`,
      width: null,
      label: null,
      category: activeTool === "target" ? "target" : "non-target",
      isBaseline: false,
      sliceNumber: currentSlice,
    };

    setPendingMeasurement(measurement);
    setLabelMenuPosition({ x: e.clientX, y: e.clientY });
    setShowLabelMenu(true);
    setIsDrawing(false);
    setStartPoint(null);
  };

  const handleLabelSelect = (label: string) => {
    if (pendingMeasurement) {
      createMeasurementMutation.mutate({
        ...pendingMeasurement,
        label,
      });
    }
    setShowLabelMenu(false);
    setPendingMeasurement(null);
  };

  const handleToolChange = (tool: string) => {
    setActiveTool(tool);
    setIsDrawing(false);
    setStartPoint(null);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1));
  const handleReset = () => {
    setZoom(1);
    setCurrentSlice(60);
  };
  const handleWindowLevelAdjust = (delta: number) => {
    // Window/level adjustment logic would go here
    console.log('Window/level adjustment:', delta);
  };

  if (!study) {
    return (
      <div 
        className="bg-black rounded-lg flex items-center justify-center text-white"
        style={{ height }}
      >
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">No Study Selected</h3>
          <p className="text-sm text-gray-400">Select a patient to view their imaging studies</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Measurement Toolbar */}
      {showToolbar && (
        <MeasurementToolbar
          onToolChange={handleToolChange}
          activeTool={activeTool}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
          onWindowLevelAdjust={handleWindowLevelAdjust}
        />
      )}

      {/* Viewer Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setViewMode(viewMode === "2D" ? "3D" : "2D")}
          >
            <Box className="w-4 h-4 mr-2" />
            {viewMode}
          </Button>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-slate-700">Slice:</label>
            <Slider
              value={[currentSlice]}
              onValueChange={(value) => setCurrentSlice(value[0])}
              max={study.sliceCount || 120}
              min={1}
              step={1}
              className="w-32"
            />
            <span className="text-sm text-slate-600">
              {currentSlice}/{study.sliceCount || 120}
            </span>
          </div>
        </div>
        
        <div className="text-sm text-slate-600">
          Zoom: {Math.round(zoom * 100)}%
        </div>
      </div>
      
      {/* Image Viewer Area with Interactive Canvas */}
      <div 
        className="bg-black rounded-lg flex items-center justify-center relative overflow-hidden"
        style={{ height }}
      >
        {study.imageUrl ? (
          <>
            <div 
              className="relative"
              style={{ 
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                cursor: activeTool === "pan" ? "grab" : activeTool === "measure" || activeTool === "target" ? "crosshair" : "default"
              }}
            >
              <img
                src={study.imageUrl}
                alt={`${study.studyType} - ${study.description}`}
                className="max-w-full max-h-full object-contain rounded-lg"
                draggable={false}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-auto"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                style={{
                  width: '100%',
                  height: '100%',
                }}
              />
            </div>
            
            <div className="absolute top-4 left-4 text-white text-sm">
              <div className="bg-black bg-opacity-50 px-2 py-1 rounded">
                <p>Study: {study.studyType}</p>
                <p>Date: {study.studyDate}</p>
                <p>Series: {study.description}</p>
                <p>Tool: {activeTool}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-white">
            <h3 className="text-lg font-medium mb-2">Image Loading...</h3>
            <p className="text-sm text-gray-400">DICOM viewer will be implemented here</p>
          </div>
        )}
      </div>
      
      {/* Viewer Navigation */}
      <div className="flex justify-center space-x-4">
        <Button 
          variant="outline"
          onClick={() => setCurrentSlice(Math.max(1, currentSlice - 1))}
          disabled={currentSlice <= 1}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous Slice
        </Button>
        <Button 
          variant="outline"
          onClick={() => setCurrentSlice(Math.min(study.sliceCount || 120, currentSlice + 1))}
          disabled={currentSlice >= (study.sliceCount || 120)}
        >
          Next Slice
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Label Selection Menu */}
      {showLabelMenu && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-2"
          style={{
            left: labelMenuPosition.x,
            top: labelMenuPosition.y,
          }}
        >
          <div className="text-sm font-medium text-slate-700 mb-2">Select anatomical site:</div>
          <div className="space-y-1">
            {ANATOMICAL_LABELS.map((label) => (
              <button
                key={label}
                onClick={() => handleLabelSelect(label)}
                className="block w-full text-left px-2 py-1 text-sm hover:bg-slate-100 rounded"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
