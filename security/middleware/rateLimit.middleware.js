/**
 * @fileoverview Rate Limiting Middleware
 * @description Prevents brute force attacks and DoS by limiting request rates
 * @module security/middleware/rateLimit.middleware
 * 
 * THREAT MODEL:
 * - Brute force attacks: Mitigated by limiting authentication attempts
 * - Credential stuffing: Mitigated by IP-based rate limiting
 * - DoS attacks: Mitigated by request quotas
 * - Account enumeration: Mitigated by consistent response times
 * 
 * DEPENDENCY: Requires express-rate-limit package
 * npm install express-rate-limit
 */

'use strict';

const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const securityConfig = require('../config/security.config');
const { auditService } = require('../services');

/**
 * Custom key generator for rate limiting
 * Uses combination of IP and user ID if available
 * 
 * @param {Object} req - Express request object
 * @returns {string} Rate limit key
 * 
 * SECURITY: Prevents bypass by changing User-Agent or headers
 */
function keyGenerator(req) {
  // Use authenticated user ID if available
  if (req.user?.userId) {
    return `user:${req.user.userId}`;
  }

  // Safe for both IPv4 and IPv6
  return ipKeyGenerator(req.ip);
}

/**
 * Custom handler for rate limit exceeded
 * Logs the event and returns appropriate response
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @param {Object} options - Rate limiter options
 */
function rateLimitHandler(req, res, next, options) {
  // Log rate limit exceeded
  auditService.logSecurityEvent({
    event: 'RATE_LIMIT_EXCEEDED',
    ipAddress: req.ip,
    userId: req.user?.userId,
    path: req.originalUrl,
    method: req.method,
    limiterType: options.limiterType || 'unknown'
  });

  // Calculate retry time
  const retryAfter = Math.ceil(options.windowMs / 1000);

  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: options.message || 'Too many requests. Please try again later.',
      retryAfter: retryAfter
    }
  });
}

/**
 * Skip rate limiting for certain conditions
 * 
 * @param {Object} req - Express request object
 * @returns {boolean} True to skip rate limiting
 */
function skipHandler(req) {
  // Skip in test environment
  if (process.env.NODE_ENV === 'test') {
    return true;
  }

  // Skip for whitelisted IPs (e.g., monitoring services)
  const whitelistedIPs = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
  if (whitelistedIPs.includes(req.ip)) {
    return true;
  }

  return false;
}

/**
 * Rate limiter for authentication endpoints
 * Strictest limits to prevent brute force attacks
 * 
 * USAGE:
 * app.use('/api/auth', rateLimitMiddleware.authLimiter);
 */
const authLimiter = rateLimit({
  windowMs: securityConfig.rateLimit.auth.windowMs,
  max: securityConfig.rateLimit.auth.max,
  message: securityConfig.rateLimit.auth.message,

  standardHeaders: securityConfig.rateLimit.auth.standardHeaders,
  legacyHeaders: securityConfig.rateLimit.auth.legacyHeaders,

  keyGenerator,

  skip: (req) => {
    const skip = skipHandler(req);
    console.log("Skip:", skip);
    return skip;
  },

  handler: (req, res, next, options) => {
    console.log("🚫 AUTH RATE LIMIT REACHED");
    rateLimitHandler(req, res, next, {
      ...options,
      limiterType: "auth",
    });
  },
});

/**
 * Rate limiter for general API endpoints
 * More lenient limits for normal usage
 * 
 * USAGE:
 * app.use('/api', rateLimitMiddleware.apiLimiter);
 */
const apiLimiter = rateLimit({
  windowMs: securityConfig.rateLimit.api.windowMs,
  max: securityConfig.rateLimit.api.max,
  message: securityConfig.rateLimit.api.message,
  standardHeaders: securityConfig.rateLimit.api.standardHeaders,
  legacyHeaders: securityConfig.rateLimit.api.legacyHeaders,
  keyGenerator: keyGenerator,
  skip: skipHandler,
  handler: (req, res, next, options) => {
    rateLimitHandler(req, res, next, { ...options, limiterType: 'api' });
  }
});

/**
 * Rate limiter for file upload endpoints
 * Prevents storage exhaustion attacks
 * 
 * USAGE:
 * app.use('/api/upload', rateLimitMiddleware.uploadLimiter);
 */
const uploadLimiter = rateLimit({
  windowMs: securityConfig.rateLimit.upload.windowMs,
  max: securityConfig.rateLimit.upload.max,
  message: securityConfig.rateLimit.upload.message,
  standardHeaders: securityConfig.rateLimit.upload.standardHeaders,
  legacyHeaders: securityConfig.rateLimit.upload.legacyHeaders,
  keyGenerator: keyGenerator,
  skip: skipHandler,
  handler: (req, res, next, options) => {
    rateLimitHandler(req, res, next, { ...options, limiterType: 'upload' });
  }
});

/**
 * Rate limiter for password reset requests
 * Prevents email bombing
 * 
 * USAGE:
 * app.use('/api/auth/forgot-password', rateLimitMiddleware.passwordResetLimiter);
 */
