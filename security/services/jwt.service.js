/**
 * @fileoverview JWT Token Service
 * @description Handles JWT token generation, validation, and refresh
 * @module security/services/jwt.service
 * 
 * THREAT MODEL:
 * - Token theft: Mitigated by short expiry times
 * - Token tampering: Mitigated by signature verification
 * - Token reuse after logout: Mitigated by token blacklisting (requires Redis)
 * - Token family attacks: Mitigated by refresh token rotation
 * 
 * DEPENDENCY: Requires jsonwebtoken package
 * npm install jsonwebtoken
 */

'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const securityConfig = require('../config/security.config');
const auditService = require('./audit.service');

/**
 * Generates a unique token ID (jti)
 * Used for token tracking and revocation
 * 
 * @returns {string} Unique token ID
 */
function generateTokenId() {
  return crypto.randomUUID();
}

/**
 * Generates a token family ID for refresh token rotation
 * 
 * @returns {string} Token family ID
 */
function generateTokenFamily() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generates an access token
 * 
 * @param {Object} payload - Token payload
 * @param {string} payload.userId - User's database ID
 * @param {string} payload.email - User's email
 * @param {string} payload.role - User's role (Admin, Doctor, Unverified)
 * @param {boolean} payload.isVerified - Whether user is verified
 * @param {Object} options - Additional options
 * @returns {string} Signed JWT access token
 * 
 * USAGE:
 * const token = jwtService.generateAccessToken({
 *   userId: user._id,
 *   email: user.email,
 *   role: user.role,
 *   isVerified: user.isVerified
 * });
 */
function generateAccessToken(payload, options = {}) {
  const tokenId = generateTokenId();
  
  const tokenPayload = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    isVerified: payload.isVerified || false,
    jti: tokenId, // Unique token ID for revocation
    type: 'access'
  };
  
  const signOptions = {
    expiresIn: options.expiresIn || securityConfig.jwt.accessToken.expiresIn,
    algorithm: securityConfig.jwt.accessToken.algorithm,
    issuer: securityConfig.jwt.issuer,
    audience: securityConfig.jwt.audience
  };
  
  return jwt.sign(
    tokenPayload,
    securityConfig.jwt.accessToken.secret,
    signOptions
  );
}

/**
 * Generates a refresh token
 * 
 * @param {Object} payload - Token payload
 * @param {string} payload.userId - User's database ID
 * @param {string} tokenFamily - Token family for rotation tracking
 * @param {Object} options - Additional options
 * @returns {string} Signed JWT refresh token
 * 
 * SECURITY: Refresh tokens should be stored in httpOnly cookies
 */
function generateRefreshToken(payload, tokenFamily = null, options = {}) {
  const tokenId = generateTokenId();
  const family = tokenFamily || generateTokenFamily();
  
  const tokenPayload = {
    userId: payload.userId,
    jti: tokenId,
    tokenFamily: family, // For rotation detection
    type: 'refresh'
  };
  
  const signOptions = {
    expiresIn: options.expiresIn || securityConfig.jwt.refreshToken.expiresIn,
    algorithm: securityConfig.jwt.refreshToken.algorithm,
    issuer: securityConfig.jwt.issuer
  };
  
  return jwt.sign(
    tokenPayload,
    securityConfig.jwt.refreshToken.secret,
    signOptions
  );
}

/**
 * Generates both access and refresh tokens
 * 
 * @param {Object} payload - Token payload
 * @param {string} payload.userId - User's database ID
 * @param {string} payload.email - User's email
 * @param {string} payload.role - User's role
 * @param {boolean} payload.isVerified - Whether user is verified
 * @returns {Object} { accessToken, refreshToken, tokenFamily }
 * 
 * USAGE:
 * const { accessToken, refreshToken } = jwtService.generateTokenPair({
 *   userId: user._id,
 *   email: user.email,
 *   role: user.role,
 *   isVerified: user.isVerified
 * });
 */
function generateTokenPair(payload) {
  const tokenFamily = generateTokenFamily();
  
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(
    { userId: payload.userId },
    tokenFamily
  );
  
  // Log token generation
  auditService.log({
    action: 'TOKEN_GENERATED',
    userId: payload.userId,
    details: {
      tokenFamily: tokenFamily.substring(0, 8) + '...' // Partial for logging
    }
  });
  
  return {
    accessToken,
    refreshToken,
    tokenFamily
  };
}

/**
 * Verifies an access token
 * 
 * @param {string} token - JWT access token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 * 
 * USAGE:
 * try {
 *   const decoded = jwtService.verifyAccessToken(token);
 *   console.log(decoded.userId);
 * } catch (error) {
 *   // Handle invalid token
 * }
 */
function verifyAccessToken(token) {
  return jwt.verify(token, securityConfig.jwt.accessToken.secret, {
    algorithms: [securityConfig.jwt.accessToken.algorithm],
    issuer: securityConfig.jwt.issuer,
    audience: securityConfig.jwt.audience
  });
}

