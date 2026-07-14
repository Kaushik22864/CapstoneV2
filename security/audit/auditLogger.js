/**
 * @fileoverview Audit Logger
 * @description HIPAA-compliant audit logging functions
 * @module security/audit/auditLogger
 * 
 * HIPAA COMPLIANCE:
 * This module implements audit controls required by:
 * - 45 CFR § 164.312(b) - Audit Controls
 * - 45 CFR § 164.308(a)(1)(ii)(D) - Information System Activity Review
 * 
 * USAGE:
 *   const { logAuditEvent, logAccessDenied } = require('./auditLogger');
 *   
 *   logAuditEvent({
 *     event: AUDIT_EVENTS.LOGIN_SUCCESS,
 *     userId: user._id,
 *     req: req,
 *     meta: { email: user.email }
 *   });
 */

'use strict';

const crypto = require('crypto');
const { getEventSeverity, getEventCategory } = require('./auditEvents');

/**
 * Configuration
 */
const config = {
    // Integrity key for HMAC (should come from env in production)
    integrityKey: process.env.AUDIT_INTEGRITY_KEY || 'audit-log-integrity-key',
    // Whether to log to console (useful for development)
    consoleOutput: process.env.NODE_ENV !== 'production',
    // Fields to redact from logs
    sensitiveFields: ['password', 'token', 'secret', 'authorization', 'cookie', 'ssn', 'creditCard']
};

/**
 * In-memory log buffer (for batching writes in production)
 * In production, this would write to a database or log service
 */
const logBuffer = [];

/**
 * Generates unique event ID
 * @returns {string} Unique event identifier
 */
function generateEventId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `AUD-${timestamp}-${random}`.toUpperCase();
}

/**
 * Generates integrity hash for log entry
 * @param {Object} entry - Log entry
 * @returns {string} HMAC hash (first 16 chars)
 */
function generateIntegrityHash(entry) {
    const data = JSON.stringify(entry);
    return crypto
        .createHmac('sha256', config.integrityKey)
        .update(data)
        .digest('hex')
        .substring(0, 16);
}

/**
 * Extracts client information from request
 * @param {Object} req - Express request object
 * @returns {Object} Client info
 */
function extractClientInfo(req) {
    if (!req) return {};

    return {
        ip: req.ip || req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.connection?.remoteAddress || 'unknown',
        userAgent: req.headers?.['user-agent'] || 'unknown',
        method: req.method,
        path: req.originalUrl || req.url,
        referer: req.headers?.referer || null
    };
}

/**
 * Sanitizes metadata to remove sensitive information
 * @param {Object} meta - Metadata object
 * @returns {Object} Sanitized metadata
 */
function sanitizeMetadata(meta) {
    if (!meta || typeof meta !== 'object') return meta;

    const sanitized = { ...meta };

    for (const field of config.sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }

    // Recursively sanitize nested objects
    for (const [key, value] of Object.entries(sanitized)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            sanitized[key] = sanitizeMetadata(value);
        }
    }

    return sanitized;
}

/**
 * Main audit logging function
 * 
 * @param {Object} options - Logging options
 * @param {string} options.event - Event type (from AUDIT_EVENTS)
 * @param {string} [options.userId] - User ID performing the action
 * @param {Object} [options.req] - Express request object
 * @param {number} [options.statusCode] - HTTP status code
 * @param {string} [options.level] - Log level override
 * @param {Object} [options.meta] - Additional metadata
 * @param {string} [options.targetUserId] - User being affected (for admin actions)
 * @param {string} [options.resourceType] - Type of resource accessed
 * @param {string} [options.resourceId] - ID of resource accessed
 * @returns {string} Event ID
 * 
 * @example
 * logAuditEvent({
 *   event: AUDIT_EVENTS.VERIFICATION_APPROVED,
 *   userId: adminId,
 *   req: req,
 *   targetUserId: doctorId,
 *   meta: { licenseNumber: '12345' }
 * });
 */
