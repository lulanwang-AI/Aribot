import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AiOverlayViewer from "./ai-overlay-viewer";
import { 
  FileImage, 
  Download, 
  Eye, 
  Layers, 
  Brain,
  Info,
  ChevronRight,
  Image,
  Zap
} from "lucide-react";

interface SampleDicomFile {
  filename: string;
  path: string;
  size: number;
  metadata?: {
    patientName?: string;
    patientId?: string;
    studyDescription?: string;
    studyDate?: string;
    modality?: string;
    seriesDescription?: string;
    instanceNumber?: number;
    sliceLocation?: number;
  };
}

export default function SampleDicomViewer() {
  const [selectedFile, setSelectedFile] = useState<SampleDicomFile | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showAiViewer, setShowAiViewer] = useState(false);

  const { data: sampleFiles, isLoading } = useQuery<SampleDicomFile[]>({
    queryKey: ['/api/dicom/sample-files']
  });

  const { data: studies } = useQuery<any[]>({
    queryKey: ['/api/dicom/sample-studies']
  });

  const formatFileSize = (bytes: number) => {
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${month}/${day}/${year}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sample DICOM Series</h2>
          <p className="text-gray-600 mt-1">
            20 real CT scan images available for testing
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <Layers className="h-4 w-4 mr-1" />
            List View
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Image className="h-4 w-4 mr-1" />
            Grid View
          </Button>
        </div>
      </div>

      {/* Study Information */}
      {studies && studies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Study Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Patient</p>
                <p className="font-medium">{studies[0].patientName || 'Anonymous'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Patient ID</p>
                <p className="font-medium">{studies[0].patientId || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Modality</p>
                <Badge variant="outline">{studies[0].modality || 'CT'}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Study Date</p>
                <p className="font-medium">{formatDate(studies[0].studyDate)}</p>
              </div>
            </div>
            {studies[0].series && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500 mb-2">Series Information</p>
                <div className="space-y-2">
                  {studies[0].series.map((series: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Series {series.seriesNumber}</Badge>
                        <span className="text-sm">{series.seriesDescription}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {series.instanceCount} images
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Files Display */}
      {viewMode === 'list' ? (
        <Card>
          <CardHeader>
            <CardTitle>DICOM Files</CardTitle>
            <CardDescription>
              {sampleFiles?.length || 0} DICOM images in this series
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {sampleFiles?.map((file, index) => (
                  <div
                    key={file.filename}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedFile?.filename === file.filename
                        ? 'bg-blue-50 border-blue-300'
                        : 'hover:bg-gray-50 border-gray-200'
                    }`}
                    onClick={() => setSelectedFile(file)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileImage className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">
                            Image {file.metadata?.instanceNumber || index + 1}
                          </p>
                          <p className="text-sm text-gray-500">
                            {file.filename} • {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {file.metadata?.sliceLocation && (
                          <span className="text-xs text-gray-500">
                            Slice: {file.metadata.sliceLocation.toFixed(1)}mm
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Image Grid</CardTitle>
            <CardDescription>
              Click on any image to view details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
              {sampleFiles?.map((file, index) => (
                <div
                  key={file.filename}
                  className={`relative aspect-square rounded border-2 transition-all cursor-pointer ${
                    selectedFile?.filename === file.filename
                      ? 'border-blue-500 shadow-lg scale-105'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                  onClick={() => setSelectedFile(file)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 rounded"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileImage className="h-8 w-8 text-white opacity-50" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center rounded-b">
                    #{file.metadata?.instanceNumber || index + 1}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected File Details */}
      {selectedFile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Selected Image Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Filename</p>
                <p className="font-medium">{selectedFile.filename}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">File Size</p>
                <p className="font-medium">{formatFileSize(selectedFile.size)}</p>
              </div>
              {selectedFile.metadata && (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Instance Number</p>
                    <p className="font-medium">{selectedFile.metadata.instanceNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Slice Location</p>
                    <p className="font-medium">
                      {selectedFile.metadata.sliceLocation 
                        ? `${selectedFile.metadata.sliceLocation.toFixed(2)} mm`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Modality</p>
                    <Badge variant="outline">{selectedFile.metadata.modality || 'CT'}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Series Description</p>
                    <p className="font-medium text-sm">
                      {selectedFile.metadata.seriesDescription || 'N/A'}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => setShowAiViewer(true)}>
                <Zap className="h-4 w-4 mr-1" />
                Open AI Analysis
              </Button>
              <Button size="sm" variant="outline">
                <Eye className="h-4 w-4 mr-1" />
                View in DICOM Viewer
              </Button>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          These are real DICOM files from a CT scan series. They can be used to test the DICOM viewer, 
          AI analysis modules, and other medical imaging features. All patient information has been anonymized.
        </AlertDescription>
      </Alert>

      {/* AI Viewer Dialog */}
      <Dialog open={showAiViewer} onOpenChange={setShowAiViewer}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI-Powered Medical Image Analysis
            </DialogTitle>
          </DialogHeader>
          <AiOverlayViewer imageUrl={selectedFile?.path} />
        </DialogContent>
      </Dialog>
    </div>
  );
}