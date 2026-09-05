const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "..", "uploads");

const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `task_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype.startsWith("image/") && ALLOWED_EXT.includes(ext))
      cb(null, true);
    else
      cb(new Error("Tylko obrazki (jpg, png, gif, webp)!"));
  },
});

// POST /api/upload/image
router.post("/image", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Brak pliku." });
  const host = process.env.API_URL || `${req.protocol}://${req.get("host")}`;
  const url = `${host}/uploads/${req.file.filename}`;
  res.json({ url });
});

module.exports = router;
