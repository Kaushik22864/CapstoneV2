/**
 * @fileoverview JWT Service Unit Tests
 * @description Tests for JWT token generation and validation
 */

'use strict';

// Mock dependencies before importing
const path = require('path');
const assert = require('node:assert');
const mockConfig = {
  jwt: {
    accessToken: {
      secret: 'test-access-secret-key-minimum-32-chars',
      expiresIn: '15m',
      algorithm: 'HS256'
    },
    refreshToken: {
      secret: 'test-refresh-secret-key-minimum-32-chars',
      expiresIn: '7d',
      algorithm: 'HS256'
    },
    issuer: 'test-issuer',
    audience: 'test-audience'
  },
  encryption: {
    key: 'test-encryption-key-32-chars!!!'
  }
};

// --- Mocking setup for security.config ---
// Resolve the absolute path to the security.config module.
// This path is relative to the *current test file*.
const configAbsolutePath = require.resolve('../../config/security.config');

// Clear the module cache for security.config to ensure our mock is used.
delete require.cache[configAbsolutePath];

// Manually set the exports for the security.config module in the cache.
// This ensures that any subsequent 'require' calls for this absolute path will receive mockConfig.
// Node.js's module loader uses absolute paths for its cache.
require.cache[configAbsolutePath] = {
  exports: mockConfig,
  id: configAbsolutePath,
  filename: configAbsolutePath,
  loaded: true,
  parent: module,
  children: [],
  paths: module.paths
};

// Now, import the jwtService. It will use the mocked config.
const jwtService = require('../../services/jwt.service');
// --- End Mocking setup ---

/**
 * Test suite for JWT Service
 */
