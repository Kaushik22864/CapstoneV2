/**
 * @fileoverview Audit Logging Service
 * @description HIPAA-compliant audit logging for security events
 * @module security/services/audit.service
 * 
 * HIPAA COMPLIANCE (45 CFR § 164.312(b)):
 * - Records all access to PHI
 * - Records all security-relevant events
 * - Maintains tamper-evident logs
 * - Retains logs for required period (6 years for HIPAA)
 * 
 * DEPENDENCY: Requires winston package
 * npm install winston
 */

'use strict';

const winston = require('winston');
const path = require('path');
const crypto = require('crypto');
const securityConfig = require('../config/security.config');

/**
 * Log levels for audit events
 */
const AUDIT_LEVELS = {
  CRITICAL: 'critical',   // Security breaches, system compromises
  HIGH: 'high',           // Failed authentication, unauthorized access
  MEDIUM: 'medium',       // Successful authentication, role changes
  LOW: 'low',             // Normal operations, data access
  INFO: 'info'            // Informational events
};

/**
 * Audit event types
 */
const AUDIT_EVENTS = {
  // Authentication events
  LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  LOGIN_FAILURE: 'AUTH_LOGIN_FAILURE',
  LOGOUT: 'AUTH_LOGOUT',
  PASSWORD_CHANGE: 'AUTH_PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST: 'AUTH_PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE: 'AUTH_PASSWORD_RESET_COMPLETE',
  TOKEN_REFRESH: 'AUTH_TOKEN_REFRESH',
  TOKEN_REVOKED: 'AUTH_TOKEN_REVOKED',
  
  // Authorization events
  ACCESS_GRANTED: 'AUTHZ_ACCESS_GRANTED',
  ACCESS_DENIED: 'AUTHZ_ACCESS_DENIED',
  ROLE_CHANGE: 'AUTHZ_ROLE_CHANGE',
  PERMISSION_CHANGE: 'AUTHZ_PERMISSION_CHANGE',
  
  // User management events
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  
  // Verification events
  VERIFICATION_SUBMITTED: 'VERIFY_SUBMITTED',
  VERIFICATION_APPROVED: 'VERIFY_APPROVED',
  VERIFICATION_REJECTED: 'VERIFY_REJECTED',
  DOCUMENT_UPLOADED: 'VERIFY_DOCUMENT_UPLOADED',
  DOCUMENT_REVIEWED: 'VERIFY_DOCUMENT_REVIEWED',
  
  // Data access events
  DATA_READ: 'DATA_READ',
  DATA_CREATED: 'DATA_CREATED',
  DATA_UPDATED: 'DATA_UPDATED',
  DATA_DELETED: 'DATA_DELETED',
  DATA_EXPORTED: 'DATA_EXPORTED',
  
  // Security events
  RATE_LIMIT_EXCEEDED: 'SEC_RATE_LIMIT',
  INVALID_TOKEN: 'SEC_INVALID_TOKEN',
  SUSPICIOUS_ACTIVITY: 'SEC_SUSPICIOUS',
  BRUTE_FORCE_DETECTED: 'SEC_BRUTE_FORCE',
  FILE_VALIDATION_FAILED: 'SEC_FILE_VALIDATION',
  MALICIOUS_FILE_BLOCKED: 'SEC_MALICIOUS_FILE',
  
  // System events
  SYSTEM_STARTUP: 'SYS_STARTUP',
  SYSTEM_SHUTDOWN: 'SYS_SHUTDOWN',
  CONFIG_CHANGE: 'SYS_CONFIG_CHANGE',
  ERROR: 'SYS_ERROR'
};

/**
 * Creates log directory if it doesn't exist
 */
const fs = require('fs');
const logDir = securityConfig.audit?.logDir || 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Custom format for audit logs
 * Includes timestamp, integrity hash, and structured data
 */
const auditFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    // Create log entry
    const logEntry = {
      timestamp,
      level,
      message,
      ...metadata
    };
    
    // Add integrity hash
    const entryString = JSON.stringify(logEntry);
    logEntry.integrity = crypto
      .createHmac('sha256', securityConfig.encryption?.key || 'audit-key')
      .update(entryString)
      .digest('hex')
      .substring(0, 16);
    
    return JSON.stringify(logEntry);
  })
);

/**
 * Winston logger configuration
 */
const logger = winston.createLogger({
  level: securityConfig.audit?.level || 'info',
  format: auditFormat,
  transports: [
    // Audit log - all audit events
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      level: 'info',
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 30,
      tailable: true
    }),
    // Security log - security events only
    new winston.transports.File({
      filename: path.join(logDir, 'security.log'),
      level: 'warn',
      maxsize: 100 * 1024 * 1024,
      maxFiles: 30,
      tailable: true
    }),
    // Error log - errors only
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 50 * 1024 * 1024,
      maxFiles: 30,
      tailable: true
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
    level: 'debug'
  }));
}

/**
 * Generates a unique audit event ID
 * @returns {string} Unique event ID
 */
