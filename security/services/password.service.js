/**
 * @fileoverview Password Security Service
 * @description Handles secure password hashing and verification
 * @module security/services/password.service
 * 
 * THREAT MODEL:
 * - Password database breach: Mitigated by bcrypt with high cost factor
 * - Rainbow table attacks: Mitigated by bcrypt's built-in salting
 * - Timing attacks: Mitigated by bcrypt's constant-time comparison
 * - Weak passwords: Mitigated by password policy enforcement
 * 
 * DEPENDENCY: Requires bcryptjs package
 * npm install bcryptjs
 */

'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const securityConfig = require('../config/security.config');
const auditService = require('./audit.service');

/**
 * Password validation result
 * @typedef {Object} PasswordValidationResult
 * @property {boolean} valid - Whether password meets policy
 * @property {string[]} errors - List of policy violations
 * @property {number} strength - Password strength score (0-4)
 */

/**
 * Validates password against security policy
 * 
 * @param {string} password - Password to validate
 * @param {Object} [options={}] - Validation options/policy override
 * @returns {PasswordValidationResult} Validation result
 * 
 * USAGE:
 * const result = passwordService.validatePolicy('MyPassword123!');
 * if (!result.valid) {
 *   console.log(result.errors);
 * }
 */
function validatePolicy(password, options = {}) {
  const errors = [];
  
  // Use provided policy or fall back to config, with hardcoded defaults as last resort
  const policy = options.policy || securityConfig.password || {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };
  
  // Check minimum length
  const minLength = policy.minLength || 8;
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  
  // Check maximum length
  const maxLength = policy.maxLength || 128;
  if (password.length > maxLength) {
    errors.push(`Password must be no more than ${maxLength} characters long`);
  }
  
  // Check for uppercase letters
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Check for lowercase letters
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Check for numbers
  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Check for special characters
  const reqSpecial = policy.requireSpecialChars || policy.requireSpecial;
  if (reqSpecial) {
    const chars = policy.specialChars || '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const specialRegex = new RegExp(`[${escapeRegExp(chars)}]`);
    if (!specialRegex.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }
  
  // Calculate strength score
  const strength = calculateStrength(password);
  
  return {
    valid: errors.length === 0,
    errors,
    strength
  };
}

/**
 * Escapes special characters for regex
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
}

/**
 * Calculates password strength score
 * 
 * @param {string} password - Password to analyze
 * @returns {number} Strength score (0-4)
 * 
 * 0 = Very weak
 * 1 = Weak
 * 2 = Fair
 * 3 = Strong
 * 4 = Very strong
 */
function calculateStrength(password) {
  let score = 0;
  
  if (!password || password.length === 0) {
    return 0;
  }
  
  // Length contribution
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  
  // Character variety contribution
  if (/[a-z]/.test(password)) score += 0.25;
  if (/[A-Z]/.test(password)) score += 0.25;
  if (/[0-9]/.test(password)) score += 0.25;
  if (/[^a-zA-Z0-9]/.test(password)) score += 0.25;
  
  // Penalize common patterns
  const commonPatterns = [
    /^[a-z]+$/i,           // Only letters
    /^[0-9]+$/,            // Only numbers
    /(.)\1{2,}/,           // Repeated characters
    /^(password|12345|qwerty|admin)/i  // Common passwords
  ];
  
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      score -= 1;
    }
  }
  
  // Normalize to 0-4 scale
  return Math.max(0, Math.min(4, Math.floor(score)));
}

/**
 * Hashes a password using bcrypt
 * 
 * @param {string} password - Plain text password
 * @param {Object} [options={}] - Options including policy override
 * @returns {Promise<string>} Hashed password
 * 
 * USAGE:
 * const hashedPassword = await passwordService.hash('MyPassword123!');
 * // Store hashedPassword in database
 * 
 * SECURITY: Uses bcrypt with configurable cost factor
 * Default is 12 rounds (~250ms on modern hardware)
 */
async function hash(password, options = {}) {
  // Validate password first
  const validation = validatePolicy(password, options);
  if (!validation.valid) {
    throw new Error(`Password policy violation: ${validation.errors.join(', ')}`);
  }
  
  // Generate salt and hash
  const rounds = options.bcryptRounds || (securityConfig.password ? securityConfig.password.bcryptRounds : 12);
  const salt = await bcrypt.genSalt(rounds);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  return hashedPassword;
}

/**
 * Verifies a password against a hash
 * 
 * @param {string} password - Plain text password to verify
 * @param {string} hashedPassword - Stored password hash
 * @returns {Promise<boolean>} True if password matches
 * 
 * USAGE:
 * const isValid = await passwordService.verify(inputPassword, user.password);
 * if (isValid) {
 *   // Password is correct
 * }
 * 
 * SECURITY: Uses constant-time comparison to prevent timing attacks
 */
async function verify(password, hashedPassword) {
  if (!password || !hashedPassword) {
    return false;
  }
  
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    // Log error but don't expose details
    console.error('Password verification error');
    return false;
  }
}

/**
 * Generates a secure random password
 * 
 * @param {number} length - Password length (default: 16)
 * @param {Object} options - Generation options
 * @param {boolean} options.includeUppercase - Include uppercase letters
 * @param {boolean} options.includeLowercase - Include lowercase letters
 * @param {boolean} options.includeNumbers - Include numbers
 * @param {boolean} options.includeSpecial - Include special characters
 * @returns {string} Random password
 * 
 * USAGE:
 * const tempPassword = passwordService.generateRandom(20);
 */
