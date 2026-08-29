import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { 
  Shield,
  AlertTriangle,
  FileText,
  Eye,
  Download,
  Clock,
  User,
  Filter,
  Calendar as CalendarIcon,
  Activity,
  CheckCircle,
  XCircle,
  TrendingUp,
  Database,
  Lock,
  AlertCircle,
  Zap
} from "lucide-react";
import type { AuditLog, DataAccessLog, SecurityEvent, ComplianceReport } from "@/shared/schema";

export default function AuditDashboard() {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    to: new Date()
  });
  const [filters, setFilters] = useState({
    severity: "all",
    userId: "all",
    resourceType: "all"
  });

  // Fetch audit logs
  const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
    queryKey: ["/api/audit/logs", dateRange, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        limit: "500"
      });
      
      if (filters.severity !== "all") params.append("severity", filters.severity);
      if (filters.userId !== "all") params.append("userId", filters.userId);
      if (filters.resourceType !== "all") params.append("resourceType", filters.resourceType);
      
      const response = await fetch(`/api/audit/logs?${params}`);
      return response.json();
    }
  });

  // Fetch data access logs
  const { data: dataAccessLogs = [], isLoading: accessLoading } = useQuery({
    queryKey: ["/api/audit/data-access", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        limit: "200"
      });
      
      const response = await fetch(`/api/audit/data-access?${params}`);
      return response.json();
    }
  });

  // Fetch security events
  const { data: securityEvents = [], isLoading: securityLoading } = useQuery({
    queryKey: ["/api/audit/security-events", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        limit: "100"
      });
      
      const response = await fetch(`/api/audit/security-events?${params}`);
      return response.json();
    }
  });

  // Fetch compliance reports
  const { data: complianceReports = [] } = useQuery({
    queryKey: ["/api/compliance/reports"],
    queryFn: async () => {
      const response = await fetch("/api/compliance/reports?limit=20");
      return response.json();
    }
  });

  // Generate compliance report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (reportData: {
      reportType: string;
      dateRange: { start: string; end: string };
      generatedBy: string;
    }) => {
      const response = await fetch("/api/compliance/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/reports"] });
    }
  });

  // Resolve security event mutation
  const resolveEventMutation = useMutation({
    mutationFn: async ({ eventId, resolvedBy }: { eventId: string; resolvedBy: string }) => {
      const response = await fetch(`/api/audit/security-events/${eventId}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolvedBy })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit/security-events"] });
    }
  });

  // Calculate dashboard statistics
  const stats = {
    totalLogs: auditLogs.length,
    criticalEvents: securityEvents.filter((e: SecurityEvent) => e.severity === 'critical').length,
    unresolvedEvents: securityEvents.filter((e: SecurityEvent) => !e.resolved).length,
    dataAccesses: dataAccessLogs.length,
    uniqueUsers: new Set(auditLogs.map((log: AuditLog) => log.userId)).size,
    patientAccesses: new Set(dataAccessLogs.map((log: DataAccessLog) => log.patientId)).size
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'error': return 'bg-red-100 text-red-700 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <Activity className="w-4 h-4 text-blue-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Audit & Compliance
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-72">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            
            <Button
              onClick={() => generateReportMutation.mutate({
                reportType: "hipaa_access",
                dateRange: {
                  start: dateRange.from.toISOString(),
                  end: dateRange.to.toISOString()
                },
                generatedBy: "current_user"
              })}
              disabled={generateReportMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate HIPAA Report
            </Button>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="px-6 py-2 bg-white border-b flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span><span className="font-semibold text-foreground">{stats.totalLogs.toLocaleString()}</span> audit logs</span>
        <span className="text-border">·</span>
        <span className={stats.criticalEvents > 0 ? "text-red-600" : ""}><span className="font-semibold">{stats.criticalEvents}</span> critical</span>
        <span className="text-border">·</span>
        <span className={stats.unresolvedEvents > 0 ? "text-amber-600" : ""}><span className="font-semibold">{stats.unresolvedEvents}</span> unresolved</span>
        <span className="text-border">·</span>
        <span><span className="font-semibold text-foreground">{stats.dataAccesses.toLocaleString()}</span> data accesses</span>
        <span className="text-border">·</span>
        <span><span className="font-semibold text-foreground">{stats.uniqueUsers}</span> active users</span>
        <span className="text-border">·</span>
        <span><span className="font-semibold text-foreground">{stats.patientAccesses}</span> patients accessed</span>
      </div>

      {/* Main Content Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
          <div className="px-6 py-3 bg-white border-b">
            <TabsList className="grid grid-cols-5 w-fit">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="audit-logs" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Audit Logs
              </TabsTrigger>
              <TabsTrigger value="data-access" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Data Access
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Security Events
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Compliance Reports
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <TabsContent value="overview" className="h-full p-6">
              <div className="grid grid-cols-2 gap-6 h-full">
                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-80">
                      <div className="space-y-3">
                        {auditLogs.slice(0, 10).map((log: AuditLog) => (
                          <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            {getSeverityIcon(log.severity || 'info')}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{log.action}</p>
                              <p className="text-xs text-gray-600">
                                {log.resourceType} • {new Date(log.timestamp).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">User: {log.userId}</p>
                            </div>
                            <Badge className={getSeverityColor(log.severity || 'info')}>
                              {log.severity}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
                
                {/* Critical Alerts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      Security Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-80">
                      <div className="space-y-3">
                        {securityEvents
                          .filter((event: SecurityEvent) => !event.resolved)
                          .slice(0, 8)
                          .map((event: SecurityEvent) => (
                            <div key={event.id} className="flex items-start gap-3 p-3 border-l-4 border-red-500 bg-red-50 rounded">
                              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{event.eventType.replace(/_/g, ' ').toUpperCase()}</p>
                                <p className="text-xs text-gray-600">
                                  {new Date(event.timestamp).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500">User: {event.userId || 'System'}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resolveEventMutation.mutate({
                                  eventId: event.id,
                                  resolvedBy: "current_user"
                                })}
                                disabled={resolveEventMutation.isPending}
                              >
                                Resolve
                              </Button>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Additional tab contents would be implemented here */}
            <TabsContent value="audit-logs" className="h-full p-6">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>System Audit Logs</CardTitle>
                    <div className="flex items-center gap-4">
                      <Select value={filters.severity} onValueChange={(value) => setFilters({...filters, severity: value})}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Severity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Levels</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filters.resourceType} onValueChange={(value) => setFilters({...filters, resourceType: value})}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Resource Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Resources</SelectItem>
                          <SelectItem value="patient">Patient Data</SelectItem>
                          <SelectItem value="study">Imaging Studies</SelectItem>
                          <SelectItem value="report">Reports</SelectItem>
                          <SelectItem value="security">Security</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="h-full p-0">
                  <ScrollArea className="h-full p-6">
                    <div className="space-y-2">
                      {auditLogs.map((log: AuditLog) => (
                        <div key={log.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50">
                          {getSeverityIcon(log.severity || 'info')}
                          <div className="flex-1 grid grid-cols-6 gap-4">
                            <div>
                              <p className="font-medium text-sm">{log.action}</p>
                              <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm">{log.resourceType}</p>
                              <p className="text-xs text-gray-500">{log.resourceId}</p>
                            </div>
                            <div>
                              <p className="text-sm">{log.userId}</p>
                              <p className="text-xs text-gray-500">{log.ipAddress}</p>
                            </div>
                            <div>
                              <Badge className={getSeverityColor(log.severity || 'info')}>
                                {log.severity}
                              </Badge>
                            </div>
                            <div>
                              <Badge variant="outline">{log.complianceLevel}</Badge>
                            </div>
                            <div>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}