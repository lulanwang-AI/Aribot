import { AuditService } from "./audit-service";

// Seed sample audit data for demonstration
export async function seedAuditData() {
  try {
    console.log("Seeding audit data...");

    // Sample user actions
    const sampleActions = [
      {
        userId: "user_123",
        action: "LOGIN",
        resourceType: "authentication",
        resourceId: null,
        details: { loginMethod: "username_password", successfulAttempt: true },
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        severity: "info" as const,
        complianceLevel: "standard" as const
      },
      {
        userId: "user_456",
        action: "READ",
        resourceType: "patient",
        resourceId: "p1",
        details: { endpoint: "/api/patients/p1", duration: 2340 },
        ipAddress: "192.168.1.101",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        severity: "info" as const,
        complianceLevel: "hipaa" as const
      },
      {
        userId: "user_789",
        action: "UPDATE",
        resourceType: "report",
        resourceId: "r123",
        details: { changedFields: ["findings", "impression"] },
        ipAddress: "192.168.1.102",
        userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        severity: "info" as const,
        complianceLevel: "hipaa" as const
      }
    ];

    // Create audit logs
    for (const action of sampleActions) {
      await AuditService.logAction(action);
    }

    // Sample data access logs
    const sampleDataAccess = [
      {
        userId: "user_456",
        patientId: "p1",
        accessType: "view" as const,
        dataType: "imaging_studies" as const,
        purpose: "treatment" as const,
        duration: 300, // 5 minutes
        ipAddress: "192.168.1.101",
        location: "New York, NY",
        deviceInfo: {
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
          platform: "macOS",
          browser: "Chrome"
        }
      },
      {
        userId: "user_789",
        patientId: "p2",
        accessType: "download" as const,
        dataType: "reports" as const,
        purpose: "treatment" as const,
        duration: 45,
        ipAddress: "192.168.1.102",
        location: "Boston, MA",
        deviceInfo: {
          userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
          platform: "Linux",
          browser: "Firefox"
        }
      }
    ];

    for (const access of sampleDataAccess) {
      await AuditService.logDataAccess(access);
    }

    // Sample security events
    const sampleSecurityEvents = [
      {
        userId: "unknown_user",
        eventType: "failed_login",
        severity: "medium" as const,
        details: {
          attemptedUsername: "admin",
          consecutiveFailures: 3,
          ipAddress: "203.0.113.1",
          blocked: true
        },
        ipAddress: "203.0.113.1",
        userAgent: "curl/7.64.1"
      },
      {
        userId: "user_456",
        eventType: "password_change",
        severity: "low" as const,
        details: {
          passwordStrengthScore: 85,
          requiresMultiFactor: true
        },
        ipAddress: "192.168.1.101",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
      }
    ];

    for (const event of sampleSecurityEvents) {
      await AuditService.logSecurityEvent(event);
    }

    // Generate a sample compliance report
    await AuditService.generateComplianceReport({
      reportType: "hipaa_access",
      generatedBy: "system",
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        end: new Date()
      },
      filters: {}
    });

    console.log("Audit data seeded successfully!");
    
    return {
      auditLogs: sampleActions.length,
      dataAccessLogs: sampleDataAccess.length,
      securityEvents: sampleSecurityEvents.length,
      complianceReports: 1
    };

  } catch (error) {
    console.error("Failed to seed audit data:", error);
    throw error;
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAuditData().then((result) => {
    console.log("Seeding completed:", result);
    process.exit(0);
  }).catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
}