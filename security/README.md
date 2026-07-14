OCT Diagnostic System — Security Framework
Group 46 Capstone | Author: Sushant Tandukar (0369922)
Role: UI/UX & System Security

Overview
This /security directory is a self-contained security layer for the MERN-stack OCT
diagnostic web application. It provides plug-in middleware, validators, audit logging, and
utility functions that backend developers integrate at clearly defined injection points —
without ever modifying files inside this directory.
The framework enforces the verification workflow described in the capstone report:

Doctor registers and uploads a government-issued ID
Admin reviews and approves / rejects the request
On approval an automated email notification fires
Only Doctor and Admin roles may access protected endpoints

All design decisions follow HIPAA security-rule principles (access control, audit controls,
transmission security, integrity controls) adapted to a student-prototype scale.

Directory Layout
/security
├── README.md                        ← You are here
├── package.json                     ← Standalone dependencies
├── .env.example                     ← All required environment variables
│
├── config/
│   └── security.config.js           ← Central tunable constants
│
├── middleware/
│   ├── authMiddleware.js            ← JWT verification + session security
│   ├── authorizationMiddleware.js   ← Role-based access control
│   ├── rateLimiter.js               ← Per-route rate limiting
│   ├── httpsEnforce.js              ← HTTPS enforcement
│   └── errorHandler.js             ← Safe error responses (no info leakage)
│
├── validators/
│   ├── authValidators.js            ← Registration & login schemas
│   ├── fileValidator.js             ← Doctor-ID upload validation
│   └── sanitizer.js                 ← Input sanitisation helpers
│
├── utils/
│   ├── passwordUtils.js             ← Bcrypt hashing + strength check
│   ├── tokenUtils.js                ← JWT sign / verify / refresh
│   ├── encryptionUtils.js           ← AES-256 field-level encryption
│   └── emailNotification.js        ← Approval / rejection emails
│
├── audit/
│   ├── auditLogger.js               ← HIPAA-aligned audit log writer
│   └── auditEvents.js               ← Event-type constants
│
└── tests/
    ├── auth.test.js
    ├── rbac.test.js
    ├── fileValidator.test.js
    ├── validators.test.js
    ├── passwordUtils.test.js
    └── auditLogger.test.js

Quick-Start for Backend Developers
1 — Install dependencies
bashcd security
npm install
2 — Create .env from the example
bashcp .env.example ../.env          # or merge into your root .env
Fill in every value. The framework will throw on startup if required vars are missing.
3 — Integrate middleware into your Express app
js// server.js  (backend team's file — do NOT edit /security files)
const express = require('express');
const app = express();

// ── Security layer imports ──────────────────────────────────────────────────
const { httpsEnforce }   = require('./security/middleware/httpsEnforce');
const { authMiddleware } = require('./security/middleware/authMiddleware');
const { requireRole }    = require('./security/middleware/rbacMiddleware');
const {
  loginLimiter,
  registerLimiter,
  uploadLimiter,
} = require('./security/middleware/rateLimiter');
const { securityErrorHandler } = require('./security/middleware/errorHandler');
const { auditLogger } = require('./security/audit/auditLogger');

// ── Apply global middleware (ORDER MATTERS) ────────────────────────────────
app.use(httpsEnforce);                          // 1. Force HTTPS
app.use(express.json({ limit: '10kb' }));       // 2. Body size cap

// ── Public auth routes ─────────────────────────────────────────────────────
app.post('/api/auth/register', registerLimiter, ...yourRegisterHandler);
app.post('/api/auth/login',    loginLimiter,    ...yourLoginHandler);

// ── Protected doctor routes ────────────────────────────────────────────────
app.use('/api/scan',   authMiddleware, requireRole('Doctor'), yourScanRouter);
app.use('/api/report', authMiddleware, requireRole('Doctor'), yourReportRouter);

// ── Admin-only routes ──────────────────────────────────────────────────────
app.use('/api/admin',  authMiddleware, requireRole('Admin'),  yourAdminRouter);

