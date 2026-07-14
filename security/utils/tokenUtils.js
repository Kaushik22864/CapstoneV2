/**
 * @fileoverview JWT Token Utilities
 * @description Helper functions for JWT token extraction and verification
 * @module security/utils/tokenUtils
 * 
 * USAGE:
 *   const { extractBearerToken, verifyAccessToken } = require('./tokenUtils');
 *   const token = extractBearerToken(req.headers.authorization);
 *   const decoded = verifyAccessToken(token);
 */

'use strict';

const jwt = require('jsonwebtoken');
const securityConfig = require('../config/security.config');

/**
 * Extracts Bearer token from Authorization header
 * 
 * @param {string|undefined} authHeader - Authorization header value
 * @returns {string|null} JWT token or null if not found/invalid format
 * 
 * SECURITY NOTES:
 * - Only accepts "Bearer <token>" format (case-insensitive scheme)
 * - Rejects other auth schemes (Basic, Digest, etc.)
 * - Returns null for malformed headers (doesn't throw)
 * 
 * @example
 * const token = extractBearerToken(req.headers.authorization);
 * // "Bearer eyJhbG..." -> "eyJhbG..."
 * // "Basic abc123"    -> null
 * // undefined         -> null
 */
function extractBearerToken(authHeader) {
    if (!authHeader || typeof authHeader !== 'string') {
        return null;
    }

    // Split "Bearer <token>"
    const parts = authHeader.split(' ');

    // Must have exactly 2 parts
    if (parts.length !== 2) {
        return null;
    }

    const [scheme, token] = parts;

    // Only accept Bearer scheme (case-insensitive)
    if (!/^Bearer$/i.test(scheme)) {
        return null;
    }

    // Basic JWT format validation (3 base64url parts separated by dots)
    if (!/^[\w-]+\.[\w-]+\.[\w-]*$/.test(token)) {
        return null;
    }

    return token;
}

/**
 * Verifies and decodes an access token
 * 
 * @param {string} token - JWT access token
 * @returns {Object} Decoded token payload
 * @throws {JsonWebTokenError} If token is invalid
 * @throws {TokenExpiredError} If token has expired
 * @throws {NotBeforeError} If token is not yet active
 * 
 * SECURITY NOTES:
 * - Validates signature using HS256 algorithm only
 * - Checks expiration (exp claim)
 * - Validates issuer and audience claims
 * - Algorithm is explicitly specified to prevent algorithm confusion attacks
 * 
 * @example
 * try {
 *   const decoded = verifyAccessToken(token);
 *   console.log(decoded.sub); // User ID
 * } catch (error) {
 *   if (error.name === 'TokenExpiredError') {
 *     // Handle expired token
 *   }
 * }
 */
function verifyAccessToken(token) {
    if (!token) {
        const error = new Error('Token is required');
        error.name = 'JsonWebTokenError';
        throw error;
    }

    return jwt.verify(token, securityConfig.jwt.accessToken.secret, {
        algorithms: [securityConfig.jwt.accessToken.algorithm], // Prevent algorithm confusion
        issuer: securityConfig.jwt.issuer,
        audience: securityConfig.jwt.audience,
        complete: false // Return payload only, not header
    });
}

/**
 * Verifies and decodes a refresh token
 * 
 * @param {string} token - JWT refresh token
 * @returns {Object} Decoded token payload
 * @throws {JsonWebTokenError} If token is invalid
 * @throws {TokenExpiredError} If token has expired
 */
function verifyRefreshToken(token) {
    if (!token) {
        const error = new Error('Token is required');
        error.name = 'JsonWebTokenError';
        throw error;
    }

    return jwt.verify(token, securityConfig.jwt.refreshToken.secret, {
        algorithms: [securityConfig.jwt.refreshToken.algorithm],
        issuer: securityConfig.jwt.issuer,
        complete: false
    });
}

/**
 * Decodes a token without verification
 * 
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token or null if invalid
 * 
 * WARNING: This does NOT verify the signature!
 * Only use for inspection/debugging purposes.
 */
function decodeToken(token) {
    try {
        return jwt.decode(token, { complete: true });
    } catch {
        return null;
    }
}

/**
 * Checks if a token is expired (without full verification)
 * 
 * @param {string} token - JWT token
 * @returns {boolean} True if expired or invalid
 */
function isTokenExpired(token) {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.payload || !decoded.payload.exp) {
        return true;
    }
    return decoded.payload.exp * 1000 < Date.now();
}

/**
 * Gets the remaining lifetime of a token in seconds
 * 
 * @param {string} token - JWT token
 * @returns {number} Seconds until expiration (0 if expired)
 */
function getTokenTTL(token) {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.payload || !decoded.payload.exp) {
        return 0;
    }
    const remaining = decoded.payload.exp - Math.floor(Date.now() / 1000);
    return Math.max(0, remaining);
}

/**
 * Extracts user ID from token (sub claim)
 * 
 * @param {string} token - JWT token
 * @returns {string|null} User ID or null
 */
function getUserIdFromToken(token) {
    const decoded = decodeToken(token);
    return decoded?.payload?.sub || decoded?.payload?.userId || null;
}

module.exports = {
    extractBearerToken,
    verifyAccessToken,
    verifyRefreshToken,
    decodeToken,
    isTokenExpired,
    getTokenTTL,
    getUserIdFromToken
};
