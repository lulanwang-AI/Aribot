import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  FolderOpen,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Activity,
  Database,
  Stethoscope,
  Brain,
  Heart,
  Zap
} from "lucide-react";

interface DicomFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  metadata?: any;
  error?: string;
}

interface DicomStudy {
  studyInstanceUID: string;
  studyDescription: string;
  studyDate: string;
  patientName: string;
  patientId: string;
  series: DicomSeries[];
}

interface DicomSeries {
  seriesInstanceUID: string;
  seriesDescription: string;
  modality: string;
  seriesNumber: number;
  instanceCount?: number;
}

export default function DicomUpload() {
  const [selectedFiles, setSelectedFiles] = useState<DicomFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingResults, setProcessingResults] = useState<DicomStudy[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('dicomFiles', file);
      });

      const response = await fetch('/api/dicom/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (data: any) => {
      setProcessingResults(data.studies || []);
      setSelectedFiles(prev => 
        prev.map(file => ({ ...file, status: 'success', progress: 100 }))
      );
      toast({
        title: "Upload Successful",
        description: `Processed ${data.filesProcessed} DICOM files successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dicom/studies'] });
    },
    onError: (error: Error) => {
      setSelectedFiles(prev => 
        prev.map(file => ({ ...file, status: 'error', error: error.message }))
      );
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const parseMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('dicomFile', file);

      const response = await fetch('/api/dicom/parse', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Parse failed: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (data: any, file: File) => {
      setSelectedFiles(prev =>
        prev.map(f => 
          f.id === (file as any).id 
            ? { ...f, metadata: data.metadata, status: 'success' }
            : f
        )
      );
    }
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles: DicomFile[] = Array.from(files).map(file => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      progress: 0
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);

    // Auto-parse each file to extract metadata
    newFiles.forEach(dicomFile => {
      if (dicomFile.file.name.toLowerCase().includes('.dcm') || 
          dicomFile.file.type === 'application/dicom') {
        parseMutation.mutate(dicomFile.file as any);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setSelectedFiles(prev => 
      prev.map(file => ({ ...file, status: 'uploading', progress: 0 }))
    );

    const files = selectedFiles.map(f => f.file);
    uploadMutation.mutate(files);
  };

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== id));
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setProcessingResults([]);
  };

  const getModalityIcon = (modality: string) => {
    switch (modality?.toUpperCase()) {
      case 'CT': return <Database className="w-4 h-4 text-blue-500" />;
      case 'MR': case 'MRI': return <Brain className="w-4 h-4 text-purple-500" />;
      case 'US': return <Heart className="w-4 h-4 text-green-500" />;
      case 'XR': case 'DX': return <Zap className="w-4 h-4 text-yellow-500" />;
      default: return <Stethoscope className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: DicomFile['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'uploading': case 'processing': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              DICOM File Manager
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Upload, parse, and process DICOM medical imaging files
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Activity className="w-3 h-3 mr-1" />
              Real DICOM Processing
            </Badge>
          </div>
        </div>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="w-5 h-5 mr-2" />
              Upload DICOM Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Drop DICOM files here or click to browse
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Supports .dcm files and DICOM format images (up to 500MB per file)
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".dcm,.dicom,application/dicom"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              
              <div className="flex justify-center space-x-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Browse Files
                </Button>
                
                {selectedFiles.length > 0 && (
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {uploadMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Selected Files ({selectedFiles.length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={clearAll}>
                <Trash2 className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {selectedFiles.map((dicomFile) => (
                    <div
                      key={dicomFile.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        {getStatusIcon(dicomFile.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {dicomFile.file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(dicomFile.file.size)}
                            {dicomFile.metadata && (
                              <>
                                {' • '}
                                {dicomFile.metadata.modality || 'Unknown modality'}
                                {dicomFile.metadata.patientName && (
                                  <> • {dicomFile.metadata.patientName}</>
                                )}
                              </>
                            )}
                          </p>
                          {dicomFile.error && (
                            <p className="text-xs text-red-500 mt-1">{dicomFile.error}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {dicomFile.metadata?.modality && (
                          <Badge variant="secondary" className="text-xs">
                            {getModalityIcon(dicomFile.metadata.modality)}
                            <span className="ml-1">{dicomFile.metadata.modality}</span>
                          </Badge>
                        )}
                        
                        {dicomFile.status === 'uploading' && (
                          <div className="w-20">
                            <Progress value={dicomFile.progress} className="h-2" />
                          </div>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(dicomFile.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Processing Results */}
        {processingResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                Processing Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {processingResults.map((study) => (
                  <div key={study.studyInstanceUID} className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {study.studyDescription}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Patient: {study.patientName} ({study.patientId}) • {study.studyDate}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View Study
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {study.series.map((series) => (
                        <div key={series.seriesInstanceUID} className="bg-white dark:bg-gray-800 rounded p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            {getModalityIcon(series.modality)}
                            <span className="text-sm font-medium">{series.seriesDescription}</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Series {series.seriesNumber} • {series.modality}
                            {series.instanceCount && <> • {series.instanceCount} images</>}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Supported File Types</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• DICOM files (.dcm, .dicom)</li>
                  <li>• Application/dicom MIME type</li>
                  <li>• Up to 500MB per file</li>
                  <li>• Maximum 100 files per upload</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Processing Features</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Automatic metadata extraction</li>
                  <li>• Study and series organization</li>
                  <li>• Patient information parsing</li>
                  <li>• HIPAA-compliant audit logging</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}