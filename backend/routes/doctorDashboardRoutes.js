const express = require("express");
const Prediction = require("../models/prediction.js");

const { authMiddleware } = require("../../security/middleware/authentication.middleware");
const {
  requireAnyRole,
  ROLES,
} = require("../../security/middleware/authorization.middleware");

const router = express.Router();

/*
GET /api/doctor/dashboard
*/
router.get(
  "/",
  authMiddleware,
  requireAnyRole(ROLES.DOCTOR, ROLES.ADMIN),
  async (req, res) => {
    try {
      const doctorId = req.user.id;

      // All scans by this doctor
      const predictions = await Prediction.find({
        userId: doctorId,
      }).sort({ createdAt: -1 });

      const totalScans = predictions.length;

      // Recent scans
      const recentAnalysis = predictions.slice(0, 5);

      // Disease counts
      const diseaseCounts = {};

      predictions.forEach((item) => {
        const disease = item.prediction || "Unknown";

        diseaseCounts[disease] =
          (diseaseCounts[disease] || 0) + 1;
      });

      // Last 7 days activity
      const activity = [0, 0, 0, 0, 0, 0, 0];

      const today = new Date();

      predictions.forEach((item) => {
        const diff =
          Math.floor(
            (today - new Date(item.createdAt)) /
              (1000 * 60 * 60 * 24)
          );

        if (diff >= 0 && diff < 7) {
          activity[6 - diff]++;
        }
      });

      res.json({
        totalScans,
        diseaseCounts,
        activity,
        recentAnalysis,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: "Failed to load dashboard",
      });
    }
  }
);

module.exports = router;