/**
 * @fileoverview Input Sanitizer
 * @description Sanitizes user input to prevent XSS, injection, and other attacks
 * @module security/utils/sanitizer
 * 
 * THREAT MODEL:
 * - XSS (Cross-Site Scripting): Mitigated by HTML entity encoding
 * - SQL Injection: Mitigated by parameterized queries (not handled here)
 * - NoSQL Injection: Mitigated by operator filtering
 * - Command Injection: Mitigated by special character removal
 * - Path Traversal: Mitigated by path component stripping
 */

'use strict';

/**
 * HTML entities for encoding
 */
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * Encodes HTML entities to prevent XSS
 * 
 * @param {string} str - String to encode
 * @returns {string} Encoded string
 * 
 * USAGE:
 * const safe = sanitizer.encodeHTML('<script>alert("xss")</script>');
 * // Returns: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
 */
function encodeHTML(str) {
  if (typeof str !== 'string') {
    return str;
  }
  
  return str.replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char]);
}

/**
 * Decodes HTML entities
 * 
 * @param {string} str - Encoded string
 * @returns {string} Decoded string
 */
function decodeHTML(str) {
  if (typeof str !== 'string') {
    return str;
  }
  
  const reverseEntities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '='
  };
  
  return str.replace(
    /&amp;|&lt;|&gt;|&quot;|&#x27;|&#x2F;|&#x60;|&#x3D;/g,
    entity => reverseEntities[entity]
  );
}

/**
 * Removes HTML tags from string
 * 
 * @param {string} str - String with HTML
 * @returns {string} Plain text
 */
function stripHTML(str) {
  if (typeof str !== 'string') {
    return str;
  }
  
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * Sanitizes string for safe HTML display
 * Removes dangerous patterns and encodes entities
 * 
 * @param {string} str - String to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized string
 */
function sanitizeHTML(str, options = {}) {
  if (typeof str !== 'string') {
    return str;
  }
  
  const {
    allowedTags = [],
    stripAll = false
  } = options;
  
  // Remove script tags and event handlers
  let sanitized = str
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags and contents
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')
    // Remove javascript: URLs
    .replace(/javascript\s*:/gi, '')
    // Remove vbscript: URLs
    .replace(/vbscript\s*:/gi, '')
    // Remove data: URLs (can contain scripts)
    .replace(/data\s*:[^"'\s>]*/gi, 'data:blocked')
    // Remove expression() (IE CSS expression)
    .replace(/expression\s*\([^)]*\)/gi, '');
  
  if (stripAll) {
    sanitized = stripHTML(sanitized);
  } else if (allowedTags.length === 0) {
    // If no allowed tags, encode everything
    sanitized = encodeHTML(sanitized);
  } else {
    // Keep allowed tags, encode others
    const tagPattern = new RegExp(
      `<(?!\/?(?:${allowedTags.join('|')})\\b)[^>]*>`,
      'gi'
    );
    sanitized = sanitized.replace(tagPattern, match => encodeHTML(match));
  }
  
  return sanitized;
}

/**
 * Sanitizes object for MongoDB to prevent NoSQL injection
 * Removes $ operators from keys
 * 
 * @param {*} obj - Object to sanitize
 * @returns {*} Sanitized object
 */
function sanitizeMongoObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeMongoObject(item));
  }
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip keys starting with $ (MongoDB operators)
    if (key.startsWith('$')) {
      continue;
    }
    
    // Skip keys containing dots (nested property access)
    if (key.includes('.')) {
      continue;
    }
    
    sanitized[key] = sanitizeMongoObject(value);
  }
  
  return sanitized;
}

/**
 * Sanitizes string for SQL (use parameterized queries instead when possible)
 * This is a fallback for edge cases
 * 
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeSQL(str) {
  if (typeof str !== 'string') {
    return str;
  }
  
  return str
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/\x00/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
}

/**
 * Sanitizes filename to prevent path traversal
 * 
 * @param {string} filename - Original filename
 * @returns {string} Safe filename
 */
