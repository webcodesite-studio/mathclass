const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { createUserSchema, patchUserSchema, generateClassSchema } = require("../schemas");

// Wszystkie endpointy users wymagają zalogowania
router.use(requireAuth);

// GET /api/users  ?role=student&limit=100
router.get("/", requireRole("admin", "teacher"), async (req, res, next) => {
  try {
    const { role, limit } = req.query;
    let q = `SELECT u.id, u.username, u.name, u.role, u.class_id, u.active,
                    u.session_minutes, u.session_locked, u.remaining_seconds, u.created_at,
                    c.name AS class_name
             FROM users u
             LEFT JOIN classes c ON c.id = u.class_id
             WHERE 1=1`;
    const params = [];
    if (role) { params.push(role); q += ` AND u.role = $${params.length}`; }
    q += ` ORDER BY u.name ASC`;
    if (limit) {
      const lim = parseInt(limit, 10);
      if (!isNaN(lim) && lim > 0 && lim <= 1000) {
        params.push(lim);
        q += ` LIMIT $${params.length}`;
      }
    }
    const { rows } = await pool.query(q, params);
    // Nigdy nie zwracaj password_hash
    res.json(rows.map(sanitizeUser));
  } catch (err) { next(err); }
});

// GET /api/users/check-username/:base  — sprawdź unikalność (public, przed /:id)
router.get("/check-username/:base", async (req, res, next) => {
  try {
    const base = req.params.base.slice(0, 100); // ogranicz długość
    const { rows } = await pool.query(
      "SELECT username FROM users WHERE username ILIKE $1",
      [base + "%"]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/users/:id
router.get("/:id", requireRole("admin", "teacher"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.name, u.role, u.class_id, u.active,
              u.session_minutes, u.session_locked, u.remaining_seconds, u.created_at,
              c.name AS class_name
       FROM users u LEFT JOIN classes c ON c.id = u.class_id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Nie znaleziono użytkownika." });
    res.json(sanitizeUser(rows[0]));
  } catch (err) { next(err); }
});

// POST /api/users
router.post("/", requireRole("admin"), validate(createUserSchema), async (req, res, next) => {
  try {
    const { username, name, password_hash, role, class_id, active, session_minutes, session_locked } = req.body;
    const hashed = await bcrypt.hash(password_hash, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (username, name, password_hash, role, class_id, active, session_minutes, session_locked)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [username, name, hashed, role, class_id || null, active, session_minutes || null, session_locked]
    );
    res.status(201).json(sanitizeUser(rows[0]));
  } catch (err) { next(err); }
});

// POST /api/users/generate-class
router.post("/generate-class", requireRole("admin"), validate(generateClassSchema), async (req, res, next) => {
  try {
    const { class_id, class_name, count, session_minutes } = req.body;
    const generated = [];

    for (let i = 1; i <= count; i++) {
      const num = String(i).padStart(2, "0");
      const username = `${num}_${class_name}`;
      const pin = String(Math.floor(1000 + Math.random() * 9000));
      const hashed = await bcrypt.hash(pin, 10);

      const { rows } = await pool.query(
        `INSERT INTO users (username, name, password_hash, role, class_id, active, session_minutes, session_locked)
         VALUES ($1,$2,$3,'student',$4,true,$5,false)
         ON CONFLICT (username) DO NOTHING RETURNING id`,
        [username, `Uczeń ${num}`, hashed, class_id, session_minutes || null]
      );

      generated.push(rows.length
        ? { username, pin, id: rows[0].id }
        : { username, pin: null, skipped: true }
      );
    }

    res.status(201).json({ generated });
  } catch (err) { next(err); }
});

// PATCH /api/users/:id
router.patch("/:id", requireRole("admin", "teacher"), validate(patchUserSchema), async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (body.password_hash) {
      body.password_hash = await bcrypt.hash(body.password_hash, 10);
    }

    const fields = Object.keys(body);
    const vals = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
    const params = [...fields.map(f => body[f]), req.params.id];

    const { rows } = await pool.query(
      `UPDATE users SET ${vals} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows.length) return res.status(404).json({ error: "Nie znaleziono użytkownika." });
    res.json(sanitizeUser(rows[0]));
  } catch (err) { next(err); }
});

// DELETE /api/users/:id
router.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Nie znaleziono użytkownika." });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── Helper ──────────────────────────────────────────────────────
function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

module.exports = router;