function logAuditEvent(options) {
    const {
        event,
        userId = null,
        req = null,
        statusCode = null,
        level = null,
        meta = {},
        targetUserId = null,
        resourceType = null,
        resourceId = null
    } = options;

    const eventId = generateEventId();
    const timestamp = new Date().toISOString();
    const clientInfo = extractClientInfo(req);
    const severity = level || getEventSeverity(event);
    const category = getEventCategory(event);

    // Build log entry
    const entry = {
        eventId,
        timestamp,
        event,
        category,
        severity,
        userId: userId?.toString() || req?.user?.id?.toString() || 'anonymous',
        targetUserId: targetUserId?.toString() || null,
        client: {
            ip: clientInfo.ip,
            userAgent: clientInfo.userAgent
        },
        request: {
            method: clientInfo.method,
            path: clientInfo.path,
            statusCode
        },
        resource: resourceType ? { type: resourceType, id: resourceId?.toString() } : null,
        meta: sanitizeMetadata(meta)
    };

    // Generate integrity hash
    entry.integrity = generateIntegrityHash(entry);

    // Output to console in development
    if (config.consoleOutput) {
        const levelColors = {
            critical: '\x1b[31m', // Red
            high: '\x1b[33m',     // Yellow
            medium: '\x1b[36m',   // Cyan
            low: '\x1b[37m',      // White
            info: '\x1b[90m'      // Gray
        };
        const reset = '\x1b[0m';
        const color = levelColors[severity] || reset;

        console.log(`${color}[AUDIT]${reset} ${timestamp} [${severity.toUpperCase()}] ${event} - User: ${entry.userId} - ${clientInfo.path || 'N/A'}`);
    }

    // Add to buffer (in production, this would write to persistent storage)
    logBuffer.push(entry);

    // Keep buffer size manageable
    if (logBuffer.length > 10000) {
        logBuffer.shift();
    }

    return eventId;
}

/**
 * Logs access denied events with standardized format
 * 
 * @param {Object} options - Options
 * @param {string} options.reason - Reason code (AUTH, RBAC, RATE_LIMIT, etc.)
 * @param {Object} options.req - Express request object
 * @param {string} [options.userId] - User ID if known
 * @param {string} [options.requiredRole] - Role that was required
 * @param {string} [options.requiredPermission] - Permission that was required
 * @returns {string} Event ID
 */
function logAccessDenied(options) {
    const {
        reason,
        req,
        userId = null,
        requiredRole = null,
        requiredPermission = null
    } = options;

    const eventMap = {
        'AUTH': 'AUTHZ_ACCESS_DENIED',
        'RBAC': 'AUTHZ_INSUFFICIENT_ROLE',
        'PERMISSION': 'AUTHZ_ACCESS_DENIED',
        'RATE_LIMIT': 'SEC_RATE_LIMIT_EXCEEDED',
        'VERIFICATION': 'AUTHZ_VERIFICATION_REQUIRED'
    };

    return logAuditEvent({
        event: eventMap[reason] || 'AUTHZ_ACCESS_DENIED',
        userId,
        req,
        statusCode: reason === 'RATE_LIMIT' ? 429 : 403,
        level: 'high',
        meta: {
            denialReason: reason,
            requiredRole,
            requiredPermission,
            userRole: req?.user?.role
        }
    });
}

/**
 * Logs authentication events
 * 
 * @param {Object} options - Options
 * @param {boolean} options.success - Whether auth succeeded
 * @param {string} [options.email] - Email attempted
 * @param {string} [options.userId] - User ID if successful
 * @param {Object} options.req - Express request
 * @param {string} [options.failureReason] - Why auth failed
 * @returns {string} Event ID
 */
function logAuthEvent(options) {
    const { success, email, userId, req, failureReason } = options;

    return logAuditEvent({
        event: success ? 'AUTH_LOGIN_SUCCESS' : 'AUTH_LOGIN_FAILURE',
        userId: userId || null,
        req,
        statusCode: success ? 200 : 401,
        level: success ? 'medium' : 'high',
        meta: {
            email: email ? `${email.substring(0, 3)}***` : null, // Partial email for privacy
            failureReason: success ? null : failureReason
        }
    });
}

