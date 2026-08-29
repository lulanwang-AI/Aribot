import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Wind,
  RotateCcw, 
  ZoomIn, 
  ZoomOut,
  Activity,
  Settings, 
  Eye,
  Loader2,
  Download,
  Tag,
  AlertTriangle,
  Brain,
  Heart,
  Info,
  Target
} from 'lucide-react';

interface OrganLabel {
  name: string;
  position: THREE.Vector3;
  color: string;
  visible: boolean;
}

interface TumorAnnotation {
  type: string;
  location: number[];
  label: string;
  severity: string;
  confidence: number;
  position?: THREE.Vector3;
}

export default function Lung3DViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const volumeRef = useRef<THREE.Mesh>(null);
  const frameRef = useRef<number>(null);
  const labelRefs = useRef<Map<string, any>>(new Map());
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opacity, setOpacity] = useState([0.7]);
  const [threshold, setThreshold] = useState([30]);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [lungData, setLungData] = useState<any>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showTumors, setShowTumors] = useState(true);
  const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null);
  const [aiAnalysisExpanded, setAiAnalysisExpanded] = useState(true);

  // Load lung data
  useEffect(() => {
    const loadLungData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/dicom/3d/sample-lung');
        if (!response.ok) {
          throw new Error('Failed to load lung data');
        }
        
        const data = await response.json();
        
        // Decode base64 volume data
        const binaryString = atob(data.data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        data.volumeArray = bytes;
        setLungData(data);
        
      } catch (err) {
        console.error('Error loading lung data:', err);
        setError('Failed to load lung visualization data');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLungData();
  }, []);

  // Initialize 3D scene with lung visualization
  useEffect(() => {
    if (!mountRef.current || !lungData || !lungData.volumeArray) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 500);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight1.position.set(100, 100, 100);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-100, -100, 100);
    scene.add(directionalLight2);

    // Create volume texture from lung data
    const [width, height, depth] = lungData.dimensions;
    const texture = new THREE.Data3DTexture(
      lungData.volumeArray,
      width,
      height,
      depth
    );
    texture.format = THREE.RedFormat;
    texture.type = THREE.UnsignedByteType;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    // Lung-specific volume rendering shader
    const lungShader = {
      uniforms: {
        volume: { value: texture },
        opacity: { value: opacity[0] },
        threshold: { value: threshold[0] / 255 },
        steps: { value: 256 },
        alphaCorrection: { value: 0.01 },
        showTumors: { value: showTumors ? 1.0 : 0.0 }
      },
      vertexShader: `
        varying vec3 vOrigin;
        varying vec3 vDirection;
        
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vOrigin = vec3(inverse(modelMatrix) * vec4(cameraPosition, 1.0));
          vDirection = position - vOrigin;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        precision highp float;
        precision highp sampler3D;
        
        uniform sampler3D volume;
        uniform float opacity;
        uniform float threshold;
        uniform float steps;
        uniform float alphaCorrection;
        uniform float showTumors;
        
        varying vec3 vOrigin;
        varying vec3 vDirection;
        
        vec2 hitBox(vec3 orig, vec3 dir) {
          vec3 box_min = vec3(-0.5);
          vec3 box_max = vec3(0.5);
          vec3 inv_dir = 1.0 / dir;
          vec3 tmin_tmp = (box_min - orig) * inv_dir;
          vec3 tmax_tmp = (box_max - orig) * inv_dir;
          vec3 tmin = min(tmin_tmp, tmax_tmp);
          vec3 tmax = max(tmin_tmp, tmax_tmp);
          float t0 = max(tmin.x, max(tmin.y, tmin.z));
          float t1 = min(tmax.x, min(tmax.y, tmax.z));
          return vec2(t0, t1);
        }
        
        vec3 getLungColor(float value) {
          // Color mapping for different tissue types
          if (value < 0.15) {
            // Air (dark)
            return vec3(0.05, 0.05, 0.1);
          } else if (value < 0.3) {
            // Lung tissue (blue-gray)
            return vec3(0.3, 0.4, 0.6);
          } else if (value < 0.6) {
            // Bronchi/vessels (lighter blue)
            return vec3(0.5, 0.6, 0.8);
          } else if (value < 0.75) {
            // Heart/soft tissue (red-pink)
            return vec3(0.8, 0.3, 0.4);
          } else if (value < 0.85 && showTumors > 0.5) {
            // Tumors (yellow-orange)
            return vec3(1.0, 0.6, 0.2);
          } else {
            // Bone (white)
            return vec3(0.95, 0.95, 0.9);
          }
        }
        
        void main() {
          vec3 rayDir = normalize(vDirection);
          vec2 bounds = hitBox(vOrigin, rayDir);
          
          if (bounds.x > bounds.y) {
            discard;
          }
          
          bounds.x = max(bounds.x, 0.0);
          
          vec3 p = vOrigin + bounds.x * rayDir;
          vec3 inc = 1.0 / abs(rayDir);
          float delta = min(inc.x, min(inc.y, inc.z)) / steps;
          
          vec4 accum = vec4(0.0);
          
          for (float t = bounds.x; t < bounds.y; t += delta) {
            vec3 samplePos = vOrigin + t * rayDir;
            vec3 texCoord = samplePos + 0.5;
            
            float sample = texture(volume, texCoord).r;
            
            if (sample > threshold) {
              vec3 color = getLungColor(sample);
              float alpha = sample * opacity * alphaCorrection;
              
              // Enhance tumor visibility
              if (sample > 0.7 && sample < 0.85 && showTumors > 0.5) {
                alpha *= 2.0;
                color = mix(color, vec3(1.0, 0.3, 0.1), 0.5);
              }
              
              accum.rgb += (1.0 - accum.a) * color * alpha;
              accum.a += (1.0 - accum.a) * alpha;
              
              if (accum.a >= 0.95) break;
            }
          }
          
          if (accum.a < 0.01) discard;
          
          gl_FragColor = accum;
        }
      `
    };

    // Create volume mesh
    const geometry = new THREE.BoxGeometry(
      lungData.dimensions[0] * lungData.spacing[0] / 100,
      lungData.dimensions[1] * lungData.spacing[1] / 100,
      lungData.dimensions[2] * lungData.spacing[2] / 100
    );
    const material = new THREE.ShaderMaterial(lungShader);
    const volume = new THREE.Mesh(geometry, material);
    scene.add(volume);
    volumeRef.current = volume;

    // Add organ labels
    if (lungData.metadata?.organs && showLabels) {
      lungData.metadata.organs.forEach((organ: any) => {
        // Create label sprite
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 256;
        canvas.height = 64;
        
        context.fillStyle = organ.color;
        context.fillRect(0, 0, 10, 64);
        
        context.fillStyle = 'white';
        context.font = 'bold 24px Arial';
        context.fillText(organ.name, 20, 40);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        // Position based on organ bounds
        const x = (organ.bounds.x[0] + organ.bounds.x[1]) / 2 - 128;
        const y = (organ.bounds.y[0] + organ.bounds.y[1]) / 2 - 128;
        const z = (organ.bounds.z[0] + organ.bounds.z[1]) / 2 - 64;
        
        sprite.position.set(x * 0.5, y * 0.5, z * 0.5);
        sprite.scale.set(40, 10, 1);
        
        scene.add(sprite);
        labelRefs.current.set(organ.name, sprite);
      });
    }

    // Add tumor markers
    if (lungData.metadata?.annotations && showTumors) {
      lungData.metadata.annotations.forEach((annotation: TumorAnnotation) => {
        const color = annotation.severity === 'high' ? 0xff0000 : 
                     annotation.severity === 'moderate' ? 0xffa500 : 0xffff00;
        
        // Create sphere marker for tumor
        const sphereGeometry = new THREE.SphereGeometry(5, 16, 16);
        const sphereMaterial = new THREE.MeshPhongMaterial({
          color: color,
          transparent: true,
          opacity: 0.6,
          emissive: color,
          emissiveIntensity: 0.3
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        
        // Convert annotation location to 3D position
        const [x, y, z] = annotation.location;
        sphere.position.set(
          (x - 128) * 0.5,
          (y - 128) * 0.5,
          (z - 64) * 0.5
        );
        
        scene.add(sphere);
        
        // Pulsing animation for high severity tumors
        if (annotation.severity === 'high') {
          const animate = () => {
            sphere.scale.setScalar(1 + Math.sin(Date.now() * 0.003) * 0.2);
          };
          setInterval(animate, 50);
        }
      });
    }

    // Add coordinate axes helper
    const axesHelper = new THREE.AxesHelper(100);
    scene.add(axesHelper);

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      if (volumeRef.current) {
        volumeRef.current.rotation.x = rotation.x;
        volumeRef.current.rotation.y = rotation.y;
      }
      
      // Update label orientations to face camera
      labelRefs.current.forEach((sprite) => {
        if (sprite) {
          sprite.lookAt(camera.position);
        }
      });
      
      if (cameraRef.current) {
        const distance = 500 / zoom;
        cameraRef.current.position.setLength(distance);
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [lungData, opacity, threshold, zoom, rotation, showLabels, showTumors]);

  // Handle mouse interactions
  useEffect(() => {
    if (!mountRef.current) return;

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      setRotation(prev => ({
        x: prev.x + deltaY * 0.01,
        y: prev.y + deltaX * 0.01
      }));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(prev => Math.max(0.5, Math.min(3, prev + e.deltaY * -0.001)));
    };

    const element = mountRef.current;
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mouseleave', handleMouseUp);
    element.addEventListener('wheel', handleWheel);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mouseleave', handleMouseUp);
      element.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Update shader uniforms
  useEffect(() => {
    if (volumeRef.current && volumeRef.current.material) {
      const material = volumeRef.current.material as THREE.ShaderMaterial;
      material.uniforms.opacity.value = opacity[0];
      material.uniforms.threshold.value = threshold[0] / 255;
      material.uniforms.showTumors.value = showTumors ? 1.0 : 0.0;
    }
  }, [opacity, threshold, showTumors]);

  const handleReset = () => {
    setRotation({ x: 0, y: 0 });
    setZoom(1);
    setOpacity([0.7]);
    setThreshold([30]);
  };

  const handleExport = () => {
    if (!rendererRef.current) return;
    
    const canvas = rendererRef.current.domElement;
    const link = document.createElement('a');
    link.download = 'lung-3d-view.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="w-full space-y-4">
      {/* Header with AI Analysis Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wind className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>3D Lung Visualization with AI Analysis</CardTitle>
                <CardDescription>
                  {lungData?.metadata?.studyDescription || 'Loading...'}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">CT Chest</Badge>
              <Badge variant={lungData?.metadata?.aiAnalysis?.lungRADS === '4A' ? 'destructive' : 'outline'}>
                Lung-RADS {lungData?.metadata?.aiAnalysis?.lungRADS || 'N/A'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        {/* AI Analysis Alert */}
        {lungData?.metadata?.aiAnalysis && (
          <CardContent>
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertTitle>AI Analysis Complete</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Algorithm:</span>
                    <span>{lungData.metadata.aiAnalysis.algorithm}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {lungData.metadata.aiAnalysis.processingTime}
                    </Badge>
                  </div>
                  <div className="font-medium text-orange-700">
                    Recommended Action: {lungData.metadata.aiAnalysis.recommendedAction}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Main 3D Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 3D Visualization */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <div className="relative bg-black" style={{ height: '600px' }}>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                  <div className="text-center text-white">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Loading lung volume with AI analysis...</p>
                  </div>
                </div>
              )}
              
              {error && (
                <Alert className="absolute top-4 left-4 right-4 z-10">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div ref={mountRef} className="w-full h-full" />

              {/* Overlay Controls */}
              <div className="absolute top-4 right-4 space-y-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
                  className="bg-white/10 hover:bg-white/20"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}
                  className="bg-white/10 hover:bg-white/20"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={handleReset}
                  className="bg-white/10 hover:bg-white/20"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={handleExport}
                  className="bg-white/10 hover:bg-white/20"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>

              {/* Toggle Controls */}
              <div className="absolute bottom-4 left-4 flex gap-2">
                <Button
                  size="sm"
                  variant={showLabels ? "default" : "secondary"}
                  onClick={() => setShowLabels(!showLabels)}
                  className="bg-white/10 hover:bg-white/20"
                >
                  <Tag className="h-4 w-4 mr-1" />
                  Organ Labels
                </Button>
                <Button
                  size="sm"
                  variant={showTumors ? "default" : "secondary"}
                  onClick={() => setShowTumors(!showTumors)}
                  className="bg-white/10 hover:bg-white/20"
                >
                  <Target className="h-4 w-4 mr-1" />
                  Show Tumors
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Side Panel with Organ List and Findings */}
        <div className="space-y-4">
          {/* Organ List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Segmented Organs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {lungData?.metadata?.organs?.map((organ: any) => (
                    <button
                      key={organ.name}
                      onClick={() => setSelectedOrgan(organ.name)}
                      className={`w-full text-left p-2 rounded-lg border transition-colors ${
                        selectedOrgan === organ.name 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: organ.color }}
                        />
                        <span className="text-sm font-medium">{organ.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Tumor Findings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Detected Abnormalities</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {lungData?.metadata?.annotations?.map((annotation: TumorAnnotation, idx: number) => (
                    <div key={idx} className="border rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{annotation.label}</span>
                        <Badge 
                          variant={
                            annotation.severity === 'high' ? 'destructive' : 
                            annotation.severity === 'moderate' ? 'default' : 'secondary'
                          }
                        >
                          {annotation.severity}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600">
                        <div>Type: {annotation.type}</div>
                        <div>Confidence: {(annotation.confidence * 100).toFixed(0)}%</div>
                        <div>Location: {annotation.location.join(', ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* AI Findings */}
          <Card>
            <CardHeader 
              className="cursor-pointer"
              onClick={() => setAiAnalysisExpanded(!aiAnalysisExpanded)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">AI Findings</CardTitle>
                <Info className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            {aiAnalysisExpanded && (
              <CardContent>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-2">
                    {lungData?.metadata?.aiAnalysis?.findings?.map((finding: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Activity className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-700">{finding}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Controls Panel */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="display">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="display" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Display Settings
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Advanced
              </TabsTrigger>
            </TabsList>

            <TabsContent value="display" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tissue Opacity</label>
                  <Slider
                    value={opacity}
                    onValueChange={setOpacity}
                    min={0}
                    max={1}
                    step={0.01}
                    className="mt-2"
                  />
                  <span className="text-xs text-gray-500">{(opacity[0] * 100).toFixed(0)}%</span>
                </div>

                <div>
                  <label className="text-sm font-medium">Density Threshold</label>
                  <Slider
                    value={threshold}
                    onValueChange={setThreshold}
                    min={0}
                    max={255}
                    step={1}
                    className="mt-2"
                  />
                  <span className="text-xs text-gray-500">HU: {threshold[0]}</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Rotation X</label>
                  <p className="text-xs text-gray-500">{rotation.x.toFixed(2)} rad</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Rotation Y</label>
                  <p className="text-xs text-gray-500">{rotation.y.toFixed(2)} rad</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Zoom Level</label>
                  <p className="text-xs text-gray-500">{(zoom * 100).toFixed(0)}%</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Volume Size</label>
                  <p className="text-xs text-gray-500">
                    {lungData ? `${lungData.dimensions[0]}×${lungData.dimensions[1]}×${lungData.dimensions[2]} voxels` : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Voxel Spacing</label>
                  <p className="text-xs text-gray-500">
                    {lungData ? `${lungData.spacing.join('×')} mm` : 'N/A'}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}