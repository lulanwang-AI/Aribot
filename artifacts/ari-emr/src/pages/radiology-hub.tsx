import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PACSWorklist from "@/components/worklist/pacs-worklist";
import CommunicationPanel from "@/components/care-team/communication-panel";
import AIWidget from "@/components/ai/ai-widget";
import { 
  Brain,
  Users,
  FileImage,
  Activity,
  Settings,
  Maximize2,
  Grid,
  Minimize2
} from "lucide-react";

export default function RadiologyHub() {
  const [layout, setLayout] = useState<"grid" | "tab">("tab");
  const [activeTab, setActiveTab] = useState("worklist");

  return (
    <div className="min-h-full lg:h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Radiology Connected Care Hub</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 rounded-lg p-1 flex">
              <Button
                variant={layout === "tab" ? "default" : "ghost"}
                size="sm"
                onClick={() => setLayout("tab")}
                className="rounded"
              >
                <Maximize2 className="w-4 h-4 mr-1" />
                Tab View
              </Button>
              <Button
                variant={layout === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setLayout("grid")}
                className="rounded"
              >
                <Grid className="w-4 h-4 mr-1" />
                Grid View
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:overflow-hidden">
        {layout === "grid" ? (
          // Grid Layout with better spacing
          <div className="p-4 sm:p-6 lg:h-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-full">
              {/* PACS Worklist - Left Panel */}
              <div className="lg:col-span-5 lg:h-full flex flex-col">
                <div className="mb-3">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FileImage className="w-5 h-5 text-blue-600" />
                    PACS Worklist
                  </h2>
                  <p className="text-sm text-gray-600">Study queue and prioritization</p>
                </div>
                <div className="flex-1 overflow-auto bg-white rounded-lg shadow-sm">
                  <PACSWorklist />
                </div>
              </div>

              {/* AI Widget - Center Panel */}
              <div className="lg:col-span-4 lg:h-full flex flex-col">
                <div className="mb-3">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    AI Analysis Engine
                  </h2>
                  <p className="text-sm text-gray-600">Multi-algorithm detection system</p>
                </div>
                <div className="flex-1 overflow-auto">
                  <AIWidget />
                </div>
              </div>

              {/* Communication Panel - Right Panel */}
              <div className="lg:col-span-3 lg:h-full flex flex-col">
                <div className="mb-3">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    Care Team
                  </h2>
                  <p className="text-sm text-gray-600">Alerts & communication</p>
                </div>
                <Card className="flex-1 overflow-hidden">
                  <CardContent className="p-4 h-full">
                    <CommunicationPanel />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          // Tab Layout with better organization
          <div className="p-4 sm:p-6 lg:h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="lg:h-full flex flex-col">
              <div className="bg-white rounded-lg shadow-sm p-1 mb-6">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 bg-gray-100 h-auto">
                  <TabsTrigger value="worklist" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <FileImage className="w-4 h-4" />
                    PACS Worklist
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <Brain className="w-4 h-4" />
                    AI Analysis
                  </TabsTrigger>
                  <TabsTrigger value="communication" className="flex items-center gap-2 data-[state=active]:bg-white">
                    <Users className="w-4 h-4" />
                    Care Team
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="worklist" className="flex-1 overflow-hidden">
                <div className="h-full bg-white rounded-lg shadow-sm">
                  <PACSWorklist />
                </div>
              </TabsContent>

              <TabsContent value="ai" className="flex-1 overflow-hidden">
                <div className="max-w-5xl mx-auto h-full">
                  <div className="bg-white rounded-lg shadow-sm p-6 h-full">
                    <div className="mb-4">
                      <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <Brain className="w-6 h-6 text-purple-600" />
                        AI Analysis Engine
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">Comprehensive multi-algorithm detection system</p>
                    </div>
                    <AIWidget />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="communication" className="flex-1 overflow-hidden">
                <div className="max-w-4xl mx-auto h-full">
                  <div className="bg-white rounded-lg shadow-sm p-6 h-full">
                    <div className="mb-4">
                      <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <Users className="w-6 h-6 text-green-600" />
                        Care Team Coordination
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">Real-time alerts, messaging, and team collaboration</p>
                    </div>
                    <CommunicationPanel />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 text-white px-6 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span>System Status: <span className="text-green-400">Online</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-400" />
            <span>AI Engines: <span className="text-blue-400">4 Active</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-yellow-400" />
            <span>Care Team: <span className="text-yellow-400">5 Members Online</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Integration Status:</span>
          <span className="text-green-400">✓ EHR</span>
          <span className="text-green-400">✓ PACS</span>
          <span className="text-green-400">✓ Scheduling</span>
        </div>
      </div>
    </div>
  );
}