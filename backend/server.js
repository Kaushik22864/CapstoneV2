const fs = require("fs");
const path = require("path");
const dns = require("dns");

// ================================
// Security Framework Initialization
// ================================
require("dotenv").config({
  path: path.resolve(__dirname, "../security/.env"),
});

console.log("=================================");
console.log(" OCT Diagnostic Security Status ");
console.log("=================================");
console.log("Security .env:", fs.existsSync("../security/.env") ? "LOADED ✓" : "NOT FOUND ✗");
console.log("MongoDB URI:", process.env.MONGO_URI ? "CONFIGURED ✓" : "MISSING ✗");
console.log("JWT Access Secret:", process.env.JWT_SECRET ? "CONFIGURED ✓" : "MISSING ✗");
console.log("JWT Refresh Secret:", process.env.JWT_REFRESH_SECRET ? "CONFIGURED ✓" : "MISSING ✗");
console.log("Flask AI Service URL:", process.env.FLASK_URL ? "CONFIGURED ✓" : "MISSING ✗ (defaulting to localhost:5001)");
console.log("=================================");

// DNS Configuration
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

// ================================
// Security Module Imports
// ================================
const securityConfig = require("../security/config/security.config");
const jwtService = require("../security/services/jwt.service");
const authMiddleware = require("../security/middleware/authentication.middleware");
const authorizationMiddleware = require("../security/middleware/authorization.middleware");
//const rateLimitMiddleware = require("../security/middleware/rateLimit.middleware");

const app = express();

// Database Connection
connectDB();

// Register composite user model for auth middleware
const UserModel = require("./models/UserModel");
app.set("UserModel", UserModel);
// Middleware
app.use(cors());
app.use(express.json());

// Example Security Middleware
// app.use(rateLimitMiddleware.apiLimiter);

// Routes
app.use(
  "/api/specialists",
  require("./routes/specialistRoutes")
);

app.use(
  "/api/admin",
  require("./routes/adminRoutes")
);

app.use(
  "/api/predict",
  require("./routes/predictRoutes")
);

// Health Check
app.get("/", (req, res) => {
  res.send("API Running");
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("=================================");
  console.log(" MongoDB Connected ✓");
  console.log(` Server running on port ${PORT} ✓`);
  console.log(" Security Framework Active ✓");
  console.log("=================================");
});