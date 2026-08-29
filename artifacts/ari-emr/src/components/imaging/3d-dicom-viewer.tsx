import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Move3D, 
  Settings, 
  Eye, 
  Palette,
  Volume2,
  Layers,
  Target,
  Maximize2
} from 'lucide-react';

interface DicomSlice {
  imageData: Uint8Array;
  width: number;
  height: number;
  sliceLocation: number;
}

interface Dicom3DViewerProps {
  dicomSeries: DicomSlice[];
  patientName?: string;
  studyDescription?: string;
  onMeasurement?: (measurement: any) => void;
}

export default function Dicom3DViewer({ 
  dicomSeries, 
  patientName = "Unknown Patient",
  studyDescription = "CT Study",
  onMeasurement 
}: Dicom3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const volumeRef = useRef<THREE.Mesh>(null);
  const controlsRef = useRef<any>(null);
  
  const [renderMode, setRenderMode] = useState<'volume' | 'mpr' | 'surface'>('volume');
  const [windowLevel, setWindowLevel] = useState([50]);
  const [windowWidth, setWindowWidth] = useState([350]);
  const [threshold, setThreshold] = useState([100]);
  const [opacity, setOpacity] = useState([0.8]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewPlane, setViewPlane] = useState<'axial' | 'sagittal' | 'coronal'>('axial');

  // Initialize 3D scene
  useEffect(() => {
    if (!mountRef.current || !dicomSeries.length) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 0, 300);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create volume from DICOM series
    createVolumeFromDicom();

    // Add mouse controls
    addMouseControls();

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (mountRef.current && camera && renderer) {
        camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [dicomSeries]);

  const createVolumeFromDicom = async () => {
    setIsLoading(true);
    
    if (!dicomSeries.length || !sceneRef.current) return;

    try {
      // Sort slices by location
      const sortedSlices = [...dicomSeries].sort((a, b) => a.sliceLocation - b.sliceLocation);
      
      const width = sortedSlices[0].width;
      const height = sortedSlices[0].height;
      const depth = sortedSlices.length;

      // Create 3D texture data
      const volumeData = new Uint8Array(width * height * depth);
      
      sortedSlices.forEach((slice, index) => {
        const sliceOffset = index * width * height;
        volumeData.set(slice.imageData, sliceOffset);
      });

      // Create 3D texture
      const texture = new THREE.Data3DTexture(volumeData, width, height, depth);
      texture.format = THREE.RedFormat;
      texture.type = THREE.UnsignedByteType;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.unpackAlignment = 1;
      texture.needsUpdate = true;

      // Volume rendering shader
      const vertexShader = `
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          vPosition = position;
          vNormal = normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;

      const fragmentShader = `
        uniform sampler3D volumeTexture;
        uniform float threshold;
        uniform float opacity;
        uniform float windowLevel;
        uniform float windowWidth;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          vec3 coord = (vPosition + 1.0) / 2.0;
          float intensity = texture(volumeTexture, coord).r;
          
          // Apply window/level
          float windowed = (intensity - (windowLevel - windowWidth/2.0)) / windowWidth;
          windowed = clamp(windowed, 0.0, 1.0);
          
          if (windowed < threshold) discard;
          
          vec3 color = vec3(windowed);
          gl_FragColor = vec4(color, opacity * windowed);
        }
      `;

      // Create volume material
      const material = new THREE.ShaderMaterial({
        uniforms: {
          volumeTexture: { value: texture },
          threshold: { value: threshold[0] / 255.0 },
          opacity: { value: opacity[0] },
          windowLevel: { value: windowLevel[0] / 255.0 },
          windowWidth: { value: windowWidth[0] / 255.0 }
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide
      });

      // Create volume geometry
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const volume = new THREE.Mesh(geometry, material);
      
      // Scale to reasonable size
      const scale = 200 / Math.max(width, height, depth);
      volume.scale.setScalar(scale);
      
      volumeRef.current = volume;
      sceneRef.current.add(volume);

      setIsLoading(false);
    } catch (error) {
      console.error('Error creating 3D volume:', error);
      setIsLoading(false);
    }
  };

  const addMouseControls = () => {
    // Simple orbit controls implementation
    let isRotating = false;
    let previousMousePosition = { x: 0, y: 0 };

    const handleMouseDown = (event: MouseEvent) => {
      isRotating = true;
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isRotating || !volumeRef.current) return;

      const deltaX = event.clientX - previousMousePosition.x;
      const deltaY = event.clientY - previousMousePosition.y;

      volumeRef.current.rotation.y += deltaX * 0.01;
      volumeRef.current.rotation.x += deltaY * 0.01;

      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const handleMouseUp = () => {
      isRotating = false;
    };

    const handleWheel = (event: WheelEvent) => {
      if (!cameraRef.current) return;
      
      const delta = event.deltaY;
      cameraRef.current.position.z += delta * 0.1;
      cameraRef.current.position.z = Math.max(50, Math.min(1000, cameraRef.current.position.z));
    };

    if (rendererRef.current) {
      const canvas = rendererRef.current.domElement;
      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('wheel', handleWheel);
    }
  };

  // Update shader uniforms when controls change
  useEffect(() => {
    if (volumeRef.current && volumeRef.current.material) {
      const material = volumeRef.current.material as THREE.ShaderMaterial;
      material.uniforms.threshold.value = threshold[0] / 255.0;
      material.uniforms.opacity.value = opacity[0];
      material.uniforms.windowLevel.value = windowLevel[0] / 255.0;
      material.uniforms.windowWidth.value = windowWidth[0] / 255.0;
    }
  }, [threshold, opacity, windowLevel, windowWidth]);

  const resetView = () => {
    if (cameraRef.current && volumeRef.current) {
      cameraRef.current.position.set(0, 0, 300);
      volumeRef.current.rotation.set(0, 0, 0);
    }
  };

  const changeRenderMode = (mode: 'volume' | 'mpr' | 'surface') => {
    setRenderMode(mode);
    // Implementation for different render modes would go here
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="bg-gray-900 text-white p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{patientName}</h3>
            <p className="text-sm text-gray-300">{studyDescription} • 3D Reconstruction</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-blue-900 text-blue-200">
              3D Volume
            </Badge>
            <Badge variant="secondary" className="bg-green-900 text-green-200">
              {dicomSeries.length} Slices
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* 3D Viewport */}
        <div className="flex-1 relative">
          <div ref={mountRef} className="w-full h-full" />
          
          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-white">Loading 3D reconstruction...</div>
            </div>
          )}

          {/* Viewport Controls */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={resetView}
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>

          {/* Render Mode Selector */}
          <div className="absolute top-4 right-4">
            <Tabs value={renderMode} onValueChange={(value) => changeRenderMode(value as any)}>
              <TabsList className="bg-gray-800">
                <TabsTrigger value="volume">Volume</TabsTrigger>
                <TabsTrigger value="mpr">MPR</TabsTrigger>
                <TabsTrigger value="surface">Surface</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Control Panel */}
        <div className="w-80 bg-gray-900 text-white p-4 border-l border-gray-700 overflow-y-auto">
          <Tabs defaultValue="rendering" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800">
              <TabsTrigger value="rendering">
                <Volume2 className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="windowing">
                <Eye className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="analysis">
                <Target className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rendering" className="space-y-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Rendering
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Threshold</label>
                    <Slider
                      value={threshold}
                      onValueChange={setThreshold}
                      max={255}
                      step={1}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-400 mt-1">{threshold[0]}</div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Opacity</label>
                    <Slider
                      value={opacity}
                      onValueChange={setOpacity}
                      max={1}
                      step={0.01}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-400 mt-1">{(opacity[0] * 100).toFixed(0)}%</div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="windowing" className="space-y-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Window/Level
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Window Level</label>
                    <Slider
                      value={windowLevel}
                      onValueChange={setWindowLevel}
                      max={255}
                      step={1}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-400 mt-1">{windowLevel[0]}</div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Window Width</label>
                    <Slider
                      value={windowWidth}
                      onValueChange={setWindowWidth}
                      max={500}
                      step={1}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-400 mt-1">{windowWidth[0]}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setWindowLevel([40]);
                        setWindowWidth([400]);
                      }}
                      className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
                    >
                      Soft Tissue
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setWindowLevel([300]);
                        setWindowWidth([1500]);
                      }}
                      className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
                    >
                      Bone
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Multiplanar Reconstruction
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant={viewPlane === 'axial' ? 'default' : 'outline'}
                      onClick={() => setViewPlane('axial')}
                      className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
                    >
                      Axial
                    </Button>
                    <Button
                      size="sm"
                      variant={viewPlane === 'sagittal' ? 'default' : 'outline'}
                      onClick={() => setViewPlane('sagittal')}
                      className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
                    >
                      Sagittal
                    </Button>
                    <Button
                      size="sm"
                      variant={viewPlane === 'coronal' ? 'default' : 'outline'}
                      onClick={() => setViewPlane('coronal')}
                      className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
                    >
                      Coronal
                    </Button>
                  </div>

                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => {}}
                  >
                    <Maximize2 className="w-4 h-4 mr-2" />
                    Export 3D Model
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}