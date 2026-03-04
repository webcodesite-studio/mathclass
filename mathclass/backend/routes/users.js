const router = require("express").Router();
const pool = require("../db");

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
    const { rows } = await pool.query(
      `INSERT INTO users (username, name, password_hash, role, class_id, active, session_minutes, session_locked)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [username, name, password_hash, role, class_id || null, active, session_minutes || null, session_locked]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Login już istnieje." });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/:id
router.patch("/:id", async (req, res) => {
  try {
    const fields = Object.keys(req.body);
    if (!fields.length) return res.status(400).json({ error: "Brak danych." });
    const vals = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
    const params = [...fields.map(f => req.body[f]), req.params.id];
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
