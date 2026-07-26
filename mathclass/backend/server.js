require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();
app.set("trust proxy", 1);

// ── Security headers (helmet) ───────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "same-site" },
}));

// ── CORS ────────────────────────────────────────────────────────
// W .env ustaw CORS_ORIGIN=https://twoja-domena.pl
// Wiele domen: CORS_ORIGIN=https://a.pl,https://b.pl
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Brak originu = curl/Postman/SSR — zezwól tylko w dev
    if (!origin) {
      return callback(null, process.env.NODE_ENV !== "production");
    }
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: niedozwolony origin: ${origin}`));
  },
  credentials: true,
}));

// ── Rate limiting ───────────────────────────────────────────────
// Globalny limit — ochrona przed abuse
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Zbyt wiele żądań. Spróbuj za chwilę." },
});

// Surowy limit dla logowania — ochrona przed brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Zbyt wiele prób logowania. Spróbuj za 15 minut." },
  skipSuccessfulRequests: true, // liczy tylko nieudane
});

app.use(globalLimiter);
app.use(express.json({ limit: "2mb" }));

// ── Statyczne pliki (upload) ────────────────────────────────────
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

// ── Routes ──────────────────────────────────────────────────────
app.use("/api/auth",       loginLimiter, require("./routes/auth"));
app.use("/api/users",      require("./routes/users"));
app.use("/api/classes",    require("./routes/classes"));
app.use("/api/tasks",      require("./routes/tasks"));
app.use("/api/answers",    require("./routes/answers"));
app.use("/api/sessions",   require("./routes/sessions"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/category-assignments", require("./routes/categoryAssignments"));
app.use("/api/teacher-classes",      require("./routes/teacherClasses"));
app.use("/api/stats",      require("./routes/stats"));
app.use("/api/upload",     require("./routes/upload"));
app.use("/api/bug-reports", require("./routes/bugReports"));

// ── Health check ────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ ok: true, env: process.env.NODE_ENV }));

// ── 404 + centralny error handler ──────────────────────────────
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`[${new Date().toISOString()}] MathClass API running on port ${PORT} (${process.env.NODE_ENV})`));
