import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toggle } from "@/components/ui/toggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AiOverlayViewer from "@/components/dicom/ai-overlay-viewer";
import ctBrainScan from "@assets/image_1754596406163.png";
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
  Info,
  PenTool,
  Type,
  MousePointer,
  Triangle,
  Minus,
  Plus,
  RefreshCw,
  Save,
  FileText,
  Settings,
  Eye,
  EyeOff,
  Brain,
  Zap
} from "lucide-react";

interface EnhancedDicomViewerProps {
  patientId: string;
  studyId: string;
  seriesId?: string;
}

// Generate multiple CT slices from the single image with variations
const generateCTSlicesFromImage = (baseImage: string, numSlices: number = 256) => {
  const slices = [];
  for (let i = 0; i < numSlices; i++) {
    const position = i / numSlices;
    slices.push({
      id: `slice-${i}`,
      index: i,
      position: (i * 2.5).toFixed(1), // mm spacing
      imageUrl: baseImage,
      brightness: 0.8 + (Math.sin(i * 0.1) * 0.2), // Vary brightness to simulate different slices
      contrast: 0.9 + (Math.cos(i * 0.08) * 0.1),
      hasAnnotation: Math.random() > 0.9,
      metadata: {
        ww: 80,  // Brain window width
        wc: 40,  // Brain window center
        kvp: 120,
        mas: 250,
        sliceThickness: 2.5,
        pixelSpacing: [0.7, 0.7]
      }
    });
  }
  return slices;
};