// ── File upload route ──────────────────────────────────────────────────────
const { validateUploadedFile } = require('./security/validators/fileValidator');
app.post('/api/auth/register/upload', registerLimiter, uploadLimiter, validateUploadedFile, ...yourUploadHandler);

// ── Global security error handler (must be last) ───────────────────────────
app.use(securityErrorHandler);
4 — Use helpers inside your route handlers
jsconst { hashPassword, verifyPassword } = require('./security/utils/passwordUtils');
const { signToken, verifyToken }       = require('./security/utils/tokenUtils');
const { encryptField, decryptField }   = require('./security/utils/encryptionUtils');
const { logAuditEvent }                = require('./security/audit/auditLogger');
const { AUDIT_EVENTS }                 = require('./security/audit/auditEvents');

// Example registration handler
async function registerHandler(req, res, next) {
  try {
    const { name, email, password } = req.validatedBody; // set by authValidators
    const hashed   = await hashPassword(password);
    const encEmail = encryptField(email);                // store encrypted

    const user = await User.create({ name, email: encEmail, password: hashed, role: 'Unverified' });

    await logAuditEvent({
      event:  AUDIT_EVENTS.USER_REGISTERED,
      userId: user._id,
      meta:   { email },          // raw value only in audit log, not DB
    });

    res.status(201).json({ message: 'Registration received. Awaiting admin approval.' });
  } catch (err) {
    next(err);   // handled by securityErrorHandler
  }
}

Environment Variables
VariablePurposeExampleJWT_SECRETSigns access tokens64-char random hexJWT_REFRESH_SECRETSigns refresh tokensDifferent 64-char hexJWT_ACCESS_EXPIRESAccess token TTL15mJWT_REFRESH_EXPIRESRefresh token TTL7dBCRYPT_ROUNDSBcrypt work factor12ENCRYPTION_KEYAES-256 key (hex)64-char hexENCRYPTION_IVAES-256 IV (hex)32-char hexNODE_ENVEnvironment flagproductionSMTP_HOSTEmail serversmtp.example.comSMTP_PORTEmail port587SMTP_USERSMTP usernamenoreply@…SMTP_PASSSMTP password(secret)EMAIL_FROMSender display addressOCT System <noreply@…>RATE_LIMIT_WINDOW_MSRate-limit window900000 (15 min)RATE_LIMIT_MAX_LOGINMax login attempts10RATE_LIMIT_MAX_REGISTERMax register attempts5MAX_UPLOAD_BYTESFile size ceiling5242880 (5 MB)AUDIT_LOG_PATHAudit log file path./logs/audit.log

Threat Model Summary
ThreatControlCredential stuffing / brute forceRate limiting on /login and /registerStolen JWTShort-lived access tokens (15 min) + refresh rotationPrivilege escalationRBAC middleware checks DB-stored role on every requestMalicious file uploadMagic-byte + MIME + extension + size validationSQL/NoSQL injectionexpress-validator + mongo-sanitize on all inputsPII exposure in transitHTTPS enforcement middlewarePII exposure at restAES-256 field-level encryption on sensitive fieldsInformation leakage via errorsCentral error handler strips stack traces in productionMissing audit trail (HIPAA)Structured JSON audit log for every security eventXSS via stored dataxss sanitiser on all string inputs

Assumptions & Limitations

This is a prototype-scale implementation. Production deployment would additionally require a WAF, secrets manager (e.g. AWS Secrets Manager), and a SIEM for audit-log ingestion.
File storage is assumed to be local disk for the prototype. A production system would use encrypted S3 + pre-signed URLs.
Email is sent via Nodemailer. Production should use a transactional email provider with SPF/DKIM.
Refresh token rotation stores tokens in MongoDB; a Redis store would be faster at scale.
The framework does not implement penetration-test-grade controls (CSP headers, CORS tuning, Helmet.js) — those belong in the main Express app layer.
Contentpdf