/**
 * @fileoverview Data Encryption Service
 * @description Handles encryption and decryption of sensitive data at rest
 * @module security/services/encryption.service
 * 
 * THREAT MODEL:
 * - Database breach: Mitigated by encrypting sensitive fields
 * - Key compromise: Mitigated by proper key management
 * - Algorithm weakness: Mitigated by using AES-256-GCM (authenticated encryption)
 * 
 * SECURITY NOTE: Encryption key must be kept secure
 * Store in environment variable, never in code
 */

'use strict';

const crypto = require('crypto');
const securityConfig = require('../config/security.config');

/**
 * Encryption configuration
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;       // 16 bytes for AES
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM auth tag
const SALT_LENGTH = 32;     // 32 bytes for key derivation salt
const KEY_LENGTH = 32;      // 32 bytes for AES-256

/**
 * Derives an encryption key from the master key and salt
 * Uses PBKDF2 for key derivation
 * 
 * @param {string} masterKey - Master encryption key
 * @param {Buffer} salt - Salt for key derivation
 * @returns {Buffer} Derived key
 * 
 * SECURITY: Key derivation adds entropy and allows for unique keys per record
 */
function deriveKey(masterKey, salt) {
  return crypto.pbkdf2Sync(
    masterKey,
    salt,
    100000, // iterations
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Encrypts data using AES-256-GCM
 * 
 * @param {string|Object} data - Data to encrypt (string or object)
 * @returns {string} Encrypted data as base64 string
 * 
 * USAGE:
 * const encrypted = encryptionService.encrypt('sensitive data');
 * const encrypted = encryptionService.encrypt({ ssn: '123-45-6789' });
 * 
 * OUTPUT FORMAT: base64(salt + iv + authTag + ciphertext)
 * 
 * SECURITY: Uses authenticated encryption (GCM mode)
 * Prevents tampering with encrypted data
 */
function encrypt(data) {
  if (data === null || data === undefined) {
    return null;
  }
  
  // Convert object to string
  const plaintext = typeof data === 'object' 
    ? JSON.stringify(data) 
    : String(data);
  
  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Derive key from master key
  const masterKey = securityConfig.encryption.key;
  const key = deriveKey(masterKey, salt);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  
  // Encrypt data
  let ciphertext = cipher.update(plaintext, 'utf8');
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  
  // Get authentication tag
  const authTag = cipher.getAuthTag();
  
  // Combine all components: salt + iv + authTag + ciphertext
  const combined = Buffer.concat([salt, iv, authTag, ciphertext]);
  
  return combined.toString('base64');
}

/**
 * Decrypts data encrypted with encrypt()
 * 
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @param {boolean} parseJson - Whether to parse result as JSON
 * @returns {string|Object|null} Decrypted data
 * 
 * USAGE:
 * const decrypted = encryptionService.decrypt(encrypted);
 * const decrypted = encryptionService.decrypt(encrypted, true); // Parse as JSON
 * 
 * SECURITY: Verifies authentication tag to ensure data integrity
 */
function decrypt(encryptedData, parseJson = false) {
  if (!encryptedData) {
    return null;
  }
  
  try {
    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    let offset = 0;
    
    const salt = combined.subarray(offset, offset + SALT_LENGTH);
    offset += SALT_LENGTH;
    
    const iv = combined.subarray(offset, offset + IV_LENGTH);
    offset += IV_LENGTH;
    
    const authTag = combined.subarray(offset, offset + AUTH_TAG_LENGTH);
    offset += AUTH_TAG_LENGTH;
    
    const ciphertext = combined.subarray(offset);
    
    // Derive key from master key
    const masterKey = securityConfig.encryption.key;
    const key = deriveKey(masterKey, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });
    
    // Set auth tag for verification
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let plaintext = decipher.update(ciphertext);
    plaintext = Buffer.concat([plaintext, decipher.final()]);
    
    const result = plaintext.toString('utf8');
    
    // Parse as JSON if requested
    if (parseJson) {
      return JSON.parse(result);
    }
    
    return result;
  } catch (error) {
    // Log error but don't expose details
    console.error('Decryption failed');
    
    // Could be tampered data or wrong key
    if (error.message === 'Unsupported state or unable to authenticate data') {
      throw new Error('Data integrity check failed');
    }
    
    throw new Error('Decryption failed');
  }
}

/**
 * Encrypts a specific field in an object
 * 
 * @param {Object} obj - Object containing field to encrypt
 * @param {string} fieldName - Name of field to encrypt
 * @returns {Object} Object with encrypted field
 * 
 * USAGE:
 * const user = { name: 'John', ssn: '123-45-6789' };
 * const encrypted = encryptionService.encryptField(user, 'ssn');
 */
function encryptField(obj, fieldName) {
  if (!obj || !obj[fieldName]) {
    return obj;
  }
  
  return {
    ...obj,
    [fieldName]: encrypt(obj[fieldName])
  };
}

/**
 * Decrypts a specific field in an object
 * 
 * @param {Object} obj - Object containing encrypted field
 * @param {string} fieldName - Name of field to decrypt
 * @param {boolean} parseJson - Whether to parse as JSON
 * @returns {Object} Object with decrypted field
 */
function decryptField(obj, fieldName, parseJson = false) {
  if (!obj || !obj[fieldName]) {
    return obj;
  }
  
  return {
    ...obj,
    [fieldName]: decrypt(obj[fieldName], parseJson)
  };
}

/**
 * Encrypts multiple fields in an object
 * 
 * @param {Object} obj - Object containing fields to encrypt
 * @param {string[]} fieldNames - Names of fields to encrypt
 * @returns {Object} Object with encrypted fields
 * 
 * USAGE:
 * const encrypted = encryptionService.encryptFields(user, ['ssn', 'dateOfBirth']);
 */
function encryptFields(obj, fieldNames) {
  if (!obj) {
    return obj;
  }
  
  const result = { ...obj };
  
  for (const field of fieldNames) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = encrypt(result[field]);
    }
  }
  
  return result;
}

