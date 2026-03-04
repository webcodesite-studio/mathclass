const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "..", "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `task_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Tylko obrazki!"));
  },
});

// POST /api/upload/image
router.post("/image", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Brak pliku." });
  const host = process.env.API_URL || `http://${req.hostname}:${process.env.PORT || 3001}`;
  const url = `${host}/uploads/${req.file.filename}`;
  res.json({ url });
});

module.exports = router;
