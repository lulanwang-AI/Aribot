import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import EnhancedDicomViewer from "./enhanced-dicom-viewer";
import ctScanImage from "@assets/image_1754563619697.png";
import {
  ArrowLeft,
  Folder,
  Brain,
  Wrench,
  Upload,
  PenTool,
  Layers,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Lock,
  Unlock,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Ruler,
  Circle,
  Square,
  Move,
  Contrast,
  Sun,
  Download,
  FileText,
  Printer,
  Check,
  Edit2,
  Trash2,
  Activity,
  Box,
  Cpu
} from "lucide-react";
import type { Patient, ImagingStudy } from "@/shared/schema";

interface ViewerLayoutProps {
  patient: Patient;
  studies: ImagingStudy[];
  onBack: () => void;
}

export default function ViewerLayout({ patient, studies, onBack }: ViewerLayoutProps) {
  const [activePanel, setActivePanel] = useState("series");
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [syncPanes, setSyncPanes] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showDicomViewer, setShowDicomViewer] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [currentSlices, setCurrentSlices] = useState([50, 50, 50]);
  const [windowLevel, setWindowLevel] = useState([50, 50]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [annotations, setAnnotations] = useState<any[]>([]);

  // Mock AI findings and CT data
  const aiFindings = [
    { id: 1, type: "Lesion", size: "34mm × 17mm", location: "Lung", confidence: 92 },
    { id: 2, type: "Lymph Node", size: "21mm × 13mm", location: "Mediastinal", confidence: 87 },
    { id: 3, type: "Nodule", size: "8mm", location: "Right Upper Lobe", confidence: 78 }
  ];

  // Mock CT data for the patient
  const ctData = (patient as any).ctData || {
    scanDate: new Date().toISOString().split('T')[0],
    findings: "No acute findings",
    slices: 256
  };

  const sidebarTools = [
    { id: "studies", icon: Folder, label: "Studies" },
    { id: "series", icon: Brain, label: "Series Viewer" },
    { id: "tools", icon: Wrench, label: "Tools" },
    { id: "upload", icon: Upload, label: "Upload" },
    { id: "annotations", icon: PenTool, label: "Annotations" },
    { id: "compare", icon: Layers, label: "Compare" }
  ];

  const measurementTools = [
    { id: "zoom", icon: ZoomIn, label: "Zoom" },
    { id: "pan", icon: Move, label: "Pan" },
    { id: "rotate", icon: RotateCw, label: "Rotate" },
    { id: "ruler", icon: Ruler, label: "Measure" },
    { id: "circle", icon: Circle, label: "Circle ROI" },
    { id: "square", icon: Square, label: "Rectangle ROI" },
    { id: "window", icon: Contrast, label: "Window/Level" },
    { id: "brightness", icon: Sun, label: "Brightness" }
  ];

  const handleSliceChange = (panelIndex: number, value: number[]) => {
    const newSlices = [...currentSlices];
    newSlices[panelIndex] = value[0];
    setCurrentSlices(newSlices);
    
    if (syncPanes) {
      setCurrentSlices([value[0], value[0], value[0]]);
    }
  };

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId === selectedTool ? null : toolId);
    // Add visual feedback or cursor change based on selected tool
    if (toolId && toolId !== selectedTool) {
      // Tool activated feedback
      const toolName = measurementTools.find(t => t.id === toolId)?.label;
      console.log(`Tool activated: ${toolName}`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            All Patients
          </Button>
          <div className="border-l border-gray-300 pl-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Patient: {patient.name}
            </h2>
          </div>
          <select className="px-3 py-1 border border-gray-300 rounded-md text-sm">
            <option>CT - Abdomen</option>
            <option>MRI - Brain</option>
            <option>PET - Whole Body</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowDicomViewer(!showDicomViewer)}
            className={showDicomViewer ? "bg-cyan-600 text-white hover:bg-cyan-700" : ""}
          >
            <Box className="w-4 h-4 mr-2" />
            {showDicomViewer ? "Standard View" : "Advanced DICOM"}
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Report
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
            <Cpu className="w-4 h-4 mr-2" />
            AI Analyze
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Show DICOM Viewer if activated */}
      {showDicomViewer ? (
        <div className="flex-1">
          <EnhancedDicomViewer 
            patientId={patient.patientId} 
            studyId={studies[0]?.id || "study-1"}
            seriesId="series-1"
          />
        </div>
      ) : (
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-16 bg-cyan-600 flex flex-col items-center py-4 space-y-2">
          {sidebarTools.map((tool) => (
            <Button
              key={tool.id}
              variant="ghost"
              size="icon"
              className={`w-12 h-12 ${
                activePanel === tool.id 
                  ? "bg-cyan-700 text-white" 
                  : "text-white hover:bg-cyan-700"
              }`}
              onClick={() => setActivePanel(tool.id)}
              title={tool.label}
            >
              <tool.icon className="w-5 h-5" />
            </Button>
          ))}
        </div>

        {/* Extended Sidebar Panel */}
        {activePanel === "tools" && (
          <div className="w-48 bg-gray-800 border-r border-gray-700 p-4">
            <h3 className="text-white text-sm font-semibold mb-4">Measurement Tools</h3>
            {selectedTool && (
              <div className="mb-3 p-2 bg-cyan-600/20 rounded text-cyan-400 text-xs">
                Active: {measurementTools.find(t => t.id === selectedTool)?.label}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {measurementTools.map((tool) => (
                <Button
                  key={tool.id}
                  variant="ghost"
                  size="sm"
                  className={`flex flex-col items-center justify-center h-16 ${
                    selectedTool === tool.id
                      ? "bg-cyan-600 text-white"
                      : "text-gray-300 hover:bg-gray-700"
                  }`}
                  onClick={() => handleToolSelect(tool.id)}
                >
                  <tool.icon className="w-5 h-5 mb-1" />
                  <span className="text-xs">{tool.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* CT Data Panel */}
        {activePanel === "series" && (
          <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
            <h3 className="text-white text-sm font-semibold mb-4">CT Scan Information</h3>
            <div className="space-y-4">
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-cyan-400 text-xs font-semibold mb-2">Scan Details</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Scan Date:</span>
                    <span className="text-white">{ctData.scanDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Slices:</span>
                    <span className="text-white">{ctData.slices}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current Slice:</span>
                    <span className="text-white">{currentSlices[0]}/{ctData.slices}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-cyan-400 text-xs font-semibold mb-2">Clinical Findings</div>
                <p className="text-gray-300 text-xs leading-relaxed">
                  {ctData.findings}
                </p>
              </div>

              <div className="bg-gray-700 rounded-lg p-3">
                <div className="text-cyan-400 text-xs font-semibold mb-2">Study Info</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Patient ID:</span>
                    <span className="text-white">{patient.patientId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Age:</span>
                    <span className="text-white">{patient.age} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gender:</span>
                    <span className="text-white">{patient.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <Badge className="bg-cyan-600 text-white text-xs">
                      {patient.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Viewer Area */}
        <div className="flex-1 bg-black relative">
          {/* Patient Info Overlay */}
          <Card className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur">
            <CardContent className="p-3">
              <div className="space-y-1 text-sm">
                <div className="font-semibold">{patient.name}</div>
                <div className="text-gray-600">Age: {patient.age} | {patient.gender}</div>
                <div className="text-gray-600">ID: {patient.patientId}</div>
                <div className="text-gray-600">Study: CT Abdomen</div>
                <div className="text-gray-600">Date: 29.06.2017</div>
              </div>
            </CardContent>
          </Card>

          {/* Three-Panel Viewer */}
          <div className="flex h-full">
            {[0, 1, 2].map((panelIndex) => (
              <div key={panelIndex} className="flex-1 border-r border-gray-800 last:border-r-0 flex flex-col">
                {/* Panel Header */}
                <div className="bg-gray-900 px-3 py-2 text-white text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <div>Patient-1</div>
                      <div className="text-gray-400">
                        {panelIndex === 0 ? "Axial" : panelIndex === 1 ? "Sagittal" : "Coronal"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div>02.04.1944 - F</div>
                      <div className="text-gray-400">
                        {panelIndex === 0 ? "[WB_CTAC] Total Body" : "[WB_CTAC] Total Body"}
                      </div>
                      <div className="text-gray-400">29.06.2017 10:45:30</div>
                    </div>
                  </div>
                </div>

                {/* Image Viewer */}
                <div className="flex-1 relative bg-black flex items-center justify-center">
                  {/* Medical Image */}
                  <div className="relative">
                    <div 
                      className="w-96 h-96 bg-gray-900 rounded-lg overflow-hidden"
                      style={{
                        cursor: selectedTool === 'zoom' ? 'zoom-in' :
                                selectedTool === 'pan' ? 'move' :
                                selectedTool === 'ruler' ? 'crosshair' :
                                selectedTool === 'circle' || selectedTool === 'square' ? 'crosshair' :
                                selectedTool === 'rotate' ? 'grab' :
                                selectedTool === 'window' ? 'col-resize' :
                                'default'
                      }}
                    >
                      {/* Display actual CT scan image */}
                      <img 
                        src={ctScanImage} 
                        alt="CT Scan" 
                        className="w-full h-full object-contain select-none"
                        style={{ 
                          filter: `brightness(${windowLevel[1] / 50}) contrast(${windowLevel[0] / 50})`,
                          transform: panelIndex === 1 ? 'rotate(90deg)' : panelIndex === 2 ? 'rotate(180deg)' : 'none'
                        }}
                      />
                    </div>
                    
                    {/* Orientation Markers */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 text-cyan-400 text-xs">A</div>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-cyan-400 text-xs">P</div>
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-cyan-400 text-xs">R</div>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400 text-xs">L</div>
                  </div>

                  {/* Slice Info */}
                  <div className="absolute bottom-2 left-2 text-white text-xs space-y-1">
                    <div>Image: {currentSlices[panelIndex]}/150</div>
                    <div>W: {windowLevel[0] * 20} L: {windowLevel[1] * 10}</div>
                  </div>
                </div>

                {/* Slice Slider */}
                <div className="bg-gray-900 px-4 py-2">
                  <Slider
                    value={[currentSlices[panelIndex]]}
                    onValueChange={(value) => handleSliceChange(panelIndex, value)}
                    max={150}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Playback Controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur rounded-lg p-2 flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-gray-700">
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-gray-700">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-gray-700"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-gray-700">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-gray-700">
              <SkipForward className="w-4 h-4" />
            </Button>
            <div className="border-l border-gray-600 pl-2 ml-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-gray-700"
                onClick={() => setSyncPanes(!syncPanes)}
                title={syncPanes ? "Unlock panes" : "Sync panes"}
              >
                {syncPanes ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-gray-700">
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right AI Panel */}
        {showAIPanel && (
          <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">AI-Detected Findings</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAIPanel(false)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {aiFindings.map((finding) => (
                <Card key={finding.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-gray-900">{finding.type}</div>
                        <div className="text-sm text-gray-600">{finding.location}</div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        {finding.confidence}%
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-700 mb-3">
                      Size: {finding.size}
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Check className="w-3 h-3 mr-1" />
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Edit2 className="w-3 h-3 mr-1" />
                        Modify
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Generate Report
              </Button>
              <div className="border-t pt-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Export Options</h4>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export to PDF
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    Export as DICOM-SR
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}  {/* Close the conditional rendering */}

      {/* Window/Level Controls (Bottom Bar) - only show for standard view */}
      {!showDicomViewer && (
        <div className="bg-gray-800 border-t border-gray-700 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Window:</span>
              <Slider
                value={windowLevel.slice(0, 1)}
                onValueChange={(value) => setWindowLevel([value[0], windowLevel[1]])}
                max={100}
                className="w-32"
              />
              <span className="text-xs text-white">{windowLevel[0] * 20}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Level:</span>
              <Slider
                value={windowLevel.slice(1)}
                onValueChange={(value) => setWindowLevel([windowLevel[0], value[0]])}
                max={100}
                className="w-32"
              />
              <span className="text-xs text-white">{windowLevel[1] * 10}</span>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            PostDICOM Viewer | Patient I-123
          </div>
        </div>
      )}
    </div>
  );
}