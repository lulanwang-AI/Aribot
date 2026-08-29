import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageSquare,
  Video,
  Phone,
  Calendar,
  Clock,
  User,
  Users,
  FileText,
  Send,
  Paperclip,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Star,
  Activity,
  Stethoscope,
  Brain,
  Heart,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

interface Consultation {
  id: string;
  patientName: string;
  patientId: string;
  requestingDoctor: string;
  consultingDoctor: string;
  department: string;
  priority: "routine" | "urgent" | "stat";
  status: "pending" | "scheduled" | "in-progress" | "completed" | "cancelled";
  type: "in-person" | "video" | "phone" | "written";
  reason: string;
  clinicalSummary: string;
  dateRequested: string;
  scheduledDate?: string;
  completedDate?: string;
  findings?: string;
  recommendations?: string;
}

interface Message {
  id: string;
  sender: string;
  role: string;
  message: string;
  timestamp: string;
  attachments?: string[];
}

export default function Consultation() {
  const [selectedTab, setSelectedTab] = useState("active");
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Mock consultations data
  const consultations: Consultation[] = [
    {
      id: "cons-001",
      patientName: "Patricia Brown",
      patientId: "P-2025-008",
      requestingDoctor: "Dr. James Wilson",
      consultingDoctor: "Dr. Sarah Johnson",
      department: "Radiology",
      priority: "stat",
      status: "in-progress",
      type: "video",
      reason: "Acute PE on CTA - Need urgent radiological review",
      clinicalSummary: "58-year-old female presenting with acute dyspnea and chest pain. D-dimer elevated. CTA shows bilateral PE.",
      dateRequested: format(new Date(), "yyyy-MM-dd HH:mm"),
      scheduledDate: format(new Date(), "yyyy-MM-dd HH:mm")
    },
    {
      id: "cons-002",
      patientName: "Michael Chen",
      patientId: "P-2025-003",
      requestingDoctor: "Dr. Emily Davis",
      consultingDoctor: "Dr. Michael Chen",
      department: "Cardiology",
      priority: "urgent",
      status: "scheduled",
      type: "in-person",
      reason: "Pre-operative cardiac clearance for AAA repair",
      clinicalSummary: "72-year-old male with 6.2cm infrarenal AAA requiring surgical intervention. History of CAD, HTN.",
      dateRequested: format(new Date(Date.now() - 3600000), "yyyy-MM-dd HH:mm"),
      scheduledDate: format(new Date(Date.now() + 7200000), "yyyy-MM-dd HH:mm")
    },
    {
      id: "cons-003",
      patientName: "Robert Martinez",
      patientId: "P-2025-005",
      requestingDoctor: "Dr. John Smith",
      consultingDoctor: "Dr. Lisa Wang",
      department: "Oncology",
      priority: "routine",
      status: "pending",
      type: "written",
      reason: "Lung mass evaluation and treatment planning",
      clinicalSummary: "65-year-old male with newly diagnosed 3.8cm RUL mass with mediastinal LAD. Biopsy pending.",
      dateRequested: format(new Date(Date.now() - 7200000), "yyyy-MM-dd HH:mm")
    },
    {
      id: "cons-004",
      patientName: "Jennifer Garcia",
      patientId: "P-2025-010",
      requestingDoctor: "Dr. Maria Rodriguez",
      consultingDoctor: "Dr. Robert Anderson",
      department: "Neurology",
      priority: "routine",
      status: "completed",
      type: "video",
      reason: "Chronic headache evaluation",
      clinicalSummary: "42-year-old female with 6-month history of recurrent headaches. MRI brain normal.",
      dateRequested: format(new Date(Date.now() - 86400000), "yyyy-MM-dd HH:mm"),
      scheduledDate: format(new Date(Date.now() - 43200000), "yyyy-MM-dd HH:mm"),
      completedDate: format(new Date(Date.now() - 3600000), "yyyy-MM-dd HH:mm"),
      findings: "Likely tension-type headaches with possible migraine component",
      recommendations: "Trial of prophylactic therapy with propranolol. Follow up in 6 weeks."
    }
  ];

  // Mock messages for active consultation
  const messages: Message[] = [
    {
      id: "msg-1",
      sender: "Dr. James Wilson",
      role: "Emergency Medicine",
      message: "Urgent consult needed for Patricia Brown. CTA shows bilateral PE. Patient stable but tachycardic.",
      timestamp: "10:30 AM",
      attachments: ["CTA_Report.pdf"]
    },
    {
      id: "msg-2",
      sender: "Dr. Sarah Johnson",
      role: "Radiology",
      message: "Reviewing the images now. I can see extensive bilateral pulmonary emboli in the main, lobar, and segmental branches.",
      timestamp: "10:35 AM"
    },
    {
      id: "msg-3",
      sender: "Dr. Sarah Johnson",
      role: "Radiology",
      message: "No evidence of right heart strain on imaging. RV/LV ratio is normal. Recommend immediate anticoagulation.",
      timestamp: "10:38 AM"
    },
    {
      id: "msg-4",
      sender: "Dr. James Wilson",
      role: "Emergency Medicine",
      message: "Thank you. Starting heparin infusion now. Will monitor closely.",
      timestamp: "10:40 AM"
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "stat": return "bg-red-100 text-red-800 border-red-300";
      case "urgent": return "bg-orange-100 text-orange-800 border-orange-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-300";
      case "in-progress": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "scheduled": return "bg-blue-100 text-blue-800 border-blue-300";
      case "pending": return "bg-gray-100 text-gray-800 border-gray-300";
      case "cancelled": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="w-4 h-4" />;
      case "phone": return <Phone className="w-4 h-4" />;
      case "written": return <FileText className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const filteredConsultations = consultations.filter(consultation => {
    if (searchTerm && !consultation.patientName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !consultation.reason.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    if (selectedTab === "active" && !["in-progress", "scheduled", "pending"].includes(consultation.status)) return false;
    if (selectedTab === "urgent" && !["urgent", "stat"].includes(consultation.priority)) return false;
    if (selectedTab === "completed" && consultation.status !== "completed") return false;
    
    return true;
  });

  const stats = {
    total: consultations.length,
    active: consultations.filter(c => ["in-progress", "scheduled", "pending"].includes(c.status)).length,
    urgent: consultations.filter(c => ["urgent", "stat"].includes(c.priority)).length,
    completed: consultations.filter(c => c.status === "completed").length,
    avgResponseTime: "18 min"
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Clinical Consultations
            </h1>
          </div>
          
          <Button className="bg-blue-600 hover:bg-blue-700">
            <MessageSquare className="w-4 h-4 mr-2" />
            New Consultation
          </Button>
        </div>
      </div>

      {/* Statistics strip */}
      <div className="px-6 py-2 bg-white border-b flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span><span className="font-semibold text-foreground">{stats.total}</span> total</span>
        <span className="text-border">·</span>
        <span><span className="font-semibold text-amber-600">{stats.active}</span> active</span>
        <span className="text-border">·</span>
        <span><span className="font-semibold text-red-600">{stats.urgent}</span> urgent/STAT</span>
        <span className="text-border">·</span>
        <span><span className="font-semibold text-emerald-600">{stats.completed}</span> completed</span>
        <span className="text-border">·</span>
        <span><span className="font-semibold text-foreground">{stats.avgResponseTime}</span> avg response</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:overflow-hidden flex flex-col lg:flex-row">
        {/* Consultations List */}
        <div className="w-full lg:w-1/2 lg:border-r bg-white">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
            <div className="px-4 py-3 border-b">
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
                <TabsTrigger value="urgent">Urgent ({stats.urgent})</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              
              <div className="mt-3">
                <Input
                  placeholder="Search consultations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            
            <TabsContent value={selectedTab} className="flex-1 overflow-auto p-4">
              <div className="space-y-3">
                {filteredConsultations.map((consultation) => (
                  <Card 
                    key={consultation.id} 
                    className={`cursor-pointer hover:shadow-md transition-all ${
                      selectedConsultation?.id === consultation.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedConsultation(consultation)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(consultation.priority)}>
                            {consultation.priority.toUpperCase()}
                          </Badge>
                          <Badge className={getStatusColor(consultation.status)}>
                            {consultation.status}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {getTypeIcon(consultation.type)}
                            <span className="text-xs text-gray-600">{consultation.type}</span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(new Date(consultation.dateRequested), "MMM dd, HH:mm")}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-sm mb-1">{consultation.patientName}</h3>
                      <p className="text-xs text-gray-500 mb-2">ID: {consultation.patientId}</p>
                      
                      <p className="text-sm text-gray-700 mb-2 line-clamp-2">{consultation.reason}</p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>From: {consultation.requestingDoctor}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span>To: {consultation.consultingDoctor}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredConsultations.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No consultations found</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Consultation Details / Chat */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedConsultation ? (
            <>
              {/* Consultation Header */}
              <div className="p-4 border-b">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="font-semibold text-lg">{selectedConsultation.patientName}</h2>
                    <p className="text-sm text-gray-600">{selectedConsultation.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    {selectedConsultation.type === "video" && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Video className="w-4 h-4 mr-1" />
                        Start Video
                      </Button>
                    )}
                    {selectedConsultation.type === "phone" && (
                      <Button size="sm" variant="outline">
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Requesting:</span>
                    <span className="ml-2 font-medium">{selectedConsultation.requestingDoctor}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Consulting:</span>
                    <span className="ml-2 font-medium">{selectedConsultation.consultingDoctor}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Department:</span>
                    <span className="ml-2">{selectedConsultation.department}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Requested:</span>
                    <span className="ml-2">{format(new Date(selectedConsultation.dateRequested), "MMM dd, HH:mm")}</span>
                  </div>
                </div>
                
                {selectedConsultation.clinicalSummary && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-1">Clinical Summary</p>
                    <p className="text-sm text-gray-600">{selectedConsultation.clinicalSummary}</p>
                  </div>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {message.sender.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{message.sender}</span>
                          <span className="text-xs text-gray-500">{message.role}</span>
                          <span className="text-xs text-gray-400">{message.timestamp}</span>
                        </div>
                        <div className="bg-gray-100 rounded-lg p-3">
                          <p className="text-sm">{message.message}</p>
                          {message.attachments && (
                            <div className="mt-2 flex gap-2">
                              {message.attachments.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-1 text-xs text-blue-600">
                                  <Paperclip className="w-3 h-3" />
                                  <span>{file}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {selectedConsultation.findings && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-medium text-sm text-green-800 mb-2">Consultation Findings</h4>
                      <p className="text-sm text-green-700">{selectedConsultation.findings}</p>
                      {selectedConsultation.recommendations && (
                        <>
                          <h4 className="font-medium text-sm text-green-800 mb-2 mt-3">Recommendations</h4>
                          <p className="text-sm text-green-700">{selectedConsultation.recommendations}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Message Input */}
              {selectedConsultation.status !== "completed" && (
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost">
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Textarea
                      placeholder="Type your message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="flex-1 min-h-[60px] max-h-[120px]"
                    />
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Select a consultation to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}