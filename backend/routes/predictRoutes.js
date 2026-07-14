const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const { authMiddleware } = require("../../security/middleware/authentication.middleware");
const { requireAnyRole, ROLES } = require("../../security/middleware/authorization.middleware");
const Prediction = require("../models/Prediction");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const FLASK_URL = process.env.FLASK_URL || "http://localhost:5001";

// POST /api/predict
router.post(
  "/",
  authMiddleware,
  requireAnyRole(ROLES.DOCTOR, ROLES.ADMIN),
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" });
      }

      const formData = new FormData();
      formData.append("image", req.file.buffer, req.file.originalname);

      const flaskRes = await axios.post(`${FLASK_URL}/predict`, formData, {
        headers: formData.getHeaders(),
        timeout: 15000,
      });

      const saved = await Prediction.create({
        userId: req.user.id,
        imageName: req.file.originalname,
        prediction: flaskRes.data.prediction,
        confidence: flaskRes.data.confidence,
        probabilities: flaskRes.data.probabilities,
      });

      res.json(saved);
    } catch (err) {
      console.error("Prediction error:", err.message);
      res.status(502).json({ error: "AI service unavailable" });
    }
  }
);

// GET /api/predict/history
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const history = await Prediction.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    console.error("History fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

module.exports = router;