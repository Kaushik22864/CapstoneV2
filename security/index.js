'use strict';

const services = require('./services');
const middleware = require('./middleware');
const config = require('./config/security.config');
const { errorHandler, asyncHandler } = require('./utils/errorHandler');

module.exports = {
  ...services,
  middleware,
  config,
  errorHandler,
  asyncHandler
};
