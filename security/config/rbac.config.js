/**
 * @fileoverview Role-Based Access Control (RBAC) Configuration
 * @description Defines roles, permissions, and access control rules
 * @module security/config/rbac.config
 * 
 * SECURITY NOTE: This configuration defines the authorization model.
 * Changes here directly impact who can access what resources.
 * Review all changes carefully before deployment.
 */

'use strict';

/**
 * User roles in the system
 * @enum {string}
 */
const ROLES = {
  ADMIN: 'Admin',
  DOCTOR: 'Doctor',
  UNVERIFIED: 'Unverified'
};

/**
 * Permission definitions
 * Each permission represents an action that can be performed
 * @enum {string}
 */
const PERMISSIONS = {
  // User management
  READ_USERS: 'read:users',
  CREATE_USERS: 'create:users',
  UPDATE_USERS: 'update:users',
  DELETE_USERS: 'delete:users',
  
  // Profile management
  READ_OWN_PROFILE: 'read:own_profile',
  UPDATE_OWN_PROFILE: 'update:own_profile',
  
  // Verification management
  SUBMIT_VERIFICATION: 'submit:verification',
  READ_VERIFICATION_REQUESTS: 'read:verification_requests',
  APPROVE_VERIFICATION: 'approve:verification',
  REJECT_VERIFICATION: 'reject:verification',
  
  // Document management
  UPLOAD_DOCUMENTS: 'upload:documents',
  READ_OWN_DOCUMENTS: 'read:own_documents',
  READ_ALL_DOCUMENTS: 'read:all_documents',
  DELETE_DOCUMENTS: 'delete:documents',
  
  // Patient data (for verified doctors)
  READ_PATIENTS: 'read:patients',
  CREATE_PATIENTS: 'create:patients',
  UPDATE_PATIENTS: 'update:patients',
  
  // Admin functions
  ACCESS_ADMIN_DASHBOARD: 'access:admin_dashboard',
  VIEW_AUDIT_LOGS: 'view:audit_logs',
  MANAGE_ROLES: 'manage:roles',
  SYSTEM_SETTINGS: 'manage:system_settings'
};

/**
 * Role-Permission mapping
 * Defines what permissions each role has
 * 
 * SECURITY PRINCIPLE: Least Privilege
 * Each role should have only the minimum permissions needed
 */
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    // Admin has all permissions
    PERMISSIONS.READ_USERS,
    PERMISSIONS.CREATE_USERS,
    PERMISSIONS.UPDATE_USERS,
    PERMISSIONS.DELETE_USERS,
    PERMISSIONS.READ_OWN_PROFILE,
    PERMISSIONS.UPDATE_OWN_PROFILE,
    PERMISSIONS.READ_VERIFICATION_REQUESTS,
    PERMISSIONS.APPROVE_VERIFICATION,
    PERMISSIONS.REJECT_VERIFICATION,
    PERMISSIONS.READ_ALL_DOCUMENTS,
    PERMISSIONS.DELETE_DOCUMENTS,
    PERMISSIONS.ACCESS_ADMIN_DASHBOARD,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.SYSTEM_SETTINGS
  ],
  
  [ROLES.DOCTOR]: [
    // Verified doctors can manage their profile and access patient data
    PERMISSIONS.READ_OWN_PROFILE,
    PERMISSIONS.UPDATE_OWN_PROFILE,
    PERMISSIONS.READ_OWN_DOCUMENTS,
    PERMISSIONS.READ_PATIENTS,
    PERMISSIONS.CREATE_PATIENTS,
    PERMISSIONS.UPDATE_PATIENTS
  ],
  
  [ROLES.UNVERIFIED]: [
    // Unverified users can only manage their profile and submit verification
    PERMISSIONS.READ_OWN_PROFILE,
    PERMISSIONS.UPDATE_OWN_PROFILE,
    PERMISSIONS.SUBMIT_VERIFICATION,
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.READ_OWN_DOCUMENTS
  ]
};

/**
 * Route protection rules
 * Maps route patterns to required roles/permissions
 * 
 * Format:
 * 'METHOD /path': { roles: [...], permissions: [...], options: {...} }
 */
