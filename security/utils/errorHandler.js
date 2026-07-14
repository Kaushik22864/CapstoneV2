/**
 * @fileoverview Secure Error Handler
 * @description Handles errors without leaking sensitive information
 * @module security/utils/errorHandler
 * 
 * SECURITY PRINCIPLE: Fail securely
 * - Don't expose internal details to users
 * - Log full details internally for debugging
 * - Return generic messages to clients
 */

'use strict';

const { auditService } = require('../services');

/**
 * Custom error codes
 */
const ERROR_CODES = {
  // Authentication errors (401)
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  ACCOUNT_NOT_VERIFIED: 'ACCOUNT_NOT_VERIFIED',
  
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',
  
  // Resource errors (404)
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  
  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};

/**
 * Base security error class
 */
class SecurityError extends Error {
  constructor(message, statusCode = 500, code = 'SECURITY_ERROR') {
    super(message);
    this.name = 'SecurityError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Distinguish from programming errors
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication error (401)
 */
class AuthenticationError extends SecurityError {
  constructor(message = 'Authentication required') {
    super(message, 401, ERROR_CODES.AUTHENTICATION_REQUIRED);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403)
 */
class AuthorizationError extends SecurityError {
  constructor(message = 'Access denied') {
    super(message, 403, ERROR_CODES.FORBIDDEN);
    this.name = 'AuthorizationError';
  }
}

/**
 * Validation error (400)
 */
class ValidationError extends SecurityError {
  constructor(message = 'Validation failed', details = []) {
    super(message, 400, ERROR_CODES.VALIDATION_ERROR);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Not found error (404)
 */
class NotFoundError extends SecurityError {
  constructor(message = 'Resource not found') {
    super(message, 404, ERROR_CODES.NOT_FOUND);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error (409)
 */
class ConflictError extends SecurityError {
  constructor(message = 'Resource conflict') {
    super(message, 409, ERROR_CODES.CONFLICT);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error (429)
 */
class RateLimitError extends SecurityError {
  constructor(message = 'Too many requests', retryAfter = 60) {
    super(message, 429, ERROR_CODES.RATE_LIMIT_EXCEEDED);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Maps error types to user-safe messages
 * Prevents information leakage
 */
const SAFE_MESSAGES = {
  'MongoError': 'A database error occurred. Please try again.',
  'MongoServerError': 'A database error occurred. Please try again.',
  'CastError': 'Invalid data format.',
  'TypeError': 'An unexpected error occurred.',
  'SyntaxError': 'Invalid request format.',
  'RangeError': 'Invalid value provided.',
  'JsonWebTokenError': 'Invalid authentication token.',
  'TokenExpiredError': 'Your session has expired. Please log in again.',
  'MulterError': 'File upload failed.'
};

/**
 * Gets a safe error message for client response
 * @param {Error} error - Original error
 * @returns {string} Safe message
 */
function getSafeMessage(error) {
  // Use custom message for operational errors
  if (error.isOperational) {
    return error.message;
  }
  
  // Look up safe message by error type
  if (SAFE_MESSAGES[error.name]) {
    return SAFE_MESSAGES[error.name];
  }
  
  // Generic message for unknown errors
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Gets HTTP status code for error
 * @param {Error} error - Original error
 * @returns {number} HTTP status code
 */
function getStatusCode(error) {
  // Use custom status if defined
  if (error.statusCode) {
    return error.statusCode;
  }
  
  // Map common error types
  const statusMap = {
    'ValidationError': 400,
    'CastError': 400,
    'JsonWebTokenError': 401,
    'TokenExpiredError': 401,
    'MongoError': error.code === 11000 ? 409 : 500,
    'MongoServerError': error.code === 11000 ? 409 : 500
  };
  
  return statusMap[error.name] || 500;
}

/**
 * Express error handling middleware
 * 
 * @param {Error} error - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 * 
 * USAGE:
 * // Add as last middleware
 * app.use(errorHandler);
 */
function errorHandler(error, req, res, next) {
  // Log the full error internally
  console.error('Error:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: error.code,
    path: req.originalUrl,
    method: req.method,
    userId: req.user?.userId
  });
  
  // Log security events for certain errors
  if (!error.isOperational || error.statusCode >= 500) {
    auditService.logSecurityEvent({
      event: 'ERROR_OCCURRED',
      errorName: error.name,
      errorCode: error.code,
      path: req.originalUrl,
      method: req.method,
      userId: req.user?.userId,
      ipAddress: req.ip
    });
  }
  
  // Get safe response values
  const statusCode = getStatusCode(error);
  const message = getSafeMessage(error);
  
  // Build response
  const response = {
    success: false,
    error: {
      code: error.code || 'ERROR',
      message: message
    }
  };
  
  // Add validation details if present
  if (error instanceof ValidationError && error.details) {
    response.error.details = error.details;
  }
  
  // Add retry-after for rate limiting
  if (error instanceof RateLimitError) {
    res.set('Retry-After', error.retryAfter);
    response.error.retryAfter = error.retryAfter;
  }
  
  // Add request ID for support reference (don't expose internal details)
  response.error.requestId = req.id || generateRequestId();
  
  res.status(statusCode).json(response);
}

/**
 * Generates a request ID for error tracking
 * @returns {string} Request ID
 */
function generateRequestId() {
  return `REQ-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
}

/**
 * Async handler wrapper
 * Catches async errors and passes to error middleware
 * 
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 * 
 * USAGE:
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.find();
 *   res.json(users);
 * }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Creates a not found handler for undefined routes
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: ERROR_CODES.NOT_FOUND,
      message: 'The requested resource was not found.'
    }
  });
}

/**
 * Handles uncaught exceptions
 * Should be set up during app initialization
 * 
 * USAGE:
 * process.on('uncaughtException', handleUncaughtException);
 */
function handleUncaughtException(error) {
  console.error('UNCAUGHT EXCEPTION:', error);
  
  auditService.logSecurityEvent({
    event: 'UNCAUGHT_EXCEPTION',
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack
  });
  
  // Give time to log before exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
}

/**
 * Handles unhandled promise rejections
 * 
 * USAGE:
 * process.on('unhandledRejection', handleUnhandledRejection);
 */
function handleUnhandledRejection(reason, promise) {
  console.error('UNHANDLED REJECTION:', reason);
  
  auditService.logSecurityEvent({
    event: 'UNHANDLED_REJECTION',
    reason: reason?.message || String(reason)
  });
  
  // Optionally exit process
  // process.exit(1);
}

module.exports = {
  SecurityError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ERROR_CODES,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  handleUncaughtException,
  handleUnhandledRejection,
  getSafeMessage,
  getStatusCode,
  generateRequestId
};
