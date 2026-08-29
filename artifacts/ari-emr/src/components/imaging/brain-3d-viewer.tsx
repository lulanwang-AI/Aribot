import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Brain,
  Settings, 
  Eye,
  Loader2,
  Download,
  Maximize2,
  Grid3X3
} from 'lucide-react';

export default function Brain3DViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const volumeRef = useRef<THREE.Mesh>(null);
  const frameRef = useRef<number>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'volume' | 'slice'>('volume');
  const [opacity, setOpacity] = useState([0.8]);
  const [threshold, setThreshold] = useState([100]);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [brainData, setBrainData] = useState<any>(null);

  // Load sample brain data
  useEffect(() => {
    const loadBrainData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/dicom/3d/sample-brain');
        if (!response.ok) {
          throw new Error('Failed to load brain data');
        }
        
        const data = await response.json();
        setBrainData(data);
        
        // Decode base64 volume data
        const binaryString = atob(data.data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        data.volumeArray = bytes;
        setBrainData(data);
        
      } catch (err) {
        console.error('Error loading brain data:', err);
        setError('Failed to load brain visualization data');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadBrainData();
  }, []);

  // Initialize 3D scene
  useEffect(() => {
    if (!mountRef.current || !brainData || !brainData.volumeArray) return;

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
    camera.position.set(0, 0, 400);
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    scene.add(directionalLight);

    // Create volume texture from brain data
    const [width, height, depth] = brainData.dimensions;
    const texture = new THREE.Data3DTexture(
      brainData.volumeArray,
      width,
      height,
      depth
    );
    texture.format = THREE.RedFormat;
    texture.type = THREE.UnsignedByteType;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    // Volume rendering shader
    const volumeShader = {
      uniforms: {
        volume: { value: texture },
        opacity: { value: opacity[0] },
        threshold: { value: threshold[0] / 255 },
        steps: { value: 100 },
        alphaCorrection: { value: 0.02 }
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
              vec3 color = vec3(1.0, 0.9, 0.8) * sample;
              float alpha = sample * opacity * alphaCorrection;
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
      brainData.dimensions[0] * brainData.spacing[0] / 100,
      brainData.dimensions[1] * brainData.spacing[1] / 100,
      brainData.dimensions[2] * brainData.spacing[2] / 100
    );
    const material = new THREE.ShaderMaterial(volumeShader);
    const volume = new THREE.Mesh(geometry, material);
    scene.add(volume);
    volumeRef.current = volume;

    // Add coordinate axes helper
    const axesHelper = new THREE.AxesHelper(200);
    scene.add(axesHelper);

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      if (volumeRef.current) {
        volumeRef.current.rotation.x = rotation.x;
        volumeRef.current.rotation.y = rotation.y;
      }
      
      if (cameraRef.current) {
        const distance = 400 / zoom;
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
  }, [brainData, opacity, threshold, zoom, rotation]);

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
    }
  }, [opacity, threshold]);

  const handleReset = () => {
    setRotation({ x: 0, y: 0 });
    setZoom(1);
    setOpacity([0.8]);
    setThreshold([100]);
  };

  const handleExport = () => {
    if (!rendererRef.current) return;
    
    const canvas = rendererRef.current.domElement;
    const link = document.createElement('a');
    link.download = 'brain-3d-view.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold">3D Brain Visualization</h3>
            <p className="text-sm text-gray-500">
              {brainData?.metadata?.studyDescription || 'Loading...'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">MRI</Badge>
          <Badge variant="outline">T1-Weighted</Badge>
        </div>
      </div>

      {/* Main Viewer */}
      <Card className="overflow-hidden">
        <div className="relative bg-black" style={{ height: '600px' }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Loading brain volume...</p>
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

          {/* View Mode Selector */}
          <div className="absolute bottom-4 left-4">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList className="bg-white/10">
                <TabsTrigger value="volume">Volume</TabsTrigger>
                <TabsTrigger value="slice">Slices</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </Card>

      {/* Controls Panel */}
      <Card className="p-4">
        <Tabs defaultValue="display">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="display" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Display
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="display" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Opacity</label>
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
              <label className="text-sm font-medium">Threshold</label>
              <Slider
                value={threshold}
                onValueChange={setThreshold}
                min={0}
                max={255}
                step={1}
                className="mt-2"
              />
              <span className="text-xs text-gray-500">{threshold[0]}</span>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="text-sm font-medium">Volume Size</label>
                <p className="text-xs text-gray-500">
                  {brainData ? `${brainData.dimensions[0]}×${brainData.dimensions[1]}×${brainData.dimensions[2]}` : 'N/A'}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}