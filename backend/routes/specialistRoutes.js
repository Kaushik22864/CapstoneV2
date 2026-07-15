const express = require("express");

const router = express.Router();
const rateLimitMiddleware = require("../../security/middleware/rateLimit.middleware");

const {
  getPresignedUrl,
  registerSpecialist,
  loginSpecialist
} = require("../controllers/specialistController");

router.post(
  "/presigned-url",
  rateLimitMiddleware.uploadLimiter,
  getPresignedUrl
);

router.post(
  "/register",
  rateLimitMiddleware.authLimiter,
  registerSpecialist
);

router.post(
  "/login",
  rateLimitMiddleware.authLimiter,
  loginSpecialist
);

module.exports = router;