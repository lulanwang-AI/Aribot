import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Building2,
  Users,
  Calendar,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  Bed,
  Stethoscope,
  FileText,
  AlertCircle,
  CheckCircle,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  BarChart3,
  Settings,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";

interface Department {
  id: string;
  name: string;
  head: string;
  staff: number;
  patients: number;
  occupancy: number;
  revenue: number;
  status: "operational" | "busy" | "critical";
}

interface Resource {
  id: string;
  name: string;
  type: string;
  status: "available" | "in-use" | "maintenance";
  department: string;
  lastMaintenance: string;
}

export default function Clinic() {
  const [selectedTab, setSelectedTab] = useState("overview");

  // Mock clinic data
  const clinicStats = {
    totalPatients: 1247,
    todayAppointments: 78,
    availableBeds: 42,
    totalBeds: 150,
    staffOnDuty: 234,
    totalStaff: 312,
    averageWaitTime: 28,
    patientSatisfaction: 4.6,
    monthlyRevenue: 2845000,
    revenueGrowth: 12.5
  };

  const departments: Department[] = [
    {
      id: "dept-1",
      name: "Radiology",
      head: "Dr. Sarah Johnson",
      staff: 45,
      patients: 234,
      occupancy: 78,
      revenue: 567000,
      status: "operational"
    },
    {
      id: "dept-2",
      name: "Emergency Medicine",
      head: "Dr. Michael Chen",
      staff: 68,
      patients: 456,
      occupancy: 92,
      revenue: 892000,
      status: "busy"
    },
    {
      id: "dept-3",
      name: "Cardiology",
      head: "Dr. Lisa Wang",
      staff: 38,
      patients: 156,
      occupancy: 65,
      revenue: 445000,
      status: "operational"
    },
    {
      id: "dept-4",
      name: "Oncology",
      head: "Dr. Robert Anderson",
      staff: 42,
      patients: 189,
      occupancy: 71,
      revenue: 678000,
      status: "operational"
    },
    {
      id: "dept-5",
      name: "Intensive Care Unit",
      head: "Dr. Emily Davis",
      staff: 52,
      patients: 48,
      occupancy: 96,
      revenue: 263000,
      status: "critical"
    }
  ];

  const resources: Resource[] = [
    { id: "res-1", name: "CT Scanner #1", type: "Imaging", status: "available", department: "Radiology", lastMaintenance: "2025-01-15" },
    { id: "res-2", name: "MRI Scanner #1", type: "Imaging", status: "in-use", department: "Radiology", lastMaintenance: "2025-01-10" },
    { id: "res-3", name: "X-Ray Machine #2", type: "Imaging", status: "available", department: "Emergency", lastMaintenance: "2025-01-20" },
    { id: "res-4", name: "Ventilator #5", type: "Life Support", status: "in-use", department: "ICU", lastMaintenance: "2025-01-18" },
    { id: "res-5", name: "Operating Room #3", type: "Facility", status: "maintenance", department: "Surgery", lastMaintenance: "2025-01-05" }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
      case "available":
        return "bg-green-100 text-green-800 border-green-300";
      case "busy":
      case "in-use":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "critical":
      case "maintenance":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Clinic Management
            </h1>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline">
              <BarChart3 className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="px-6 py-2 bg-white border-b flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span><span className="font-semibold text-foreground">{clinicStats.todayAppointments}</span> today · {clinicStats.totalPatients} total patients</span>
        <span className="text-border">·</span>
        <span><span className="font-semibold text-foreground">{Math.round((clinicStats.totalBeds - clinicStats.availableBeds) / clinicStats.totalBeds * 100)}%</span> beds occupied ({clinicStats.availableBeds}/{clinicStats.totalBeds} available)</span>
        <span className="text-border">·</span>
        <span><span className="font-semibold text-foreground">{clinicStats.staffOnDuty}</span> / {clinicStats.totalStaff} staff on duty</span>
        <span className="text-border">·</span>
        <span><span className="font-semibold text-foreground">${(clinicStats.monthlyRevenue / 1000000).toFixed(2)}M</span> monthly revenue <span className="text-emerald-600">+{clinicStats.revenueGrowth}%</span></span>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
          <div className="px-6 py-3 bg-white border-b">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-fit h-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="departments">Departments</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>
          </div>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="flex-1 p-6 overflow-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Real-time Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Real-time Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Average Wait Time</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{clinicStats.averageWaitTime} min</span>
                      <Badge variant="outline" className="text-yellow-600">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +5 min
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Patient Satisfaction</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{clinicStats.patientSatisfaction}/5.0</span>
                      <Badge variant="outline" className="text-green-600">
                        Excellent
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Emergency Response</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">3.2 min</span>
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        On Target
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">System Status</span>
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      All Systems Operational
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              
              {/* Department Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    Department Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {departments.slice(0, 4).map((dept) => (
                    <div key={dept.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(dept.status)}>
                          {dept.status}
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">{dept.name}</p>
                          <p className="text-xs text-gray-500">{dept.head}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{dept.occupancy}%</p>
                        <Progress value={dept.occupancy} className="w-16 h-1 mt-1" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              
              {/* Recent Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    Recent Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">ICU at Maximum Capacity</p>
                        <p className="text-xs text-red-600 mt-1">Divert non-critical patients to other units</p>
                        <p className="text-xs text-gray-500 mt-1">10 minutes ago</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800">MRI Scanner Maintenance Due</p>
                        <p className="text-xs text-yellow-600 mt-1">Schedule maintenance for MRI Scanner #1</p>
                        <p className="text-xs text-gray-500 mt-1">1 hour ago</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-800">Staff Meeting Reminder</p>
                        <p className="text-xs text-blue-600 mt-1">Department heads meeting at 3:00 PM</p>
                        <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-between">
                    View Today's Schedule
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between">
                    Check Resource Availability
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between">
                    Generate Daily Report
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between">
                    Emergency Protocol
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Departments Tab */}
          <TabsContent value="departments" className="flex-1 p-6 overflow-auto">
            <div className="space-y-4">
              {departments.map((dept) => (
                <Card key={dept.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Building2 className="w-6 h-6 text-gray-400" />
                          <div>
                            <h3 className="font-semibold text-lg">{dept.name}</h3>
                            <p className="text-sm text-gray-600">Head: {dept.head}</p>
                          </div>
                          <Badge className={getStatusColor(dept.status)}>
                            {dept.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Staff</p>
                            <p className="text-xl font-semibold">{dept.staff}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Patients</p>
                            <p className="text-xl font-semibold">{dept.patients}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Occupancy</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xl font-semibold">{dept.occupancy}%</p>
                              <Progress value={dept.occupancy} className="w-20 h-2" />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Monthly Revenue</p>
                            <p className="text-xl font-semibold">${(dept.revenue / 1000).toFixed(0)}K</p>
                          </div>
                        </div>
                      </div>
                      
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          {/* Resources Tab */}
          <TabsContent value="resources" className="flex-1 p-6 overflow-auto">
            <div className="grid grid-cols-2 gap-4">
              {resources.map((resource) => (
                <Card key={resource.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{resource.name}</h3>
                      <Badge className={getStatusColor(resource.status)}>
                        {resource.status}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type:</span>
                        <span>{resource.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Department:</span>
                        <span>{resource.department}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Maintenance:</span>
                        <span>{resource.lastMaintenance}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          {/* Performance Tab */}
          <TabsContent value="performance" className="flex-1 p-6 overflow-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Key Performance Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Patient Throughput</span>
                      <span className="text-sm font-semibold">92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Resource Utilization</span>
                      <span className="text-sm font-semibold">78%</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Staff Efficiency</span>
                      <span className="text-sm font-semibold">85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Cost Efficiency</span>
                      <span className="text-sm font-semibold">73%</span>
                    </div>
                    <Progress value={73} className="h-2" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Trends</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span className="text-sm">Patient Volume</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-600">+12%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span className="text-sm">Revenue</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-600">+8.5%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <span className="text-sm">Wait Times</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-semibold text-red-600">+15%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                    <span className="text-sm">Operating Costs</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-semibold text-yellow-600">+3%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}