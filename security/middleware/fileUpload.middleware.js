/**
 * @fileoverview File Upload Security Middleware
 * @description Validates and sanitizes file uploads to prevent malicious uploads
 * @module security/middleware/fileUpload.middleware
 * 
 * THREAT MODEL:
 * - Malicious file upload: Mitigated by type validation, magic number checking
 * - File name injection: Mitigated by name sanitization
 * - Storage exhaustion: Mitigated by size limits
 * - Path traversal: Mitigated by filename sanitization
 * - Executable uploads: Mitigated by extension whitelist
 * 
 * DEPENDENCY: Requires multer package
 * npm install multer
 */

'use strict';

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const securityConfig = require('../config/security.config');
const { auditService } = require('../services');

/**
 * Magic numbers (file signatures) for allowed file types
 * These are the first bytes of each file type
 * 
 * SECURITY: Verifying magic numbers prevents extension spoofing
 */
const MAGIC_NUMBERS = {
  // JPEG images
  'ffd8ffe0': 'image/jpeg',  // JFIF
  'ffd8ffe1': 'image/jpeg',  // EXIF
  'ffd8ffe2': 'image/jpeg',  // ICC
  'ffd8ffe3': 'image/jpeg',
  'ffd8ffe8': 'image/jpeg',
  'ffd8ffdb': 'image/jpeg',
  
  // PNG images
  '89504e47': 'image/png',
  
  // PDF documents
  '25504446': 'application/pdf'
};

/**
 * Dangerous file extensions that should NEVER be allowed
 * Even if disguised as other file types
 */
const DANGEROUS_EXTENSIONS = [
  '.exe', '.dll', '.so', '.dylib',  // Executables
  '.bat', '.cmd', '.com', '.msi',    // Windows executables
  '.sh', '.bash', '.zsh',            // Shell scripts
  '.ps1', '.psm1', '.psd1',          // PowerShell
  '.vbs', '.vbe', '.js', '.jse',     // Script files
  '.ws', '.wsf', '.wsc', '.wsh',
  '.php', '.phtml', '.php3', '.php4', '.php5', '.php7',  // Server scripts
  '.asp', '.aspx', '.cer', '.csr',
  '.jsp', '.jspx', '.jsw', '.jsv',
  '.pl', '.pm', '.py', '.pyc', '.pyo', '.pyw',
  '.rb', '.rbw',
  '.scr', '.pif', '.application',
  '.gadget', '.hta', '.cpl', '.msc',
  '.jar', '.class',
  '.swf', '.swc',
  '.reg', '.inf', '.lnk',
  '.scf', '.url'
];

/**
 * Sanitizes filename to prevent path traversal and injection
 * 
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 * 
 * SECURITY: Removes path components and special characters
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return `file_${Date.now()}`;
  }
  
  // Remove path components
  let sanitized = path.basename(filename);
  
  // Remove null bytes (used in path traversal attacks)
  sanitized = sanitized.replace(/\0/g, '');
  
  // Remove path traversal patterns
  sanitized = sanitized.replace(/\.\./g, '');
  sanitized = sanitized.replace(/\//g, '_');
  sanitized = sanitized.replace(/\\/g, '_');
  
  // Remove special characters that could cause issues
  sanitized = sanitized.replace(/[<>:"|?*]/g, '_');
  
  // Limit length
  if (sanitized.length > 100) {
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    sanitized = name.substring(0, 100 - ext.length) + ext;
  }
  
  // If nothing left, generate a random name
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    sanitized = `file_${Date.now()}`;
  }
  
  return sanitized;
}

/**
 * Generates a secure, unique filename
 * 
 * @param {string} originalFilename - Original filename
 * @returns {string} Secure unique filename
 * 
 * SECURITY: UUID-based naming prevents filename collisions and guessing
 */
function generateSecureFilename(originalFilename) {
  const ext = path.extname(originalFilename).toLowerCase();
  const uuid = crypto.randomUUID();
  const timestamp = Date.now();
  
  return `${uuid}_${timestamp}${ext}`;
}

/**
 * Validates file extension against whitelist
 * 
 * @param {string} filename - Filename to validate
 * @returns {boolean} True if extension is allowed
 */
