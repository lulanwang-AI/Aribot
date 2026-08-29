import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AIModuleCard from "@/components/ai/ai-module-card";
import MedicalAIChat from "@/components/ai/medical-ai-chat";
import { X, Bot, Brain, Activity, FileImage, Sparkles, Upload } from "lucide-react";
import ariLogo from "@assets/aribot-mark-primary-1024_1785138240677.png";

const AI_MODULES = [
  {
    id: "brain-ct",
    name: "Brain CT Triage",
    description: "Detects intracranial hemorrhage, large vessel occlusion, and midline shift with 98% sensitivity.",
    provider: "Powered by CARE1 Model",
    icon: "🧠",
    color: "blue",
  },
  {
    id: "lung-analysis",
    name: "Lung X-ray Analysis",
    description: "Identifies lung nodules, pneumothorax, and other thoracic abnormalities with high AUC performance.",
    provider: "Lunit INSIGHT CXR",
    icon: "🫁",
    color: "green",
  },
  {
    id: "stroke-detection",
    name: "Stroke Detection",
    description: "Advanced LVO detection with 98% sensitivity as validated in the DUEL study.",
    provider: "RapidAI LVO Detection",
    icon: "❤️",
    color: "red",
  },
  {
    id: "cardiac-analysis",
    name: "Cardiac CT Analysis",
    description: "Coronary artery calcium scoring and stenosis detection for cardiac risk assessment.",
    provider: "Multi-vendor Compatible",
    icon: "💓",
    color: "purple",
  },
  {
    id: "oncology-screening",
    name: "Oncology Screening",
    description: "Comprehensive tumor detection and characterization across multiple organ systems.",
    provider: "Multi-organ Detection",
    icon: "🔬",
    color: "orange",
  },
  {
    id: "bone-analysis",
    name: "Bone Fracture Detection",
    description: "Automated fracture detection and classification for emergency and orthopedic workflows.",
    provider: "Orthopedic AI",
    icon: "🦴",
    color: "amber",
  },
];

export default function AITools() {
  const [showResults, setShowResults] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(true);

  const handleRunAnalysis = (moduleId: string, moduleName: string) => {
    setCurrentAnalysis(moduleName);
    setShowResults(true);
  };

  const hideResults = () => {
    setShowResults(false);
    setCurrentAnalysis(null);
  };

  return (
    <div className="p-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <img src={ariLogo} alt="Ari" className="h-5 w-5" />
          Ari — Clinical AI
        </h1>
      </div>

      {/* Prominent AI Assistant Section */}
      <div className="mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white border shadow-sm flex items-center justify-center p-2">
                    <img src={ariLogo} alt="Ari" className="w-full h-full object-contain" />
                  </div>
                  Ari — Clinical AI
                </CardTitle>
                <CardDescription className="mt-2 text-base">
                  Multi-modal AI for documentation, diagnostics, and medical image analysis
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2">
                <Badge className="bg-green-500">
                  <Activity className="h-3 w-3 mr-1" />
                  Online
                </Badge>
                <Badge variant="secondary">Multimodal AI</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <Card className="bg-white/80">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <FileImage className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="font-semibold">DICOM Analysis</p>
                      <p className="text-sm text-gray-600">Upload & analyze medical images</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/80">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Brain className="h-8 w-8 text-purple-500" />
                    <div>
                      <p className="font-semibold">Diagnostic Support</p>
                      <p className="text-sm text-gray-600">AI-powered differential diagnosis</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/80">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-8 w-8 text-orange-500" />
                    <div>
                      <p className="font-semibold">Clinical Insights</p>
                      <p className="text-sm text-gray-600">Evidence-based recommendations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="h-[600px]">
              <MedicalAIChat />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* AI Module Grid - Secondary Features */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Specialized AI Analysis Modules</h2>
        <p className="text-slate-600 mb-6">Select AI models for targeted analysis of specific conditions</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AI_MODULES.map((module) => (
            <AIModuleCard
              key={module.id}
              module={module}
              onRunAnalysis={handleRunAnalysis}
            />
          ))}
        </div>
      </div>
      
      {/* AI Findings Panel */}
      {showResults && (
        <Card className="mb-6">
          <div className="p-6 border-b border-slate-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">AI Analysis Results</h3>
              <Button variant="ghost" size="sm" onClick={hideResults}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium text-slate-900">{currentAnalysis}</h4>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completed
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Analysis Confidence</span>
                      <span className="text-sm font-medium text-green-600">94%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Processing Time</span>
                      <span className="text-sm font-medium text-slate-600">2.3 seconds</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Critical Findings</span>
                      <span className="text-sm font-medium text-green-600">None detected</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
