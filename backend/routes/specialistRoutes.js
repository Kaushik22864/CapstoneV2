const express = require("express");

const router = express.Router();
const rateLimitMiddleware = require("../../security/middleware/rateLimit.middleware");

const {
  getPresignedUrl,
  registerSpecialist,
  loginSpecialist,
  verifyOTP,
  resetPassword,
  sendForgotPasswordOTP
} = require("../controllers/specialistController");

const { authMiddleware } = require("../../security/middleware/authentication.middleware");
const { requireAnyRole, ROLES } = require("../../security/middleware/authorization.middleware");
const {
  getProfile,
  updateProfile,
  changePassword,
  deactivateAccount,
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
router.post(
    "/forgot-password",
    sendForgotPasswordOTP
);

router.post(
    "/verify-otp",
    verifyOTP
);

router.post(
    "/reset-password",
    resetPassword
);

// Profile management
router.get(
  "/me",
  authMiddleware,
  requireAnyRole(ROLES.DOCTOR, ROLES.ADMIN),
  getProfile
);

router.put(
  "/me",
  authMiddleware,
  requireAnyRole(ROLES.DOCTOR, ROLES.ADMIN),
  updateProfile
);

router.put(
  "/me/password",
  authMiddleware,
  requireAnyRole(ROLES.DOCTOR, ROLES.ADMIN),
  changePassword
);

router.delete(
  "/me",
  authMiddleware,
  requireAnyRole(ROLES.DOCTOR, ROLES.ADMIN),
  deactivateAccount
);

module.exports = router;