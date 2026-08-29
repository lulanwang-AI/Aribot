import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ZoomIn, ZoomOut, RotateCcw, Move, Link, Target, Ruler, Hand } from "lucide-react";

interface MeasurementToolbarProps {
  onToolChange: (tool: string) => void;
  activeTool: string;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onWindowLevelAdjust: (delta: number) => void;
}

export default function MeasurementToolbar({
  onToolChange,
  activeTool,
  onZoomIn,
  onZoomOut,
  onReset,
  onWindowLevelAdjust,
}: MeasurementToolbarProps) {
  const [windowLevel, setWindowLevel] = useState(50);

  const tools = [
    { id: "pan", icon: Hand, label: "Pan", description: "Pan image" },
    { id: "zoom", icon: ZoomIn, label: "Zoom", description: "Zoom tool" },
    { id: "measure", icon: Ruler, label: "Measure", description: "Create measurement" },
    { id: "target", icon: Target, label: "New Target", description: "Create target lesion" },
    { id: "move", icon: Move, label: "Move", description: "Move annotations" },
    { id: "link", icon: Link, label: "Link Series", description: "Link multiple series" },
  ];

  const handleWindowLevelChange = (value: number) => {
    setWindowLevel(value);
    onWindowLevelAdjust(value - 50);
  };

  return (
    <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        {/* Main Tools */}
        <div className="flex items-center space-x-2">
          {tools.map((tool) => (
            <Button
              key={tool.id}
              variant={activeTool === tool.id ? "default" : "outline"}
              size="sm"
              onClick={() => onToolChange(tool.id)}
              title={tool.description}
              className={activeTool === tool.id ? "bg-medical-blue text-white" : ""}
            >
              <tool.icon className="w-4 h-4" />
              <span className="ml-2 hidden sm:inline">{tool.label}</span>
            </Button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Zoom Controls */}
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={onZoomIn} title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onZoomOut} title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onReset} title="Reset View">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Window/Level Controls */}
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-slate-700">W/L:</label>
          <input
            type="range"
            min="0"
            max="100"
            value={windowLevel}
            onChange={(e) => handleWindowLevelChange(parseInt(e.target.value))}
            className="w-24 accent-medical-blue"
            title="Window/Level adjustment"
          />
          <span className="text-sm text-slate-600 w-8">{windowLevel}</span>
        </div>
      </div>
    </div>
  );
}