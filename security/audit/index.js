/**
 * @fileoverview Audit Module Exports
 * @description Central export for audit logging functionality
 * @module security/audit
 */

'use strict';

const auditLogger = require('./auditLogger');
const auditEvents = require('./auditEvents');

module.exports = {
    // Logger functions
    ...auditLogger,

    // Event constants
    ...auditEvents
};