/**
 * @fileoverview Security Middleware Exports
 * @description Central export point for all security middleware
 * @module security/middleware
 */

'use strict';

// Mapping internal filenames to the export object
const authMiddleware = require('./authentication.middleware');
const rbacMiddleware = require('./authorization.middleware');
const rateLimitMiddleware = require('./rateLimit.middleware');
const fileUploadMiddleware = require('./fileUpload.middleware');
const validationMiddleware = require('./validation.middleware');

module.exports = {
  authMiddleware,
  rbacMiddleware,
  rateLimitMiddleware,
  fileUploadMiddleware,
  validationMiddleware
};