import type { Request, Response, NextFunction } from "express";
import { AuditService } from "./audit-service";

// Extend Express Request interface to include audit context
declare global {
  namespace Express {
    interface Request {
      auditContext?: {
        userId?: string;
        sessionId?: string;
        startTime?: number;
      };
      user?: {
        id: string;
        [key: string]: any;
      };
      sessionID?: string;
    }
  }
}

// Middleware to set up audit context
export function auditContextMiddleware(req: Request, res: Response, next: NextFunction) {
  req.auditContext = {
    userId: req.user?.id || 'anonymous',
    sessionId: req.sessionID,
    startTime: Date.now()
  };
  
  next();
}

// Middleware to automatically log API actions
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Override response methods to capture response data
  res.send = function(data) {
    logAction(req, res, data);
    return originalSend.call(this, data);
  };
  
  res.json = function(data) {
    logAction(req, res, data);
    return originalJson.call(this, data);
  };
  
  next();
}

// Function to log the API action
async function logAction(req: Request, res: Response, responseData?: any) {
  try {
    const { method, path, body, query, params } = req;
    const { statusCode } = res;
    const userId = req.auditContext?.userId || 'anonymous';
    const sessionId = req.auditContext?.sessionId;
    const duration = req.auditContext?.startTime ? Date.now() - req.auditContext.startTime : 0;
    
    // Extract resource information from path
    const resourceInfo = extractResourceInfo(path, params);
    
    // Determine action based on HTTP method
    const action = getActionFromMethod(method, path);
    
    // Get client information
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    // Create audit details
    const details = {
      method,
      path,
      statusCode,
      duration,
      query: Object.keys(query || {}).length > 0 ? query : undefined,
      bodySize: body ? JSON.stringify(body).length : 0,
      responseSize: responseData ? JSON.stringify(responseData).length : 0,
      hasError: statusCode >= 400
    };

    // Log the action
    await AuditService.logAction({
      userId,
      action,
      resourceType: resourceInfo.type,
      resourceId: resourceInfo.id,
      details,
      ipAddress,
      userAgent,
      sessionId,
      severity: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warning' : 'info',
      complianceLevel: resourceInfo.type === 'patient' ? 'hipaa' : 'standard'
    });

    // Special handling for patient data access
    if (resourceInfo.type === 'patient' && method === 'GET' && statusCode < 400) {
      await AuditService.logDataAccess({
        userId,
        patientId: resourceInfo.id || 'unknown',
        accessType: 'view',
        dataType: getDataTypeFromPath(path),
        purpose: 'treatment', // Could be extracted from query params or headers
        duration: Math.round(duration / 1000),
        ipAddress,
        deviceInfo: {
          userAgent,
          platform: extractPlatform(userAgent || ''),
          browser: extractBrowser(userAgent || '')
        }
      });
    }
  } catch (error) {
    console.error('Audit logging failed:', error);
    // Don't fail the request if audit logging fails
  }
}

// Extract resource information from API path
function extractResourceInfo(path: string, params: any) {
  const segments = path.split('/').filter(Boolean);
  
  if (segments.includes('patients')) {
    return {
      type: 'patient',
      id: params?.id || params?.patientId || extractIdFromPath(path, 'patients')
    };
  }
  
  if (segments.includes('studies')) {
    return {
      type: 'study',
      id: params?.id || params?.studyId || extractIdFromPath(path, 'studies')
    };
  }
  
  if (segments.includes('reports')) {
    return {
      type: 'report',
      id: params?.id || params?.reportId || extractIdFromPath(path, 'reports')
    };
  }
  
  if (segments.includes('audit')) {
    return {
      type: 'audit',
      id: params?.id || null
    };
  }
  
  return {
    type: segments[1] || 'api',
    id: params?.id || null
  };
}

// Extract ID from path
function extractIdFromPath(path: string, resource: string): string | null {
  const regex = new RegExp(`/${resource}/([^/]+)`);
  const match = path.match(regex);
  return match ? match[1] : null;
}

// Get action type from HTTP method and path
function getActionFromMethod(method: string, path: string): string {
  const baseAction = {
    'GET': 'READ',
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE'
  }[method.toUpperCase()] || 'ACTION';
  
  // Add context from path
  if (path.includes('/login')) return 'LOGIN';
  if (path.includes('/logout')) return 'LOGOUT';
  if (path.includes('/download')) return 'DOWNLOAD';
  if (path.includes('/export')) return 'EXPORT';
  if (path.includes('/print')) return 'PRINT';
  
  return baseAction;
}

// Get data type from API path
function getDataTypeFromPath(path: string): string {
  if (path.includes('/studies')) return 'imaging_studies';
  if (path.includes('/reports')) return 'reports';
  if (path.includes('/demographics')) return 'demographics';
  if (path.includes('/notes')) return 'clinical_notes';
  if (path.includes('/patients')) return 'patient_data';
  return 'general';
}

// Extract platform information from User-Agent
function extractPlatform(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Macintosh')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  return 'Unknown';
}

// Extract browser information from User-Agent
function extractBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  return 'Unknown';
}

// Middleware for logging security events
export function securityEventMiddleware(eventType: string, severity: 'low' | 'medium' | 'high' | 'critical') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.auditContext?.userId;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      
      const details = {
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        additionalInfo: req.body || {}
      };

      await AuditService.logSecurityEvent({
        userId,
        eventType,
        severity,
        details,
        ipAddress,
        userAgent
      });
    } catch (error) {
      console.error('Security event logging failed:', error);
    }
    
    next();
  };
}

// Middleware for failed login attempts
export function failedLoginMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (res.statusCode === 401 || res.statusCode === 403) {
      // Log failed login attempt
      AuditService.logSecurityEvent({
        userId: req.body?.username || 'unknown',
        eventType: 'failed_login',
        severity: 'medium',
        details: {
          attemptedUsername: req.body?.username,
          path: req.path,
          timestamp: new Date().toISOString()
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      }).catch(error => {
        console.error('Failed login audit logging failed:', error);
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}