/**
 * Decrypts multiple fields in an object
 * 
 * @param {Object} obj - Object containing encrypted fields
 * @param {string[]} fieldNames - Names of fields to decrypt
 * @param {Object} options - Options per field
 * @returns {Object} Object with decrypted fields
 */
function decryptFields(obj, fieldNames, options = {}) {
  if (!obj) {
    return obj;
  }
  
  const result = { ...obj };
  
  for (const field of fieldNames) {
    if (result[field] !== undefined && result[field] !== null) {
      const parseJson = options[field]?.parseJson || false;
      result[field] = decrypt(result[field], parseJson);
    }
  }
  
  return result;
}

/**
 * Creates a hash of data for comparison
 * Does NOT encrypt - used for searchable encrypted fields
 * 
 * @param {string} data - Data to hash
 * @returns {string} Hash of data
 * 
 * USAGE:
 * // For searching encrypted fields without decrypting
 * const ssnHash = encryptionService.hash(ssn);
 * const user = await User.findOne({ ssnHash });
 */
function hash(data) {
  if (!data) {
    return null;
  }
  
  return crypto
    .createHmac('sha256', securityConfig.encryption.key)
    .update(String(data))
    .digest('hex');
}

/**
 * Compares data against a hash
 * 
 * @param {string} data - Data to compare
 * @param {string} hashedData - Hash to compare against
 * @returns {boolean} True if match
 */
function compareHash(data, hashedData) {
  if (!data || !hashedData) {
    return false;
  }
  
  const dataHash = hash(data);
  
  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(dataHash),
    Buffer.from(hashedData)
  );
}

/**
 * Generates a random encryption key
 * 
 * @returns {string} Random 32-byte key as hex string
 * 
 * USAGE:
 * // Generate new key for .env file
 * const key = encryptionService.generateKey();
 * console.log('ENCRYPTION_KEY=' + key);
 */
function generateKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Rotates encryption key
 * Decrypts with old key, re-encrypts with new key
 * 
 * @param {string} encryptedData - Data encrypted with old key
 * @param {string} oldKey - Previous encryption key
 * @param {string} newKey - New encryption key
 * @returns {string} Data re-encrypted with new key
 * 
 * SECURITY: Key rotation should be done periodically
 * This function helps with the process
 */
function rotateKey(encryptedData, oldKey, newKey) {
  // Temporarily swap keys to decrypt with old key
  const originalKey = securityConfig.encryption.key;
  
  // Decrypt with old key
  securityConfig.encryption.key = oldKey;
  const plaintext = decrypt(encryptedData);
  
  // Encrypt with new key
  securityConfig.encryption.key = newKey;
  const reEncrypted = encrypt(plaintext);
  
  // Restore original key
  securityConfig.encryption.key = originalKey;
  
  return reEncrypted;
}

/**
 * Masks sensitive data for display
 * 
 * @param {string} data - Data to mask
 * @param {Object} options - Masking options
 * @param {number} options.showFirst - Characters to show at start
 * @param {number} options.showLast - Characters to show at end
 * @param {string} options.maskChar - Character to use for masking
 * @returns {string} Masked data
 * 
 * USAGE:
 * maskData('1234567890', { showLast: 4 }); // '******7890'
 * maskData('john@email.com', { showFirst: 2, showLast: 4 }); // 'jo*********l.com'
 */
function maskData(data, options = {}) {
  if (!data) {
    return data;
  }
  
  const str = String(data);
  const {
    showFirst = 0,
    showLast = 0,
    maskChar = '*'
  } = options;
  
  if (showFirst + showLast >= str.length) {
    return str;
  }
  
  const first = str.substring(0, showFirst);
  const last = str.substring(str.length - showLast);
  const maskLength = str.length - showFirst - showLast;
  const mask = maskChar.repeat(maskLength);
  
  return first + mask + last;
}

/**
 * Encrypts data for secure transmission
 * Uses a one-time key derived from shared secret
 * 
 * @param {string} data - Data to encrypt
 * @param {string} recipientPublicKey - Recipient's public key (base64)
 * @returns {Object} { encrypted, ephemeralPublicKey }
 * 
 * SECURITY: Uses ECDH for key exchange, AES-256-GCM for encryption
 */
function encryptForTransmission(data, recipientPublicKey) {
  // Generate ephemeral key pair
  const ephemeral = crypto.createECDH('secp256k1');
  ephemeral.generateKeys();
  
  // Derive shared secret
  const recipientKey = Buffer.from(recipientPublicKey, 'base64');
  const sharedSecret = ephemeral.computeSecret(recipientKey);
  
  // Derive encryption key from shared secret
  const encryptionKey = crypto.createHash('sha256')
    .update(sharedSecret)
    .digest();
  
  // Encrypt data
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  
  let ciphertext = cipher.update(data, 'utf8');
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted: Buffer.concat([iv, authTag, ciphertext]).toString('base64'),
    ephemeralPublicKey: ephemeral.getPublicKey('base64')
  };
}

module.exports = {
  encrypt,
  decrypt,
  encryptField,
  decryptField,
  encryptFields,
  decryptFields,
  hash,
  compareHash,
  generateKey,
  rotateKey,
  maskData,
  encryptForTransmission
};
