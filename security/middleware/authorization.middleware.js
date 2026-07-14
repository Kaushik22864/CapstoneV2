/**
 * @fileoverview Authorization Middleware (RBAC)
 * @description Granular Role-Based Access Control for route protection
 * @module security/middleware/authorization.middleware
 */

'use strict';

const { SecurityError } = require('./authentication.middleware');
const { logAccessDenied, logAuditEvent } = require('../audit/auditLogger');
const { AUDIT_EVENTS } = require('../audit/auditEvents');
const { 
  ROLES, 
  hasPermission, 
  hasAnyPermission, 
  getRouteRule 
} = require('../config/rbac.config');

/**
 * requireRole
 * Requires a specific role (e.g., Admin).
 */
function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new SecurityError('Authentication context missing.', 500));
    }

    if (req.user.role !== requiredRole) {
      logAccessDenied({
        reason: 'RBAC_ROLE_MISMATCH',
        req,
        userId: req.user.id,
        meta: { userRole: req.user.role, requiredRole }
      });

      return next(new SecurityError('Access denied. Insufficient role.', 403));
    }
    next();
  };
}

/**
 * requireAnyRole
 * Requires any one of the specified roles.
 */
function requireAnyRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new SecurityError('Authentication context missing.', 500));
    }

    const { role, id } = req.user;
    if (!allowedRoles.includes(role)) {
      logAccessDenied({
        reason: 'RBAC_VIOLATION',
        req,
        userId: id,
        meta: { userRole: role, requiredRoles: allowedRoles }
      });

      return next(new SecurityError('Access denied. Role not authorized.', 403));
    }
    next();
  };
}

/**
 * requirePermission
 * Checks for specific granular permissions.
 */
function requirePermission(requiredPermissions, options = { requireAll: true }) {
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

  return (req, res, next) => {
    if (!req.user) {
      return next(new SecurityError('Authentication context missing.', 500));
    }

    const userRole = req.user.role;
    const hasAccess = options.requireAll
      ? permissions.every(perm => hasPermission(userRole, perm))
      : hasAnyPermission(userRole, permissions);

    if (!hasAccess) {
      logAccessDenied({
        reason: 'PERMISSION_DENIED',
        req,
        userId: req.user.id,
        meta: { userRole, requiredPermissions: permissions }
      });

      return next(new SecurityError('Access denied. Missing required permissions.', 403));
    }
    next();
  };
}

/**
 * requireVerified
 * Ensures the doctor has been approved by an Admin.
 */
function requireVerified(req, res, next) {
  if (!req.user) return next(new SecurityError('Authentication context missing.', 500));

  if (req.user.status !== 'Approved') {
    logAccessDenied({ reason: 'STATUS_UNVERIFIED', req, userId: req.user.id });
    return next(new SecurityError('Account verification required.', 403));
  }
  next();
}

/**
 * requireOwnership
 * Ensures users can only access their own resources (e.g., their own profile).
 */
function requireOwnership(paramName) {
  return (req, res, next) => {
    if (!req.user) return next(new SecurityError('Authentication context missing.', 500));

    const resourceUserId = req.params[paramName];
    if (req.user.role === ROLES.ADMIN) return next();

    if (req.user.id !== resourceUserId) {
      logAccessDenied({
        reason: 'OWNERSHIP_VIOLATION',
        req,
        userId: req.user.id,
        meta: { attemptedResourceId: resourceUserId }
      });
      return next(new SecurityError('Access denied. Ownership required.', 403));
    }
    next();
  };
}

/**
 * enforceRouteRules
 * Dynamic authorization based on the ROUTE_RULES in rbac.config.js.
 */
function enforceRouteRules(req, res, next) {
  const rule = getRouteRule(req.method, req.path);

  if (!rule) {
    if (process.env.NODE_ENV === 'production') {
      logAuditEvent({
        event: AUDIT_EVENTS.UNPROTECTED_ROUTE_ACCESS,
        req,
        level: 'warn'
      });
      return next(new SecurityError('Access denied.', 403));
    }
    return next();
  }

  if (rule.public) return next();

  if (rule.authenticated && !req.user) {
    return next(new SecurityError('Authentication required.', 401));
  }

  // Role check
  if (rule.roles && rule.roles.length > 0) {
    if (!req.user || !rule.roles.includes(req.user.role)) {
      logAccessDenied({
        reason: 'ROLE_CHECK_FAILED',
        req,
        userId: req.user?.id,
        meta: { userRole: req.user?.role, requiredRoles: rule.roles }
      });
      return next(new SecurityError('Insufficient role.', 403));
    }
  }

  // Permission check
  if (rule.permissions && rule.permissions.length > 0) {
    const hasAllPerms = rule.permissions.every(perm => hasPermission(req.user.role, perm));
    if (!hasAllPerms) {
      logAccessDenied({
        reason: 'PERMISSION_CHECK_FAILED',
        req,
        userId: req.user.id,
        meta: { userRole: req.user.role, requiredPermissions: rule.permissions }
      });
      return next(new SecurityError('Insufficient permissions.', 403));
    }
  }

  // Verification check
  if (rule.requireVerified && req.user.status !== 'Approved') {
    return next(new SecurityError('Account verification required.', 403));
  }

  next();
}

/**
 * requireAdmin
 * Convenience middleware for strictly Admin routes.
 */
function requireAdmin(req, res, next) {
  if (!req.user) return next(new SecurityError('Authentication required.', 401));
  
  if (req.user.role !== ROLES.ADMIN) {
    logAccessDenied({
      reason: 'ADMIN_REQUIRED',
      req,
      userId: req.user.id
    });
    return next(new SecurityError('Administrator access required.', 403));
  }
  next();
}

module.exports = { 
  requireRole, 
  requireAnyRole, 
  requirePermission, 
  requireVerified, 
  requireOwnership,
  requireAdmin,
  enforceRouteRules,
  ROLES
};