function validateExtension(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  // Check against dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return false;
  }
  
  // Check against allowed extensions
  return securityConfig.fileUpload.allowedExtensions.includes(ext);
}

/**
 * Validates file MIME type against whitelist
 * 
 * @param {string} mimeType - MIME type to validate
 * @returns {boolean} True if MIME type is allowed
 */
function validateMimeType(mimeType) {
  return securityConfig.fileUpload.allowedMimeTypes.includes(mimeType);
}

/**
 * Verifies file content matches claimed type using magic numbers
 * 
 * @param {Buffer} buffer - File buffer (at least first 8 bytes)
 * @param {string} claimedMimeType - Claimed MIME type
 * @returns {Object} { valid: boolean, detectedType: string }
 * 
 * SECURITY: Prevents content-type spoofing attacks
 */
function verifyMagicNumber(buffer, claimedMimeType) {
  if (!buffer || buffer.length < 4) {
    return { valid: false, detectedType: 'unknown' };
  }
  
  // Get first 4-8 bytes as hex
  const hex4 = buffer.slice(0, 4).toString('hex').toLowerCase();
  const hex8 = buffer.slice(0, 8).toString('hex').toLowerCase();
  
  // Check against known magic numbers
  let detectedType = MAGIC_NUMBERS[hex4] || MAGIC_NUMBERS[hex8];
  
  // Special handling for PDF (may have whitespace before signature)
  if (!detectedType && buffer.toString('ascii', 0, 20).includes('%PDF')) {
    detectedType = 'application/pdf';
  }
  
  if (!detectedType) {
    return { valid: false, detectedType: 'unknown' };
  }
  
  // Verify detected type matches claimed type
  const valid = detectedType === claimedMimeType;
  
  return { valid, detectedType };
}

/**
 * Scans file for potentially malicious content
 * 
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - File MIME type
 * @returns {Object} { safe: boolean, threats: string[] }
 * 
 * SECURITY: Detects embedded scripts, PHP code, etc.
 */
