import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Ruler,
  Circle,
  Square,
  Move,
  Contrast,
  Sun,
  FlipHorizontal,
  FlipVertical,
  Crosshair,
  Trash2,
  Download,
  Upload,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Grid3x3,
  Layers,
  Box,
  Activity,
  Info
} from "lucide-react";

interface DicomViewerProps {
  patientId: string;
  studyId: string;
  seriesId?: string;
  onMeasurement?: (measurement: any) => void;
  onAnnotation?: (annotation: any) => void;
}

// Generate realistic CT scan data for demonstration
const generateCTSlices = (numSlices: number = 256) => {
  const slices = [];
  for (let i = 0; i < numSlices; i++) {
    slices.push({
      id: `slice-${i}`,
      index: i,
      position: (i * 2.5).toFixed(1), // mm spacing
      ww: 400, // window width
      wc: 40,  // window center
      pixelData: generateSliceData(i, numSlices)
    });
  }
  return slices;
};

// Generate realistic slice visualization
const generateSliceData = (index: number, total: number) => {
  // Simulate different anatomical regions based on slice position
  const region = index / total;
  let baseIntensity = 128;
  
  if (region < 0.2) { // Upper chest
    baseIntensity = 90;
  } else if (region < 0.5) { // Mid chest/heart
    baseIntensity = 110;
  } else if (region < 0.8) { // Abdomen
    baseIntensity = 100;
  } else { // Pelvis
    baseIntensity = 95;
  }
  
  return {
    baseIntensity,
    structures: generateAnatomicalStructures(region),
    hasPathology: Math.random() > 0.9 // 10% chance of pathology
  };
};

const generateAnatomicalStructures = (region: number) => {
  const structures = [];
  
  if (region < 0.3) {
    // Lungs
    structures.push(
      { type: 'lung-left', x: 30, y: 50, radius: 35 },
      { type: 'lung-right', x: 70, y: 50, radius: 35 },
      { type: 'spine', x: 50, y: 75, radius: 8 }
    );
  } else if (region < 0.6) {
    // Heart and vessels
    structures.push(
      { type: 'heart', x: 45, y: 45, radius: 25 },
      { type: 'aorta', x: 50, y: 70, radius: 10 },
      { type: 'spine', x: 50, y: 80, radius: 8 }
    );
  } else {
    // Abdomen
    structures.push(
      { type: 'liver', x: 35, y: 40, radius: 30 },
      { type: 'kidney-left', x: 25, y: 65, radius: 12 },
      { type: 'kidney-right', x: 75, y: 65, radius: 12 },
      { type: 'spine', x: 50, y: 75, radius: 8 }
    );
  }
  
  return structures;
};

