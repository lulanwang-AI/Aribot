import DicomUpload from "@/components/dicom/dicom-upload";
import SampleDicomViewer from "@/components/dicom/sample-dicom-viewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileImage, Upload, Database, Brain, Box, Wind, Bot } from "lucide-react";
import Lung3DViewer from "@/components/imaging/lung-3d-viewer";
import MedicalAIChat from "@/components/ai/medical-ai-chat";

export default function DicomManager() {
  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">AI Diagnostics</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">20</span> sample images ·{" "}
          <span className="font-semibold text-foreground">1.1 MB</span> DICOM data ·{" "}
          <span className="font-semibold text-foreground">CT</span> modality
        </p>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="ai-assistant" className="space-y-4">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="ai-assistant" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="sample" className="flex items-center gap-2">
            <FileImage className="h-4 w-4" />
            Sample Data
          </TabsTrigger>
          <TabsTrigger value="3d-viewer" className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            3D Viewer
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-assistant" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-600" />
                  AI Medical Imaging Assistant
                </CardTitle>
                <CardDescription>
                  Chat with our AI assistant to analyze DICOM images, get diagnostic insights, and receive clinical recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[600px]">
                <MedicalAIChat />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sample" className="space-y-4">
          <SampleDicomViewer />
        </TabsContent>

        <TabsContent value="3d-viewer" className="space-y-4">
          <Lung3DViewer />
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload DICOM Files</CardTitle>
              <CardDescription>
                Upload medical imaging files in DICOM format for processing and analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DicomUpload />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}