import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileImage,
  AlertCircle,
  Clock,
  CheckCircle,
  PlayCircle,
  User,
  Calendar,
  Brain,
  Heart,
  Stethoscope,
  Activity,
  Filter,
  Search,
  ChevronRight
} from "lucide-react";

interface Study {
  id: string;
  patientName: string;
  patientId: string;
  modality: string;
  studyDate: string;
  studyTime: string;
  description: string;
  status: "new" | "in-progress" | "completed" | "urgent";
  aiStatus: "pending" | "processing" | "completed";
  priority: "routine" | "urgent" | "stat";
  bodyPart: string;
  findings?: string;
}

export default function PACSWorklist() {
  const [selectedStudy, setSelectedStudy] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const studies: Study[] = [
    {
      id: "1",
      patientName: "Patricia Brown",
      patientId: "P-2025-008",
      modality: "CT",
      studyDate: "2025-08-07",
      studyTime: "10:15",
      description: "CTA Chest - PE Protocol",
      status: "urgent",
      aiStatus: "completed",
      priority: "stat",
      bodyPart: "Chest",
      findings: "Bilateral pulmonary emboli detected"
    },
    {
      id: "2",
      patientName: "Michael Chen",
      patientId: "P-2025-003",
      modality: "CT",
      studyDate: "2025-08-07",
      studyTime: "09:45",
      description: "CT Abdomen/Pelvis w/ contrast",
      status: "urgent",
      aiStatus: "completed",
      priority: "urgent",
      bodyPart: "Abdomen",
      findings: "6.2cm AAA requiring intervention"
    },
    {
      id: "3",
      patientName: "Robert Martinez",
      patientId: "P-2025-005",
      modality: "CT",
      studyDate: "2025-08-07",
      studyTime: "08:30",
      description: "CT Chest w/ contrast",
      status: "in-progress",
      aiStatus: "completed",
      priority: "routine",
      bodyPart: "Chest",
      findings: "3.8cm lung mass, suspicious"
    },
    {
      id: "4",
      patientName: "Jennifer Garcia",
      patientId: "P-2025-010",
      modality: "CT",
      studyDate: "2025-08-07",
      studyTime: "11:00",
      description: "CT Pelvis w/ contrast",
      status: "new",
      aiStatus: "processing",
      priority: "routine",
      bodyPart: "Pelvis"
    },
    {
      id: "5",
      patientName: "Christopher Lewis",
      patientId: "P-2025-019",
      modality: "CT",
      studyDate: "2025-08-07",
      studyTime: "07:30",
      description: "CT Head w/o contrast",
      status: "urgent",
      aiStatus: "completed",
      priority: "stat",
      bodyPart: "Head",
      findings: "Large MCA territory infarct"
    }
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case "urgent": return "bg-red-100 text-red-800 border-red-300";
      case "in-progress": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "completed": return "bg-green-100 text-green-800 border-green-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch(priority) {
      case "stat": return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "urgent": return <Clock className="w-4 h-4 text-orange-500" />;
      default: return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getBodyPartIcon = (bodyPart: string) => {
    switch(bodyPart.toLowerCase()) {
      case "head": return <Brain className="w-4 h-4" />;
      case "chest": return <Heart className="w-4 h-4" />;
      case "abdomen":
      case "pelvis": return <Stethoscope className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const filteredStudies = studies.filter(study => {
    if (filter === "urgent" && study.priority !== "stat" && study.priority !== "urgent") return false;
    if (filter === "ai-ready" && study.aiStatus !== "completed") return false;
    if (searchTerm && !study.patientName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !study.patientId.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header Section */}
      <div className="px-6 py-4 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Study Queue</h3>
            <p className="text-sm text-gray-600 mt-1">Active cases requiring radiologist review</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-blue-50 border-blue-200 px-3 py-1">
              <Activity className="w-3 h-3 mr-1" />
              {studies.length} Total
            </Badge>
            <Badge className="bg-red-100 text-red-700 border border-red-200 px-3 py-1">
              <AlertCircle className="w-3 h-3 mr-1" />
              {studies.filter(s => s.priority === "stat").length} STAT
            </Badge>
            <Badge className="bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1">
              <Clock className="w-3 h-3 mr-1" />
              {studies.filter(s => s.priority === "urgent").length} Urgent
            </Badge>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search patient name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
              className="h-9"
            >
              All Studies
            </Button>
            <Button
              variant={filter === "urgent" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("urgent")}
              className="h-9"
            >
              Priority Only
            </Button>
            <Button
              variant={filter === "ai-ready" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("ai-ready")}
              className="h-9"
            >
              AI Completed
            </Button>
          </div>
        </div>
      </div>
      
      {/* Study List Area */}
      <div className="flex-1 overflow-hidden bg-gray-50 p-4">
        <ScrollArea className="h-full">
          <div className="space-y-3">
            {filteredStudies.map((study) => (
              <Card 
                key={study.id} 
                className={`cursor-pointer hover:shadow-lg transition-all duration-200 bg-white ${
                  selectedStudy === study.id ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
                } ${study.priority === 'stat' ? 'border-l-4 border-l-red-500' : 
                   study.priority === 'urgent' ? 'border-l-4 border-l-orange-500' : ''}`}
                onClick={() => setSelectedStudy(study.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Patient Info Row */}
                      <div className="flex items-center gap-3 mb-3">
                        {getPriorityIcon(study.priority)}
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-base">{study.patientName}</span>
                          <Badge variant="outline" className="text-xs">
                            {study.patientId}
                          </Badge>
                        </div>
                        <Badge className={getStatusColor(study.status)}>
                          {study.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      {/* Study Details Row */}
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <FileImage className="w-4 h-4" />
                          <span>{study.modality}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {getBodyPartIcon(study.bodyPart)}
                          <span>{study.bodyPart}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{study.studyDate} {study.studyTime}</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mb-3">{study.description}</p>

                      {/* AI Status and Findings */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">AI Analysis:</span>
                          {study.aiStatus === "completed" ? (
                            <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          ) : study.aiStatus === "processing" ? (
                            <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200">
                              <Clock className="w-3 h-3 mr-1" />
                              Processing
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-600">
                              Pending
                            </Badge>
                          )}
                        </div>
                        
                        {study.findings && (
                          <div className="flex items-center gap-2 text-xs">
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            <span className="text-orange-700 font-medium">{study.findings}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 ml-4">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <PlayCircle className="w-4 h-4 mr-1" />
                        View Study
                      </Button>
                      {study.aiStatus === "completed" && (
                        <Button size="sm" variant="outline">
                          AI Report
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredStudies.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileImage className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">No studies found</p>
                <p className="text-sm">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}