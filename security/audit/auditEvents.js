/**
 * @fileoverview Audit Event Constants
 * @description Centralized audit event type definitions for HIPAA compliance
 * @module security/audit/auditEvents
 * 
 * HIPAA COMPLIANCE:
 * These event types support the audit controls required by 
 * 45 CFR § 164.312(b) - Audit Controls
 * 
 * USAGE:
 *   const { AUDIT_EVENTS } = require('./auditEvents');
 *   logAuditEvent({ event: AUDIT_EVENTS.LOGIN_SUCCESS, ... });
 */

'use strict';

/**
 * Audit Event Types
 * Organized by category for easy reference
 */
const AUDIT_EVENTS = {
    // ═══════════════════════════════════════════════════════════════════════════
    // AUTHENTICATION EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /** User successfully logged in */
    LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',

    /** Login attempt failed (wrong password, user not found, etc.) */
    LOGIN_FAILURE: 'AUTH_LOGIN_FAILURE',

    /** User logged out */
    LOGOUT: 'AUTH_LOGOUT',

    /** User logged out from all devices */
    LOGOUT_ALL: 'AUTH_LOGOUT_ALL',

    /** Password changed successfully */
    PASSWORD_CHANGED: 'AUTH_PASSWORD_CHANGED',

    /** Password reset requested */
    PASSWORD_RESET_REQUESTED: 'AUTH_PASSWORD_RESET_REQUESTED',

    /** Password reset completed */
    PASSWORD_RESET_COMPLETED: 'AUTH_PASSWORD_RESET_COMPLETED',

    /** New user registered */
    REGISTRATION: 'AUTH_REGISTRATION',

    /** Email verification completed */
    EMAIL_VERIFIED: 'AUTH_EMAIL_VERIFIED',

    /** Access token refreshed */
    TOKEN_REFRESHED: 'AUTH_TOKEN_REFRESHED',

    /** Token validation failed (invalid signature, malformed) */
    TOKEN_INVALID: 'AUTH_TOKEN_INVALID',

    /** Token has expired */
    TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',

    /** Token was revoked/blacklisted */
    TOKEN_REVOKED: 'AUTH_TOKEN_REVOKED',

    // ═══════════════════════════════════════════════════════════════════════════
    // AUTHORIZATION EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Access granted to resource */
    ACCESS_GRANTED: 'AUTHZ_ACCESS_GRANTED',

    /** Access denied to resource */
    ACCESS_DENIED: 'AUTHZ_ACCESS_DENIED',

    /** User role was changed */
    ROLE_CHANGED: 'AUTHZ_ROLE_CHANGED',

    /** Permission added or removed */
    PERMISSION_CHANGED: 'AUTHZ_PERMISSION_CHANGED',

    /** Attempted to access resource without proper role */
    INSUFFICIENT_ROLE: 'AUTHZ_INSUFFICIENT_ROLE',

    /** Attempted to access resource without verification */
    VERIFICATION_REQUIRED: 'AUTHZ_VERIFICATION_REQUIRED',

    // ═══════════════════════════════════════════════════════════════════════════
    // USER MANAGEMENT EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /** New user account created */
    USER_CREATED: 'USER_CREATED',

    /** User profile updated */
    USER_UPDATED: 'USER_UPDATED',

    /** User account deleted */
    USER_DELETED: 'USER_DELETED',

    /** User account activated */
    USER_ACTIVATED: 'USER_ACTIVATED',

    /** User account deactivated/suspended */
    USER_DEACTIVATED: 'USER_DEACTIVATED',

    /** User account locked (too many failed attempts) */
    USER_LOCKED: 'USER_LOCKED',

    /** User account unlocked */
    USER_UNLOCKED: 'USER_UNLOCKED',

    // ═══════════════════════════════════════════════════════════════════════════
    // VERIFICATION WORKFLOW EVENTS (Doctor Verification Specific)
    // ═══════════════════════════════════════════════════════════════════════════

    /** Verification request submitted */
    VERIFICATION_SUBMITTED: 'VERIFY_SUBMITTED',

    /** Verification document uploaded */
    VERIFICATION_DOCUMENT_UPLOADED: 'VERIFY_DOCUMENT_UPLOADED',

    /** Verification request approved by admin */
    VERIFICATION_APPROVED: 'VERIFY_APPROVED',

    /** Verification request rejected by admin */
    VERIFICATION_REJECTED: 'VERIFY_REJECTED',

    /** Verification request marked for review */
    VERIFICATION_PENDING_REVIEW: 'VERIFY_PENDING_REVIEW',

    /** Admin viewed verification request */
    VERIFICATION_VIEWED: 'VERIFY_VIEWED',

    /** Verification document downloaded/viewed by admin */
    VERIFICATION_DOCUMENT_ACCESSED: 'VERIFY_DOCUMENT_ACCESSED',

    // ═══════════════════════════════════════════════════════════════════════════
    // DATA ACCESS EVENTS (HIPAA PHI Access Logging)
    // ═══════════════════════════════════════════════════════════════════════════

    /** Data read/viewed */
    DATA_READ: 'DATA_READ',

    /** Data created */
    DATA_CREATED: 'DATA_CREATED',

    /** Data updated/modified */
    DATA_UPDATED: 'DATA_UPDATED',

    /** Data deleted */
    DATA_DELETED: 'DATA_DELETED',

    /** Data exported */
    DATA_EXPORTED: 'DATA_EXPORTED',

    /** Data printed */
    DATA_PRINTED: 'DATA_PRINTED',

    /** Bulk data access */
    DATA_BULK_ACCESS: 'DATA_BULK_ACCESS',

    // ═══════════════════════════════════════════════════════════════════════════
    // FILE EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /** File uploaded successfully */
    FILE_UPLOADED: 'FILE_UPLOADED',

    /** File upload rejected (wrong type, too large, malicious) */
    FILE_REJECTED: 'FILE_REJECTED',

    /** File downloaded */
    FILE_DOWNLOADED: 'FILE_DOWNLOADED',

    /** File deleted */
    FILE_DELETED: 'FILE_DELETED',

    /** Malicious file detected */
    FILE_MALICIOUS: 'FILE_MALICIOUS',

    // ═══════════════════════════════════════════════════════════════════════════
    // SECURITY EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Rate limit exceeded */
    RATE_LIMIT_EXCEEDED: 'SEC_RATE_LIMIT_EXCEEDED',

    /** Brute force attack detected */
    BRUTE_FORCE_DETECTED: 'SEC_BRUTE_FORCE_DETECTED',

    /** Suspicious activity detected */
    SUSPICIOUS_ACTIVITY: 'SEC_SUSPICIOUS_ACTIVITY',

    /** Potential injection attack */
    INJECTION_ATTEMPT: 'SEC_INJECTION_ATTEMPT',

    /** XSS attempt detected */
    XSS_ATTEMPT: 'SEC_XSS_ATTEMPT',

    /** CSRF token mismatch */
    CSRF_MISMATCH: 'SEC_CSRF_MISMATCH',

    /** Insecure connection attempt (HTTP in production) */
    INSECURE_ACCESS_ATTEMPT: 'SEC_INSECURE_ACCESS',

    /** Invalid input detected */
    INVALID_INPUT: 'SEC_INVALID_INPUT',

    /** Configuration change */
    CONFIG_CHANGED: 'SEC_CONFIG_CHANGED',

    // ═══════════════════════════════════════════════════════════════════════════
    // SYSTEM EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Application started */
    SYSTEM_STARTUP: 'SYS_STARTUP',

    /** Application shutdown */
    SYSTEM_SHUTDOWN: 'SYS_SHUTDOWN',

    /** Health check performed */
    HEALTH_CHECK: 'SYS_HEALTH_CHECK',

    /** Error occurred */
    ERROR: 'SYS_ERROR',

    /** Database connection event */
    DB_CONNECTION: 'SYS_DB_CONNECTION',

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Admin accessed dashboard */
    ADMIN_DASHBOARD_ACCESS: 'ADMIN_DASHBOARD_ACCESS',

    /** Admin viewed user list */
    ADMIN_USER_LIST_VIEWED: 'ADMIN_USER_LIST_VIEWED',

    /** Admin viewed user details */
    ADMIN_USER_VIEWED: 'ADMIN_USER_VIEWED',

    /** Admin modified user */
    ADMIN_USER_MODIFIED: 'ADMIN_USER_MODIFIED',

    /** Admin viewed audit logs */
    ADMIN_AUDIT_LOGS_VIEWED: 'ADMIN_AUDIT_LOGS_VIEWED',

    /** Admin changed system settings */
    ADMIN_SETTINGS_CHANGED: 'ADMIN_SETTINGS_CHANGED'
};

