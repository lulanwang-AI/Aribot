import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Volume2, 
  Layers, 
  RotateCcw, 
  Download, 
  Share,
  Loader2,
  Box,
  Grid3X3,
  Eye,
  Settings2
} from 'lucide-react';
import Dicom3DViewer from '@/components/imaging/3d-dicom-viewer';
import MPRViewer from '@/components/imaging/mpr-viewer';

interface VolumeInfo {
  patientInfo: {
    name: string;
    id: string;
    studyDate: string;
    studyDescription: string;
  };
  seriesInfo: Array<{
    seriesInstanceUID: string;
    seriesDescription: string;
    modality: string;
    sliceCount: number;
    spacing: [number, number];
    sliceThickness: number;
  }>;
  volumeDimensions: [number, number, number];
  volumeSpacing: [number, number, number];
  volumeOrigin: [number, number, number];
}

interface DicomSlice {
  imageData: Uint8Array;
  width: number;
  height: number;
  sliceLocation: number;
}

export default function ThreeDViewer() {
  const [viewMode, setViewMode] = useState<'3d' | 'mpr'>('3d');
  const [selectedSeries, setSelectedSeries] = useState(0);
  const [dicomSlices, setDicomSlices] = useState<DicomSlice[]>([]);

  // Fetch volume information
  const { data: volumeInfo, isLoading: isLoadingVolume, error: volumeError } = useQuery<any>({
    queryKey: ['/api/dicom/3d/volume'],
    retry: 2
  });

  // Fetch volume data for 3D reconstruction
  const { data: volumeData, isLoading: isLoadingData } = useQuery<any>({
    queryKey: ['/api/dicom/3d/volume/data'],
    enabled: viewMode === '3d',
    retry: 2
  });

  // Load DICOM slices for MPR viewing
  useEffect(() => {
    if (volumeInfo && viewMode === 'mpr') {
      loadDicomSlices();
    }
  }, [volumeInfo, viewMode, selectedSeries]);

  const loadDicomSlices = async () => {
    if (!volumeInfo?.seriesInfo[selectedSeries]) return;

    const series = volumeInfo.seriesInfo[selectedSeries];
    const slices: DicomSlice[] = [];

    try {
      for (let i = 0; i < series.sliceCount; i++) {
        const response = await fetch(`/api/dicom/3d/slice/${selectedSeries}/${i}`);
        if (response.ok) {
          const sliceData = await response.json();
          slices.push({
            imageData: new Uint8Array(sliceData.imageData),
            width: sliceData.width,
            height: sliceData.height,
            sliceLocation: i * (series.sliceThickness || 1)
          });
        }
      }
      setDicomSlices(slices);
    } catch (error) {
      console.error('Error loading DICOM slices:', error);
    }
  };

  const convertVolumeDataToSlices = (): DicomSlice[] => {
    if (!volumeData || !volumeInfo) return [];

    const [width, height, depth] = volumeInfo.volumeDimensions;
    const data = new Uint16Array(
      Uint8Array.from(atob(volumeData.data), c => c.charCodeAt(0)).buffer
    );

    const slices: DicomSlice[] = [];
    
    for (let z = 0; z < depth; z++) {
      const sliceData = new Uint8Array(width * height);
      const offset = z * width * height;
      
      for (let i = 0; i < width * height; i++) {
        // Convert 16-bit to 8-bit with simple scaling
        sliceData[i] = Math.min(255, Math.max(0, data[offset + i] / 16));
      }

      slices.push({
        imageData: sliceData,
        width,
        height,
        sliceLocation: z * (volumeInfo.volumeSpacing[2] || 1)
      });
    }

    return slices;
  };

  const exportVolume = () => {
    if (!volumeData || !volumeInfo) return;
    
    const exportData = {
      patientInfo: volumeInfo.patientInfo,
      volumeDimensions: volumeInfo.volumeDimensions,
      volumeSpacing: volumeInfo.volumeSpacing,
      volumeOrigin: volumeInfo.volumeOrigin,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${volumeInfo.patientInfo.name.replace(/\s+/g, '_')}_3D_volume.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (volumeError) {
    return (
      <div className="p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            Failed to load 3D volume data. Please ensure DICOM files are available and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoadingVolume) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading 3D reconstruction data...</p>
        </div>
      </div>
    );
  }

  if (!volumeInfo) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>
            No 3D volume data available. Please upload DICOM files first.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const slicesForViewing = viewMode === '3d' ? 
    convertVolumeDataToSlices() : 
    dicomSlices;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">3D Medical Imaging Viewer</h1>
            <p className="text-gray-600">
              {volumeInfo.patientInfo.name} • {volumeInfo.patientInfo.studyDescription}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* View Mode Selector */}
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as '3d' | 'mpr')}>
              <TabsList>
                <TabsTrigger value="3d" className="flex items-center gap-2">
                  <Box className="w-4 h-4" />
                  3D Volume
                </TabsTrigger>
                <TabsTrigger value="mpr" className="flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4" />
                  MPR Views
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Action Buttons */}
            <Button
              variant="outline"
              onClick={exportVolume}
              disabled={!volumeData}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2"
            >
              <Share className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>

        {/* Volume Information */}
        <div className="flex gap-4 mt-4">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Volume2 className="w-3 h-3 mr-1" />
            {volumeInfo.volumeDimensions.join(' × ')} voxels
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Layers className="w-3 h-3 mr-1" />
            {volumeInfo.seriesInfo[selectedSeries]?.sliceCount || 0} slices
          </Badge>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            <Eye className="w-3 h-3 mr-1" />
            {volumeInfo.volumeSpacing.map((s: any) => s.toFixed(2)).join(' × ')} mm spacing
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Viewer Area */}
        <div className="flex-1">
          {viewMode === '3d' ? (
            isLoadingData ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p>Loading 3D volume data...</p>
                </div>
              </div>
            ) : (
              <Dicom3DViewer
                dicomSeries={slicesForViewing}
                patientName={volumeInfo.patientInfo.name}
                studyDescription={volumeInfo.patientInfo.studyDescription}
              />
            )
          ) : (
            <MPRViewer
              dicomSeries={slicesForViewing}
              patientName={volumeInfo.patientInfo.name}
              studyDescription={volumeInfo.patientInfo.studyDescription}
            />
          )}
        </div>

        {/* Side Panel */}
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="w-5 h-5" />
                Study Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">Patient Details</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="text-gray-500">Name:</span> {volumeInfo.patientInfo.name}</div>
                  <div><span className="text-gray-500">ID:</span> {volumeInfo.patientInfo.id}</div>
                  <div><span className="text-gray-500">Study Date:</span> {volumeInfo.patientInfo.studyDate}</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">Series Information</h4>
                <div className="space-y-2">
                  {volumeInfo.seriesInfo.map((series: any, index: number) => (
                    <Card 
                      key={index}
                      className={`cursor-pointer transition-colors ${
                        selectedSeries === index ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedSeries(index)}
                    >
                      <CardContent className="p-3">
                        <div className="text-sm">
                          <div className="font-medium">{series.seriesDescription}</div>
                          <div className="text-gray-500">{series.modality} • {series.sliceCount} slices</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {series.spacing.map((s: any) => s.toFixed(2)).join(' × ')}mm spacing
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">Volume Properties</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="text-gray-500">Dimensions:</span> {volumeInfo.volumeDimensions.join(' × ')}</div>
                  <div><span className="text-gray-500">Spacing:</span> {volumeInfo.volumeSpacing.map((s: any) => s.toFixed(2)).join(' × ')} mm</div>
                  <div><span className="text-gray-500">Origin:</span> {volumeInfo.volumeOrigin.map((o: any) => o.toFixed(1)).join(', ')}</div>
                </div>
              </div>

              {viewMode === '3d' && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 mb-2">3D Controls</h4>
                  <div className="space-y-2 text-xs text-gray-600">
                    <div>• Click and drag to rotate volume</div>
                    <div>• Scroll to zoom in/out</div>
                    <div>• Use control panel to adjust rendering</div>
                    <div>• Toggle between render modes</div>
                  </div>
                </div>
              )}

              {viewMode === 'mpr' && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 mb-2">MPR Controls</h4>
                  <div className="space-y-2 text-xs text-gray-600">
                    <div>• Click on any view to reposition crosshairs</div>
                    <div>• Use slice navigator to change position</div>
                    <div>• Adjust window/level for optimal contrast</div>
                    <div>• Toggle crosshairs on/off</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}