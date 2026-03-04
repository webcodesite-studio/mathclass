const router = require("express").Router();
const pool = require("../db");
const jwt = require("jsonwebtoken");

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Brak loginu lub hasła." });

  try {
    const { rows } = await pool.query(
      `SELECT u.*, c.name AS class_name
       FROM users u
       LEFT JOIN classes c ON c.id = u.class_id
       WHERE u.username = $1 AND u.password_hash = $2
       LIMIT 1`,
      [username.trim(), password]
    );

    if (!rows.length)
      return res.status(401).json({ error: "Nieprawidłowy login lub hasło." });

    const user = rows[0];

    if (!user.active)
      return res.status(403).json({ error: "Konto zablokowane. Skontaktuj się z nauczycielem." });

    if (user.role === "student" && user.session_locked)
      return res.status(403).json({ error: "Czas sesji minął. Konto zablokowane – skontaktuj się z nauczycielem." });

    // Create session
    const expiresAt = user.session_minutes
      ? new Date(Date.now() + user.session_minutes * 60000)
      : null;

    const { rows: sess } = await pool.query(
      `INSERT INTO sessions (user_id, expires_at, active)
       VALUES ($1, $2, true) RETURNING id`,
      [user.id, expiresAt]
    );

    const token = jwt.sign(
      { userId: user.id, role: user.role, sid: sess[0].id },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: user.session_minutes ? `${user.session_minutes}m` : "24h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        class_id: user.class_id,
        className: user.class_name,
        session_minutes: user.session_minutes,
        session_locked: user.session_locked,
        active: user.active,
        sid: sess[0].id,
        exp: expiresAt?.toISOString() || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd serwera." });
  }
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  const { sid } = req.body;
  if (sid) {
    await pool.query(
      "UPDATE sessions SET active = false WHERE id = $1",
      [sid]
    ).catch(() => {});
  }
  res.json({ ok: true });
});

module.exports = router;