function scanForThreats(buffer, mimeType) {
  const threats = [];
  const content = buffer.toString('utf8', 0, Math.min(buffer.length, 10000));
  
  // Patterns that indicate malicious content
  const dangerousPatterns = [
    { pattern: /<\s*script/i, threat: 'Embedded script tag' },
    { pattern: /<\s*\?php/i, threat: 'Embedded PHP code' },
    { pattern: /<\s*\%/i, threat: 'Embedded server-side code' },
    { pattern: /javascript\s*:/i, threat: 'JavaScript protocol' },
    { pattern: /vbscript\s*:/i, threat: 'VBScript protocol' },
    { pattern: /on\w+\s*=/i, threat: 'Event handler' },
    { pattern: /eval\s*\(/i, threat: 'Eval function' },
    { pattern: /document\s*\.\s*cookie/i, threat: 'Cookie access' },
    { pattern: /exec\s*\(/i, threat: 'Exec function' },
    { pattern: /system\s*\(/i, threat: 'System call' },
    { pattern: /shell_exec/i, threat: 'Shell execution' },
    { pattern: /passthru\s*\(/i, threat: 'Command passthrough' }
  ];
  
  // For image files, check for polyglot attacks
  if (mimeType.startsWith('image/')) {
    for (const { pattern, threat } of dangerousPatterns) {
      if (pattern.test(content)) {
        threats.push(threat);
      }
    }
  }
  
  // For PDFs, check for JavaScript
  if (mimeType === 'application/pdf') {
    if (/\/JavaScript/i.test(content) || /\/JS\s/i.test(content)) {
      threats.push('PDF contains JavaScript');
    }
    if (/\/Launch/i.test(content)) {
      threats.push('PDF contains launch action');
    }
    if (/\/OpenAction/i.test(content)) {
      threats.push('PDF contains auto-open action');
    }
  }
  
  return {
    safe: threats.length === 0,
    threats
  };
}

/**
 * Multer storage configuration
 * Stores files with secure names in configured directory
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(securityConfig.fileUpload.uploadDir);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true, mode: 0o750 });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate secure filename
    const secureFilename = generateSecureFilename(file.originalname);
    cb(null, secureFilename);
  }
});

/**
 * Multer memory storage for validation before saving
 * Files are held in memory for inspection
 */
const memoryStorage = multer.memoryStorage();

/**
 * Multer file filter
 * Validates files before accepting upload
 * 
 * @param {Object} req - Express request object
 * @param {Object} file - Multer file object
 * @param {Function} cb - Callback function
 */
function fileFilter(req, file, cb) {
  // Validate extension
  if (!validateExtension(file.originalname)) {
    auditService.logSecurityEvent({
      event: 'INVALID_FILE_EXTENSION',
      userId: req.user?.userId,
      filename: file.originalname,
      ipAddress: req.ip
    });
    
    return cb(new Error('File type not allowed'), false);
  }
  
  // Validate MIME type
  if (!validateMimeType(file.mimetype)) {
    auditService.logSecurityEvent({
      event: 'INVALID_MIME_TYPE',
      userId: req.user?.userId,
      filename: file.originalname,
      mimeType: file.mimetype,
      ipAddress: req.ip
    });
    
    return cb(new Error('Invalid file type'), false);
  }
  
  cb(null, true);
}

/**
 * Base multer configuration
 */
const multerConfig = {
  storage: memoryStorage, // Use memory storage for validation
  fileFilter: fileFilter,
  limits: {
    fileSize: securityConfig.fileUpload.maxSize,
    files: 1, // Single file per request
    fields: 10, // Limit form fields
    fieldSize: 1024 * 1024 // 1MB max field size
  }
};

/**
 * Creates multer upload middleware for single file
 * 
 * @param {string} fieldName - Form field name for file
 * @returns {Function} Multer middleware
 * 
 * USAGE:
 * router.post('/upload',
 *   fileUploadMiddleware.singleDocument('doctorId'),
 *   fileUploadMiddleware.validateUpload,
 *   controller.upload
 * );
 */
function singleDocument(fieldName) {
  return multer(multerConfig).single(fieldName);
}

/**
 * Creates multer upload middleware for multiple files
 * 
 * @param {string} fieldName - Form field name for files
 * @param {number} maxCount - Maximum number of files
 * @returns {Function} Multer middleware
 */
function multipleDocuments(fieldName, maxCount = 5) {
  return multer({
    ...multerConfig,
    limits: {
      ...multerConfig.limits,
      files: maxCount
    }
  }).array(fieldName, maxCount);
}

/**
 * Validates uploaded file content
 * Must be used AFTER multer middleware
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * 
 * SECURITY: Performs deep file validation including:
 * - Magic number verification
 * - Content scanning
 * - Size validation
 */
function validateUpload(req, res, next) {
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'Please select a file to upload.'
        }
      });
    }
    
    // Verify magic number
    const magicResult = verifyMagicNumber(file.buffer, file.mimetype);
    
    if (!magicResult.valid) {
      auditService.logSecurityEvent({
        event: 'MAGIC_NUMBER_MISMATCH',
        userId: req.user?.userId,
        filename: file.originalname,
        claimedType: file.mimetype,
        detectedType: magicResult.detectedType,
        ipAddress: req.ip
      });
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_CONTENT',
          message: 'File content does not match its type. Please upload a valid document.'
        }
      });
    }
    
    // Scan for threats
    const scanResult = scanForThreats(file.buffer, file.mimetype);
    
    if (!scanResult.safe) {
      auditService.logSecurityEvent({
        event: 'MALICIOUS_FILE_DETECTED',
        userId: req.user?.userId,
        filename: file.originalname,
        threats: scanResult.threats,
        ipAddress: req.ip
      });
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'MALICIOUS_CONTENT',
          message: 'File contains potentially harmful content and cannot be uploaded.'
        }
      });
    }
    
    // All validations passed - save file to disk
    const uploadDir = path.resolve(securityConfig.fileUpload.uploadDir);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true, mode: 0o750 });
    }
    
    const secureFilename = generateSecureFilename(file.originalname);
    const filePath = path.join(uploadDir, secureFilename);
    
    // Write file
    fs.writeFileSync(filePath, file.buffer, { mode: 0o640 });
    
    // Update file object with saved location
    req.file.savedFilename = secureFilename;
    req.file.savedPath = filePath;
    req.file.sanitizedOriginalName = sanitizeFilename(file.originalname);
    
    // Log successful upload
    auditService.log({
      action: 'FILE_UPLOADED',
      userId: req.user?.userId,
      details: {
        originalName: file.originalname,
        savedFilename: secureFilename,
        mimeType: file.mimetype,
        size: file.size
      },
      ipAddress: req.ip
    });
    
    next();
  } catch (error) {
    console.error('File validation error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: 'An error occurred while processing your upload.'
      }
    });
  }
}

