require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.set("trust proxy", 1);

// ── Middleware ──────────────────────────────────────────────────
// Walidacja JWT_SECRET przy starcie
if (!process.env.JWT_SECRET) {
  console.error("BŁĄD: JWT_SECRET nie jest ustawiony w .env!");
  process.exit(1);
}

app.use(cors({ origin: "https://twojadomena.pl" })); // ← wstaw swoją domenę
app.use(express.json());

// Statyczne pliki (uploadowane obrazki)
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

// ── Routes ──────────────────────────────────────────────────────
const { auth } = require("./middleware/auth");
const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Za dużo prób logowania. Spróbuj za 15 minut." }
});

app.use("/api/auth/login",           loginLimiter);
app.use("/api/auth",                 require("./routes/auth"));
app.use("/api/users",                auth, require("./routes/users"));
app.use("/api/classes",              auth, require("./routes/classes"));
app.use("/api/tasks",                auth, require("./routes/tasks"));
app.use("/api/answers",              auth, require("./routes/answers"));
app.use("/api/sessions",             auth, require("./routes/sessions"));
app.use("/api/categories",           auth, require("./routes/categories"));
app.use("/api/category-assignments", auth, require("./routes/categoryAssignments"));
app.use("/api/teacher-classes",      auth, require("./routes/teacherClasses"));
app.use("/api/stats",                auth, require("./routes/stats"));
app.use("/api/upload",               auth, require("./routes/upload"));
app.use("/api/bug-reports",          require("./routes/bugReports")); // bez auth — uczniowie zgłaszają bugi

// ── Health check ────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`MathClass API running on port ${PORT}`));