const testJWTService = {
  /**
   * Test: Generate Access Token
   */
  testGenerateAccessToken() {
    console.log('Testing: generateAccessToken');
    const payload = {
      userId: '507f1f77bcf86cd799439011',
      email: 'doctor@test.com',
      role: 'Doctor',
      isVerified: true
    };
    
    const token = jwtService.generateAccessToken(payload);
    
    // Assertions
    assert.strictEqual(typeof token, 'string', 'Token should be a string');
    assert.strictEqual(token.split('.').length, 3, 'Token should have 3 parts (JWT format)');
    
    console.log('✓ generateAccessToken passed');
    return true;
  },
  
  /**
   * Test: Verify Access Token
   */
  testVerifyAccessToken() {
    console.log('Testing: verifyAccessToken');
    const payload = {
      userId: '507f1f77bcf86cd799439011',
      email: 'doctor@test.com',
      role: 'Doctor',
      isVerified: true
    };
    
    const token = jwtService.generateAccessToken(payload);
    const decoded = jwtService.verifyAccessToken(token);
    
    // Assertions
    assert.strictEqual(decoded.userId, payload.userId, 'userId should match');
    assert.strictEqual(decoded.email, payload.email, 'email should match');
    assert.strictEqual(decoded.role, payload.role, 'role should match');
    assert.strictEqual(decoded.isVerified, payload.isVerified, 'isVerified should match');
    assert.ok(decoded.jti !== undefined, 'jti (token ID) should exist');
    
    console.log('✓ verifyAccessToken passed');
    return true;
  },
  
  /**
   * Test: Invalid Token Rejection
   */
  testInvalidTokenRejection() {
    console.log('Testing: invalid token rejection');

    // Use assert.throws to check for the specific error type
    assert.throws(
      () => jwtService.verifyAccessToken('invalid.token.here'),
      { name: 'JsonWebTokenError' },
      'Should throw JsonWebTokenError for an invalid token'
    );
    
    console.log('✓ invalid token rejection passed');
    return true;
  },
  
  /**
   * Test: Generate Token Pair
   */
  testGenerateTokenPair() {
    console.log('Testing: generateTokenPair');
    const payload = {
      userId: '507f1f77bcf86cd799439011',
      email: 'doctor@test.com',
      role: 'Doctor',
      isVerified: true
    };
    
    const { accessToken, refreshToken, tokenFamily } = jwtService.generateTokenPair(payload);
    
    // Assertions
    assert.strictEqual(typeof accessToken, 'string', 'accessToken should be a string');
    assert.strictEqual(typeof refreshToken, 'string', 'refreshToken should be a string');
    assert.strictEqual(typeof tokenFamily, 'string', 'tokenFamily should be a string');
    assert.notStrictEqual(accessToken, refreshToken, 'Tokens should be different');
    
    console.log('✓ generateTokenPair passed');
    return true;
  },
  
  /**
   * Test: Verify Refresh Token
   */
  testVerifyRefreshToken() {
    console.log('Testing: verifyRefreshToken');
    const payload = { userId: '507f1f77bcf86cd799439011' };
    const tokenFamily = jwtService.generateTokenFamily();
    
    const refreshToken = jwtService.generateRefreshToken(payload, tokenFamily);
    const decoded = jwtService.verifyRefreshToken(refreshToken);
    
    // Assertions
    assert.strictEqual(decoded.userId, payload.userId, 'userId should match');
    assert.strictEqual(decoded.tokenFamily, tokenFamily, 'tokenFamily should match');
    assert.strictEqual(decoded.type, 'refresh', 'type should be refresh');
    
    console.log('✓ verifyRefreshToken passed');
    return true;
  },
  
  /**
   * Test: Decode Token Without Verification
   */
  testDecodeToken() {
    console.log('Testing: decodeToken');
    const payload = {
      userId: '507f1f77bcf86cd799439011',
      email: 'doctor@test.com',
      role: 'Doctor',
      isVerified: true
    };
    
    const token = jwtService.generateAccessToken(payload);
    const decoded = jwtService.decodeToken(token);
    
    // Assertions
    assert.notStrictEqual(decoded, null, 'Decoded should not be null');
    assert.ok(decoded.payload !== undefined, 'Should have payload');
    assert.ok(decoded.header !== undefined, 'Should have header');
    
    console.log('✓ decodeToken passed');
    return true;
  },
  
  /**
   * Test: Token Expiration Check
   */
  testIsTokenExpired() {
    console.log('Testing: isTokenExpired');
    const payload = {
      userId: '507f1f77bcf86cd799439011',
      email: 'doctor@test.com',
      role: 'Doctor',
      isVerified: true
    };
    
    const token = jwtService.generateAccessToken(payload);
    const isExpired = jwtService.isTokenExpired(token);
    
    // Assertions
    assert.strictEqual(isExpired, false, 'Fresh token should not be expired');
    
    console.log('✓ isTokenExpired passed');
    return true;
  },
  
  /**
   * Test: Get Token Lifetime
   */
  testGetTokenLifetime() {
    console.log('Testing: getTokenLifetime');
    const payload = {
      userId: '507f1f77bcf86cd799439011',
      email: 'doctor@test.com',
      role: 'Doctor',
      isVerified: true
    };
    
    const token = jwtService.generateAccessToken(payload);
    const lifetime = jwtService.getTokenLifetime(token);
    
    // Assertions
    assert.strictEqual(typeof lifetime, 'number', 'Lifetime should be a number');
    assert.ok(lifetime > 0, 'Lifetime should be positive');
    assert.ok(lifetime <= 15 * 60, 'Lifetime should be <= 15 minutes');
    
    console.log('✓ getTokenLifetime passed');
    return true;
  },
  
  /**
   * Test: Password Reset Token
   */
  testPasswordResetToken() {
    console.log('Testing: passwordResetToken');
    const userId = '507f1f77bcf86cd799439011';
    const email = 'doctor@test.com';
    
    const token = jwtService.generatePasswordResetToken(userId, email);
    const decoded = jwtService.verifyPasswordResetToken(token);
    
    // Assertions
    assert.strictEqual(decoded.userId, userId, 'userId should match');
    assert.strictEqual(decoded.email, email, 'email should match');
    assert.strictEqual(decoded.type, 'password_reset', 'type should be password_reset');
    
    console.log('✓ passwordResetToken passed');
    return true;
  },
  
  /**
   * Run all tests
   */
  runAll() {
    console.log('\n=== JWT Service Tests ===\n');
    
    const tests = [
      'testGenerateAccessToken',
      'testVerifyAccessToken',
      'testInvalidTokenRejection',
      'testGenerateTokenPair',
      'testVerifyRefreshToken',
      'testDecodeToken',
      'testIsTokenExpired',
      'testGetTokenLifetime',
      'testPasswordResetToken'
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
      try {
        this[test]();
        passed++;
      } catch (error) {
        console.error(`✗ ${test} failed:`, error.message);
        failed++;
      }
    }
    
    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
    return failed === 0;
  }
};

// Export for use with test runners
module.exports = testJWTService;

// Run tests if executed directly
if (require.main === module) {
  testJWTService.runAll();
}
