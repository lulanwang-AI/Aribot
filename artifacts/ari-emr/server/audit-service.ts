import { db } from "./db";
import { auditLogs, dataAccessLogs, securityEvents, complianceReports } from "@shared/schema";
import type { 
  InsertAuditLog, 
  InsertDataAccessLog, 
  InsertSecurityEvent,
  InsertComplianceReport 
} from "@shared/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export class AuditService {
  // Log general system actions
  static async logAction({
    userId,
    action,
    resourceType,
    resourceId,
    details,
    ipAddress,
    userAgent,
    sessionId,
    severity = "info",
    complianceLevel = "standard"
  }: InsertAuditLog) {
    try {
      const [logEntry] = await db
        .insert(auditLogs)
        .values({
          userId,
          action,
          resourceType,
          resourceId,
          details,
          ipAddress,
          userAgent,
          sessionId,
          severity,
          complianceLevel
        })
        .returning();
      
      return logEntry;
    } catch (error) {
      console.error("Failed to create audit log:", error);
      throw error;
    }
  }

  // Log patient data access for HIPAA compliance
  static async logDataAccess({
    userId,
    patientId,
    accessType,
    dataType,
    purpose,
    duration,
    ipAddress,
    location,
    deviceInfo
  }: InsertDataAccessLog) {
    try {
      const [logEntry] = await db
        .insert(dataAccessLogs)
        .values({
          userId,
          patientId,
          accessType,
          dataType,
          purpose,
          duration,
          ipAddress,
          location,
          deviceInfo
        })
        .returning();

      // Also create a general audit log for this data access
      await this.logAction({
        userId,
        action: `DATA_ACCESS_${accessType.toUpperCase()}`,
        resourceType: "patient_data",
        resourceId: patientId,
        details: {
          dataType,
          purpose,
          duration,
          location
        },
        ipAddress,
        severity: "info",
        complianceLevel: "hipaa"
      });
      
      return logEntry;
    } catch (error) {
      console.error("Failed to create data access log:", error);
      throw error;
    }
  }

  // Log security events
  static async logSecurityEvent({
    userId,
    eventType,
    severity,
    details,
    ipAddress,
    userAgent
  }: InsertSecurityEvent) {
    try {
      const [logEntry] = await db
        .insert(securityEvents)
        .values({
          userId,
          eventType,
          severity,
          details,
          ipAddress,
          userAgent
        })
        .returning();

      // Also create a general audit log for this security event
      await this.logAction({
        userId: userId || "system",
        action: `SECURITY_EVENT_${eventType.toUpperCase()}`,
        resourceType: "security",
        resourceId: logEntry.id,
        details,
        ipAddress,
        userAgent,
        severity,
        complianceLevel: "audit"
      });
      
      return logEntry;
    } catch (error) {
      console.error("Failed to create security event log:", error);
      throw error;
    }
  }

  // Get audit logs with filtering
  static async getAuditLogs({
    userId,
    resourceType,
    action,
    startDate,
    endDate,
    severity,
    limit = 100
  }: {
    userId?: string;
    resourceType?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    severity?: string;
    limit?: number;
  }) {
    try {
      const conditions = [];
      
      if (userId) conditions.push(eq(auditLogs.userId, userId));
      if (resourceType) conditions.push(eq(auditLogs.resourceType, resourceType));
      if (action) conditions.push(eq(auditLogs.action, action));
      if (severity) conditions.push(eq(auditLogs.severity, severity));
      if (startDate) conditions.push(gte(auditLogs.timestamp, startDate));
      if (endDate) conditions.push(lte(auditLogs.timestamp, endDate));

      const logs = await db
        .select()
        .from(auditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(auditLogs.timestamp))
        .limit(limit);

      return logs;
    } catch (error) {
      console.error("Failed to retrieve audit logs:", error);
      throw error;
    }
  }

  // Get data access logs for HIPAA compliance
  static async getDataAccessLogs({
    userId,
    patientId,
    accessType,
    startDate,
    endDate,
    limit = 100
  }: {
    userId?: string;
    patientId?: string;
    accessType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    try {
      const conditions = [];
      
      if (userId) conditions.push(eq(dataAccessLogs.userId, userId));
      if (patientId) conditions.push(eq(dataAccessLogs.patientId, patientId));
      if (accessType) conditions.push(eq(dataAccessLogs.accessType, accessType));
      if (startDate) conditions.push(gte(dataAccessLogs.timestamp, startDate));
      if (endDate) conditions.push(lte(dataAccessLogs.timestamp, endDate));

      const logs = await db
        .select()
        .from(dataAccessLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(dataAccessLogs.timestamp))
        .limit(limit);

      return logs;
    } catch (error) {
      console.error("Failed to retrieve data access logs:", error);
      throw error;
    }
  }

  // Get security events
  static async getSecurityEvents({
    userId,
    eventType,
    severity,
    resolved,
    startDate,
    endDate,
    limit = 100
  }: {
    userId?: string;
    eventType?: string;
    severity?: string;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    try {
      const conditions = [];
      
      if (userId) conditions.push(eq(securityEvents.userId, userId));
      if (eventType) conditions.push(eq(securityEvents.eventType, eventType));
      if (severity) conditions.push(eq(securityEvents.severity, severity));
      if (resolved !== undefined) conditions.push(eq(securityEvents.resolved, resolved));
      if (startDate) conditions.push(gte(securityEvents.timestamp, startDate));
      if (endDate) conditions.push(lte(securityEvents.timestamp, endDate));

      const events = await db
        .select()
        .from(securityEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(securityEvents.timestamp))
        .limit(limit);

      return events;
    } catch (error) {
      console.error("Failed to retrieve security events:", error);
      throw error;
    }
  }

  // Generate compliance report
  static async generateComplianceReport({
    reportType,
    generatedBy,
    dateRange,
    filters = {}
  }: {
    reportType: string;
    generatedBy: string;
    dateRange: { start: Date; end: Date };
    filters?: Record<string, any>;
  }) {
    try {
      let reportData: any = {};

      switch (reportType) {
        case "hipaa_access":
          const accessLogs = await this.getDataAccessLogs({
            startDate: dateRange.start,
            endDate: dateRange.end,
            ...filters
          });
          
          reportData = {
            totalAccesses: accessLogs.length,
            accessesByType: this.groupBy(accessLogs, 'accessType'),
            accessesByUser: this.groupBy(accessLogs, 'userId'),
            accessesByPatient: this.groupBy(accessLogs, 'patientId'),
            averageDuration: accessLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / accessLogs.length,
            accessLogs: accessLogs.slice(0, 1000) // Limit for report size
          };
          break;

        case "security_audit":
          const securityEventsList = await this.getSecurityEvents({
            startDate: dateRange.start,
            endDate: dateRange.end,
            ...filters
          });
          
          reportData = {
            totalEvents: securityEventsList.length,
            eventsBySeverity: this.groupBy(securityEventsList, 'severity'),
            eventsByType: this.groupBy(securityEventsList, 'eventType'),
            unresolvedEvents: securityEventsList.filter(e => !e.resolved).length,
            criticalEvents: securityEventsList.filter(e => e.severity === 'critical').length,
            events: securityEventsList.slice(0, 1000)
          };
          break;

        case "user_activity":
          const auditLogsList = await this.getAuditLogs({
            startDate: dateRange.start,
            endDate: dateRange.end,
            ...filters
          });
          
          reportData = {
            totalActions: auditLogsList.length,
            actionsByUser: this.groupBy(auditLogsList, 'userId'),
            actionsByType: this.groupBy(auditLogsList, 'action'),
            actionsByResource: this.groupBy(auditLogsList, 'resourceType'),
            logs: auditLogsList.slice(0, 1000)
          };
          break;

        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      const [report] = await db
        .insert(complianceReports)
        .values({
          reportType,
          generatedBy,
          dateRange,
          filters,
          reportData
        })
        .returning();

      return report;
    } catch (error) {
      console.error("Failed to generate compliance report:", error);
      throw error;
    }
  }

  // Utility function for grouping data
  private static groupBy(array: any[], key: string) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown';
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }

  // Get compliance reports
  static async getComplianceReports({
    reportType,
    generatedBy,
    limit = 50
  }: {
    reportType?: string;
    generatedBy?: string;
    limit?: number;
  } = {}) {
    try {
      const conditions = [];
      
      if (reportType) conditions.push(eq(complianceReports.reportType, reportType));
      if (generatedBy) conditions.push(eq(complianceReports.generatedBy, generatedBy));

      const reports = await db
        .select()
        .from(complianceReports)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(complianceReports.createdAt))
        .limit(limit);

      return reports;
    } catch (error) {
      console.error("Failed to retrieve compliance reports:", error);
      throw error;
    }
  }

  // Resolve security event
  static async resolveSecurityEvent(eventId: string, resolvedBy: string) {
    try {
      const [updatedEvent] = await db
        .update(securityEvents)
        .set({
          resolved: true,
          resolvedBy,
          resolvedAt: new Date()
        })
        .where(eq(securityEvents.id, eventId))
        .returning();

      // Log the resolution
      await this.logAction({
        userId: resolvedBy,
        action: "SECURITY_EVENT_RESOLVED",
        resourceType: "security",
        resourceId: eventId,
        details: { eventId },
        severity: "info",
        complianceLevel: "audit"
      });

      return updatedEvent;
    } catch (error) {
      console.error("Failed to resolve security event:", error);
      throw error;
    }
  }
}