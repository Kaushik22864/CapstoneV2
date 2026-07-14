/**
 * @fileoverview Main Security Configuration
 * @description Centralized, validated security settings for the OCT system.
 */


'use strict';


const rbac = require('./rbac.config');


const isProd = process.env.NODE_ENV === 'production';


/**
 * Security configuration object
 */
const securityConfig = {
  env: {
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: isProd,
    isTest: process.env.NODE_ENV === 'test'
  },


  /**
   * JWT Configuration
   * Best Practice: Use different secrets for Access and Refresh tokens.
   */
  jwt: {
    access: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
      algorithm: 'HS256'
    },
    refresh: {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
      algorithm: 'HS256'
    },
    issuer: process.env.JWT_ISSUER || 'oct-diagnostic-system',
    audience: process.env.JWT_AUDIENCE || 'oct-users',
  },


  /**
   * Password Policy (Bcrypt)
   */
  password: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    minLength: 12, // Increased from 8 for medical personnel security
    requireSpecialChars: true
  },


  /**
   * Rate Limiting
   * Prevents automated attacks on sensitive endpoints.
   */
  rateLimit: {
    auth: {
      windowMs: 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX_LOGIN, 10) || 10,
      message: 'Too many attempts. Please try again after 15 minutes.'
    },
    api: {
      windowMs: 15 * 60 * 1000,
      max: 100
    },
    upload: {
      windowMs: 60 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX_UPLOAD, 10) || 10
    },
    passwordReset: {
      windowMs: 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX_RESET, 10) || 5,
      message: 'Too many password reset attempts. Please try again after 15 minutes.'
    }
  },


  /**
   * HIPAA-Compliant Encryption (At Rest)
   * Using AES-256-GCM for authenticated encryption.
   */
  encryption: {
    algorithm: 'aes-256-gcm',
    key: process.env.ENCRYPTION_KEY, // 64-char hex string
    iv: process.env.ENCRYPTION_IV,   // 32-char hex string
    authTagLength: 16
  },


  /**
   * File Upload Constraints
   */
  fileUpload: {
    maxSize: parseInt(process.env.MAX_UPLOAD_BYTES, 10) || 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf'],
    uploadDir: process.env.UPLOAD_DIR || './uploads'
  },


  /**
   * Audit Logging
   */
  audit: {
    logPath: process.env.AUDIT_LOG_PATH || './logs/audit.log',
    retentionDays: 365, // HIPAA requirement
  },


  /**
   * CORS Settings
   */
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  },


  /**
   * Import RBAC constants for unified access
   */
  roles: rbac.ROLES,
  permissions: rbac.PERMISSIONS
};

// Aliases for JWT configuration properties expected by jwt.service.js
securityConfig.jwt.accessToken = securityConfig.jwt.access;
securityConfig.jwt.refreshToken = securityConfig.jwt.refresh;


/**
 * Validates security configuration on startup.
 * This prevents the server from running in a "partially secure" state.
 */
function validateConfig() {
  const missing = [];


  // 1. Check JWT Secrets
  if (!securityConfig.jwt.access.secret) missing.push('JWT_SECRET');
  if (!securityConfig.jwt.refresh.secret) missing.push('JWT_REFRESH_SECRET');


  // 2. Check Encryption Keys (Must be present in any environment for consistency)
  if (!securityConfig.encryption.key) missing.push('ENCRYPTION_KEY');
  if (!securityConfig.encryption.iv) missing.push('ENCRYPTION_IV');


  // 3. Key Length Validations (Hex strings: 32 bytes = 64 chars, 16 bytes = 32 chars)
  if (securityConfig.encryption.key && securityConfig.encryption.key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
  }

  if (securityConfig.encryption.iv && securityConfig.encryption.iv.length !== 32) {
    throw new Error('ENCRYPTION_IV must be a 32-character hex string (16 bytes).');
  }


  if (missing.length > 0) {
    const errorMsg = `[SECURITY FATAL] Missing critical environment variables: ${missing.join(', ')}`;

    if (isProd) {
      console.error(errorMsg);
      process.exit(1); // Kill process in production
    } else {
      console.warn(errorMsg);
    }
  }


  return true;
}

// Export the configuration object directly, attaching helper functions and config alias for backward compatibility.
securityConfig.config = securityConfig;
securityConfig.validateConfig = validateConfig;

module.exports = securityConfig;