/**
 * Event severity levels
 */
const EVENT_SEVERITY = {
    CRITICAL: 'critical',  // Security breaches, system compromises
    HIGH: 'high',          // Failed auth, unauthorized access attempts
    MEDIUM: 'medium',      // Successful auth, role changes
    LOW: 'low',            // Normal operations
    INFO: 'info'           // Informational events
};

/**
 * Maps events to their default severity
 */
const EVENT_SEVERITY_MAP = {
    // Critical
    [AUDIT_EVENTS.BRUTE_FORCE_DETECTED]: EVENT_SEVERITY.CRITICAL,
    [AUDIT_EVENTS.FILE_MALICIOUS]: EVENT_SEVERITY.CRITICAL,
    [AUDIT_EVENTS.INJECTION_ATTEMPT]: EVENT_SEVERITY.CRITICAL,

    // High
    [AUDIT_EVENTS.LOGIN_FAILURE]: EVENT_SEVERITY.HIGH,
    [AUDIT_EVENTS.TOKEN_INVALID]: EVENT_SEVERITY.HIGH,
    [AUDIT_EVENTS.ACCESS_DENIED]: EVENT_SEVERITY.HIGH,
    [AUDIT_EVENTS.RATE_LIMIT_EXCEEDED]: EVENT_SEVERITY.HIGH,
    [AUDIT_EVENTS.SUSPICIOUS_ACTIVITY]: EVENT_SEVERITY.HIGH,
    [AUDIT_EVENTS.USER_LOCKED]: EVENT_SEVERITY.HIGH,

    // Medium
    [AUDIT_EVENTS.LOGIN_SUCCESS]: EVENT_SEVERITY.MEDIUM,
    [AUDIT_EVENTS.LOGOUT]: EVENT_SEVERITY.MEDIUM,
    [AUDIT_EVENTS.PASSWORD_CHANGED]: EVENT_SEVERITY.MEDIUM,
    [AUDIT_EVENTS.ROLE_CHANGED]: EVENT_SEVERITY.MEDIUM,
    [AUDIT_EVENTS.VERIFICATION_APPROVED]: EVENT_SEVERITY.MEDIUM,
    [AUDIT_EVENTS.VERIFICATION_REJECTED]: EVENT_SEVERITY.MEDIUM,

    // Low
    [AUDIT_EVENTS.ACCESS_GRANTED]: EVENT_SEVERITY.LOW,
    [AUDIT_EVENTS.DATA_READ]: EVENT_SEVERITY.LOW,
    [AUDIT_EVENTS.FILE_UPLOADED]: EVENT_SEVERITY.LOW,
    [AUDIT_EVENTS.FILE_DOWNLOADED]: EVENT_SEVERITY.LOW,

    // Info
    [AUDIT_EVENTS.HEALTH_CHECK]: EVENT_SEVERITY.INFO,
    [AUDIT_EVENTS.SYSTEM_STARTUP]: EVENT_SEVERITY.INFO
};

