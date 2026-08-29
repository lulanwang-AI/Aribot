import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText,
  Download,
  Send,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  Search,
  Calendar,
  User,
  Printer,
  Share2,
  Lock,
  Unlock,
  TrendingUp,
  FileImage
} from "lucide-react";
import { format } from "date-fns";

interface Report {
  id: string;
  patientName: string;
  patientId: string;
  studyType: string;
  modality: string;
  reportDate: string;
  radiologist: string;
  referringPhysician: string;
  status: "draft" | "preliminary" | "final" | "amended" | "addendum";
  priority: "routine" | "urgent" | "stat";
  findings: string;
  impression: string;
  recommendations?: string;
  criticalFindings?: boolean;
  signedAt?: string;
}

export default function ClinicalDocuments() {
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  // Mock reports data
  const reports: Report[] = [
    {
      id: "rpt-001",
      patientName: "Patricia Brown",
      patientId: "P-2025-008",
      studyType: "CTA Chest - PE Protocol",
      modality: "CT",
      reportDate: format(new Date(), "yyyy-MM-dd"),
      radiologist: "Dr. Sarah Johnson",
      referringPhysician: "Dr. Michael Chen",
      status: "final",
      priority: "stat",
      findings: "Bilateral pulmonary emboli identified in the main, lobar, and segmental branches. No evidence of right heart strain.",
      impression: "Acute bilateral pulmonary emboli without evidence of right heart strain. Immediate anticoagulation recommended.",
      recommendations: "Immediate anticoagulation therapy. Follow-up CTA in 3-6 months.",
      criticalFindings: true,
      signedAt: format(new Date(), "yyyy-MM-dd HH:mm")
    },
    {
      id: "rpt-002",
      patientName: "Michael Chen",
      patientId: "P-2025-003",
      studyType: "CT Abdomen/Pelvis with contrast",
      modality: "CT",
      reportDate: format(new Date(), "yyyy-MM-dd"),
      radiologist: "Dr. Lisa Wang",
      referringPhysician: "Dr. James Wilson",
      status: "preliminary",
      priority: "urgent",
      findings: "6.2 cm infrarenal abdominal aortic aneurysm. No evidence of rupture or leak. Bilateral renal arteries patent.",
      impression: "Large infrarenal AAA requiring urgent vascular surgery consultation.",
      recommendations: "Urgent vascular surgery consultation for possible endovascular or open repair.",
      criticalFindings: true
    },
    {
      id: "rpt-003",
      patientName: "Robert Martinez",
      patientId: "P-2025-005",
      studyType: "CT Chest with contrast",
      modality: "CT",
      reportDate: format(new Date(), "yyyy-MM-dd"),
      radiologist: "Dr. John Smith",
      referringPhysician: "Dr. Emily Davis",
      status: "draft",
      priority: "routine",
      findings: "3.8 cm spiculated mass in the right upper lobe with mediastinal lymphadenopathy. No pleural effusion.",
      impression: "Suspicious lung mass with lymphadenopathy, likely malignant. Tissue diagnosis recommended.",
      recommendations: "CT-guided biopsy or bronchoscopy for tissue diagnosis."
    },
    {
      id: "rpt-004",
      patientName: "Jennifer Garcia",
      patientId: "P-2025-010",
      studyType: "MRI Brain with and without contrast",
      modality: "MRI",
      reportDate: format(new Date(Date.now() - 86400000), "yyyy-MM-dd"),
      radiologist: "Dr. Robert Anderson",
      referringPhysician: "Dr. Maria Rodriguez",
      status: "final",
      priority: "routine",
      findings: "No acute intracranial abnormality. Small vessel ischemic changes appropriate for age.",
      impression: "No acute findings. Age-appropriate changes.",
      signedAt: format(new Date(Date.now() - 86400000), "yyyy-MM-dd HH:mm")
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "final": return "bg-green-100 text-green-800 border-green-300";
      case "preliminary": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "draft": return "bg-gray-100 text-gray-800 border-gray-300";
      case "amended": return "bg-blue-100 text-blue-800 border-blue-300";
      case "addendum": return "bg-purple-100 text-purple-800 border-purple-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "stat": return "text-red-600";
      case "urgent": return "text-orange-600";
      default: return "text-gray-600";
    }
  };

  const filteredReports = reports.filter(report => {
    if (filterStatus !== "all" && report.status !== filterStatus) return false;
    if (filterPriority !== "all" && report.priority !== filterPriority) return false;
    if (searchTerm && !report.patientName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !report.patientId.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !report.studyType.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    if (selectedTab === "draft" && report.status !== "draft") return false;
    if (selectedTab === "pending" && report.status !== "preliminary") return false;
    if (selectedTab === "completed" && report.status !== "final") return false;
    if (selectedTab === "critical" && !report.criticalFindings) return false;
    
    return true;
  });

  const stats = {
    total: reports.length,
    draft: reports.filter(r => r.status === "draft").length,
    pending: reports.filter(r => r.status === "preliminary").length,
    completed: reports.filter(r => r.status === "final").length,
    critical: reports.filter(r => r.criticalFindings).length
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              Clinical Documents
            </h1>
            <p className="text-gray-600 mt-1">Create, review, and manage diagnostic reports</p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Reports
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <FileText className="w-4 h-4 mr-2" />
              New Report
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="grid grid-cols-5 gap-4">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Total Reports</p>
                  <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Draft</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.draft}</p>
                </div>
                <Edit className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-600 text-sm font-medium">Pending Review</p>
                  <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-800">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">Critical</p>
                  <p className="text-2xl font-bold text-red-800">{stats.critical}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
          <div className="px-6 py-3 bg-white border-b">
            <div className="flex items-center justify-between">
              <TabsList className="grid grid-cols-5 w-fit">
                <TabsTrigger value="all">All Reports</TabsTrigger>
                <TabsTrigger value="draft">Draft ({stats.draft})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
                <TabsTrigger value="critical">Critical ({stats.critical})</TabsTrigger>
              </TabsList>
              
              {/* Filters */}
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="preliminary">Preliminary</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <TabsContent value={selectedTab} className="flex-1 p-6 overflow-auto">
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <Card key={report.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <FileImage className="w-10 h-10 text-gray-400" />
                        <div>
                          <h3 className="font-semibold text-lg">{report.studyType}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-gray-600">{report.patientName}</span>
                            <span className="text-sm text-gray-500">ID: {report.patientId}</span>
                            <span className="text-sm text-gray-500">{report.modality}</span>
                            <span className="text-sm text-gray-500">{report.reportDate}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {report.criticalFindings && (
                          <Badge className="bg-red-100 text-red-700 border-red-300">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Critical
                          </Badge>
                        )}
                        <Badge className={getStatusColor(report.status)}>
                          {report.status === "final" && <Lock className="w-3 h-3 mr-1" />}
                          {report.status === "draft" && <Edit className="w-3 h-3 mr-1" />}
                          {report.status === "preliminary" && <Clock className="w-3 h-3 mr-1" />}
                          {report.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(report.priority)}>
                          {report.priority.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-1">Findings</h4>
                        <p className="text-sm text-gray-600 line-clamp-2">{report.findings}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-1">Impression</h4>
                        <p className="text-sm text-gray-900 font-medium">{report.impression}</p>
                      </div>
                      
                      {report.recommendations && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-1">Recommendations</h4>
                          <p className="text-sm text-gray-600">{report.recommendations}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {report.radiologist}
                        </span>
                        <span>→</span>
                        <span>{report.referringPhysician}</span>
                        {report.signedAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            Signed: {report.signedAt}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Printer className="w-4 h-4 mr-1" />
                          Print
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Send className="w-4 h-4 mr-1" />
                          Send
                        </Button>
                        {report.status === "draft" && (
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredReports.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No reports found</p>
                  <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}