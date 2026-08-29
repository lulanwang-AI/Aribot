import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { 
  Brain, 
  Activity, 
  AlertTriangle,
  Info,
  Zap,
  Target,
  Eye,
  EyeOff,
  Settings,
  RefreshCw
} from "lucide-react";

interface AiDetection {
  id: string;
  type: 'cancer' | 'nodule' | 'lesion' | 'abnormality';
  confidence: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export default function AiOverlayViewer({ imageUrl }: { imageUrl?: string }) {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [opacity, setOpacity] = useState([0.7]);
  const [selectedDetection, setSelectedDetection] = useState<AiDetection | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Simulated AI detections for demonstration
  const [detections, setDetections] = useState<AiDetection[]>([]);

  // Simulate AI analysis when toggled on
  useEffect(() => {
    if (aiEnabled && !detections.length) {
      setIsAnalyzing(true);
      setTimeout(() => {
        // Generate random detections for demonstration
        const mockDetections: AiDetection[] = [
          {
            id: '1',
            type: 'nodule',
            confidence: 0.92,
            position: { x: 150, y: 120 },
            size: { width: 45, height: 40 },
            severity: 'high',
            description: 'Suspicious pulmonary nodule detected in right upper lobe'
          },
          {
            id: '2',
            type: 'lesion',
            confidence: 0.78,
            position: { x: 280, y: 200 },
            size: { width: 30, height: 35 },
            severity: 'medium',
            description: 'Potential lesion requiring further investigation'
          },
          {
            id: '3',
            type: 'abnormality',
            confidence: 0.65,
            position: { x: 100, y: 250 },
            size: { width: 55, height: 50 },
            severity: 'low',
            description: 'Minor abnormality detected, likely benign'
          }
        ];
        setDetections(mockDetections);
        setIsAnalyzing(false);
      }, 1500);
    }
  }, [aiEnabled, detections.length]);

  // Draw overlay on canvas
  useEffect(() => {
    if (!canvasRef.current || !aiEnabled || !showOverlay) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw detections
    detections.forEach(detection => {
      ctx.globalAlpha = opacity[0];
      
      // Set color based on severity
      let color = '';
      let bgColor = '';
      switch (detection.severity) {
        case 'critical':
          color = 'rgba(220, 38, 38, 1)'; // red
          bgColor = 'rgba(220, 38, 38, 0.2)';
          break;
        case 'high':
          color = 'rgba(239, 68, 68, 1)'; // light red
          bgColor = 'rgba(239, 68, 68, 0.2)';
          break;
        case 'medium':
          color = 'rgba(251, 146, 60, 1)'; // orange
          bgColor = 'rgba(251, 146, 60, 0.2)';
          break;
        case 'low':
          color = 'rgba(250, 204, 21, 1)'; // yellow
          bgColor = 'rgba(250, 204, 21, 0.2)';
          break;
      }

      // Draw filled area
      ctx.fillStyle = bgColor;
      ctx.fillRect(
        detection.position.x,
        detection.position.y,
        detection.size.width,
        detection.size.height
      );

      // Draw border
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        detection.position.x,
        detection.position.y,
        detection.size.width,
        detection.size.height
      );

      // Draw confidence label
      ctx.fillStyle = color;
      ctx.font = 'bold 12px Inter';
      ctx.fillText(
        `${Math.round(detection.confidence * 100)}%`,
        detection.position.x,
        detection.position.y - 5
      );

      // Reset alpha
      ctx.globalAlpha = 1;
    });
  }, [aiEnabled, showOverlay, detections, opacity]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Analysis Controls
            </div>
            <Badge variant={aiEnabled ? "default" : "secondary"}>
              {aiEnabled ? "Active" : "Inactive"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Toggle AI-powered cancer and abnormality detection overlay
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main AI Toggle */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <Label htmlFor="ai-toggle" className="text-base font-semibold">
                  Enable AI Detection
                </Label>
                <p className="text-sm text-gray-600">
                  Activate real-time cancer and abnormality detection
                </p>
              </div>
            </div>
            <Switch
              id="ai-toggle"
              checked={aiEnabled}
              onCheckedChange={setAiEnabled}
              className="scale-125"
            />
          </div>

          {/* AI Settings */}
          {aiEnabled && (
            <div className="space-y-4 pt-2">
              {/* Overlay Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {showOverlay ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  <Label htmlFor="overlay-toggle">Show Overlay</Label>
                </div>
                <Switch
                  id="overlay-toggle"
                  checked={showOverlay}
                  onCheckedChange={setShowOverlay}
                />
              </div>

              {/* Opacity Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Overlay Opacity</Label>
                  <span className="text-sm text-gray-500">{Math.round(opacity[0] * 100)}%</span>
                </div>
                <Slider
                  value={opacity}
                  onValueChange={setOpacity}
                  min={0.1}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Refresh Analysis */}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  setDetections([]);
                  setAiEnabled(false);
                  setTimeout(() => setAiEnabled(true), 100);
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-analyze Image
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Viewer with Overlay */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            DICOM Image with AI Overlay
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '400px' }}>
            {/* Placeholder for actual DICOM image */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <img 
                ref={imageRef}
                src={imageUrl || '/api/placeholder/400/400'} 
                alt="DICOM scan"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            
            {/* AI Overlay Canvas */}
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="absolute inset-0 pointer-events-none"
              style={{ display: aiEnabled && showOverlay ? 'block' : 'none' }}
            />

            {/* Loading Overlay */}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
                  <p className="text-sm">Analyzing image...</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detection Results */}
      {aiEnabled && detections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                AI Detection Results
              </div>
              <Badge variant="destructive">
                {detections.length} Findings
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {detections.map(detection => (
                <div
                  key={detection.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedDetection?.id === detection.id 
                      ? 'ring-2 ring-blue-500' 
                      : ''
                  } ${getSeverityColor(detection.severity)}`}
                  onClick={() => setSelectedDetection(detection)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium capitalize">{detection.type}</span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(detection.confidence * 100)}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm opacity-90">{detection.description}</p>
                      <div className="flex gap-4 mt-2 text-xs opacity-75">
                        <span>Position: ({detection.position.x}, {detection.position.y})</span>
                        <span>Size: {detection.size.width}x{detection.size.height}px</span>
                      </div>
                    </div>
                    <Badge 
                      variant={
                        detection.severity === 'critical' ? 'destructive' :
                        detection.severity === 'high' ? 'destructive' :
                        detection.severity === 'medium' ? 'default' : 'secondary'
                      }
                    >
                      {detection.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Information */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This AI detection system uses advanced deep learning algorithms to identify potential 
          cancerous regions, nodules, and other abnormalities in medical images. Results should 
          always be verified by qualified medical professionals.
        </AlertDescription>
      </Alert>
    </div>
  );
}