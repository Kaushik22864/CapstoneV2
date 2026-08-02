const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const { fileUploadMiddleware } = require("../../security/middleware");

const {
  authMiddleware,
} = require("../../security/middleware/authentication.middleware");

const {
  requireAnyRole,
  ROLES,
} = require("../../security/middleware/authorization.middleware");

const Prediction = require("../models/Prediction");

const router = express.Router();

const FLASK_URL = process.env.FLASK_URL || "http://localhost:5001";

// =======================================================
// Predict OCT Image
// =======================================================

router.post(
  "/",
  authMiddleware,
  requireAnyRole(ROLES.DOCTOR, ROLES.ADMIN),
  fileUploadMiddleware.singleDocument("image"),
  fileUploadMiddleware.validateUpload,

  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No image uploaded",
        });
      }

      const {
        patientName,
        patientId,
        patientAge,
        patientGender,
        scanType,
      } = req.body;

      const formData = new FormData();
      formData.append(
        "image",
        req.file.buffer,
        req.file.originalname
      );

      const flaskRes = await axios.post(
        `${FLASK_URL}/predict`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 15000,
        }
      );

      const savedPrediction = await Prediction.create({
        userId: req.user.id,

        patientName,
        patientId,
        patientAge,
        patientGender,
        scanType,

        imageName: req.file.originalname,

        prediction: flaskRes.data.prediction,
        confidence: flaskRes.data.confidence,
        probabilities: flaskRes.data.probabilities,
      });

      if (req.file.savedPath) {
        fileUploadMiddleware.deleteFile(req.file.savedPath);
      }

      res.json(savedPrediction);
    } catch (err) {
      console.error("Prediction Error:", err);

      if (req.file?.savedPath) {
        fileUploadMiddleware.deleteFile(req.file.savedPath);
      }

      res.status(502).json({
        error: "AI Service Unavailable",
      });
    }
  },

  fileUploadMiddleware.handleMulterError
);

// =======================================================
// Doctor Prediction History
// =======================================================

router.get("/history", authMiddleware, async (req, res) => {
  try {
    const history = await Prediction.find({
      userId: req.user.id,
    }).sort({
      createdAt: -1,
    });

    res.json(history);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to fetch history",
    });
  }
});

// =======================================================
// Dashboard Statistics
// =======================================================

router.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    const predictions = await Prediction.find({
      userId: req.user.id,
    }).sort({
      createdAt: -1,
    });

    const totalScans = predictions.length;

    const diseaseDistribution = {};

    predictions.forEach((item) => {
      diseaseDistribution[item.prediction] =
        (diseaseDistribution[item.prediction] || 0) + 1;
    });

    const last7Days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();

      date.setDate(date.getDate() - i);

      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const count = predictions.filter(
        (p) =>
          p.createdAt >= start &&
          p.createdAt <= end
      ).length;

      last7Days.push({
        day: start.toLocaleDateString("en-US", {
          weekday: "short",
        }),
        scans: count,
      });
    }

    res.json({
      totalScans,
      diseaseDistribution,
      last7Days,
      recentPredictions: predictions.slice(0, 5),
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Dashboard Error",
    });
  }
});

module.exports = router;