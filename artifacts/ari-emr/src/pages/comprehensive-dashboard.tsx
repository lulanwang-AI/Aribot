import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  Activity, 
  FileText, 
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  Brain,
  Heart,
  Stethoscope,
  Zap,
  Building2,
  UserCheck,
  MessageSquare,
  DollarSign,
  Bed,
  Video,
  Phone,
  Shield,
  Star,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function ComprehensiveDashboard() {
  const { data: patients = [] } = useQuery<any[]>({ queryKey: ["/api/patients"] });
  
  // Comprehensive stats from all modules
  const stats = {
    // Patient Overview
    totalPatients: patients.length,
    newPatients: 12,
    criticalPatients: 8,
    
    // Radiology Hub
    activeStudies: 47,
    aiAnalysesRunning: 15,
    pendingReads: 23,
    
    // Appointments
    todayAppointments: 78,
    completedAppointments: 45,
    upcomingAppointments: 33,
    
    // Reports
    pendingReports: 12,
    finalizedReports: 234,
    criticalFindings: 5,
    
    // Clinic Management
    bedOccupancy: 72,
    availableBeds: 42,
    departmentsOperational: 8,
    
    // Staff
    staffOnDuty: 234,
    doctorsAvailable: 45,
    nursesAvailable: 89,
    
    // Consultations
    activeConsultations: 18,
    urgentConsults: 6,
    avgResponseTime: 18,
    
    // Financial
    todayRevenue: 145620,
    monthlyRevenue: 2845000,
    revenueGrowth: 12.5,
    
    // Compliance
    complianceScore: 94,
    securityEvents: 2,
    auditLogsToday: 1247
  };

  // Real-time activity feed
  const recentActivity = [
    { 
      type: "critical", 
      icon: AlertCircle,
      message: "PE detected in Patricia Brown - CT scan completed", 
      time: "2 min ago", 
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    { 
      type: "consultation", 
      icon: MessageSquare,
      message: "Dr. Johnson requested urgent cardiology consult", 
      time: "5 min ago",
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    { 
      type: "report", 
      icon: FileText,
      message: "5 radiology reports finalized and signed", 
      time: "12 min ago",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    { 
      type: "appointment", 
      icon: Calendar,
      message: "15 appointments completed this morning", 
      time: "25 min ago",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    { 
      type: "staff", 
      icon: UserCheck,
      message: "Night shift staff checked in - 45 members", 
      time: "1 hour ago",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
  ];

  // Department performance metrics
  const departmentMetrics = [
    { 
      name: "Emergency", 
      patients: 423, 
      waitTime: 28, 
      efficiency: 79, 
      status: "busy",
      trend: "up",
      change: 15
    },
    { 
      name: "Radiology", 
      patients: 234, 
      waitTime: 15, 
      efficiency: 92, 
      status: "optimal",
      trend: "up",
      change: 8
    },
    { 
      name: "Cardiology", 
      patients: 156, 
      waitTime: 22, 
      efficiency: 88, 
      status: "good",
      trend: "stable",
      change: 0
    },
    { 
      name: "Oncology", 
      patients: 189, 
      waitTime: 35, 
      efficiency: 85, 
      status: "good",
      trend: "down",
      change: -3
    },
    { 
      name: "ICU", 
      patients: 48, 
      waitTime: 0, 
      efficiency: 96, 
      status: "critical",
      trend: "up",
      change: 12
    },
  ];

  // AI Analysis Summary
  const aiAnalytics = [
    { type: "PE Detection", count: 3, accuracy: 98.5, icon: Brain },
    { type: "ICH Detection", count: 1, accuracy: 99.2, icon: Brain },
    { type: "Fracture Detection", count: 7, accuracy: 96.8, icon: Brain },
    { type: "Cancer Screening", count: 12, accuracy: 94.3, icon: Brain },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "optimal": return "text-green-600";
      case "good": return "text-blue-600";
      case "busy": return "text-yellow-600";
      case "critical": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50">
      {/* Header with Time */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Healthcare Command Center</h1>
          <p className="text-gray-600 mt-2">Real-time overview of all systems and operations</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">{format(new Date(), "EEEE, MMMM dd, yyyy")}</p>
          <p className="text-2xl font-semibold text-gray-900">{format(new Date(), "HH:mm")}</p>
        </div>
      </div>

      {/* Critical Metrics Row */}
      <div className="grid grid-cols-6 gap-4">
        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <Badge className="bg-red-600 text-white">URGENT</Badge>
            </div>
            <p className="text-xs text-red-700 font-medium">Critical Patients</p>
            <p className="text-2xl font-bold text-red-800">{stats.criticalPatients}</p>
            <p className="text-xs text-red-600 mt-1">Immediate attention</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="w-5 h-5 text-orange-600" />
              <span className="text-xs font-medium text-orange-700">ACTIVE</span>
            </div>
            <p className="text-xs text-orange-700 font-medium">Urgent Consults</p>
            <p className="text-2xl font-bold text-orange-800">{stats.urgentConsults}</p>
            <p className="text-xs text-orange-600 mt-1">Avg: {stats.avgResponseTime} min</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Brain className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">AI</span>
            </div>
            <p className="text-xs text-blue-700 font-medium">AI Analyses</p>
            <p className="text-2xl font-bold text-blue-800">{stats.aiAnalysesRunning}</p>
            <p className="text-xs text-blue-600 mt-1">Processing now</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Bed className="w-5 h-5 text-green-600" />
              <span className="text-xs font-medium text-green-700">{stats.bedOccupancy}%</span>
            </div>
            <p className="text-xs text-green-700 font-medium">Bed Occupancy</p>
            <p className="text-2xl font-bold text-green-800">{stats.availableBeds}</p>
            <p className="text-xs text-green-600 mt-1">Beds available</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <UserCheck className="w-5 h-5 text-purple-600" />
              <span className="text-xs font-medium text-purple-700">ON DUTY</span>
            </div>
            <p className="text-xs text-purple-700 font-medium">Staff Active</p>
            <p className="text-2xl font-bold text-purple-800">{stats.staffOnDuty}</p>
            <p className="text-xs text-purple-600 mt-1">{stats.doctorsAvailable} doctors</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {stats.revenueGrowth}%
              </span>
            </div>
            <p className="text-xs text-emerald-700 font-medium">Today's Revenue</p>
            <p className="text-2xl font-bold text-emerald-800">${(stats.todayRevenue / 1000).toFixed(0)}K</p>
            <p className="text-xs text-emerald-600 mt-1">Target: $150K</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Department Performance */}
        <Card className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Department Performance
              </CardTitle>
              <Link href="/clinic">
                <Button variant="ghost" size="sm">
                  View Details
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {departmentMetrics.map((dept) => (
                <div key={dept.name} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${getStatusColor(dept.status)}`}>
                        {dept.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {dept.patients} patients
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {dept.waitTime} min wait
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {dept.trend === "up" && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <ArrowUpRight className="w-3 h-3" />
                          {Math.abs(dept.change)}%
                        </span>
                      )}
                      {dept.trend === "down" && (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                          <ArrowDownRight className="w-3 h-3" />
                          {Math.abs(dept.change)}%
                        </span>
                      )}
                      {dept.trend === "stable" && (
                        <span className="text-xs text-gray-500">Stable</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={dept.efficiency} className="flex-1" />
                    <span className="text-sm font-medium text-gray-700">{dept.efficiency}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Live Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[320px]">
              <div className="space-y-3">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className={`p-3 rounded-lg ${activity.bgColor}`}>
                    <div className="flex items-start gap-3">
                      <activity.icon className={`w-4 h-4 mt-0.5 ${activity.color}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-4 gap-4">
        {/* Appointments Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Today's Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Total Scheduled</span>
                <span className="font-semibold">{stats.todayAppointments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Completed</span>
                <span className="font-semibold text-green-600">{stats.completedAppointments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Upcoming</span>
                <span className="font-semibold text-blue-600">{stats.upcomingAppointments}</span>
              </div>
              <Link href="/appointments">
                <Button variant="outline" size="sm" className="w-full mt-2">
                  Manage Appointments
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Reports Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-600" />
              Reports Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Pending Review</span>
                <span className="font-semibold text-yellow-600">{stats.pendingReports}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Finalized Today</span>
                <span className="font-semibold text-green-600">{stats.finalizedReports}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Critical Findings</span>
                <span className="font-semibold text-red-600">{stats.criticalFindings}</span>
              </div>
              <Link href="/reports">
                <Button variant="outline" size="sm" className="w-full mt-2">
                  View Reports
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* AI Analytics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-600" />
              AI Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {aiAnalytics.slice(0, 3).map((ai, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">{ai.type}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{ai.count}</Badge>
                    <span className="text-xs text-green-600">{ai.accuracy}%</span>
                  </div>
                </div>
              ))}
              <Link href="/radiology-hub">
                <Button variant="outline" size="sm" className="w-full mt-2">
                  AI Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Score */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              Compliance & Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Compliance Score</span>
                <span className="font-semibold text-green-600">{stats.complianceScore}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Security Events</span>
                <span className="font-semibold text-yellow-600">{stats.securityEvents}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Audit Logs Today</span>
                <span className="font-semibold">{stats.auditLogsToday}</span>
              </div>
              <Link href="/audit">
                <Button variant="outline" size="sm" className="w-full mt-2">
                  Audit Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-6 gap-4">
          <Link href="/workspace">
            <Card className="hover:shadow-lg transition-all cursor-pointer hover:scale-105">
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="text-sm font-medium">Patients</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/radiology-hub">
            <Card className="hover:shadow-lg transition-all cursor-pointer hover:scale-105">
              <CardContent className="p-4 text-center">
                <Brain className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <p className="text-sm font-medium">Radiology</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/appointments">
            <Card className="hover:shadow-lg transition-all cursor-pointer hover:scale-105">
              <CardContent className="p-4 text-center">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">Schedule</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/consultation">
            <Card className="hover:shadow-lg transition-all cursor-pointer hover:scale-105">
              <CardContent className="p-4 text-center">
                <MessageSquare className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                <p className="text-sm font-medium">Consults</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/staff">
            <Card className="hover:shadow-lg transition-all cursor-pointer hover:scale-105">
              <CardContent className="p-4 text-center">
                <UserCheck className="w-6 h-6 mx-auto mb-2 text-pink-600" />
                <p className="text-sm font-medium">Staff</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/clinic">
            <Card className="hover:shadow-lg transition-all cursor-pointer hover:scale-105">
              <CardContent className="p-4 text-center">
                <Building2 className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
                <p className="text-sm font-medium">Clinic</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}