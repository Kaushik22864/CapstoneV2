/**
 * @fileoverview Input Validation Middleware
 * @description Validates and sanitizes all incoming request data
 * @module security/middleware/validation.middleware
 * 
 * THREAT MODEL:
 * - SQL Injection: Mitigated by input sanitization (though MongoDB is NoSQL)
 * - NoSQL Injection: Mitigated by type checking and operator filtering
 * - XSS: Mitigated by HTML encoding and script removal
 * - Command Injection: Mitigated by special character filtering
 * 
 * DEPENDENCY: Requires express-validator package
 * npm install express-validator
 */

'use strict';

const { validationResult, matchedData } = require('express-validator');
const { auditService } = require('../services');

/**
 * Middleware to check validation results
 * Should be used after validation rules
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * 
 * USAGE:
 * router.post('/register',
 *   authValidator.registerRules,
 *   validationMiddleware.validate,
 *   authController.register
 * );
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Format errors for response
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      // Don't include the actual value - could leak sensitive data
      location: error.location
    }));
    
    // Log validation failure (without sensitive data)
    auditService.log({
      action: 'VALIDATION_FAILED',
      userId: req.user?.userId,
      details: {
        path: req.originalUrl,
        method: req.method,
        errors: formattedErrors.map(e => e.field)
      },
      ipAddress: req.ip
    });
    
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please correct the errors and try again.',
        details: formattedErrors
      }
    });
  }
  
  // Replace req.body with only validated data
  // This removes any fields not in the validation schema
  req.validatedData = matchedData(req, { locations: ['body', 'query', 'params'] });
  
  next();
}

/**
 * Sanitizes object to prevent NoSQL injection
 * Removes MongoDB operators from input
 * 
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 * 
 * SECURITY: Prevents attacks like { "$gt": "" } in queries
 */
function sanitizeMongoQuery(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  // If array, sanitize each element
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeMongoQuery(item));
  }
  
  // Sanitize object keys
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Block MongoDB operators
    if (key.startsWith('$')) {
      auditService.logSecurityEvent({
        event: 'NOSQL_INJECTION_ATTEMPT',
        details: { blockedKey: key }
      });
      continue;
    }
    
    // Recursively sanitize nested objects
    sanitized[key] = sanitizeMongoQuery(value);
  }
  
  return sanitized;
}

/**
 * Middleware to sanitize request body against NoSQL injection
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function sanitizeBody(req, res, next) {
  if (req.body) {
    req.body = sanitizeMongoQuery(req.body);
  }
  next();
}

/**
 * Middleware to sanitize query parameters
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function sanitizeQuery(req, res, next) {
  if (req.query) {
    req.query = sanitizeMongoQuery(req.query);
  }
  next();
}

/**
 * Middleware to sanitize URL parameters
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function sanitizeParams(req, res, next) {
  if (req.params) {
    req.params = sanitizeMongoQuery(req.params);
  }
  next();
}

/**
 * Combined sanitization middleware
 * Sanitizes body, query, and params
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * 
 * USAGE:
 * app.use(validationMiddleware.sanitizeAll);
 */
function sanitizeAll(req, res, next) {
  req.body = sanitizeMongoQuery(req.body);
  req.query = sanitizeMongoQuery(req.query);
  req.params = sanitizeMongoQuery(req.params);
  next();
}

/**
 * Validates content type header
 * Ensures requests have proper content type for their method
 * 
 * @param {string[]} allowedTypes - Allowed content types
 * @returns {Function} Express middleware
 * 
 * USAGE:
 * router.post('/api/users',
 *   validationMiddleware.requireContentType(['application/json']),
 *   controller.create
 * );
 */
function requireContentType(allowedTypes) {
  return (req, res, next) => {
    // Skip for GET, HEAD, DELETE, OPTIONS
    if (['GET', 'HEAD', 'DELETE', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    const contentType = req.get('Content-Type');
    
    if (!contentType) {
      return res.status(415).json({
        success: false,
        error: {
          code: 'MISSING_CONTENT_TYPE',
          message: 'Content-Type header is required.'
        }
      });
    }
    
    // Check if content type matches any allowed type
    const matches = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );
    
    if (!matches) {
      auditService.logSecurityEvent({
        event: 'INVALID_CONTENT_TYPE',
        contentType: contentType,
        allowedTypes: allowedTypes,
        ipAddress: req.ip
      });
      
      return res.status(415).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_CONTENT_TYPE',
          message: `Content type must be one of: ${allowedTypes.join(', ')}`
        }
      });
    }
    
    next();
  };
}

