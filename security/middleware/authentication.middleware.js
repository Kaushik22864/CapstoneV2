
/**
 * security/middleware/authentication.middleware.js
 *
 * Express middleware that validates the JWT on every protected route.
 * Attaches the decoded user payload to req.user for downstream handlers.
 *
 * INJECTION POINT (server.js):
 *   const { authenticationMiddleware } = require('./security/middleware/authenticationMiddleware');
 *   app.use('/api/scan',   authenticationMiddleware, scanRouter);
 *   app.use('/api/admin',  authenticationMiddleware, adminRouter);
 *
 * THREAT MODEL:
 *   - Token is read from Authorization header only (not cookies or query
 *     params) to prevent CSRF and accidental token logging in server logs.
 *   - JsonWebTokenError and TokenExpiredError are caught and re-thrown as
 *     safe SecurityError objects so the global error handler can return
 *     consistent, non-leaking responses.
 *   - The DB lookup on every request confirms the user's CURRENT role and
 *     approval status — a role change by the admin takes effect immediately
 *     on the next request without waiting for the token to expire.
 *
 * CONNECTION LOGIC:
 *   This middleware uses Dependency Injection. Ensure the User model is 
 *   injected in server.js: app.set('UserModel', User);
 *   
 *   Expected model interface: .findById().select('role status').lean()
 */
 
'use strict';
 
const jwt = require('jsonwebtoken');
const securityConfig = require('../config/security.config');
const { verifyAccessToken, extractBearerToken } = require('../utils/tokenUtils');
const { logAuditEvent, logAccessDenied }         = require('../audit/auditLogger');
const { AUDIT_EVENTS }                           = require('../audit/auditEvents');
 
// ── Lightweight security error class ──────────────────────────────────────
class SecurityError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.name       = 'SecurityError';
    this.statusCode = statusCode;
    this.isOperational = true; // tells errorHandler this is expected
  }
}
 
/**
 * authMiddleware
 *
 * Verifies the Bearer JWT, confirms the user is still approved in the DB,
 * and attaches { id, role, status } to req.user.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function authenticationMiddleware(req, res, next) {
  try {
    // 1. Extract token from Authorization header
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      logAccessDenied({ reason: 'AUTH', req });
      return next(new SecurityError('Authentication token is required.', 401));
    }
 
    // 2. Verify token signature and expiry
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (jwtError) {
      logAuditEvent({
        event:      AUDIT_EVENTS.TOKEN_INVALID,
        req,
        statusCode: 401,
        level:      'warn',
        meta:       { reason: jwtError.name },
      });
 
      const msg = jwtError.name === 'TokenExpiredError'
        ? 'Your session has expired. Please log in again.'
        : 'Invalid authentication token.';
      return next(new SecurityError(msg, 401));
    }
 
    let dbUser;
    try {
      const User = req.app.get('UserModel'); 
      dbUser = await User.findById(decoded.sub || decoded.userId).select('role status').lean();
    } catch (dbError) {
      return next(new SecurityError('Authentication service unavailable.', 503));
    }
 
    if (!dbUser) {
      logAccessDenied({ reason: 'AUTH', req, userId: decoded.sub });
      return next(new SecurityError('Account not found.', 401));
    }
 
    // Note: Global 'Approved' status check is removed here to allow 
    // Unverified users to access verification routes.
    // Specific verification requirements are now handled by the RBAC 
    // middleware using the 'requireVerified' flag from rbac.config.js.

    req.user = {
      id:     dbUser._id,
      userId: dbUser._id, // compatibility with proposed input
      role:   dbUser.role,
      status: dbUser.status,
      jti:    decoded.jti
    };
 
    logAuditEvent({
      event:  AUDIT_EVENTS.ACCESS_GRANTED,
      userId: decoded.sub,
      req,
    });
 
    next();
  } catch (err) {
    next(err);
  }
}
 
/**
 * Verifies Refresh Tokens (stored in httpOnly cookies or request body)
 */
async function verifyRefreshToken(req, res, next) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) throw new SecurityError('Refresh token required.', 401);

    const decoded = jwt.verify(token, securityConfig.jwt.refresh.secret, {
      algorithms: [securityConfig.jwt.refresh.algorithm],
      issuer: securityConfig.jwt.issuer
    });

    req.refreshTokenData = {
      userId: decoded.sub || decoded.userId,
      tokenFamily: decoded.tokenFamily
    };
    next();
  } catch (error) {
    const msg = error.name === 'TokenExpiredError' 
      ? 'Refresh token expired.' 
      : 'Invalid refresh token.';
    next(new SecurityError(msg, 401));
  }
}

/**
 * Optional Authentication
 * Attaches req.user if token is valid, but continues if not.
 */
async function optionalAuth(req, res, next) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) return next();

  try {
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.sub || decoded.userId, role: decoded.role };
    next();
  } catch (err) {
    next(); // Silently fail for optional auth
  }
}

/**
 * Transport Security: Force HTTPS in production
 */
function requireHTTPS(req, res, next) {
  if (!securityConfig.env.isProduction) return next();

  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    return next();
  }

  logAuditEvent({
    event: AUDIT_EVENTS.INSECURE_ACCESS_ATTEMPT,
    req,
    level: 'warn'
  });

  return res.redirect(301, `https://${req.headers.host}${req.url}`);
}

/**
 * Validates that the database user still exists (Session sanity check)
 */
async function validateSession(req, res, next) {
  if (!req.user?.id) return next(new SecurityError('No active session.', 401));
  
  const User = req.app.get('UserModel');
  const userExists = await User.exists({ _id: req.user.id });
  
  if (!userExists) return next(new SecurityError('Session invalidated.', 401));
  next();
}

module.exports = { 
  authMiddleware: authenticationMiddleware, 
  verifyRefreshToken, 
  optionalAuth, 
  requireHTTPS, 
  validateSession,
  SecurityError 
};