export default function EnhancedDicomViewer({ patientId, studyId, seriesId }: EnhancedDicomViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Viewer state
  const [viewMode, setViewMode] = useState<'2D' | '3D' | 'MPR'>('2D');
  const [currentSlice, setCurrentSlice] = useState(128);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [windowWidth, setWindowWidth] = useState(80);
  const [windowCenter, setWindowCenter] = useState(40);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>('pan');
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [showOverlays, setShowOverlays] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [viewLayout, setViewLayout] = useState<'single' | '2x2' | '3x3'>('single');
  const [isFlippedH, setIsFlippedH] = useState(false);
  const [isFlippedV, setIsFlippedV] = useState(false);
  const [isInverted, setIsInverted] = useState(false);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  
  // Mouse interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentMeasurement, setCurrentMeasurement] = useState<any>(null);
  
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
  
  const ctSlices = generateCTSlicesFromImage(ctBrainScan, 256);
  const totalSlices = ctSlices.length;
  
  // Window/Level presets
  const windowPresets = [
    { name: 'Brain', ww: 80, wc: 40 },
    { name: 'Bone', ww: 1500, wc: 300 },
    { name: 'Lung', ww: 1500, wc: -600 },
    { name: 'Soft Tissue', ww: 400, wc: 40 },
    { name: 'Liver', ww: 150, wc: 60 },
    { name: 'Mediastinum', ww: 350, wc: 50 }
  ];
  
  // Tool functions
  const tools = [
    { id: 'pointer', icon: MousePointer, label: 'Select', hotkey: 'S' },
    { id: 'pan', icon: Move, label: 'Pan', hotkey: 'P' },
    { id: 'zoom', icon: ZoomIn, label: 'Zoom', hotkey: 'Z' },
    { id: 'window', icon: Contrast, label: 'Window/Level', hotkey: 'W' },
    { id: 'ruler', icon: Ruler, label: 'Measure', hotkey: 'M' },
    { id: 'angle', icon: Activity, label: 'Angle', hotkey: 'A' },
    { id: 'circle', icon: Circle, label: 'Circle ROI', hotkey: 'C' },
    { id: 'rectangle', icon: Square, label: 'Rectangle ROI', hotkey: 'R' },
    { id: 'polygon', icon: Triangle, label: 'Polygon', hotkey: 'G' },
    { id: 'pen', icon: PenTool, label: 'Freehand', hotkey: 'F' },
    { id: 'text', icon: Type, label: 'Text', hotkey: 'T' },
    { id: 'crosshair', icon: Crosshair, label: 'Crosshair', hotkey: 'X' }
  ];
  
  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDragging(true);
    setDragStart({ x, y });
    
    if (selectedTool === 'ruler' || selectedTool === 'circle' || selectedTool === 'rectangle') {
      setIsDrawing(true);
      setCurrentMeasurement({
        type: selectedTool,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        sliceIndex: currentSlice
      });
    }
  }, [selectedTool, currentSlice]);
  
  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isDragging) {
      if (selectedTool === 'pan') {
        setPanOffset({
          x: panOffset.x + (x - dragStart.x),
          y: panOffset.y + (y - dragStart.y)
        });
        setDragStart({ x, y });
      } else if (selectedTool === 'window') {
        const deltaX = x - dragStart.x;
        const deltaY = y - dragStart.y;
        setWindowWidth(Math.max(1, windowWidth + deltaX));
        setWindowCenter(windowCenter - deltaY);
        setDragStart({ x, y });
      } else if (selectedTool === 'zoom') {
        const delta = (y - dragStart.y) * -0.5;
        setZoom(Math.max(50, Math.min(400, zoom + delta)));
        setDragStart({ x, y });
      }
    }
    
    if (isDrawing && currentMeasurement) {
      setCurrentMeasurement({
        ...currentMeasurement,
        endX: x,
        endY: y
      });
    }
  }, [isDragging, dragStart, selectedTool, panOffset, windowWidth, windowCenter, zoom, isDrawing, currentMeasurement]);
  
  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    
    if (isDrawing && currentMeasurement) {
      // Calculate measurement
      const dx = currentMeasurement.endX - currentMeasurement.startX;
      const dy = currentMeasurement.endY - currentMeasurement.startY;
      const pixelSpacing = 0.7; // mm per pixel
      
      let measurement: any = {
        id: Date.now(),
        type: currentMeasurement.type,
        sliceIndex: currentSlice,
        startX: currentMeasurement.startX,
        startY: currentMeasurement.startY,
        endX: currentMeasurement.endX,
        endY: currentMeasurement.endY
      };
      
      if (currentMeasurement.type === 'ruler') {
        measurement.length = Math.sqrt(dx * dx + dy * dy) * pixelSpacing;
        measurement.label = `${measurement.length.toFixed(1)} mm`;
      } else if (currentMeasurement.type === 'circle') {
        const radius = Math.sqrt(dx * dx + dy * dy);
        measurement.radius = radius;
        measurement.area = Math.PI * radius * radius * pixelSpacing * pixelSpacing;
        measurement.label = `Area: ${measurement.area.toFixed(1)} mm²`;
      } else if (currentMeasurement.type === 'rectangle') {
        measurement.width = Math.abs(dx) * pixelSpacing;
        measurement.height = Math.abs(dy) * pixelSpacing;
        measurement.area = measurement.width * measurement.height;
        measurement.label = `${measurement.width.toFixed(1)} × ${measurement.height.toFixed(1)} mm`;
      }
      
      setMeasurements([...measurements, measurement]);
      setIsDrawing(false);
      setCurrentMeasurement(null);
    }
  }, [isDrawing, currentMeasurement, currentSlice, measurements]);
  
  // Draw on canvas
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save context state
    ctx.save();
    
    // Apply transformations
    ctx.translate(canvas.width / 2 + panOffset.x, canvas.height / 2 + panOffset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom / 100, zoom / 100);
    if (isFlippedH) ctx.scale(-1, 1);
    if (isFlippedV) ctx.scale(1, -1);
    
    // Apply image adjustments
    const filters = [];
    filters.push(`brightness(${brightness}%)`);
    filters.push(`contrast(${contrast}%)`);
    if (isInverted) filters.push('invert(1)');
    ctx.filter = filters.join(' ');
    
    // Draw the image
    if (img.complete) {
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
    }
    
    // Restore context
    ctx.restore();
    
    // Draw overlays (measurements, annotations) without transformations
    if (showOverlays) {
      // Draw measurements
      measurements.filter(m => m.sliceIndex === currentSlice).forEach(m => {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.font = '14px Arial';
        ctx.fillStyle = '#00ff00';
        
        if (m.type === 'ruler') {
          ctx.beginPath();
          ctx.moveTo(m.startX, m.startY);
          ctx.lineTo(m.endX, m.endY);
          ctx.stroke();
          
          // Draw endpoints
          ctx.fillRect(m.startX - 3, m.startY - 3, 6, 6);
          ctx.fillRect(m.endX - 3, m.endY - 3, 6, 6);
          
          // Draw label
          const midX = (m.startX + m.endX) / 2;
          const midY = (m.startY + m.endY) / 2;
          ctx.fillText(m.label, midX, midY - 5);
        } else if (m.type === 'circle') {
          const radius = m.radius;
          const centerX = m.startX;
          const centerY = m.startY;
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.fillText(m.label, centerX, centerY - radius - 10);
        } else if (m.type === 'rectangle') {
          ctx.strokeRect(
            Math.min(m.startX, m.endX),
            Math.min(m.startY, m.endY),
            Math.abs(m.endX - m.startX),
            Math.abs(m.endY - m.startY)
          );
          
          ctx.fillText(m.label, Math.min(m.startX, m.endX), Math.min(m.startY, m.endY) - 5);
        }
      });
      
      // Draw current measurement being created
      if (isDrawing && currentMeasurement) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        if (currentMeasurement.type === 'ruler') {
          ctx.beginPath();
          ctx.moveTo(currentMeasurement.startX, currentMeasurement.startY);
          ctx.lineTo(currentMeasurement.endX, currentMeasurement.endY);
          ctx.stroke();
        } else if (currentMeasurement.type === 'circle') {
          const dx = currentMeasurement.endX - currentMeasurement.startX;
          const dy = currentMeasurement.endY - currentMeasurement.startY;
          const radius = Math.sqrt(dx * dx + dy * dy);
          
          ctx.beginPath();
          ctx.arc(currentMeasurement.startX, currentMeasurement.startY, radius, 0, Math.PI * 2);
          ctx.stroke();
        } else if (currentMeasurement.type === 'rectangle') {
          ctx.strokeRect(
            Math.min(currentMeasurement.startX, currentMeasurement.endX),
            Math.min(currentMeasurement.startY, currentMeasurement.endY),
            Math.abs(currentMeasurement.endX - currentMeasurement.startX),
            Math.abs(currentMeasurement.endY - currentMeasurement.startY)
          );
        }
        
        ctx.setLineDash([]);
      }
      
      // Draw annotations
      if (showAnnotations) {
        annotations.filter(a => a.sliceIndex === currentSlice).forEach(a => {
          ctx.fillStyle = '#ffff00';
          ctx.font = '14px Arial';
          ctx.fillText(a.text, a.x, a.y);
        });
      }
      
      // Draw slice info
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText(`Slice: ${currentSlice + 1}/${totalSlices}`, 10, 20);
      ctx.fillText(`Position: ${ctSlices[currentSlice].position} mm`, 10, 35);
      ctx.fillText(`WW: ${windowWidth.toFixed(0)} WC: ${windowCenter.toFixed(0)}`, 10, 50);
      ctx.fillText(`Zoom: ${zoom}%`, 10, 65);
      
      // Draw orientation markers
      ctx.fillStyle = '#00ffff';
      ctx.font = '16px Arial';
      ctx.fillText('A', canvas.width / 2 - 5, 20);
      ctx.fillText('P', canvas.width / 2 - 5, canvas.height - 10);
      ctx.fillText('R', 10, canvas.height / 2);
      ctx.fillText('L', canvas.width - 20, canvas.height / 2);
    }
  }, [currentSlice, zoom, rotation, panOffset, windowWidth, windowCenter, brightness, contrast, 
      isFlippedH, isFlippedV, isInverted, showOverlays, showAnnotations, measurements, 
      annotations, isDrawing, currentMeasurement]);
  
  // Animation loop for cine playback
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentSlice(prev => (prev + 1) % totalSlices);
    }, 100);
    
    return () => clearInterval(interval);
  }, [isPlaying, totalSlices]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 's': setSelectedTool('pointer'); break;
        case 'p': setSelectedTool('pan'); break;
        case 'z': setSelectedTool('zoom'); break;
        case 'w': setSelectedTool('window'); break;
        case 'm': setSelectedTool('ruler'); break;
        case 'a': setSelectedTool('angle'); break;
        case 'c': setSelectedTool('circle'); break;
        case 'r': setSelectedTool('rectangle'); break;
        case 'g': setSelectedTool('polygon'); break;
        case 'f': setSelectedTool('pen'); break;
        case 't': setSelectedTool('text'); break;
        case 'x': setSelectedTool('crosshair'); break;
        case ' ': e.preventDefault(); setIsPlaying(!isPlaying); break;
        case 'ArrowLeft': setCurrentSlice(Math.max(0, currentSlice - 1)); break;
        case 'ArrowRight': setCurrentSlice(Math.min(totalSlices - 1, currentSlice + 1)); break;
        case 'Delete': 
          if (measurements.length > 0) {
            setMeasurements(measurements.slice(0, -1));
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedTool, isPlaying, currentSlice, totalSlices, measurements]);
  
  const handleAddAnnotation = () => {
    const newAnnotation = {
      id: Date.now(),
      sliceIndex: currentSlice,
      text: prompt('Enter annotation text:') || 'Annotation',
      x: 256,
      y: 256
    };
    setAnnotations([...annotations, newAnnotation]);
  };
  
  const handleReset = () => {
    setZoom(100);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
    setBrightness(100);
    setContrast(100);
    setIsFlippedH(false);
    setIsFlippedV(false);
    setIsInverted(false);
  };
  
  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slice-${currentSlice + 1}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
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
                title="Single View"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewLayout === '2x2' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewLayout('2x2')}
                className="h-7 w-7"
                title="2x2 Grid"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Tool selector */}
            <div className="flex bg-gray-800 rounded-md p-1">
              {tools.slice(0, 8).map(tool => (
                <Button
                  key={tool.id}
                  variant={selectedTool === tool.id ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setSelectedTool(tool.id)}
                  title={`${tool.label} (${tool.hotkey})`}
                  className="h-7 w-7"
                >
                  <tool.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
            
            {/* Image manipulation */}
            <div className="flex bg-gray-800 rounded-md p-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFlippedH(!isFlippedH)}
                className="h-7 w-7"
                title="Flip Horizontal"
              >
                <FlipHorizontal className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFlippedV(!isFlippedV)}
                className="h-7 w-7"
                title="Flip Vertical"
              >
                <FlipVertical className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRotation(rotation - 90)}
                className="h-7 w-7"
                title="Rotate Left"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRotation(rotation + 90)}
                className="h-7 w-7"
                title="Rotate Right"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                variant={isInverted ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setIsInverted(!isInverted)}
                className="h-7 w-7"
                title="Invert"
              >
                <Contrast className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Overlay toggle */}
            <Button
              variant={showOverlays ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowOverlays(!showOverlays)}
            >
              {showOverlays ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
              Overlays
            </Button>
            
            <Button
              variant={showAnnotations ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowAnnotations(!showAnnotations)}
            >
              <Type className="h-4 w-4 mr-1" />
              Annotations
            </Button>
            
            {/* AI Analysis Button */}
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowAiAnalysis(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Zap className="h-4 w-4 mr-1" />
              AI Analysis
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
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-white text-xs w-12 text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom(Math.min(400, zoom + 10))}
                className="h-7 w-7"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              title="Reset View"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              title="Export Image"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main viewer area */}
      <div className="flex-1 flex">
        {/* Image viewing area */}
        <div className="flex-1 relative bg-black" ref={containerRef}>
          {viewMode === '2D' && (
            <div className="h-full flex items-center justify-center">
              {/* Hidden image element for loading */}
              <img
                ref={imageRef}
                src={ctBrainScan}
                alt="CT Scan"
                style={{ display: 'none' }}
              />
              
              {/* Interactive canvas */}
              <canvas
                ref={canvasRef}
                width={512}
                height={512}
                className="border border-gray-700"
                style={{
                  cursor: selectedTool === 'zoom' ? 'zoom-in' :
                          selectedTool === 'pan' ? (isDragging ? 'grabbing' : 'grab') :
                          selectedTool === 'ruler' || selectedTool === 'circle' || selectedTool === 'rectangle' ? 'crosshair' :
                          selectedTool === 'window' ? 'ew-resize' :
                          selectedTool === 'text' ? 'text' :
                          selectedTool === 'pen' ? 'crosshair' :
                          'default'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
          )}
          
          {viewMode === '3D' && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-96 h-96 bg-gray-900 rounded-lg flex items-center justify-center">
                  <div className="text-white">
                    <Box className="w-24 h-24 mx-auto mb-4 text-cyan-500" />
                    <p className="text-lg">3D Volume Rendering</p>
                    <p className="text-sm text-gray-400 mt-2">Interactive 3D visualization</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {viewMode === 'MPR' && (
            <div className="h-full grid grid-cols-2 gap-2 p-2">
              <div className="bg-gray-900 rounded flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white text-sm mb-2">Axial View</p>
                  <img src={ctBrainScan} alt="Axial" className="w-64 h-64 rounded" />
                </div>
              </div>
              <div className="bg-gray-900 rounded flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white text-sm mb-2">Coronal View</p>
                  <img src={ctBrainScan} alt="Coronal" className="w-64 h-64 rounded transform rotate-90" />
                </div>
              </div>
              <div className="bg-gray-900 rounded flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white text-sm mb-2">Sagittal View</p>
                  <img src={ctBrainScan} alt="Sagittal" className="w-64 h-64 rounded transform -rotate-90" />
                </div>
              </div>
              <div className="bg-gray-900 rounded flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white text-sm mb-2">3D Reconstruction</p>
                  <div className="w-64 h-64 bg-gray-800 rounded flex items-center justify-center">
                    <Layers className="w-16 h-16 text-cyan-500" />
                  </div>
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
        </div>
        
        {/* Right panel - Controls and measurements */}
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
                  {windowPresets.map(preset => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setWindowWidth(preset.ww);
                        setWindowCenter(preset.wc);
                      }}
                      className="text-xs"
                    >
                      {preset.name}
                    </Button>
                  ))}
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
                <label className="text-white text-sm">Brightness: {brightness}%</label>
                <Slider
                  value={[brightness]}
                  onValueChange={(value) => setBrightness(value[0])}
                  max={200}
                  min={0}
                  className="mt-2"
                />
              </div>
              
              <div>
                <label className="text-white text-sm">Contrast: {contrast}%</label>
                <Slider
                  value={[contrast]}
                  onValueChange={(value) => setContrast(value[0])}
                  max={200}
                  min={0}
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
                  onClick={() => setMeasurements([])}
                  disabled={measurements.length === 0}
                >
                  Clear All
                </Button>
              </div>
              
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {measurements.map((m) => (
                    <Card key={m.id} className="bg-gray-800 border-gray-700">
                      <CardContent className="p-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-white text-xs">
                              {m.type === 'ruler' ? 'Line' : m.type === 'circle' ? 'Circle' : 'Rectangle'}
                            </p>
                            <p className="text-cyan-400 text-xs font-semibold">{m.label}</p>
                            <p className="text-gray-400 text-xs">Slice {m.sliceIndex + 1}</p>
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
                  <span>CT Brain</span>
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
                <div className="flex justify-between">
                  <span className="text-gray-400">Patient ID:</span>
                  <span>{patientId}</span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-700">
                <h4 className="text-white text-sm font-semibold mb-2">Export Options</h4>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Save className="w-4 h-4 mr-2" />
                    Save Measurements
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export DICOM
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* AI Analysis Dialog */}
      <Dialog open={showAiAnalysis} onOpenChange={setShowAiAnalysis}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI-Powered Medical Image Analysis
            </DialogTitle>
          </DialogHeader>
          <AiOverlayViewer imageUrl={ctBrainScan} />
        </DialogContent>
      </Dialog>
    </div>
  );
}