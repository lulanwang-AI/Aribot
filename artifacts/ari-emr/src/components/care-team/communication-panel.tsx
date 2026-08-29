import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  AlertTriangle, 
  Users, 
  Send,
  Phone,
  Video,
  Bell,
  CheckCircle,
  Clock,
  User,
  Activity
} from "lucide-react";

interface CareTeamMember {
  id: string;
  name: string;
  role: string;
  status: "online" | "offline" | "busy";
  initials: string;
}

interface Alert {
  id: string;
  type: "urgent" | "critical" | "info";
  message: string;
  timestamp: string;
  patient: string;
  acknowledged: boolean;
}

export default function CommunicationPanel() {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: "1",
      type: "critical",
      message: "Code PE triggered - Pulmonary Embolism detected",
      timestamp: "2 min ago",
      patient: "Patricia Brown",
      acknowledged: false
    },
    {
      id: "2",
      type: "urgent",
      message: "Large AAA detected - 6.2cm requiring urgent intervention",
      timestamp: "15 min ago",
      patient: "Michael Chen",
      acknowledged: true
    },
    {
      id: "3",
      type: "info",
      message: "New cancer positive finding - Review required",
      timestamp: "1 hour ago",
      patient: "Robert Martinez",
      acknowledged: false
    }
  ]);

  const careTeam: CareTeamMember[] = [
    { id: "1", name: "Dr. Sarah Mitchell", role: "Attending Radiologist", status: "online", initials: "SM" },
    { id: "2", name: "Dr. James Wilson", role: "ED Physician", status: "online", initials: "JW" },
    { id: "3", name: "Dr. Emily Chen", role: "Oncologist", status: "busy", initials: "EC" },
    { id: "4", name: "Nurse Lisa Thompson", role: "ED Nurse", status: "online", initials: "LT" },
    { id: "5", name: "Dr. Robert Garcia", role: "Surgeon", status: "offline", initials: "RG" }
  ];

  const handleAcknowledge = (alertId: string) => {
    setAlerts(alerts.map(a => 
      a.id === alertId ? { ...a, acknowledged: true } : a
    ));
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "online": return "bg-green-500";
      case "busy": return "bg-yellow-500";
      case "offline": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  const getAlertColor = (type: string) => {
    switch(type) {
      case "critical": return "border-red-500 bg-red-50";
      case "urgent": return "border-orange-500 bg-orange-50";
      case "info": return "border-blue-500 bg-blue-50";
      default: return "border-gray-500 bg-gray-50";
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="alerts" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Care Team
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="flex-1 mt-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3 pr-4">
              {alerts.map((alert) => (
                <Card key={alert.id} className={`border-l-4 ${getAlertColor(alert.type)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {alert.type === "critical" && <AlertTriangle className="w-5 h-5 text-red-500" />}
                        {alert.type === "urgent" && <Clock className="w-5 h-5 text-orange-500" />}
                        {alert.type === "info" && <Activity className="w-5 h-5 text-blue-500" />}
                        <Badge variant={alert.type === "critical" ? "destructive" : 
                                       alert.type === "urgent" ? "default" : "secondary"}>
                          {alert.type.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">{alert.timestamp}</span>
                    </div>
                    <p className="font-medium text-sm mb-1">{alert.message}</p>
                    <p className="text-sm text-gray-600 mb-3">Patient: {alert.patient}</p>
                    <div className="flex gap-2">
                      {!alert.acknowledged ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleAcknowledge(alert.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Acknowledge
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Acknowledged
                        </Badge>
                      )}
                      <Button size="sm" variant="outline">
                        View Case
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="team" className="flex-1 mt-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3 pr-4">
              {careTeam.map((member) => (
                <Card key={member.id} className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedMember(member.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar>
                            <AvatarFallback>{member.initials}</AvatarFallback>
                          </Avatar>
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${getStatusColor(member.status)} border-2 border-white`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.name}</p>
                          <p className="text-xs text-gray-600">{member.role}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Video className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="messages" className="flex-1 mt-4 flex flex-col">
          <ScrollArea className="flex-1 h-[500px] border rounded-lg p-4 mb-4">
            <div className="space-y-4">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>SM</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <p className="text-sm font-medium">Dr. Sarah Mitchell</p>
                    <p className="text-sm">Please prioritize the PE case in room 3. Patient is symptomatic.</p>
                    <span className="text-xs text-gray-500">10:45 AM</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>JW</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <p className="text-sm font-medium">Dr. James Wilson</p>
                    <p className="text-sm">Acknowledged. Starting anticoagulation protocol.</p>
                    <span className="text-xs text-gray-500">10:47 AM</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            />
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}