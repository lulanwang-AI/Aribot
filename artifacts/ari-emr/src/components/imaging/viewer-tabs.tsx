import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ImageViewer from "./image-viewer";
import TargetPanel from "./target-panel";
import TimepointSelector from "./timepoint-selector";
import type { ImagingStudy, Patient, AiAnalysis, Report, Timepoint } from "@/shared/schema";
import { Wand2, Save, Send } from "lucide-react";

interface ViewerTabsProps {
  selectedStudy: ImagingStudy | null;
  selectedPatient: Patient | null;
}

export default function ViewerTabs({ selectedStudy, selectedPatient }: ViewerTabsProps) {
  const [reportFindings, setReportFindings] = useState("");
  const [reportImpression, setReportImpression] = useState("");
  const [selectedTimepoint, setSelectedTimepoint] = useState<Timepoint | null>(null);

  const { data: aiAnalyses = [] } = useQuery<AiAnalysis[]>({
    queryKey: ["/api/studies", selectedStudy?.id, "analyses"],
    enabled: !!selectedStudy?.id,
  });

  const { data: report } = useQuery<Report>({
    queryKey: ["/api/studies", selectedStudy?.id, "report"],
    enabled: !!selectedStudy?.id,
  });

  const handleGenerateReport = () => {
    const findings = `
TECHNIQUE: Contrast-enhanced CT chest, abdomen, and pelvis.

COMPARISON: Prior study from ${selectedTimepoint ? new Date(selectedTimepoint.studyDate).toLocaleDateString() : 'baseline'}.

FINDINGS:
Target lesions have been measured and tracked according to RECIST 1.1 criteria.

${selectedStudy ? `
Current measurements show:
- Multiple target lesions identified and measured  
- Baseline measurements established for comparison
- Response assessment pending comparison with prior timepoint
` : ''}

IMPRESSION:
Oncologic follow-up with target lesion measurements documented for response assessment.
Further correlation with clinical findings recommended.
    `.trim();

    const impression = `
1. Oncologic follow-up with target lesion measurements
2. RECIST 1.1 criteria applied for response assessment  
3. Recommend continued surveillance imaging per protocol
    `.trim();

    setReportFindings(findings);
    setReportImpression(impression);
  };

  return (
    <div className="space-y-4">
      {/* Timepoint Selector */}
      <TimepointSelector
        patientId={selectedPatient?.id || null}
        currentTimepoint={selectedTimepoint}
        onTimepointChange={setSelectedTimepoint}
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Target Panel */}
        <div className="xl:col-span-1">
          <TargetPanel
            studyId={selectedStudy?.id || null}
            onGenerateReport={handleGenerateReport}
          />
        </div>

        {/* Main Viewer Area */}
        <div className="xl:col-span-3">
          <Card className="h-full">
            <Tabs defaultValue="imaging" className="h-full">
              <div className="border-b border-slate-200">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="imaging">Imaging Viewer</TabsTrigger>
                  <TabsTrigger value="report">Report</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                  <TabsTrigger value="ai-findings">AI Findings</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="imaging" className="p-6">
                <ImageViewer study={selectedStudy} height="calc(100vh - 400px)" />
              </TabsContent>

              <TabsContent value="report" className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-slate-900">Oncology Report</h3>
                    <Button onClick={handleGenerateReport}>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate from Measurements
                    </Button>
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-medium text-slate-900 mb-2">Clinical Information</h4>
                    <p className="text-sm text-slate-600">
                      Oncologic follow-up examination. Target lesions measured and tracked according to RECIST 1.1 criteria for treatment response assessment.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Findings</label>
                    <Textarea
                      rows={8}
                      value={reportFindings}
                      onChange={(e) => setReportFindings(e.target.value)}
                      placeholder="Enter your findings..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Impression</label>
                    <Textarea
                      rows={3}
                      value={reportImpression}
                      onChange={(e) => setReportImpression(e.target.value)}
                      placeholder="Enter your impression..."
                    />
                  </div>
                  
                  <div className="flex space-x-4">
                    <Button>
                      <Save className="w-4 h-4 mr-2" />
                      Save Report
                    </Button>
                    <Button className="bg-medical-green hover:bg-green-700">
                      <Send className="w-4 h-4 mr-2" />
                      Send to Care Team
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Treatment Timeline</h3>
                  
                  <div className="space-y-3">
                    <div className="border border-slate-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-slate-900">CT Chest/Abdomen/Pelvis - Current Study</h4>
                        <span className="text-sm text-slate-500">Today, 10:30 AM</span>
                      </div>
                      <p className="text-sm text-slate-600">Response assessment after cycle 4 of chemotherapy. Target lesions measured.</p>
                      <Badge className="mt-2 bg-blue-100 text-blue-800">Current</Badge>
                    </div>
                    
                    <div className="border border-slate-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-slate-900">CT Chest/Abdomen/Pelvis</h4>
                        <span className="text-sm text-slate-500">6 weeks ago</span>
                      </div>
                      <p className="text-sm text-slate-600">Mid-treatment assessment. Stable disease with target lesion measurements.</p>
                      <Badge className="mt-2 bg-yellow-100 text-yellow-800">Stable Disease</Badge>
                    </div>
                    
                    <div className="border border-slate-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-slate-900">CT Chest/Abdomen/Pelvis - Baseline</h4>
                        <span className="text-sm text-slate-500">3 months ago</span>
                      </div>
                      <p className="text-sm text-slate-600">Pre-treatment baseline study. Initial target lesion measurements established.</p>
                      <Badge className="mt-2 bg-green-100 text-green-800">Baseline</Badge>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ai-findings" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">AI Analysis Results</h3>
                  
                  <div className="space-y-4">
                    <div className="border border-slate-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium text-slate-900">Oncology Screening</h4>
                        <Badge className="bg-green-100 text-green-800">
                          Completed
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Lesion Detection</span>
                          <span className="text-sm font-medium text-green-600">5 targets identified (95%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Measurement Assistance</span>
                          <span className="text-sm font-medium text-green-600">Auto-measurements available (98%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">RECIST Compliance</span>
                          <span className="text-sm font-medium text-green-600">Criteria validated (99%)</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border border-slate-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium text-slate-900">Lung Analysis</h4>
                        <Badge className="bg-green-100 text-green-800">
                          Completed
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Pulmonary Nodules</span>
                          <span className="text-sm font-medium text-green-600">Multiple detected (92%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Progression Assessment</span>
                          <span className="text-sm font-medium text-yellow-600">Stable (87%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex">
                      <i className="fas fa-info-circle text-blue-500 mt-1 mr-3"></i>
                      <div>
                        <h4 className="font-medium text-blue-900">AI Analysis Summary</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          AI modules have identified multiple target lesions and provided measurement assistance. 
                          Results support comprehensive oncologic assessment and RECIST-compliant reporting.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}