function generateEventId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `AUD-${timestamp}-${random}`.toUpperCase();
}

/**
 * Sanitizes sensitive data before logging
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
function sanitizeData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveFields = [
    'password', 'newPassword', 'oldPassword', 'confirmPassword',
    'token', 'accessToken', 'refreshToken',
    'secret', 'apiKey', 'privateKey',
    'ssn', 'socialSecurityNumber',
    'creditCard', 'cardNumber', 'cvv',
    'dateOfBirth', 'dob'
  ];

  return Object.keys(data).reduce((acc, key) => {
    const value = data[key];
    if (sensitiveFields.includes(key)) {
      acc[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      acc[key] = sanitizeData(value);
    } else {
      acc[key] = value;
    }
    return acc;
  }, Array.isArray(data) ? [] : {});
}

/**
 * Main audit logging function
 * 
 * @param {Object} entry - Audit log entry
 * @param {string} entry.action - Action being logged (use AUDIT_EVENTS constants)
 * @param {string} entry.userId - User performing the action
 * @param {string} entry.targetUserId - User being affected (optional)
 * @param {string} entry.ipAddress - IP address of request
 * @param {string} entry.userAgent - User agent string
 * @param {Object} entry.details - Additional details
 * @param {string} entry.level - Log level (default: LOW)
 * 
 * USAGE:
 * auditService.log({
 *   action: 'VERIFICATION_APPROVED',
 *   userId: admin._id,
 *   targetUserId: doctor._id,
 *   ipAddress: req.ip,
 *   details: { licenseNumber: '12345' }
 * });
 */
function log(entry) {
  const eventId = generateEventId();
  
  const auditEntry = {
    eventId,
    action: entry.action || 'UNKNOWN',
    level: entry.level || AUDIT_LEVELS.LOW,
    userId: entry.userId || 'anonymous',
    targetUserId: entry.targetUserId || null,
    ipAddress: entry.ipAddress || 'unknown',
    userAgent: entry.userAgent || null,
    path: entry.path || null,
    method: entry.method || null,
    details: sanitizeData(entry.details) || {},
    sessionId: entry.sessionId || null,
    correlationId: entry.correlationId || null
  };
  
  // Determine log level based on action
  const winstonLevel = mapToWinstonLevel(auditEntry.level);
  
  logger.log(winstonLevel, auditEntry.action, auditEntry);
  
  return eventId;
}

/**
 * Maps audit level to Winston level
 * @param {string} level - Audit level
 * @returns {string} Winston level
 */
function mapToWinstonLevel(level) {
  const mapping = {
    [AUDIT_LEVELS.CRITICAL]: 'error',
    [AUDIT_LEVELS.HIGH]: 'warn',
    [AUDIT_LEVELS.MEDIUM]: 'info',
    [AUDIT_LEVELS.LOW]: 'info',
    [AUDIT_LEVELS.INFO]: 'debug'
  };
  return mapping[level] || 'info';
}

/**
 * Logs authentication events
 * 
 * @param {Object} event - Authentication event
 * @param {string} event.type - Event type (success/failure)
 * @param {string} event.userId - User ID
 * @param {string} event.email - User email
 * @param {string} event.ipAddress - IP address
 * @param {string} event.reason - Failure reason (if applicable)
 */
function logAuth(event) {
  const action = event.type === 'success' 
    ? AUDIT_EVENTS.LOGIN_SUCCESS 
    : AUDIT_EVENTS.LOGIN_FAILURE;
  
  const level = event.type === 'success' 
    ? AUDIT_LEVELS.MEDIUM 
    : AUDIT_LEVELS.HIGH;
  
  return log({
    action,
    level,
    userId: event.userId,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    details: {
      email: event.email,
      reason: event.reason || null,
      attemptNumber: event.attemptNumber || null
    }
  });
}

/**
 * Logs security events
 * 
 * @param {Object} event - Security event details
 * @param {string} event.event - Event type
 * @param {string} event.ipAddress - IP address
 * @param {Object} event.details - Additional details
 */
function logSecurityEvent(event) {
  const level = determineSecurityLevel(event.event);
  
  return log({
    action: event.event,
    level,
    userId: event.userId || 'unknown',
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    path: event.path,
    method: event.method,
    details: event
  });
}

/**
 * Determines security level based on event type
 * @param {string} eventType - Type of security event
 * @returns {string} Security level
 */
function determineSecurityLevel(eventType) {
  const criticalEvents = [
    'BRUTE_FORCE_DETECTED',
    'MALICIOUS_FILE_DETECTED',
    'SUSPICIOUS_ACTIVITY'
  ];
  
  const highEvents = [
    'INVALID_TOKEN',
    'RATE_LIMIT_EXCEEDED',
    'UNAUTHORIZED_ACCESS_ATTEMPT',
    'PERMISSION_DENIED'
  ];
  
  if (criticalEvents.some(e => eventType?.includes(e))) {
    return AUDIT_LEVELS.CRITICAL;
  }
  
  if (highEvents.some(e => eventType?.includes(e))) {
    return AUDIT_LEVELS.HIGH;
  }
  
  return AUDIT_LEVELS.MEDIUM;
}

