const express = require("express");

const router = express.Router();

const {
  getPresignedUrl,
  registerSpecialist,
  loginSpecialist
} = require("../controllers/specialistController");

router.post(
  "/presigned-url",
  getPresignedUrl
);

router.post(
  "/register",
  registerSpecialist
);

router.post(
  "/login",
  loginSpecialist
);

module.exports = router;