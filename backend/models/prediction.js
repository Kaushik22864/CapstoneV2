const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Specialist",
    required: true,
  },

  patientName: {
    type: String,
    required: true,
  },

  patientId: {
    type: String,
    required: true,
  },

  patientAge: Number,

  patientGender: String,

  scanType: {
    type: String,
    default: "OCT - Macula",
  },

  imageName: String,

  prediction: String,

  confidence: Number,

  probabilities: Object,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Prediction", predictionSchema);