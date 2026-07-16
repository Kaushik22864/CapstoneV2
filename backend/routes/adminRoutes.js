const express = require("express");

const router = express.Router();
const rateLimitMiddleware = require("../../security/middleware/rateLimit.middleware");

const {
  loginAdmin,
  getDashboardStats,
  getRecentApplications,
  getApplicationById,
  approveApplication,
  rejectApplication,
  getAllUsers,
  getUserDetails,
  updateUserRole,
  deleteUser,
  getCredentialViewUrl
} = require("../controllers/adminController");

router.post(
  "/login",
  rateLimitMiddleware.authLimiter,
  loginAdmin
);

router.post(
  "/credential-view-url",
  rateLimitMiddleware.uploadLimiter,
  getCredentialViewUrl
);

router.get(
  "/dashboard",
  rateLimitMiddleware.apiLimiter,
  getDashboardStats
);

router.get(
  "/applications/recent",
  rateLimitMiddleware.apiLimiter,
  getRecentApplications
);

router.put(
  "/application/:id/approve",
  rateLimitMiddleware.apiLimiter,
  approveApplication
);

router.put(
  "/application/:id/reject",
  rateLimitMiddleware.apiLimiter,
  rejectApplication
);

router.get(
  "/users",
  rateLimitMiddleware.apiLimiter,
  getAllUsers
);

router.get(
  "/application/:id",
  rateLimitMiddleware.apiLimiter,
  getApplicationById
);

router.get(
  "/user/:id",
  rateLimitMiddleware.apiLimiter,
  getUserDetails
);

router.put(
  "/user/:id/role",
  rateLimitMiddleware.apiLimiter,
  updateUserRole
);

router.delete(
  "/user/:id",
  rateLimitMiddleware.apiLimiter,
  deleteUser
);

module.exports = router;