const passwordResetLimiter = rateLimit({
  windowMs: securityConfig.rateLimit.passwordReset.windowMs,
  max: securityConfig.rateLimit.passwordReset.max,
  message: securityConfig.rateLimit.passwordReset.message,
  standardHeaders: securityConfig.rateLimit.passwordReset.standardHeaders,
  legacyHeaders: securityConfig.rateLimit.passwordReset.legacyHeaders,

  keyGenerator: (req) => {
    // Limit by email if provided
    if (req.body?.email) {
      return `reset:${req.body.email.toLowerCase()}`;
    }

    // Otherwise use the IP safely
    return `reset:${ipKeyGenerator(req)}`;
  },

  skip: skipHandler,

  handler: (req, res, next, options) => {
    rateLimitHandler(req, res, next, {
      ...options,
      limiterType: "passwordReset",
    });
  },
});


/**
 * Creates a custom rate limiter with specified options
 * 
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.message - Error message
 * @returns {Function} Express rate limiter middleware
 * 
 * USAGE:
 * const customLimiter = rateLimitMiddleware.createLimiter({
 *   windowMs: 60000,
 *   max: 10,
 *   message: 'Custom limit exceeded'
 * });
 */
function createLimiter(options) {
  return rateLimit({
    windowMs: options.windowMs || 60 * 1000,
    max: options.max || 10,
    message: options.message || 'Too many requests',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || keyGenerator,
    skip: options.skip || skipHandler,
    handler: (req, res, next, opts) => {
      rateLimitHandler(req, res, next, {
        ...opts,
        limiterType: options.name || 'custom'
      });
    }
  });
}

/**
 * Sliding window rate limiter for more precise control
 * Distributes requests more evenly over time
 * 
 * Note: This is a simplified implementation
 * For production, consider using Redis for distributed rate limiting
 */
class SlidingWindowLimiter {
  constructor(options) {
    this.windowMs = options.windowMs || 60 * 1000;
    this.max = options.max || 10;
    this.requests = new Map();
  }

  /**
   * Check if request should be allowed
   * @param {string} key - Rate limit key
   * @returns {Object} { allowed: boolean, remaining: number, resetTime: number }
   */
  check(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get or create request log for this key
    let requestLog = this.requests.get(key) || [];

    // Remove expired entries
    requestLog = requestLog.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (requestLog.length >= this.max) {
      const oldestRequest = requestLog[0];
      const resetTime = oldestRequest + this.windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetTime: resetTime
      };
    }

    // Add current request
    requestLog.push(now);
    this.requests.set(key, requestLog);

    return {
      allowed: true,
      remaining: this.max - requestLog.length,
      resetTime: now + this.windowMs
    };
  }

  /**
   * Express middleware
   */
  middleware() {
    return (req, res, next) => {
      const key = keyGenerator(req);
      const result = this.check(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.max);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

      if (!result.allowed) {
        auditService.logSecurityEvent({
          event: 'SLIDING_RATE_LIMIT_EXCEEDED',
          key: key,
          ipAddress: req.ip,
          path: req.originalUrl
        });

        res.setHeader('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000));

        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
          }
        });
      }

      next();
    };
  }

  /**
   * Clean up expired entries periodically
   */
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, requestLog] of this.requests.entries()) {
      const validRequests = requestLog.filter(ts => ts > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

/**
 * Progressive rate limiter
 * Increases delay exponentially with each failed attempt
 * Useful for login endpoints
 * 
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
function progressiveLimiter(options = {}) {
  const {
    baseDelay = 1000,          // Start with 1 second delay
    maxDelay = 3600000,        // Max 1 hour delay
    multiplier = 2,            // Double delay each time
    resetAfter = 900000        // Reset after 15 minutes of success
  } = options;

  const delays = new Map();

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Get current delay info
    let delayInfo = delays.get(key) || {
      currentDelay: 0,
      lastFailure: 0,
      failureCount: 0
    };

    // Check if we need to wait
    if (delayInfo.currentDelay > 0) {
      const waitTime = delayInfo.lastFailure + delayInfo.currentDelay - now;

      if (waitTime > 0) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Please wait ${Math.ceil(waitTime / 1000)} seconds before trying again.`,
            retryAfter: Math.ceil(waitTime / 1000)
          }
        });
      }
    }

    // Reset if enough time has passed since last failure
    if (delayInfo.lastFailure && (now - delayInfo.lastFailure) > resetAfter) {
      delayInfo = {
        currentDelay: 0,
        lastFailure: 0,
        failureCount: 0
      };
      delays.set(key, delayInfo);
    }

    // Add method to record success/failure
    res.recordSuccess = () => {
      delayInfo.currentDelay = 0;
      delayInfo.failureCount = 0;
      delays.set(key, delayInfo);
    };

    res.recordFailure = () => {
      delayInfo.failureCount++;
      delayInfo.lastFailure = Date.now();
      delayInfo.currentDelay = Math.min(
        baseDelay * Math.pow(multiplier, delayInfo.failureCount - 1),
        maxDelay
      );
      delays.set(key, delayInfo);

      // Log progressive limiting
      auditService.logSecurityEvent({
        event: 'PROGRESSIVE_RATE_LIMIT',
        key: key,
        failureCount: delayInfo.failureCount,
        nextDelay: delayInfo.currentDelay,
        ipAddress: req.ip
      });
    };

    next();
  };
}

module.exports = {
  authLimiter,
  apiLimiter,
  uploadLimiter,
  passwordResetLimiter,
  createLimiter,
  SlidingWindowLimiter,
  progressiveLimiter,
  keyGenerator
};