const ROUTE_RULES = {
  // Public routes (no authentication required)
  'POST /api/auth/register': { public: true },
  'POST /api/auth/login': { public: true },
  'POST /api/specialists/register': { public: true },
  'POST /api/specialists/login': { public: true },
  'POST /api/auth/forgot-password': { public: true },
  'POST /api/auth/reset-password': { public: true },
  'GET /api/health': { public: true },
  
  // Authenticated routes (any logged-in user)
  'GET /api/auth/me': { authenticated: true },
  'POST /api/auth/logout': { authenticated: true },
  'POST /api/auth/refresh-token': { authenticated: true },
  
  // Profile routes
  'GET /api/profile': { authenticated: true },
  'PUT /api/profile': { 
    authenticated: true,
    permissions: [PERMISSIONS.UPDATE_OWN_PROFILE]
  },
  
  // Verification routes
  'POST /api/verification/submit': {
    roles: [ROLES.UNVERIFIED],
    permissions: [PERMISSIONS.SUBMIT_VERIFICATION]
  },
  'POST /api/verification/upload': {
    roles: [ROLES.UNVERIFIED],
    permissions: [PERMISSIONS.UPLOAD_DOCUMENTS]
  },
  'GET /api/verification/status': {
    roles: [ROLES.UNVERIFIED, ROLES.DOCTOR],
    authenticated: true
  },
  
  // Admin routes - Verification management
  'GET /api/admin/verification-requests': {
    roles: [ROLES.ADMIN],
    permissions: [PERMISSIONS.READ_VERIFICATION_REQUESTS]
  },
  'POST /api/admin/verify/:userId': {
    roles: [ROLES.ADMIN],
    permissions: [PERMISSIONS.APPROVE_VERIFICATION]
  },
  'POST /api/admin/reject/:userId': {
    roles: [ROLES.ADMIN],
    permissions: [PERMISSIONS.REJECT_VERIFICATION]
  },
  
  // Admin routes - User management
  'GET /api/admin/users': {
    roles: [ROLES.ADMIN],
    permissions: [PERMISSIONS.READ_USERS]
  },
  'GET /api/admin/users/:userId': {
    roles: [ROLES.ADMIN],
    permissions: [PERMISSIONS.READ_USERS]
  },
  'PUT /api/admin/users/:userId': {
    roles: [ROLES.ADMIN],
    permissions: [PERMISSIONS.UPDATE_USERS]
  },
  'DELETE /api/admin/users/:userId': {
    roles: [ROLES.ADMIN],
    permissions: [PERMISSIONS.DELETE_USERS]
  },
  
  // Admin routes - System
  'GET /api/admin/dashboard': {
    roles: [ROLES.ADMIN],
    permissions: [PERMISSIONS.ACCESS_ADMIN_DASHBOARD]
  },
  'GET /api/admin/audit-logs': {
    roles: [ROLES.ADMIN],
    permissions: [PERMISSIONS.VIEW_AUDIT_LOGS]
  },
  
  // Doctor routes (verified only)
  'GET /api/patients': {
    roles: [ROLES.DOCTOR],
    permissions: [PERMISSIONS.READ_PATIENTS],
    requireVerified: true
  },
  'POST /api/patients': {
    roles: [ROLES.DOCTOR],
    permissions: [PERMISSIONS.CREATE_PATIENTS],
    requireVerified: true
  },
  'PUT /api/patients/:patientId': {
    roles: [ROLES.DOCTOR],
    permissions: [PERMISSIONS.UPDATE_PATIENTS],
    requireVerified: true
  }
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean} True if role has permission
 */
function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return false;
  }
  return permissions.includes(permission);
}

/**
 * Check if a role has all specified permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} True if role has all permissions
 */
function hasAllPermissions(role, permissions) {
  return permissions.every(perm => hasPermission(role, perm));
}

/**
 * Check if a role has any of the specified permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} True if role has at least one permission
 */
function hasAnyPermission(role, permissions) {
  return permissions.some(perm => hasPermission(role, perm));
}

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {string[]} Array of permissions
 */
function getPermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Get route rule for a specific endpoint
 * @param {string} method - HTTP method
 * @param {string} path - Route path
 * @returns {Object|null} Route rule or null if not found
 */
function getRouteRule(method, path) {
  // First try exact match
  const exactKey = `${method.toUpperCase()} ${path}`;
  if (ROUTE_RULES[exactKey]) {
    return ROUTE_RULES[exactKey];
  }
  
  // Try pattern matching for parameterized routes
  for (const [pattern, rule] of Object.entries(ROUTE_RULES)) {
    const [ruleMethod, rulePath] = pattern.split(' ');
    if (ruleMethod !== method.toUpperCase()) continue;
    
    // Convert Express route pattern to regex
    const regexPattern = rulePath
      .replace(/:[^/]+/g, '[^/]+') // Replace :params with regex
      .replace(/\//g, '\\/'); // Escape forward slashes
    
    const regex = new RegExp(`^${regexPattern}$`);
    if (regex.test(path)) {
      return rule;
    }
  }
  
  return null;
}

/**
 * Validate role hierarchy
 * Admins are highest, followed by Doctors, then Unverified
 * @param {string} userRole - User's role
 * @param {string} requiredRole - Required role
 * @returns {boolean} True if user role meets requirement
 */
function meetsRoleRequirement(userRole, requiredRole) {
  const hierarchy = {
    [ROLES.ADMIN]: 3,
    [ROLES.DOCTOR]: 2,
    [ROLES.UNVERIFIED]: 1
  };
  
  return (hierarchy[userRole] || 0) >= (hierarchy[requiredRole] || 0);
}

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROUTE_RULES,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissions,
  getRouteRule,
  meetsRoleRequirement
};
