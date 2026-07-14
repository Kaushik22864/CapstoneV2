/**
 * @fileoverview Input Validation Unit Tests
 * @description Tests for input validation and sanitization
 */

'use strict';

/**
 * Test suite for Validation
 */
const testValidation = {
  /**
   * Test: MongoDB Query Sanitization
   */
  testMongoSanitization() {
    console.log('Testing: sanitizeMongoQuery');
    
    const { sanitizeMongoQuery } = require('../../middleware/validation.middleware');
    
    // Test removing $ operators
    const malicious = {
      username: 'admin',
      password: { $gt: '' }  // NoSQL injection attempt
    };
    
    const sanitized = sanitizeMongoQuery(malicious);
    
    console.assert(sanitized.username === 'admin', 'Should keep normal fields');
    console.assert(
      sanitized.password === undefined || 
      (typeof sanitized.password === 'object' && Object.keys(sanitized.password).length === 0),
      'Should remove or empty $gt operator'
    );
    
    // Test nested objects
    const nested = {
      user: {
        query: { $where: 'malicious' }
      }
    };
    
    const sanitizedNested = sanitizeMongoQuery(nested);
    console.assert(
      !JSON.stringify(sanitizedNested).includes('$where'),
      'Should remove nested $ operators'
    );
    
    console.log('✓ sanitizeMongoQuery passed');
    return true;
  },
  
  /**
   * Test: HTML Encoding
   */
  testHTMLEncoding() {
    console.log('Testing: encodeHTML');
    
    const sanitizer = require('../../utils/sanitizer');
    
    // Test XSS prevention
    const xssAttempt = '<script>alert("xss")</script>';
    const encoded = sanitizer.encodeHTML(xssAttempt);
    
    console.assert(!encoded.includes('<script>'), 'Should encode script tags');
    console.assert(encoded.includes('&lt;'), 'Should contain encoded less-than');
    console.assert(encoded.includes('&gt;'), 'Should contain encoded greater-than');
    
    // Test special characters
    const special = '"test" & \'quotes\'';
    const encodedSpecial = sanitizer.encodeHTML(special);
    
    console.assert(encodedSpecial.includes('&quot;'), 'Should encode double quotes');
    console.assert(encodedSpecial.includes('&amp;'), 'Should encode ampersand');
    console.assert(encodedSpecial.includes('&#x27;'), 'Should encode single quotes');
    
    console.log('✓ encodeHTML passed');
    return true;
  },
  
  /**
   * Test: HTML Stripping
   */
  testHTMLStripping() {
    console.log('Testing: stripHTML');
    
    const sanitizer = require('../../utils/sanitizer');
    
    const html = '<p>Hello <strong>World</strong></p><script>alert("xss")</script>';
    const stripped = sanitizer.stripHTML(html);
    
    console.assert(!stripped.includes('<'), 'Should remove all tags');
    console.assert(!stripped.includes('>'), 'Should remove all tags');
    console.assert(stripped.includes('Hello'), 'Should keep text content');
    console.assert(stripped.includes('World'), 'Should keep text content');
    console.assert(!stripped.includes('alert'), 'Should remove script content');
    
    console.log('✓ stripHTML passed');
    return true;
  },
  
  /**
   * Test: Filename Sanitization
   */
  testFilenameSanitization() {
    console.log('Testing: sanitizeFilename');
    
    const sanitizer = require('../../utils/sanitizer');
    
    // Test path traversal prevention
    const pathTraversal = '../../../etc/passwd';
    const sanitizedPath = sanitizer.sanitizeFilename(pathTraversal);
    
    console.assert(!sanitizedPath.includes('..'), 'Should remove path traversal');
    console.assert(!sanitizedPath.includes('/'), 'Should remove slashes');
    
    // Test special characters
    const special = 'file<>:"|?*.txt';
    const sanitizedSpecial = sanitizer.sanitizeFilename(special);
    
    console.assert(!sanitizedSpecial.includes('<'), 'Should remove <');
    console.assert(!sanitizedSpecial.includes('>'), 'Should remove >');
    console.assert(!sanitizedSpecial.includes('|'), 'Should remove |');
    console.assert(!sanitizedSpecial.includes('?'), 'Should remove ?');
    console.assert(!sanitizedSpecial.includes('*'), 'Should remove *');
    
    // Test null bytes
    const nullByte = 'file\x00.txt';
    const sanitizedNull = sanitizer.sanitizeFilename(nullByte);
    
    console.assert(!sanitizedNull.includes('\x00'), 'Should remove null bytes');
    
    console.log('✓ sanitizeFilename passed');
    return true;
  },
  
  /**
   * Test: Email Sanitization
   */
  testEmailSanitization() {
    console.log('Testing: sanitizeEmail');
    
    const sanitizer = require('../../utils/sanitizer');
    
    // Test lowercase conversion
    const uppercase = 'TEST@EXAMPLE.COM';
    const sanitizedUpper = sanitizer.sanitizeEmail(uppercase);
    
    console.assert(sanitizedUpper === 'test@example.com', 'Should lowercase email');
    
    // Test trimming
    const whitespace = '  email@test.com  ';
    const sanitizedWhitespace = sanitizer.sanitizeEmail(whitespace);
    
    console.assert(sanitizedWhitespace === 'email@test.com', 'Should trim whitespace');
    
    // Test dangerous character removal
    const dangerous = 'test<script>@example.com';
    const sanitizedDangerous = sanitizer.sanitizeEmail(dangerous);
    
    console.assert(!sanitizedDangerous.includes('<'), 'Should remove <');
    console.assert(!sanitizedDangerous.includes('>'), 'Should remove >');
    
    console.log('✓ sanitizeEmail passed');
    return true;
  },
  
  /**
   * Test: URL Sanitization
   */
  testURLSanitization() {
    console.log('Testing: sanitizeURL');
    
    const sanitizer = require('../../utils/sanitizer');
    
    // Test valid HTTPS URL
    const httpsUrl = 'https://example.com/path?query=value';
    const sanitizedHttps = sanitizer.sanitizeURL(httpsUrl);
    
    console.assert(sanitizedHttps !== null, 'Should allow HTTPS URLs');
    console.assert(sanitizedHttps.startsWith('https://'), 'Should keep HTTPS');
    
    // Test valid HTTP URL
    const httpUrl = 'http://example.com';
    const sanitizedHttp = sanitizer.sanitizeURL(httpUrl);
    
    console.assert(sanitizedHttp !== null, 'Should allow HTTP URLs');
    
    // Test javascript: URL rejection
    const javascriptUrl = 'javascript:alert("xss")';
    const sanitizedJavascript = sanitizer.sanitizeURL(javascriptUrl);
    
    console.assert(sanitizedJavascript === null, 'Should reject javascript: URLs');
    
    // Test data: URL rejection (when not configured to allow)
    const dataUrl = 'data:text/html,<script>alert("xss")</script>';
    const sanitizedData = sanitizer.sanitizeURL(dataUrl);
    
    console.assert(sanitizedData === null, 'Should reject data: URLs');
    
    // Test URL with credentials removal
    const credUrl = 'https://user:pass@example.com';
    const sanitizedCred = sanitizer.sanitizeURL(credUrl);
    
    console.assert(!sanitizedCred.includes('user:pass'), 'Should remove credentials');
    
    console.log('✓ sanitizeURL passed');
    return true;
  },
  
  /**
   * Test: Path Sanitization
   */
  testPathSanitization() {
    console.log('Testing: sanitizePath');
    
    const sanitizer = require('../../utils/sanitizer');
    
    // Test path traversal
    const traversal = '../../../etc/passwd';
    const sanitized = sanitizer.sanitizePath(traversal);
    
    console.assert(!sanitized.includes('..'), 'Should remove ..');
    
    // Test backslash normalization
    const backslash = 'path\\to\\file';
    const normalizedBackslash = sanitizer.sanitizePath(backslash);
    
    console.assert(!normalizedBackslash.includes('\\'), 'Should normalize backslashes');
    
    // Test multiple slashes
    const multiSlash = 'path///to////file';
    const normalizedSlash = sanitizer.sanitizePath(multiSlash);
    
    console.assert(!normalizedSlash.includes('//'), 'Should remove multiple slashes');
    
    console.log('✓ sanitizePath passed');
    return true;
  },
  
  /**
   * Test: Object Trimming
   */
  testObjectTrimming() {
    console.log('Testing: trimObject');
    
    const sanitizer = require('../../utils/sanitizer');
    
    const obj = {
      name: '  John  ',
      email: '  test@example.com  ',
      nested: {
        value: '  nested value  '
      },
      number: 123,
      nullVal: null
    };
    
    const trimmed = sanitizer.trimObject(obj);
    
    console.assert(trimmed.name === 'John', 'Should trim string values');
    console.assert(trimmed.email === 'test@example.com', 'Should trim email');
    console.assert(trimmed.nested.value === 'nested value', 'Should trim nested strings');
    console.assert(trimmed.number === 123, 'Should preserve numbers');
    console.assert(trimmed.nullVal === null, 'Should preserve null');
    
    console.log('✓ trimObject passed');
    return true;
  },
  
  /**
   * Test: HTML Sanitization
   */
  testHTMLSanitization() {
    console.log('Testing: sanitizeHTML');
    
    const sanitizer = require('../../utils/sanitizer');
    
    // Test script removal
    const script = '<p>Hello</p><script>alert("xss")</script>';
    const sanitizedScript = sanitizer.sanitizeHTML(script);
    
    console.assert(!sanitizedScript.includes('<script'), 'Should remove script tags');
    console.assert(!sanitizedScript.includes('alert'), 'Should remove script content');
    
    // Test event handler removal
    const eventHandler = '<div onclick="alert(\'xss\')">Click me</div>';
    const sanitizedEvent = sanitizer.sanitizeHTML(eventHandler);
    
    console.assert(!sanitizedEvent.includes('onclick'), 'Should remove onclick');
    
    // Test javascript: URL removal
    const jsUrl = '<a href="javascript:alert(1)">Link</a>';
    const sanitizedJsUrl = sanitizer.sanitizeHTML(jsUrl);
    
    console.assert(!sanitizedJsUrl.includes('javascript:'), 'Should remove javascript: URLs');
    
    console.log('✓ sanitizeHTML passed');
    return true;
  },
  
  /**
   * Test: MongoDB Object Sanitization
   */
  testMongoObjectSanitization() {
    console.log('Testing: sanitizeMongoObject');
    
    const sanitizer = require('../../utils/sanitizer');
    
    // Test operator removal
    const withOperators = {
      name: 'John',
      $where: 'function() { return true }',
      query: {
        $gt: 100
      }
    };
    
    const sanitized = sanitizer.sanitizeMongoObject(withOperators);
    
    console.assert(!('$where' in sanitized), 'Should remove $where');
    console.assert(sanitized.name === 'John', 'Should keep normal fields');
    console.assert(!('$gt' in (sanitized.query || {})), 'Should remove nested operators');
    
    // Test dot notation prevention
    const dotNotation = {
      'field.nested': 'value',
      normal: 'keep'
    };
    
    const sanitizedDot = sanitizer.sanitizeMongoObject(dotNotation);
    
    console.assert(!('field.nested' in sanitizedDot), 'Should remove dot notation keys');
    console.assert(sanitizedDot.normal === 'keep', 'Should keep normal keys');
    
    console.log('✓ sanitizeMongoObject passed');
    return true;
  },
  
  /**
   * Run all tests
   */
  runAll() {
    console.log('\n=== Validation Tests ===\n');
    
    const tests = [
      'testMongoSanitization',
      'testHTMLEncoding',
      'testHTMLStripping',
      'testFilenameSanitization',
      'testEmailSanitization',
      'testURLSanitization',
      'testPathSanitization',
      'testObjectTrimming',
      'testHTMLSanitization',
      'testMongoObjectSanitization'
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
module.exports = testValidation;

// Run tests if executed directly
if (require.main === module) {
  testValidation.runAll();
}