/**
 * Logs data access events (HIPAA requirement)
 * 
 * @param {Object} options - Options
 * @param {string} options.action - read, create, update, delete
 * @param {string} options.resourceType - Type of resource
 * @param {string} options.resourceId - Resource ID
 * @param {Object} options.req - Express request
 * @param {Array} [options.fields] - Fields accessed (for partial reads)
 * @returns {string} Event ID
 */
function logDataAccess(options) {
    const { action, resourceType, resourceId, req, fields } = options;

    const eventMap = {
        'read': 'DATA_READ',
        'create': 'DATA_CREATED',
        'update': 'DATA_UPDATED',
        'delete': 'DATA_DELETED',
        'export': 'DATA_EXPORTED'
    };

    return logAuditEvent({
        event: eventMap[action] || 'DATA_READ',
        userId: req?.user?.id,
        req,
        resourceType,
        resourceId,
        meta: { fields }
    });
}

/**
 * Logs verification workflow events
 * 
 * @param {Object} options - Options
 * @param {string} options.action - submitted, approved, rejected
 * @param {string} options.doctorId - Doctor user ID
 * @param {string} [options.adminId] - Admin who took action
 * @param {Object} options.req - Express request
 * @param {string} [options.reason] - Reason for rejection
 * @returns {string} Event ID
 */
function logVerificationEvent(options) {
    const { action, doctorId, adminId, req, reason } = options;

    const eventMap = {
        'submitted': 'VERIFY_SUBMITTED',
        'approved': 'VERIFY_APPROVED',
        'rejected': 'VERIFY_REJECTED',
        'document_uploaded': 'VERIFY_DOCUMENT_UPLOADED'
    };

    return logAuditEvent({
        event: eventMap[action] || 'VERIFY_SUBMITTED',
        userId: adminId || req?.user?.id,
        req,
        targetUserId: doctorId,
        level: 'medium',
        meta: { reason }
    });
}

/**
 * Logs security-related events
 * 
 * @param {Object} options - Options
 * @param {string} options.event - Security event type
 * @param {Object} options.req - Express request
 * @param {Object} [options.details] - Additional details
 * @returns {string} Event ID
 */
function logSecurityEvent(options) {
    const { event, req, details } = options;

    return logAuditEvent({
        event,
        req,
        level: 'high',
        meta: details
    });
}

/**
 * Verifies integrity of a log entry
 * 
 * @param {Object} entry - Log entry to verify
 * @returns {boolean} True if integrity check passes
 */
function verifyLogIntegrity(entry) {
    if (!entry.integrity) return false;

    const entryCopy = { ...entry };
    delete entryCopy.integrity;

    const expectedHash = generateIntegrityHash(entryCopy);
    return entry.integrity === expectedHash;
}

/**
 * Gets recent audit logs (for admin interface)
 * In production, this would query the database
 * 
 * @param {Object} filters - Query filters
 * @param {number} [filters.limit=100] - Max results
 * @param {string} [filters.userId] - Filter by user
 * @param {string} [filters.event] - Filter by event type
 * @returns {Array} Log entries
 */
function getRecentLogs(filters = {}) {
    const { limit = 100, userId, event } = filters;

    let results = [...logBuffer];

    if (userId) {
        results = results.filter(e => e.userId === userId);
    }

    if (event) {
        results = results.filter(e => e.event === event);
    }

    return results.slice(-limit).reverse();
}

/**
 * Clears log buffer (for testing)
 */
function clearLogBuffer() {
    logBuffer.length = 0;
}

module.exports = {
    logAuditEvent,
    logAccessDenied,
    logAuthEvent,
    logDataAccess,
    logVerificationEvent,
    logSecurityEvent,
    verifyLogIntegrity,
    getRecentLogs,
    clearLogBuffer,
    generateEventId
};
