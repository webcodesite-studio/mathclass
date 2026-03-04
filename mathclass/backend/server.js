require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());

// Statyczne pliki (uploadowane obrazki)
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

// ── Routes ──────────────────────────────────────────────────────
app.use("/api/auth",       require("./routes/auth"));
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

// ── Health check ────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`MathClass API running on port ${PORT}`));