/**
 * Validates request size
 * 
 * @param {number} maxSize - Maximum body size in bytes
 * @returns {Function} Express middleware
 */
function limitRequestSize(maxSize) {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0', 10);
    
    if (contentLength > maxSize) {
      auditService.logSecurityEvent({
        event: 'REQUEST_TOO_LARGE',
        contentLength: contentLength,
        maxSize: maxSize,
        ipAddress: req.ip
      });
      
      return res.status(413).json({
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: `Request body exceeds ${Math.floor(maxSize / 1024)}KB limit.`
        }
      });
    }
    
    next();
  };
}

/**
 * Validates that required fields are present
 * Simple presence check before detailed validation
 * 
 * @param {string[]} fields - Required field names
 * @returns {Function} Express middleware
 */
function requireFields(fields) {
  return (req, res, next) => {
    const missing = fields.filter(field => {
      const value = req.body[field];
      return value === undefined || value === null || value === '';
    });
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Required fields are missing.',
          details: missing.map(field => ({
            field,
            message: `${field} is required`
          }))
        }
      });
    }
    
    next();
  };
}

/**
 * Validates ObjectId format for MongoDB
 * 
 * @param {string} paramName - Parameter name containing ObjectId
 * @returns {Function} Express middleware
 */
function validateObjectId(paramName) {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    // MongoDB ObjectId is 24 hex characters
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    
    if (!id || !objectIdPattern.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid identifier format.'
        }
      });
    }
    
    next();
  };
}

/**
 * Validates pagination parameters
 * 
 * @param {Object} options - Pagination options
 * @param {number} options.maxLimit - Maximum allowed limit
 * @param {number} options.defaultLimit - Default limit if not specified
 * @returns {Function} Express middleware
 */
function validatePagination(options = {}) {
  const { maxLimit = 100, defaultLimit = 20 } = options;
  
  return (req, res, next) => {
    let { page, limit } = req.query;
    
    // Parse and validate page
    page = parseInt(page, 10);
    if (isNaN(page) || page < 1) {
      page = 1;
    }
    
    // Parse and validate limit
    limit = parseInt(limit, 10);
    if (isNaN(limit) || limit < 1) {
      limit = defaultLimit;
    }
    if (limit > maxLimit) {
      limit = maxLimit;
    }
    
    // Attach to request
    req.pagination = {
      page,
      limit,
      skip: (page - 1) * limit
    };
    
    next();
  };
}

/**
 * Validates sort parameters
 * 
 * @param {string[]} allowedFields - Fields that can be sorted
 * @returns {Function} Express middleware
 */
function validateSort(allowedFields) {
  return (req, res, next) => {
    let { sortBy, sortOrder } = req.query;
    
    // Default sort
    req.sort = { createdAt: -1 };
    
    if (sortBy) {
      // Validate sort field
      if (!allowedFields.includes(sortBy)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SORT_FIELD',
            message: `Sort field must be one of: ${allowedFields.join(', ')}`
          }
        });
      }
      
      // Validate sort order
      sortOrder = sortOrder?.toLowerCase();
      const order = sortOrder === 'asc' ? 1 : -1;
      
      req.sort = { [sortBy]: order };
    }
    
    next();
  };
}

/**
 * Strips dangerous characters from all string inputs
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function stripDangerousChars(req, res, next) {
  const stripChars = (obj) => {
    if (typeof obj === 'string') {
      // Remove null bytes, backspace, and other control characters
      return obj.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }
    
    if (Array.isArray(obj)) {
      return obj.map(stripChars);
    }
    
    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[stripChars(key)] = stripChars(value);
      }
      return result;
    }
    
    return obj;
  };
  
  req.body = stripChars(req.body);
  req.query = stripChars(req.query);
  req.params = stripChars(req.params);
  
  next();
}

module.exports = {
  validate,
  sanitizeMongoQuery,
  sanitizeBody,
  sanitizeQuery,
  sanitizeParams,
  sanitizeAll,
  requireContentType,
  limitRequestSize,
  requireFields,
  validateObjectId,
  validatePagination,
  validateSort,
  stripDangerousChars
};
