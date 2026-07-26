const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcrypt");

// GET /api/users  ?role=student&order=name.asc
router.get("/", async (req, res) => {
  try {
    const { role, order, select, limit } = req.query;
    let q = `SELECT u.*, c.name AS class_name FROM users u LEFT JOIN classes c ON c.id = u.class_id WHERE 1=1`;
    const params = [];
    if (role) { params.push(role); q += ` AND u.role = $${params.length}`; }
    q += ` ORDER BY u.name ASC`;
    if (limit) { params.push(parseInt(limit)); q += ` LIMIT $${params.length}`; }
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/users/:id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.*, c.name AS class_name FROM users u LEFT JOIN classes c ON c.id = u.class_id WHERE u.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Nie znaleziono." });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/users
router.post("/", async (req, res) => {
  try {
    const { username, name, password_hash, role = "student", class_id, active = true, session_minutes, session_locked = false } = req.body;
    const hashed = await bcrypt.hash(password_hash, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (username, name, password_hash, role, class_id, active, session_minutes, session_locked)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [username, name, hashed, role, class_id || null, active, session_minutes || null, session_locked]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Login już istnieje." });
    res.status(500).json({ error: err.message });
  }
});
// POST /api/users/generate-class — generuje konta uczniów z numerem w dzienniku + losowym PIN-em
router.post("/generate-class", async (req, res) => {
  try {
    const { class_id, class_name, count, session_minutes } = req.body;
    if (!class_id || !class_name || !count) {
      return res.status(400).json({ error: "Brak class_id, class_name lub count." });
    }

    const generated = [];
    for (let i = 1; i <= count; i++) {
      const num = String(i).padStart(2, "0");
      const username = `${num}_${class_name}`;
      const pin = String(Math.floor(1000 + Math.random() * 9000));
      const hashed = await bcrypt.hash(pin, 10);

      const { rows } = await pool.query(
        `INSERT INTO users (username, name, password_hash, role, class_id, active, session_minutes, session_locked)
         VALUES ($1,$2,$3,'student',$4,true,$5,false)
         ON CONFLICT (username) DO NOTHING
         RETURNING *`,
        [username, `Uczeń ${num}`, hashed, class_id, session_minutes || null]
      );

      if (rows.length) {
        generated.push({ username, pin, id: rows[0].id });
      } else {
        generated.push({ username, pin: null, skipped: true });
      }
    }

    res.status(201).json({ generated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// PATCH /api/users/:id
router.patch("/:id", async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.password_hash) {
      body.password_hash = await bcrypt.hash(body.password_hash, 10);
    }
    const fields = Object.keys(body);
    if (!fields.length) return res.status(400).json({ error: "Brak danych." });
    const vals = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
    const params = [...fields.map(f => body[f]), req.params.id];
    const { rows } = await pool.query(
      `UPDATE users SET ${vals} WHERE id = $${params.length} RETURNING *`,
      params
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/users/:id
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/users/check-username/:base  — sprawdź unikalność loginu
router.get("/check-username/:base", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT username FROM users WHERE username ILIKE $1",
      [req.params.base + "%"]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;