/**
 * Verifies a refresh token
 * 
 * @param {string} token - JWT refresh token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, securityConfig.jwt.refreshToken.secret, {
    algorithms: [securityConfig.jwt.refreshToken.algorithm],
    issuer: securityConfig.jwt.issuer
  });
}

/**
 * Decodes a token without verification
 * Useful for inspecting expired tokens
 * 
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 * 
 * SECURITY WARNING: This does NOT verify the signature
 * Only use for inspection, never for authentication
 */
function decodeToken(token) {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    return null;
  }
}

/**
 * Rotates refresh token
 * Generates new token pair while maintaining token family
 * 
 * @param {string} refreshToken - Current refresh token
 * @param {Object} userPayload - User data for new access token
 * @returns {Object} { accessToken, refreshToken, tokenFamily }
 * @throws {Error} If refresh token is invalid
 * 
 * SECURITY: Implements refresh token rotation
 * If same refresh token is used twice, entire family should be revoked
 */
function rotateRefreshToken(refreshToken, userPayload) {
  // Verify current refresh token
  const decoded = verifyRefreshToken(refreshToken);
  
  // Generate new tokens with same family
  const accessToken = generateAccessToken(userPayload);
  const newRefreshToken = generateRefreshToken(
    { userId: decoded.userId },
    decoded.tokenFamily
  );
  
  // Log rotation
  auditService.log({
    action: 'TOKEN_ROTATED',
    userId: decoded.userId,
    details: {
      tokenFamily: decoded.tokenFamily.substring(0, 8) + '...'
    }
  });
  
  return {
    accessToken,
    refreshToken: newRefreshToken,
    tokenFamily: decoded.tokenFamily
  };
}

/**
 * Generates a password reset token
 * 
 * @param {string} userId - User's database ID
 * @param {string} email - User's email
 * @returns {string} Password reset token
 */
function generatePasswordResetToken(userId, email) {
  const tokenPayload = {
    userId,
    email,
    type: 'password_reset',
    jti: generateTokenId()
  };
  
  return jwt.sign(tokenPayload, securityConfig.jwt.accessToken.secret, {
    expiresIn: '1h', // Password reset tokens expire in 1 hour
    algorithm: securityConfig.jwt.accessToken.algorithm,
    issuer: securityConfig.jwt.issuer
  });
}

/**
 * Verifies a password reset token
 * 
 * @param {string} token - Password reset token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyPasswordResetToken(token) {
  const decoded = jwt.verify(token, securityConfig.jwt.accessToken.secret, {
    algorithms: [securityConfig.jwt.accessToken.algorithm],
    issuer: securityConfig.jwt.issuer
  });
  
  if (decoded.type !== 'password_reset') {
    throw new Error('Invalid token type');
  }
  
  return decoded;
}

/**
 * Generates an email verification token
 * 
 * @param {string} userId - User's database ID
 * @param {string} email - User's email
 * @returns {string} Email verification token
 */
function generateEmailVerificationToken(userId, email) {
  const tokenPayload = {
    userId,
    email,
    type: 'email_verification',
    jti: generateTokenId()
  };
  
  return jwt.sign(tokenPayload, securityConfig.jwt.accessToken.secret, {
    expiresIn: '24h', // Email verification expires in 24 hours
    algorithm: securityConfig.jwt.accessToken.algorithm,
    issuer: securityConfig.jwt.issuer
  });
}

/**
 * Verifies an email verification token
 * 
 * @param {string} token - Email verification token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyEmailVerificationToken(token) {
  const decoded = jwt.verify(token, securityConfig.jwt.accessToken.secret, {
    algorithms: [securityConfig.jwt.accessToken.algorithm],
    issuer: securityConfig.jwt.issuer
  });
  
  if (decoded.type !== 'email_verification') {
    throw new Error('Invalid token type');
  }
  
  return decoded;
}

/**
 * Gets token expiration time
 * 
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date or null
 */
function getTokenExpiration(token) {
  const decoded = decodeToken(token);
  if (decoded && decoded.payload && decoded.payload.exp) {
    return new Date(decoded.payload.exp * 1000);
  }
  return null;
}

/**
 * Checks if token is expired
 * 
 * @param {string} token - JWT token
 * @returns {boolean} True if expired
 */
function isTokenExpired(token) {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return true;
  }
  return expiration < new Date();
}

/**
 * Gets remaining token lifetime in seconds
 * 
 * @param {string} token - JWT token
 * @returns {number} Seconds until expiration (0 if expired)
 */
function getTokenLifetime(token) {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return 0;
  }
  const remaining = Math.floor((expiration - new Date()) / 1000);
  return Math.max(0, remaining);
}

module.exports = {
  generateTokenId,
  generateTokenFamily,
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  rotateRefreshToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
  getTokenExpiration,
  isTokenExpired,
  getTokenLifetime
};
