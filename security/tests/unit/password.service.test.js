/**
 * @fileoverview Password Service Unit Tests
 * @description Tests for password hashing and validation
 */

'use strict';

const assert = require('node:assert');
const passwordService = require('../../services/password.service');

/**
 * Test suite for Password Service
 */
const testPasswordService = {
  /**
   * Default policy for tests to prevent undefined property errors
   */
  defaultOptions: {
    policy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecial: true
    }
  },

  /**
   * Test: Password Policy Validation - Valid Password
   */
  async testValidPasswordPolicy() {
    console.log('Testing: validatePolicy with valid password');
    const result = await passwordService.validatePolicy('SecureP@ss123', this.defaultOptions);
    
    // Assertions
    assert.strictEqual(result.valid, true, 'Password should be valid');
    assert.strictEqual(result.errors.length, 0, 'Should have no errors');
    assert.ok(result.strength >= 2, 'Should have strength >= 2');
    
    console.log('✓ validatePolicy valid password passed');
    return true;
  },
  
  /**
   * Test: Password Policy Validation - Too Short
   */
  async testPasswordTooShort() {
    console.log('Testing: validatePolicy with short password');
    const result = await passwordService.validatePolicy('Short1!', this.defaultOptions);
    
    // Assertions
    assert.strictEqual(result.valid, false, 'Password should be invalid');
    assert.ok(result.errors.length > 0, 'Should have errors');
    assert.ok(
      result.errors.some(e => e.includes('at least')),
      'Should mention minimum length'
    );
    
    console.log('✓ validatePolicy short password passed');
    return true;
  },
  
  /**
   * Test: Password Policy Validation - Missing Uppercase
   */
  async testPasswordMissingUppercase() {
    console.log('Testing: validatePolicy missing uppercase');
    const result = await passwordService.validatePolicy('lowercase123!', this.defaultOptions);
    
    // Assertions
    assert.strictEqual(result.valid, false, 'Password should be invalid');
    assert.ok(
      result.errors.some(e => e.includes('uppercase')),
      'Should mention uppercase requirement'
    );
    
    console.log('✓ validatePolicy missing uppercase passed');
    return true;
  },
  
  /**
   * Test: Password Policy Validation - Missing Special Character
   */
  async testPasswordMissingSpecial() {
    console.log('Testing: validatePolicy missing special char');
    const result = await passwordService.validatePolicy('Password123', this.defaultOptions);
    
    // Assertions
    assert.strictEqual(result.valid, false, 'Password should be invalid');
    assert.ok(
      result.errors.some(e => e.includes('special')),
      'Should mention special character requirement'
    );
    
    console.log('✓ validatePolicy missing special passed');
    return true;
  },
  
  /**
   * Test: Password Strength Calculation
   */
  testPasswordStrength() {
    console.log('Testing: calculateStrength');
    // Test weak password
    const weakStrength = passwordService.calculateStrength('password');
    assert.ok(weakStrength <= 1, 'Weak password should have low strength');
    
    // Test medium password
    const mediumStrength = passwordService.calculateStrength('Tr0ub4dur&3');
    assert.ok(mediumStrength >= 1 && mediumStrength <= 3, 'Medium password should have medium strength');
    
    // Test strong password
    const strongStrength = passwordService.calculateStrength('MyV3ry$tr0ngP@ssw0rd!');
    assert.ok(strongStrength >= 3, 'Strong password should have high strength');
    
    console.log('✓ calculateStrength passed');
    return true;
  },
  
  /**
   * Test: Password Hashing
   */
  async testPasswordHashing() {
    console.log('Testing: hash');
    const password = 'SecureP@ss123';
    const hash = await passwordService.hash(password, this.defaultOptions);
    
    // Assertions
    assert.strictEqual(typeof hash, 'string', 'Hash should be a string');
    assert.ok(hash.startsWith('$2'), 'Should be bcrypt hash');
    assert.ok(hash.length > 50, 'Hash should be long');
    assert.notStrictEqual(hash, password, 'Hash should not equal password');
    
    console.log('✓ hash passed');
    return true;
  },
  
  /**
   * Test: Password Verification
   */
  async testPasswordVerification() {
    console.log('Testing: verify');
    const password = 'SecureP@ss123';
    const hash = await passwordService.hash(password, this.defaultOptions);
    
    const isValid = await passwordService.verify(password, hash);
    const isInvalid = await passwordService.verify('wrongpassword', hash);
    
    // Assertions
    assert.strictEqual(isValid, true, 'Correct password should verify');
    assert.strictEqual(isInvalid, false, 'Wrong password should not verify');
    
    console.log('✓ verify passed');
    return true;
  },
  
  /**
   * Test: Random Password Generation
   */
  testRandomPasswordGeneration() {
    console.log('Testing: generateRandom');
    const password1 = passwordService.generateRandom(16);
    const password2 = passwordService.generateRandom(16);
    
    // Assertions
    assert.strictEqual(password1.length, 16, 'Should be 16 characters');
    assert.notStrictEqual(password1, password2, 'Should be unique');
    assert.ok(/[a-z]/.test(password1), 'Should contain lowercase');
    assert.ok(/[A-Z]/.test(password1), 'Should contain uppercase');
    assert.ok(/[0-9]/.test(password1), 'Should contain number');
    
    // Test options
    const numbersOnly = passwordService.generateRandom(10, {
      includeUppercase: false,
      includeLowercase: false,
      includeNumbers: true,
      includeSpecial: false
    });
    assert.ok(/^\d+$/.test(numbersOnly), 'Should be numbers only');
    
    console.log('✓ generateRandom passed');
    return true;
  },
  
  /**
   * Test: Common Password Detection
   */
  testCommonPasswordDetection() {
    console.log('Testing: isCommonPassword');
    // Test common passwords
    assert.strictEqual(passwordService.isCommonPassword('password'), true, 'password should be common');
    assert.strictEqual(passwordService.isCommonPassword('123456'), true, '123456 should be common');
    assert.strictEqual(passwordService.isCommonPassword('qwerty'), true, 'qwerty should be common');
    
    // Test with substitutions
    assert.strictEqual(passwordService.isCommonPassword('p@ssw0rd'), true, 'p@ssw0rd should be detected');
    
    // Test uncommon password
    assert.strictEqual(
      passwordService.isCommonPassword('xK9#mP2$vL7@nQ4!'),
      false,
      'Random password should not be common'
    );
    
    console.log('✓ isCommonPassword passed');
    return true;
  },
  
  /**
   * Test: User Info in Password Detection
   */
  testUserInfoInPassword() {
    console.log('Testing: containsUserInfo');
    const userInfo = {
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe'
    };
    
    // Should detect user info
    assert.strictEqual(
      passwordService.containsUserInfo('johnPassword123!', userInfo), true,
      'Should detect first name in password'
    );
    assert.strictEqual(
      passwordService.containsUserInfo('Doe2023!Pass', userInfo), true,
      'Should detect last name in password'
    );
    
    // Should not flag random password
    assert.strictEqual(
      passwordService.containsUserInfo('Random$ecure123', userInfo), false,
      'Should not flag random password'
    );
    
    console.log('✓ containsUserInfo passed');
    return true;
  },
  
  /**
   * Test: Password Similarity Check
   */
  testPasswordSimilarity() {
    console.log('Testing: isTooSimilar');
    // Should detect similar passwords
    assert.strictEqual(
      passwordService.isTooSimilar('Password123!', 'Password123'), true,
      'Should detect very similar passwords'
    );
    assert.strictEqual(
      passwordService.isTooSimilar('MyPassword123!New', 'Password123!'), true,
      'Should detect password contained in new'
    );
    
    // Should allow different passwords
    assert.strictEqual(
      passwordService.isTooSimilar('CompletelyDifferent!1', 'OldPassword@2'), false,
      'Should allow different passwords'
    );
    
    console.log('✓ isTooSimilar passed');
    return true;
  },
  
  /**
   * Test: Full Password Validation
   */
  async testFullPasswordValidation() {
    console.log('Testing: validatePassword');
    const userInfo = {
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe'
    };
    
    // Test valid password
    const validResult = await passwordService.validatePassword('$ecureR@nd0m!99', {
      userInfo,
      ...this.defaultOptions
    });
    assert.strictEqual(validResult.valid, true, 'Should be valid');
    
    // Test common password
    const commonResult = await passwordService.validatePassword('password123', { // Changed password to a known common one
      userInfo,
      ...this.defaultOptions
    });
    assert.strictEqual(commonResult.valid, false, 'Should reject common password');
    
    // Test with user info
    const userInfoResult = await passwordService.validatePassword('JohnDoe123!@#', {
      userInfo,
      ...this.defaultOptions
    });
    assert.strictEqual(userInfoResult.valid, false, 'Should reject password with user info');
    
    console.log('✓ validatePassword passed');
    return true;
  },
  
  /**
   * Run all tests
   */
  async runAll() {
    console.log('\n=== Password Service Tests ===\n');
    
    const tests = [
      'testValidPasswordPolicy',
      'testPasswordTooShort',
      'testPasswordMissingUppercase',
      'testPasswordMissingSpecial',
      'testPasswordStrength',
      'testPasswordHashing',
      'testPasswordVerification',
      'testRandomPasswordGeneration',
      'testCommonPasswordDetection',
      'testUserInfoInPassword',
      'testPasswordSimilarity',
      'testFullPasswordValidation'
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
      try {
        await this[test]();
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
module.exports = testPasswordService;

// Run tests if executed directly
if (require.main === module) {
  testPasswordService.runAll().catch(console.error);
}
