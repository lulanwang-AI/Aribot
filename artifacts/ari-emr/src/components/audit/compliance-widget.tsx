import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  FileText,
  Eye,
  Download,
  TrendingUp,
  Users,
  Lock,
  AlertCircle
} from "lucide-react";

interface ComplianceMetrics {
  hipaaScore: number;
  accessControlScore: number;
  auditTrailScore: number;
  dataEncryptionScore: number;
  incidentResponse: number;
  overallCompliance: number;
  lastAudit: string;
  nextAuditDue: string;
  criticalIssues: number;
  resolvedIssues: number;
  pendingReviews: number;
}

export default function ComplianceWidget() {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  // Mock compliance metrics - in production this would come from real compliance monitoring
  const complianceMetrics: ComplianceMetrics = {
    hipaaScore: 94,
    accessControlScore: 96,
    auditTrailScore: 98,
    dataEncryptionScore: 100,
    incidentResponse: 88,
    overallCompliance: 95,
    lastAudit: "2025-07-15",
    nextAuditDue: "2026-01-15",
    criticalIssues: 0,
    resolvedIssues: 12,
    pendingReviews: 2
  };

  const { data: recentAlerts = [] } = useQuery({
    queryKey: ["/api/audit/security-events", "recent"],
    queryFn: async () => {
      const params = new URLSearchParams({
        resolved: "false",
        severity: "high",
        limit: "5"
      });
      const response = await fetch(`/api/audit/security-events?${params}`);
      return response.json();
    }
  });

  const getScoreColor = (score: number) => {
    if (score >= 95) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 85) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (score >= 70) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getProgressColor = (score: number) => {
    if (score >= 95) return "bg-green-500";
    if (score >= 85) return "bg-yellow-500";
    if (score >= 70) return "bg-orange-500";
    return "bg-red-500";
  };

  const complianceAreas = [
    {
      key: "hipaa",
      title: "HIPAA Compliance",
      score: complianceMetrics.hipaaScore,
      icon: Shield,
      description: "Patient privacy and data protection standards"
    },
    {
      key: "access",
      title: "Access Control",
      score: complianceMetrics.accessControlScore,
      icon: Lock,
      description: "User authentication and authorization"
    },
    {
      key: "audit",
      title: "Audit Trail",
      score: complianceMetrics.auditTrailScore,
      icon: Eye,
      description: "Complete activity logging and monitoring"
    },
    {
      key: "encryption",
      title: "Data Encryption",
      score: complianceMetrics.dataEncryptionScore,
      icon: FileText,
      description: "Data encryption at rest and in transit"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overall Compliance Score */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-lg">
              <Shield className="w-6 h-6 text-blue-600" />
              Overall HIPAA Compliance Score
            </CardTitle>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1">
              Last Updated: Today
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2"
                  strokeDasharray={`${complianceMetrics.overallCompliance}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-green-600">
                  {complianceMetrics.overallCompliance}%
                </span>
              </div>
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <p className="text-sm font-medium text-gray-900">{complianceMetrics.resolvedIssues}</p>
                  <p className="text-xs text-gray-500">Issues Resolved</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <Clock className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                  <p className="text-sm font-medium text-gray-900">{complianceMetrics.pendingReviews}</p>
                  <p className="text-xs text-gray-500">Pending Reviews</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Next Audit Due:</span>
                <span className="font-medium text-gray-900">{complianceMetrics.nextAuditDue}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Areas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Compliance Area Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {complianceAreas.map((area) => (
            <div key={area.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <area.icon className="w-5 h-5 text-gray-600" />
                  <div>
                    <h4 className="font-medium text-sm">{area.title}</h4>
                    <p className="text-xs text-gray-500">{area.description}</p>
                  </div>
                </div>
                <Badge className={`${getScoreColor(area.score)} font-semibold`}>
                  {area.score}%
                </Badge>
              </div>
              <div className="relative">
                <Progress value={area.score} className="h-2" />
                <div 
                  className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-500 ${getProgressColor(area.score)}`}
                  style={{ width: `${area.score}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Recent Security Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAlerts.length > 0 ? (
            <div className="space-y-3">
              {recentAlerts.slice(0, 3).map((alert: any) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {alert.eventType.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm">No active security alerts</p>
              <p className="text-xs">All systems operating normally</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Quick Compliance Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="sm" className="justify-start">
              <FileText className="w-4 h-4 mr-2" />
              Generate HIPAA Report
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <Eye className="w-4 h-4 mr-2" />
              Review Access Logs
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <Download className="w-4 h-4 mr-2" />
              Export Audit Trail
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <Shield className="w-4 h-4 mr-2" />
              Security Assessment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}