/**
 * Gets the default severity for an event type
 * @param {string} eventType - Event type constant
 * @returns {string} Severity level
 */
function getEventSeverity(eventType) {
    return EVENT_SEVERITY_MAP[eventType] || EVENT_SEVERITY.LOW;
}

/**
 * Categories for grouping events in reports
 */
const EVENT_CATEGORIES = {
    AUTHENTICATION: 'Authentication',
    AUTHORIZATION: 'Authorization',
    USER_MANAGEMENT: 'User Management',
    VERIFICATION: 'Verification Workflow',
    DATA_ACCESS: 'Data Access',
    FILE_OPERATIONS: 'File Operations',
    SECURITY: 'Security',
    SYSTEM: 'System',
    ADMIN: 'Administration'
};

/**
 * Maps events to categories
 * @param {string} eventType - Event type constant
 * @returns {string} Category name
 */
function getEventCategory(eventType) {
    if (eventType.startsWith('AUTH_')) return EVENT_CATEGORIES.AUTHENTICATION;
    if (eventType.startsWith('AUTHZ_')) return EVENT_CATEGORIES.AUTHORIZATION;
    if (eventType.startsWith('USER_')) return EVENT_CATEGORIES.USER_MANAGEMENT;
    if (eventType.startsWith('VERIFY_')) return EVENT_CATEGORIES.VERIFICATION;
    if (eventType.startsWith('DATA_')) return EVENT_CATEGORIES.DATA_ACCESS;
    if (eventType.startsWith('FILE_')) return EVENT_CATEGORIES.FILE_OPERATIONS;
    if (eventType.startsWith('SEC_')) return EVENT_CATEGORIES.SECURITY;
    if (eventType.startsWith('SYS_')) return EVENT_CATEGORIES.SYSTEM;
    if (eventType.startsWith('ADMIN_')) return EVENT_CATEGORIES.ADMIN;
    return 'Other';
}

module.exports = {
    AUDIT_EVENTS,
    EVENT_SEVERITY,
    EVENT_CATEGORIES,
    getEventSeverity,
    getEventCategory
};