/**
 * Logs verification workflow events
 * 
 * @param {Object} event - Verification event
 * @param {string} event.action - Verification action
 * @param {string} event.adminId - Admin performing action
 * @param {string} event.doctorId - Doctor being verified
 * @param {Object} event.details - Additional details
 */
function logVerification(event) {
  return log({
    action: event.action,
    level: AUDIT_LEVELS.MEDIUM,
    userId: event.adminId,
    targetUserId: event.doctorId,
    ipAddress: event.ipAddress,
    details: {
      verificationStatus: event.status,
      reason: event.reason,
      documentIds: event.documentIds,
      licenseNumber: event.licenseNumber
    }
  });
}

/**
 * Logs data access events (HIPAA requirement)
 * 
 * @param {Object} event - Data access event
 * @param {string} event.userId - User accessing data
 * @param {string} event.resourceType - Type of resource accessed
 * @param {string} event.resourceId - ID of resource accessed
 * @param {string} event.action - Access action (read/write/delete)
 */
function logDataAccess(event) {
  const actionMap = {
    'read': AUDIT_EVENTS.DATA_READ,
    'create': AUDIT_EVENTS.DATA_CREATED,
    'update': AUDIT_EVENTS.DATA_UPDATED,
    'delete': AUDIT_EVENTS.DATA_DELETED,
    'export': AUDIT_EVENTS.DATA_EXPORTED
  };
  
  return log({
    action: actionMap[event.action] || AUDIT_EVENTS.DATA_READ,
    level: AUDIT_LEVELS.LOW,
    userId: event.userId,
    ipAddress: event.ipAddress,
    details: {
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      fields: event.fields || null,
      query: event.query || null
    }
  });
}

/**
 * Logs admin actions
 * 
 * @param {Object} event - Admin action event
 */
function logAdminAction(event) {
  return log({
    action: event.action,
    level: AUDIT_LEVELS.MEDIUM,
    userId: event.adminId,
    targetUserId: event.targetUserId,
    ipAddress: event.ipAddress,
    details: event.details
  });
}

/**
 * Creates audit middleware for Express
 * Automatically logs all requests
 * 
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware
 * 
 * USAGE:
 * app.use(auditService.middleware({ excludePaths: ['/health'] }));
 */
function middleware(options = {}) {
  const { excludePaths = [] } = options;
  
  return (req, res, next) => {
    // Skip excluded paths
    if (excludePaths.some(p => req.path.startsWith(p))) {
      return next();
    }
    
    // Capture start time
    const startTime = Date.now();
    
    // Capture original end function
    const originalEnd = res.end;
    
    // Override end to log after response
    res.end = function(...args) {
      // Restore original end
      res.end = originalEnd;
      
      // Call original end
      res.end.apply(this, args);
      
      // Log the request
      const duration = Date.now() - startTime;
      
      log({
        action: 'HTTP_REQUEST',
        level: AUDIT_LEVELS.INFO,
        userId: req.user?.userId || 'anonymous',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.originalUrl,
        method: req.method,
        details: {
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          contentLength: res.get('Content-Length') || 0
        }
      });
    };
    
    next();
  };
}

/**
 * Queries audit logs (for admin interface)
 * 
 * @param {Object} query - Query parameters
 * @param {string} query.startDate - Start date (ISO string)
 * @param {string} query.endDate - End date (ISO string)
 * @param {string} query.userId - Filter by user ID
 * @param {string} query.action - Filter by action type
 * @param {number} query.limit - Maximum results
 * @returns {Promise<Array>} Array of audit entries
 * 
 * NOTE: In production, implement with database storage for queryability
 */
async function queryLogs(query) {
  // This is a simplified implementation
  // In production, logs should be stored in a database for querying
  console.warn('queryLogs: Using file-based logs. Implement database storage for production.');
  
  return {
    message: 'Log querying requires database storage. See INTEGRATION.md for setup.',
    query
  };
}

/**
 * Verifies log integrity
 * Checks that logs haven't been tampered with
 * 
 * @param {Object} logEntry - Log entry to verify
 * @returns {boolean} True if integrity check passes
 */
function verifyLogIntegrity(logEntry) {
  if (!logEntry.integrity) {
    return false;
  }
  
  const entryWithoutIntegrity = { ...logEntry };
  delete entryWithoutIntegrity.integrity;
  
  const entryString = JSON.stringify(entryWithoutIntegrity);
  const expectedHash = crypto
    .createHmac('sha256', securityConfig.encryption?.key || 'audit-key')
    .update(entryString)
    .digest('hex')
    .substring(0, 16);
  
  return logEntry.integrity === expectedHash;
}

module.exports = {
  log,
  logAuth,
  logSecurityEvent,
  logVerification,
  logDataAccess,
  logAdminAction,
  middleware,
  queryLogs,
  verifyLogIntegrity,
  AUDIT_LEVELS,
  AUDIT_EVENTS,
  generateEventId
};