export default function DicomViewer({ patientId, studyId, seriesId }: DicomViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas3DRef = useRef<HTMLCanvasElement>(null);
  
  // Viewer state
  const [viewMode, setViewMode] = useState<'2D' | '3D' | 'MPR'>('2D');
  const [currentSlice, setCurrentSlice] = useState(128);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [windowWidth, setWindowWidth] = useState(400);
  const [windowCenter, setWindowCenter] = useState(40);
  const [brightness, setBrightness] = useState(50);
  const [contrast, setContrast] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>('pan');
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [showOverlays, setShowOverlays] = useState(true);
  const [viewLayout, setViewLayout] = useState<'single' | '2x2' | '3x3'>('single');
  
  // MPR state
  const [mprView, setMprView] = useState({
    axial: 128,
    coronal: 128,
    sagittal: 128
  });
  
  // 3D rendering state
  const [render3D, setRender3D] = useState({
    mode: 'volume', // volume, surface, MIP
    threshold: 100,
    opacity: 0.8,
    rotation: { x: 0, y: 0, z: 0 }
  });
  
  const ctSlices = generateCTSlices(256);
  const totalSlices = ctSlices.length;
  
  // Tool functions
  const tools = [
    { id: 'pan', icon: Move, label: 'Pan', hotkey: 'P' },
    { id: 'zoom', icon: ZoomIn, label: 'Zoom', hotkey: 'Z' },
    { id: 'window', icon: Contrast, label: 'Window/Level', hotkey: 'W' },
    { id: 'ruler', icon: Ruler, label: 'Measure', hotkey: 'M' },
    { id: 'angle', icon: Activity, label: 'Angle', hotkey: 'A' },
    { id: 'circle', icon: Circle, label: 'Circle ROI', hotkey: 'C' },
    { id: 'rectangle', icon: Square, label: 'Rectangle ROI', hotkey: 'R' },
    { id: 'crosshair', icon: Crosshair, label: 'Crosshair', hotkey: 'X' }
  ];
  
  // Draw slice on canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Get current slice data
    const slice = ctSlices[currentSlice];
    if (!slice) return;
    
    // Apply window/level
    const adjustedIntensity = (value: number) => {
      const min = windowCenter - windowWidth / 2;
      const max = windowCenter + windowWidth / 2;
      const normalized = (value - min) / (max - min);
      return Math.max(0, Math.min(255, normalized * 255));
    };
    
    // Draw anatomical structures
    slice.pixelData.structures.forEach((structure: any) => {
      const x = (structure.x / 100) * canvas.width;
      const y = (structure.y / 100) * canvas.height;
      const radius = (structure.radius / 100) * Math.min(canvas.width, canvas.height);
      
      // Different intensities for different structures
      let intensity = slice.pixelData.baseIntensity;
      switch (structure.type) {
        case 'lung-left':
        case 'lung-right':
          intensity = 30; // Air-filled lungs are dark
          break;
        case 'heart':
          intensity = 100; // Soft tissue
          break;
        case 'liver':
          intensity = 110; // Soft tissue
          break;
        case 'spine':
          intensity = 200; // Bone is bright
          break;
        case 'aorta':
          intensity = 90; // Blood vessel
          break;
        case 'kidney-left':
        case 'kidney-right':
          intensity = 95; // Soft tissue
          break;
      }
      
      const grayValue = adjustedIntensity(intensity);
      ctx.fillStyle = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Add some texture/noise for realism
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
    
    // Apply brightness/contrast
    ctx.filter = `brightness(${brightness / 50}) contrast(${contrast / 50})`;
    
    // Apply rotation
    if (rotation !== 0) {
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }
    
    // Draw measurements and annotations
    if (showOverlays) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.font = '14px Arial';
      ctx.fillStyle = '#00ff00';
      
      measurements.forEach((m) => {
        if (m.sliceIndex === currentSlice) {
          if (m.type === 'line') {
            ctx.beginPath();
            ctx.moveTo(m.x1, m.y1);
            ctx.lineTo(m.x2, m.y2);
            ctx.stroke();
            ctx.fillText(`${m.length.toFixed(1)} mm`, (m.x1 + m.x2) / 2, (m.y1 + m.y2) / 2);
          } else if (m.type === 'circle') {
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillText(`Area: ${(Math.PI * m.radius * m.radius).toFixed(1)} mm²`, m.x, m.y - m.radius - 10);
          }
        }
      });
      
      // Draw slice info
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.fillText(`Slice: ${currentSlice + 1}/${totalSlices}`, 10, 20);
      ctx.fillText(`Position: ${ctSlices[currentSlice].position} mm`, 10, 35);
      ctx.fillText(`WW: ${windowWidth} WC: ${windowCenter}`, 10, 50);
    }
    
    if (rotation !== 0) {
      ctx.restore();
    }
  }, [currentSlice, windowWidth, windowCenter, brightness, contrast, rotation, showOverlays, measurements]);
  
  // 3D rendering effect
  useEffect(() => {
    if (viewMode !== '3D' || !canvas3DRef.current) return;
    
    const canvas = canvas3DRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Simple 3D visualization
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw a rotating 3D volume representation
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const size = Math.min(canvas.width, canvas.height) * 0.3;
    
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 2;
    
    // Draw cube edges with rotation
    const rotX = render3D.rotation.x * Math.PI / 180;
    const rotY = render3D.rotation.y * Math.PI / 180;
    
    // Simple 3D to 2D projection
    const project3D = (x: number, y: number, z: number) => {
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      
      const y1 = y * cosX - z * sinX;
      const z1 = y * sinX + z * cosX;
      const x1 = x * cosY + z1 * sinY;
      
      return {
        x: centerX + x1,
        y: centerY + y1
      };
    };
    
    // Draw volume outline
    const vertices = [
      [-size, -size, -size], [size, -size, -size],
      [size, size, -size], [-size, size, -size],
      [-size, -size, size], [size, -size, size],
      [size, size, size], [-size, size, size]
    ];
    
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];
    
    edges.forEach(([i, j]) => {
      const p1 = project3D(...vertices[i] as [number, number, number]);
      const p2 = project3D(...vertices[j] as [number, number, number]);
      
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });
    
    // Add some volume slices for effect
    ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
    for (let z = -size; z <= size; z += size / 5) {
      const corners = [
        project3D(-size, -size, z),
        project3D(size, -size, z),
        project3D(size, size, z),
        project3D(-size, size, z)
      ];
      
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      corners.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
    }
    
    // Draw render mode label
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.fillText(`3D ${render3D.mode.toUpperCase()} Rendering`, 10, 20);
  }, [viewMode, render3D]);
  
  // Animation loop for cine playback
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentSlice(prev => (prev + 1) % totalSlices);
    }, 100);
    
    return () => clearInterval(interval);
  }, [isPlaying, totalSlices]);
  
  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
  };
  
  const handleAddMeasurement = () => {
    const newMeasurement = {
      id: Date.now(),
      type: 'line',
      sliceIndex: currentSlice,
      x1: Math.random() * 500,
      y1: Math.random() * 500,
      x2: Math.random() * 500,
      y2: Math.random() * 500,
      length: Math.random() * 50 + 10
    };
    setMeasurements([...measurements, newMeasurement]);
  };
  
  const handleAddAnnotation = () => {
    const newAnnotation = {
      id: Date.now(),
      sliceIndex: currentSlice,
      text: `Finding at slice ${currentSlice + 1}`,
      x: Math.random() * 500,
      y: Math.random() * 500
    };
    setAnnotations([...annotations, newAnnotation]);
  };
  
  return (
    <div className="h-full flex flex-col bg-black">
      {/* Toolbar */}
      <div className="bg-gray-900 border-b border-gray-800 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* View mode selector */}
            <div className="flex bg-gray-800 rounded-md p-1">
              <Button
                variant={viewMode === '2D' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('2D')}
                className="text-xs"
              >
                2D
              </Button>
              <Button
                variant={viewMode === '3D' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('3D')}
                className="text-xs"
              >
                3D
              </Button>
              <Button
                variant={viewMode === 'MPR' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('MPR')}
                className="text-xs"
              >
                MPR
              </Button>
            </div>
            
            {/* Layout selector */}
            <div className="flex bg-gray-800 rounded-md p-1">
              <Button
                variant={viewLayout === 'single' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewLayout('single')}
                className="h-7 w-7"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewLayout === '2x2' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewLayout('2x2')}
                className="h-7 w-7"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Tool selector */}
            <div className="flex bg-gray-800 rounded-md p-1">
              {tools.map(tool => (
                <Button
                  key={tool.id}
                  variant={selectedTool === tool.id ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => handleToolSelect(tool.id)}
                  title={`${tool.label} (${tool.hotkey})`}
                  className="h-7 w-7"
                >
                  <tool.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
            
            {/* Overlay toggle */}
            <Button
              variant={showOverlays ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowOverlays(!showOverlays)}
            >
              <Info className="h-4 w-4 mr-1" />
              Overlays
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Zoom controls */}
            <div className="flex items-center space-x-1 bg-gray-800 rounded-md p-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                className="h-7 w-7"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-white text-xs w-12 text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom(Math.min(400, zoom + 10))}
                className="h-7 w-7"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Rotation controls */}
            <div className="flex items-center space-x-1 bg-gray-800 rounded-md p-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRotation(rotation - 90)}
                className="h-7 w-7"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRotation(rotation + 90)}
                className="h-7 w-7"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main viewer area */}
      <div className="flex-1 flex">
        {/* Image viewing area */}
        <div className="flex-1 relative bg-black">
          {viewMode === '2D' && (
            <div className="h-full flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={512}
                height={512}
                className="border border-gray-700"
                style={{
                  transform: `scale(${zoom / 100})`,
                  imageRendering: 'pixelated'
                }}
              />
            </div>
          )}
          
          {viewMode === '3D' && (
            <div className="h-full flex items-center justify-center">
              <canvas
                ref={canvas3DRef}
                width={512}
                height={512}
                className="border border-gray-700"
              />
            </div>
          )}
          
          {viewMode === 'MPR' && (
            <div className="h-full grid grid-cols-2 gap-2 p-2">
              <div className="bg-gray-900 rounded flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white text-sm mb-2">Axial View</p>
                  <div className="w-64 h-64 bg-gray-800 rounded" />
                </div>
              </div>
              <div className="bg-gray-900 rounded flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white text-sm mb-2">Coronal View</p>
                  <div className="w-64 h-64 bg-gray-800 rounded" />
                </div>
              </div>
              <div className="bg-gray-900 rounded flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white text-sm mb-2">Sagittal View</p>
                  <div className="w-64 h-64 bg-gray-800 rounded" />
                </div>
              </div>
              <div className="bg-gray-900 rounded flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white text-sm mb-2">3D Reconstruction</p>
                  <div className="w-64 h-64 bg-gray-800 rounded" />
                </div>
              </div>
            </div>
          )}
          
          {/* Playback controls */}
          {viewMode === '2D' && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900/90 rounded-lg p-2">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentSlice(0)}
                  className="h-8 w-8 text-white"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentSlice(Math.max(0, currentSlice - 1))}
                  className="h-8 w-8 text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="h-8 w-8 text-white"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentSlice(Math.min(totalSlices - 1, currentSlice + 1))}
                  className="h-8 w-8 text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentSlice(totalSlices - 1)}
                  className="h-8 w-8 text-white"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
                <div className="w-32 mx-2">
                  <Slider
                    value={[currentSlice]}
                    onValueChange={(value) => setCurrentSlice(value[0])}
                    max={totalSlices - 1}
                    step={1}
                    className="w-full"
                  />
                </div>
                <span className="text-white text-xs">
                  {currentSlice + 1}/{totalSlices}
                </span>
              </div>
            </div>
          )}
          
          {/* 3D controls */}
          {viewMode === '3D' && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900/90 rounded-lg p-2">
              <div className="flex items-center space-x-4">
                <div className="flex flex-col">
                  <label className="text-white text-xs mb-1">X Rotation</label>
                  <Slider
                    value={[render3D.rotation.x]}
                    onValueChange={(value) => setRender3D({
                      ...render3D,
                      rotation: { ...render3D.rotation, x: value[0] }
                    })}
                    max={360}
                    className="w-24"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-white text-xs mb-1">Y Rotation</label>
                  <Slider
                    value={[render3D.rotation.y]}
                    onValueChange={(value) => setRender3D({
                      ...render3D,
                      rotation: { ...render3D.rotation, y: value[0] }
                    })}
                    max={360}
                    className="w-24"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-white text-xs mb-1">Opacity</label>
                  <Slider
                    value={[render3D.opacity * 100]}
                    onValueChange={(value) => setRender3D({
                      ...render3D,
                      opacity: value[0] / 100
                    })}
                    max={100}
                    className="w-24"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Right panel - Window/Level and measurements */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 p-4">
          <Tabs defaultValue="window" className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="window">Window/Level</TabsTrigger>
              <TabsTrigger value="measure">Measurements</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>
            
            <TabsContent value="window" className="space-y-4">
              <div>
                <label className="text-white text-sm">Presets</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setWindowWidth(400);
                      setWindowCenter(40);
                    }}
                  >
                    Soft Tissue
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setWindowWidth(1500);
                      setWindowCenter(300);
                    }}
                  >
                    Bone
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setWindowWidth(1500);
                      setWindowCenter(-600);
                    }}
                  >
                    Lung
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setWindowWidth(80);
                      setWindowCenter(40);
                    }}
                  >
                    Brain
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-white text-sm">Window Width: {windowWidth}</label>
                <Slider
                  value={[windowWidth]}
                  onValueChange={(value) => setWindowWidth(value[0])}
                  max={3000}
                  min={1}
                  className="mt-2"
                />
              </div>
              
              <div>
                <label className="text-white text-sm">Window Center: {windowCenter}</label>
                <Slider
                  value={[windowCenter]}
                  onValueChange={(value) => setWindowCenter(value[0])}
                  max={1000}
                  min={-1000}
                  className="mt-2"
                />
              </div>
              
              <div>
                <label className="text-white text-sm">Brightness: {brightness}</label>
                <Slider
                  value={[brightness]}
                  onValueChange={(value) => setBrightness(value[0])}
                  max={100}
                  className="mt-2"
                />
              </div>
              
              <div>
                <label className="text-white text-sm">Contrast: {contrast}</label>
                <Slider
                  value={[contrast]}
                  onValueChange={(value) => setContrast(value[0])}
                  max={100}
                  className="mt-2"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="measure" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-white text-sm font-semibold">Measurements</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddMeasurement}
                >
                  Add
                </Button>
              </div>
              
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {measurements.map((m) => (
                    <Card key={m.id} className="bg-gray-800 border-gray-700">
                      <CardContent className="p-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-white text-xs">Slice {m.sliceIndex + 1}</p>
                            <p className="text-gray-400 text-xs">{m.length.toFixed(1)} mm</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMeasurements(measurements.filter(item => item.id !== m.id))}
                            className="h-6 w-6"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="flex justify-between items-center">
                <h3 className="text-white text-sm font-semibold">Annotations</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddAnnotation}
                >
                  Add
                </Button>
              </div>
              
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {annotations.map((a) => (
                    <Card key={a.id} className="bg-gray-800 border-gray-700">
                      <CardContent className="p-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-white text-xs">{a.text}</p>
                            <p className="text-gray-400 text-xs">Slice {a.sliceIndex + 1}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAnnotations(annotations.filter(item => item.id !== a.id))}
                            className="h-6 w-6"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="info" className="space-y-4">
              <div className="space-y-2 text-white text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Study ID:</span>
                  <span>{studyId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Series:</span>
                  <span>{seriesId || 'CT Chest'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Modality:</span>
                  <span>CT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Slices:</span>
                  <span>{totalSlices}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Slice Thickness:</span>
                  <span>2.5 mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pixel Spacing:</span>
                  <span>0.7 × 0.7 mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">kVp:</span>
                  <span>120</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">mAs:</span>
                  <span>250</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}