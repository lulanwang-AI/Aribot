import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Shield,
  Zap,
  Target,
  BarChart3,
  FileText,
  Download,
  RefreshCw,
  Settings
} from "lucide-react";

interface AIResult {
  id: string;
  algorithm: string;
  status: "pending" | "processing" | "completed" | "error";
  confidence: number;
  findings: string[];
  priority: "low" | "medium" | "high" | "critical";
  timestamp: string;
}

interface AIAlgorithm {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
  accuracy: number;
}

export default function AIWidget() {
  const [activeTab, setActiveTab] = useState("results");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const algorithms: AIAlgorithm[] = [
    {
      id: "pe-detection",
      name: "PE Detection",
      description: "Pulmonary Embolism detection",
      icon: Activity,
      enabled: true,
      accuracy: 94
    },
    {
      id: "ich-detection",
      name: "ICH Detection",
      description: "Intracranial Hemorrhage detection",
      icon: Brain,
      enabled: true,
      accuracy: 96
    },
    {
      id: "cancer-screening",
      name: "Cancer Screening",
      description: "Multi-organ cancer detection",
      icon: Shield,
      enabled: true,
      accuracy: 89
    },
    {
      id: "fracture-detection",
      name: "Fracture Detection",
      description: "Bone fracture identification",
      icon: Zap,
      enabled: true,
      accuracy: 92
    }
  ];

  const aiResults: AIResult[] = [
    {
      id: "1",
      algorithm: "PE Detection",
      status: "completed",
      confidence: 92,
      findings: ["Bilateral pulmonary emboli", "Right heart strain"],
      priority: "critical",
      timestamp: "10:45 AM"
    },
    {
      id: "2",
      algorithm: "Cancer Screening",
      status: "completed",
      confidence: 87,
      findings: ["3.8cm lung mass", "Mediastinal lymphadenopathy"],
      priority: "high",
      timestamp: "10:30 AM"
    },
    {
      id: "3",
      algorithm: "ICH Detection",
      status: "processing",
      confidence: 0,
      findings: [],
      priority: "medium",
      timestamp: "10:50 AM"
    }
  ];

  useEffect(() => {
    if (processing) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setProcessing(false);
            return 0;
          }
          return prev + 10;
        });
      }, 500);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [processing]);

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case "critical": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      default: return "bg-green-100 text-green-800";
    }
  };

  const runAllAlgorithms = () => {
    setProcessing(true);
    setProgress(0);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            AI Analysis Widget
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setActiveTab("settings")}
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={runAllAlgorithms}
              disabled={processing}
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-1" />
                  Run All
                </>
              )}
            </Button>
          </div>
        </div>
        {processing && (
          <Progress value={progress} className="mt-2" />
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="algorithms">Algorithms</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="flex-1 overflow-auto mt-4">
            <div className="space-y-3">
              {aiResults.map((result) => (
                <Card key={result.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {result.status === "completed" ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : result.status === "processing" ? (
                          <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        )}
                        <span className="font-medium text-sm">{result.algorithm}</span>
                        <Badge className={getPriorityColor(result.priority)}>
                          {result.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">{result.timestamp}</span>
                    </div>

                    {result.status === "completed" && (
                      <>
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex items-center gap-1">
                            <Target className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              Confidence: {result.confidence}%
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {result.findings.map((finding, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                              <span>{finding}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {result.status === "processing" && (
                      <div className="text-sm text-gray-600">
                        Analyzing images...
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="algorithms" className="flex-1 overflow-auto mt-4">
            <div className="grid grid-cols-2 gap-3">
              {algorithms.map((algo) => (
                <Card key={algo.id} className={algo.enabled ? "" : "opacity-60"}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <algo.icon className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-sm">{algo.name}</span>
                      </div>
                      <Button
                        size="sm"
                        variant={algo.enabled ? "default" : "outline"}
                        className="h-6 text-xs"
                      >
                        {algo.enabled ? "ON" : "OFF"}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{algo.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Accuracy</span>
                      <Badge variant="outline" className="text-xs">
                        {algo.accuracy}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="flex-1 overflow-auto mt-4">
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">Performance Metrics</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Cases Analyzed Today</span>
                      <span className="font-medium">124</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Critical Findings</span>
                      <span className="font-medium text-red-600">8</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Average Processing Time</span>
                      <span className="font-medium">2.3s</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Overall Accuracy</span>
                      <span className="font-medium text-green-600">92.5%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Impact Summary</span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                      <span>Reduced average diagnosis time by 47%</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                      <span>Detected 12 critical cases in the last 24 hours</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                      <span>98% physician agreement rate</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <FileText className="w-4 h-4 mr-1" />
                  Generate Report
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Download className="w-4 h-4 mr-1" />
                  Export Data
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}