function generateRandom(length = 16, options = {}) {
  const {
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSpecial = true
  } = options;
  
  let charset = '';
  let password = '';
  const requirements = [];
  
  if (includeLowercase) {
    charset += 'abcdefghijklmnopqrstuvwxyz';
    requirements.push('abcdefghijklmnopqrstuvwxyz');
  }
  if (includeUppercase) {
    charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    requirements.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  }
  if (includeNumbers) {
    charset += '0123456789';
    requirements.push('0123456789');
  }
  if (includeSpecial) {
    charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    requirements.push('!@#$%^&*()_+-=[]{}|;:,.<>?');
  }
  
  if (charset.length === 0) {
    charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  }
  
  // Ensure at least one character from each required set
  for (const req of requirements) {
    const randomIndex = crypto.randomInt(0, req.length);
    password += req[randomIndex];
  }
  
  // Fill remaining length with random characters
  while (password.length < length) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  // Shuffle the password to avoid predictable patterns
  password = password.split('').sort(() => crypto.randomInt(-1, 2)).join('');
  
  return password;
}

/**
 * Checks if a password is commonly used
 * 
 * @param {string} password - Password to check
 * @returns {boolean} True if password is common
 * 
 * SECURITY: Prevents use of most common passwords
 * In production, consider using a larger dictionary (10k+ entries)
 */
function isCommonPassword(password) {
  // Top 100 most common passwords (shortened list)
  const commonPasswords = [
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'monkey', '1234567', 'letmein', 'trustno1', 'dragon',
    'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
    'bailey', 'passw0rd', 'shadow', '123123', '654321',
    'superman', 'qazwsx', 'michael', 'football', 'password1',
    'password123', 'batman', 'login', 'admin', 'princess',
    'starwars', 'welcome', 'hello', 'charlie', 'donald',
    '!@#$%^&*', 'aa123456', 'qwerty123', 'test', 'test123',
    'password12', '1234567890', 'guest', 'master123', 'changeme'
  ];
  
  const lowerPassword = password.toLowerCase();
  
  // Check exact matches
  if (commonPasswords.includes(lowerPassword)) {
    return true;
  }
  
  // Check with common substitutions
  const substituted = lowerPassword
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's');
  
  return commonPasswords.includes(substituted);
}

/**
 * Checks if password contains user information
 * 
 * @param {string} password - Password to check
 * @param {Object} userInfo - User information to check against
 * @param {string} userInfo.email - User's email
 * @param {string} userInfo.firstName - User's first name
 * @param {string} userInfo.lastName - User's last name
 * @returns {boolean} True if password contains user info
 */
function containsUserInfo(password, userInfo) {
  const lowerPassword = password.toLowerCase();
  
  const fieldsToCheck = [
    userInfo.email?.split('@')[0], // Username part of email
    userInfo.firstName,
    userInfo.lastName
  ].filter(Boolean).map(s => s.toLowerCase());
  
  for (const field of fieldsToCheck) {
    if (field.length >= 3 && lowerPassword.includes(field)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Checks if new password is too similar to old password
 * 
 * @param {string} newPassword - New password
 * @param {string} oldPassword - Old password
 * @returns {boolean} True if passwords are too similar
 */
function isTooSimilar(newPassword, oldPassword) {
  if (!oldPassword) {
    return false;
  }
  
  // Simple check: if new password contains old password
  if (newPassword.toLowerCase().includes(oldPassword.toLowerCase())) {
    return true;
  }
  
  // Simple character overlap check
  const overlap = countOverlap(newPassword, oldPassword);
  const similarity = overlap / Math.max(newPassword.length, oldPassword.length);
  
  return similarity > 0.7; // 70% or more similar
}

/**
 * Counts character overlap between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Number of overlapping characters
 */
function countOverlap(str1, str2) {
  const chars1 = new Set(str1.toLowerCase().split(''));
  const chars2 = new Set(str2.toLowerCase().split(''));
  
  let overlap = 0;
  for (const char of chars1) {
    if (chars2.has(char)) {
      overlap++;
    }
  }
  
  return overlap;
}

/**
 * Validates a new password comprehensively
 * 
 * @param {string} password - New password
 * @param {Object} context - Validation context
 * @param {Object} context.userInfo - User information
 * @param {string} context.oldPassword - Old password (for change password)
 * @returns {Object} { valid: boolean, errors: string[], strength: number }
 */
function validatePassword(password, context = {}) {
  const errors = [];
  
  // Basic policy validation
  const policyResult = validatePolicy(password, context);
  errors.push(...policyResult.errors);
  
  // Check against common passwords
  if (isCommonPassword(password)) {
    errors.push('This password is too common. Please choose a more unique password.');
  }
  
  // Check for user information in password
  if (context.userInfo && containsUserInfo(password, context.userInfo)) {
    errors.push('Password should not contain your personal information.');
  }
  
  // Check similarity to old password
  if (context.oldPassword && isTooSimilar(password, context.oldPassword)) {
    errors.push('New password is too similar to your current password.');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    strength: policyResult.strength
  };
}

/**
 * Hashes password for storage (with full validation)
 * 
 * @param {string} password - Password to hash
 * @param {Object} context - Validation context
 * @returns {Promise<string>} Hashed password
 * @throws {Error} If password validation fails
 */
async function hashPassword(password, context = {}) {
  const validation = validatePassword(password, context);
  
  if (!validation.valid) {
    const error = new Error('Password validation failed');
    error.code = 'PASSWORD_VALIDATION_FAILED';
    error.details = validation.errors;
    throw error;
  }
  
  return hash(password);
}

module.exports = {
  validatePolicy,
  calculateStrength,
  hash,
  verify,
  generateRandom,
  isCommonPassword,
  containsUserInfo,
  isTooSimilar,
  validatePassword,
  hashPassword
};