/**
 * Validates multiple uploaded files
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateMultipleUploads(req, res, next) {
  try {
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILES',
          message: 'Please select files to upload.'
        }
      });
    }
    
    const validatedFiles = [];
    const uploadDir = path.resolve(securityConfig.fileUpload.uploadDir);
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true, mode: 0o750 });
    }
    
    for (const file of files) {
      // Verify magic number
      const magicResult = verifyMagicNumber(file.buffer, file.mimetype);
      
      if (!magicResult.valid) {
        auditService.logSecurityEvent({
          event: 'MAGIC_NUMBER_MISMATCH',
          userId: req.user?.userId,
          filename: file.originalname,
          claimedType: file.mimetype,
          detectedType: magicResult.detectedType,
          ipAddress: req.ip
        });
        
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_CONTENT',
            message: `File "${sanitizeFilename(file.originalname)}" content does not match its type.`
          }
        });
      }
      
      // Scan for threats
      const scanResult = scanForThreats(file.buffer, file.mimetype);
      
      if (!scanResult.safe) {
        auditService.logSecurityEvent({
          event: 'MALICIOUS_FILE_DETECTED',
          userId: req.user?.userId,
          filename: file.originalname,
          threats: scanResult.threats,
          ipAddress: req.ip
        });
        
        return res.status(400).json({
          success: false,
          error: {
            code: 'MALICIOUS_CONTENT',
            message: `File "${sanitizeFilename(file.originalname)}" contains harmful content.`
          }
        });
      }
      
      // Save file
      const secureFilename = generateSecureFilename(file.originalname);
      const filePath = path.join(uploadDir, secureFilename);
      fs.writeFileSync(filePath, file.buffer, { mode: 0o640 });
      
      validatedFiles.push({
        ...file,
        savedFilename: secureFilename,
        savedPath: filePath,
        sanitizedOriginalName: sanitizeFilename(file.originalname)
      });
    }
    
    req.validatedFiles = validatedFiles;
    
    // Log successful uploads
    auditService.log({
      action: 'MULTIPLE_FILES_UPLOADED',
      userId: req.user?.userId,
      details: {
        fileCount: validatedFiles.length,
        files: validatedFiles.map(f => ({
          originalName: f.originalname,
          savedFilename: f.savedFilename,
          size: f.size
        }))
      },
      ipAddress: req.ip
    });
    
    next();
  } catch (error) {
    console.error('Multiple file validation error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: 'An error occurred while processing your uploads.'
      }
    });
  }
}

/**
 * Handles multer errors
 * 
 * @param {Error} error - Multer error
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function handleMulterError(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    // Log multer error
    auditService.logSecurityEvent({
      event: 'UPLOAD_ERROR',
      userId: req.user?.userId,
      errorCode: error.code,
      ipAddress: req.ip
    });
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size exceeds the ${securityConfig.fileUpload.maxSize / (1024 * 1024)}MB limit.`
          }
        });
      
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: {
            code: 'TOO_MANY_FILES',
            message: 'Too many files uploaded.'
          }
        });
      
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: {
            code: 'UNEXPECTED_FIELD',
            message: 'Unexpected file field.'
          }
        });
      
      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: 'File upload failed.'
          }
        });
    }
  }
  
  // Pass non-multer errors to next handler
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: error.message || 'File upload failed.'
      }
    });
  }
  
  next();
}

/**
 * Deletes uploaded file securely
 * 
 * @param {string} filePath - Path to file
 * @returns {boolean} True if deleted successfully
 */
function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

module.exports = {
  singleDocument,
  multipleDocuments,
  validateUpload,
  validateMultipleUploads,
  handleMulterError,
  sanitizeFilename,
  generateSecureFilename,
  validateExtension,
  validateMimeType,
  verifyMagicNumber,
  scanForThreats,
  deleteFile
};
