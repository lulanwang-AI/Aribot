import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Move, 
  RotateCw, 
  Maximize2, 
  Crosshair, 
  Layers,
  Eye,
  Ruler,
  CircleDot
} from 'lucide-react';

interface DicomSlice {
  imageData: Uint8Array;
  width: number;
  height: number;
  sliceLocation: number;
  pixelSpacing?: [number, number];
  sliceThickness?: number;
}

interface MPRViewerProps {
  dicomSeries: DicomSlice[];
  patientName?: string;
  studyDescription?: string;
  onMeasurement?: (measurement: any) => void;
}

interface CrosshairPosition {
  x: number;
  y: number;
  z: number;
}

export default function MPRViewer({ 
  dicomSeries, 
  patientName = "Unknown Patient",
  studyDescription = "CT Study",
  onMeasurement 
}: MPRViewerProps) {
  const axialCanvasRef = useRef<HTMLCanvasElement>(null);
  const sagittalCanvasRef = useRef<HTMLCanvasElement>(null);
  const coronalCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [crosshairPosition, setCrosshairPosition] = useState<CrosshairPosition>({ x: 0, y: 0, z: 0 });
  const [windowLevel, setWindowLevel] = useState([50]);
  const [windowWidth, setWindowWidth] = useState([350]);
  const [currentSlice, setCurrentSlice] = useState([0]);
  const [showCrosshairs, setShowCrosshairs] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [measurements, setMeasurements] = useState<any[]>([]);

  // Initialize MPR views
  useEffect(() => {
    if (!dicomSeries.length) return;
    
    setIsLoading(true);
    
    // Sort slices by location
    const sortedSlices = [...dicomSeries].sort((a, b) => a.sliceLocation - b.sliceLocation);
    
    // Set initial crosshair to center of volume
    const centerX = Math.floor(sortedSlices[0].width / 2);
    const centerY = Math.floor(sortedSlices[0].height / 2);
    const centerZ = Math.floor(sortedSlices.length / 2);
    
    setCrosshairPosition({ x: centerX, y: centerY, z: centerZ });
    setCurrentSlice([centerZ]);
    
    // Render initial views
    renderMPRViews(sortedSlices, { x: centerX, y: centerY, z: centerZ });
    
    setIsLoading(false);
  }, [dicomSeries]);

  // Update views when crosshair position changes
  useEffect(() => {
    if (dicomSeries.length) {
      const sortedSlices = [...dicomSeries].sort((a, b) => a.sliceLocation - b.sliceLocation);
      renderMPRViews(sortedSlices, crosshairPosition);
    }
  }, [crosshairPosition, windowLevel, windowWidth, showCrosshairs]);

  const renderMPRViews = (slices: DicomSlice[], crosshair: CrosshairPosition) => {
    renderAxialView(slices, crosshair);
    renderSagittalView(slices, crosshair);
    renderCoronalView(slices, crosshair);
  };

  const renderAxialView = (slices: DicomSlice[], crosshair: CrosshairPosition) => {
    const canvas = axialCanvasRef.current;
    if (!canvas || !slices.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const slice = slices[Math.min(crosshair.z, slices.length - 1)];
    if (!slice) return;

    canvas.width = slice.width;
    canvas.height = slice.height;

    // Create image data
    const imageData = ctx.createImageData(slice.width, slice.height);
    
    for (let i = 0; i < slice.imageData.length; i++) {
      const intensity = applyWindowLevel(slice.imageData[i], windowLevel[0], windowWidth[0]);
      const idx = i * 4;
      imageData.data[idx] = intensity;     // R
      imageData.data[idx + 1] = intensity; // G
      imageData.data[idx + 2] = intensity; // B
      imageData.data[idx + 3] = 255;       // A
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw crosshairs
    if (showCrosshairs) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(crosshair.x, 0);
      ctx.lineTo(crosshair.x, slice.height);
      ctx.moveTo(0, crosshair.y);
      ctx.lineTo(slice.width, crosshair.y);
      ctx.stroke();
    }
  };

  const renderSagittalView = (slices: DicomSlice[], crosshair: CrosshairPosition) => {
    const canvas = sagittalCanvasRef.current;
    if (!canvas || !slices.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = slices.length;
    const height = slices[0].height;
    
    canvas.width = width;
    canvas.height = height;

    // Create sagittal slice by extracting pixel column from each axial slice
    const imageData = ctx.createImageData(width, height);
    
    for (let z = 0; z < slices.length; z++) {
      const slice = slices[z];
      for (let y = 0; y < height; y++) {
        const sourceIdx = y * slice.width + crosshair.x;
        const intensity = applyWindowLevel(slice.imageData[sourceIdx] || 0, windowLevel[0], windowWidth[0]);
        
        const targetIdx = (y * width + z) * 4;
        imageData.data[targetIdx] = intensity;     // R
        imageData.data[targetIdx + 1] = intensity; // G
        imageData.data[targetIdx + 2] = intensity; // B
        imageData.data[targetIdx + 3] = 255;       // A
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw crosshairs
    if (showCrosshairs) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(crosshair.z, 0);
      ctx.lineTo(crosshair.z, height);
      ctx.moveTo(0, crosshair.y);
      ctx.lineTo(width, crosshair.y);
      ctx.stroke();
    }
  };

  const renderCoronalView = (slices: DicomSlice[], crosshair: CrosshairPosition) => {
    const canvas = coronalCanvasRef.current;
    if (!canvas || !slices.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = slices[0].width;
    const height = slices.length;
    
    canvas.width = width;
    canvas.height = height;

    // Create coronal slice by extracting pixel row from each axial slice
    const imageData = ctx.createImageData(width, height);
    
    for (let z = 0; z < slices.length; z++) {
      const slice = slices[z];
      for (let x = 0; x < width; x++) {
        const sourceIdx = crosshair.y * slice.width + x;
        const intensity = applyWindowLevel(slice.imageData[sourceIdx] || 0, windowLevel[0], windowWidth[0]);
        
        const targetIdx = (z * width + x) * 4;
        imageData.data[targetIdx] = intensity;     // R
        imageData.data[targetIdx + 1] = intensity; // G
        imageData.data[targetIdx + 2] = intensity; // B
        imageData.data[targetIdx + 3] = 255;       // A
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw crosshairs
    if (showCrosshairs) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(crosshair.x, 0);
      ctx.lineTo(crosshair.x, height);
      ctx.moveTo(0, crosshair.z);
      ctx.lineTo(width, crosshair.z);
      ctx.stroke();
    }
  };

  const applyWindowLevel = (pixelValue: number, level: number, width: number): number => {
    const min = level - width / 2;
    const max = level + width / 2;
    
    if (pixelValue <= min) return 0;
    if (pixelValue >= max) return 255;
    
    return Math.round(((pixelValue - min) / width) * 255);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>, view: 'axial' | 'sagittal' | 'coronal') => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Scale coordinates to image space
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const imageX = Math.floor(x * scaleX);
    const imageY = Math.floor(y * scaleY);

    let newCrosshair = { ...crosshairPosition };

    switch (view) {
      case 'axial':
        newCrosshair.x = imageX;
        newCrosshair.y = imageY;
        break;
      case 'sagittal':
        newCrosshair.z = imageX;
        newCrosshair.y = imageY;
        break;
      case 'coronal':
        newCrosshair.x = imageX;
        newCrosshair.z = imageY;
        break;
    }

    setCrosshairPosition(newCrosshair);
    setCurrentSlice([newCrosshair.z]);
  };

  const resetWindowing = () => {
    setWindowLevel([50]);
    setWindowWidth([350]);
  };

  const setBoneWindowing = () => {
    setWindowLevel([300]);
    setWindowWidth([1500]);
  };

  const setSoftTissueWindowing = () => {
    setWindowLevel([40]);
    setWindowWidth([400]);
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="bg-gray-900 text-white p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{patientName}</h3>
            <p className="text-sm text-gray-300">{studyDescription} • Multiplanar Reconstruction</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-blue-900 text-blue-200">
              MPR
            </Badge>
            <Badge variant="secondary" className="bg-green-900 text-green-200">
              {dicomSeries.length} Slices
            </Badge>
            <Badge variant="secondary" className="bg-purple-900 text-purple-200">
              Slice {currentSlice[0] + 1}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* MPR Views Grid */}
        <div className="flex-1 grid grid-cols-2 gap-1 p-2">
          {/* Axial View */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center justify-between">
                <span>Axial (Z: {crosshairPosition.z})</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCrosshairs(!showCrosshairs)}
                  className="h-6 w-6 p-0 text-green-400"
                >
                  <Crosshair className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <canvas
                ref={axialCanvasRef}
                onClick={(e) => handleCanvasClick(e, 'axial')}
                className="w-full h-auto border border-gray-600 cursor-crosshair"
                style={{ maxHeight: '300px', objectFit: 'contain' }}
              />
            </CardContent>
          </Card>

          {/* Sagittal View */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center justify-between">
                <span>Sagittal (X: {crosshairPosition.x})</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-blue-400"
                >
                  <Layers className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <canvas
                ref={sagittalCanvasRef}
                onClick={(e) => handleCanvasClick(e, 'sagittal')}
                className="w-full h-auto border border-gray-600 cursor-crosshair"
                style={{ maxHeight: '300px', objectFit: 'contain' }}
              />
            </CardContent>
          </Card>

          {/* Coronal View */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center justify-between">
                <span>Coronal (Y: {crosshairPosition.y})</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-400"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <canvas
                ref={coronalCanvasRef}
                onClick={(e) => handleCanvasClick(e, 'coronal')}
                className="w-full h-auto border border-gray-600 cursor-crosshair"
                style={{ maxHeight: '300px', objectFit: 'contain' }}
              />
            </CardContent>
          </Card>

          {/* 3D Info Panel */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">3D Navigation</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-3">
              <div className="text-sm text-gray-300">
                <div>Position: ({crosshairPosition.x}, {crosshairPosition.y}, {crosshairPosition.z})</div>
                <div className="text-xs text-gray-400 mt-1">
                  Pixel Value: {dicomSeries[crosshairPosition.z]?.imageData?.[crosshairPosition.y * dicomSeries[crosshairPosition.z].width + crosshairPosition.x] || 0}
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full bg-gray-800 hover:bg-gray-700 border-gray-600 text-white"
                  onClick={() => {}}
                >
                  <Ruler className="w-4 h-4 mr-2" />
                  Measure Distance
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full bg-gray-800 hover:bg-gray-700 border-gray-600 text-white"
                  onClick={() => {}}
                >
                  <CircleDot className="w-4 h-4 mr-2" />
                  Place Annotation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Control Panel */}
        <div className="w-72 bg-gray-900 text-white p-4 border-l border-gray-700 space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm">Slice Navigation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Current Slice: {currentSlice[0] + 1} / {dicomSeries.length}
                </label>
                <Slider
                  value={currentSlice}
                  onValueChange={(value) => {
                    setCurrentSlice(value);
                    setCrosshairPosition(prev => ({ ...prev, z: value[0] }));
                  }}
                  max={dicomSeries.length - 1}
                  step={1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm">Window/Level</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Level: {windowLevel[0]}</label>
                <Slider
                  value={windowLevel}
                  onValueChange={setWindowLevel}
                  min={-1000}
                  max={1000}
                  step={1}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">Width: {windowWidth[0]}</label>
                <Slider
                  value={windowWidth}
                  onValueChange={setWindowWidth}
                  min={1}
                  max={2000}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={setSoftTissueWindowing}
                  className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
                >
                  Soft Tissue
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={setBoneWindowing}
                  className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
                >
                  Bone
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={resetWindowing}
                  className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm">Display Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                size="sm"
                variant={showCrosshairs ? "default" : "outline"}
                onClick={() => setShowCrosshairs(!showCrosshairs)}
                className="w-full"
              >
                <Crosshair className="w-4 h-4 mr-2" />
                Crosshairs
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="w-full bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
                onClick={() => {}}
              >
                <Maximize2 className="w-4 h-4 mr-2" />
                Fullscreen
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}