function sanitizeFilename(filename) {
  if (typeof filename !== 'string') {
    return 'unnamed';
  }
  
  return filename
    // Remove path separators
    .replace(/[/\\]/g, '_')
    // Remove null bytes
    .replace(/\x00/g, '')
    // Remove path traversal patterns
    .replace(/\.\./g, '')
    // Remove leading dots
    .replace(/^\.+/, '')
    // Remove special characters
    .replace(/[<>:"|?*]/g, '_')
    // Limit length
    .slice(0, 200)
    // Ensure not empty
    || 'unnamed';
}

/**
 * Sanitizes path to prevent directory traversal
 * 
 * @param {string} pathStr - Path string
 * @returns {string} Safe path
 */
function sanitizePath(pathStr) {
  if (typeof pathStr !== 'string') {
    return '';
  }
  
  return pathStr
    // Remove null bytes
    .replace(/\x00/g, '')
    // Normalize slashes
    .replace(/\\/g, '/')
    // Remove path traversal
    .replace(/\.\./g, '')
    // Remove multiple slashes
    .replace(/\/+/g, '/')
    // Remove leading slash
    .replace(/^\//, '')
    // Remove trailing slash
    .replace(/\/$/, '');
}

/**
 * Sanitizes email address
 * 
 * @param {string} email - Email address
 * @returns {string} Sanitized email
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') {
    return '';
  }
  
  return email
    .toLowerCase()
    .trim()
    // Remove dangerous characters
    .replace(/[<>"'`;()]/g, '')
    // Ensure valid email characters only
    .replace(/[^\w.@+-]/g, '');
}

/**
 * Sanitizes phone number
 * 
 * @param {string} phone - Phone number
 * @returns {string} Sanitized phone number
 */
function sanitizePhone(phone) {
  if (typeof phone !== 'string') {
    return '';
  }
  
  return phone
    .trim()
    // Keep only digits, plus, spaces, hyphens, parentheses
    .replace(/[^\d\s+()-]/g, '')
    // Remove multiple spaces
    .replace(/\s+/g, ' ');
}

/**
 * Sanitizes URL
 * 
 * @param {string} url - URL string
 * @returns {string|null} Sanitized URL or null if invalid
 */
function sanitizeURL(url) {
  if (typeof url !== 'string') {
    return null;
  }
  
  try {
    const parsed = new URL(url);
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    // Remove credentials
    parsed.username = '';
    parsed.password = '';
    
    return parsed.toString();
  } catch (error) {
    return null;
  }
}

/**
 * Sanitizes object recursively
 * Applies appropriate sanitization based on field type
 * 
 * @param {Object} obj - Object to sanitize
 * @param {Object} schema - Schema defining field types
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj, schema = {}) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fieldSchema = schema[key] || {};
    
    if (value === null || value === undefined) {
      result[key] = value;
      continue;
    }
    
    switch (fieldSchema.type) {
      case 'email':
        result[key] = sanitizeEmail(value);
        break;
      case 'phone':
        result[key] = sanitizePhone(value);
        break;
      case 'url':
        result[key] = sanitizeURL(value);
        break;
      case 'html':
        result[key] = sanitizeHTML(value, fieldSchema.options);
        break;
      case 'filename':
        result[key] = sanitizeFilename(value);
        break;
      case 'path':
        result[key] = sanitizePath(value);
        break;
      case 'text':
      default:
        if (typeof value === 'string') {
          result[key] = encodeHTML(value.trim());
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value, fieldSchema.nested || {});
        } else {
          result[key] = value;
        }
    }
  }
  
  return result;
}

/**
 * Creates sanitization middleware
 * 
 * @param {Object} schema - Sanitization schema
 * @returns {Function} Express middleware
 * 
 * USAGE:
 * app.post('/users', sanitizer.middleware({
 *   email: { type: 'email' },
 *   name: { type: 'text' }
 * }), controller.create);
 */
function middleware(schema = {}) {
  return (req, res, next) => {
    if (req.body) {
      req.body = sanitizeObject(req.body, schema);
    }
    if (req.query) {
      req.query = sanitizeObject(req.query, schema);
    }
    if (req.params) {
      req.params = sanitizeObject(req.params, schema);
    }
    next();
  };
}

/**
 * Trims whitespace from all string values in object
 * 
 * @param {Object} obj - Object to trim
 * @returns {Object} Trimmed object
 */
function trimObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => trimObject(item));
  }
  
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = value.trim();
    } else if (typeof value === 'object') {
      result[key] = trimObject(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

module.exports = {
  encodeHTML,
  decodeHTML,
  stripHTML,
  sanitizeHTML,
  sanitizeMongoObject,
  sanitizeSQL,
  sanitizeFilename,
  sanitizePath,
  sanitizeEmail,
  sanitizePhone,
  sanitizeURL,
  sanitizeObject,
  middleware,
  trimObject
};
