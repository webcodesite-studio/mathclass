const router = require("express").Router();
const pool = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

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
       WHERE u.username = $1
       LIMIT 1`,
      [username.trim()]
    );

    if (!rows.length)
      return res.status(401).json({ error: "Nieprawidłowy login lub hasło." });

    const user = rows[0];

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk)
      return res.status(401).json({ error: "Nieprawidłowy login lub hasło." });

    if (!user.active)
      return res.status(403).json({ error: "Konto zablokowane. Skontaktuj się z nauczycielem." });

    if (user.role === "student" && user.session_locked)
      return res.status(403).json({ error: "Czas sesji minął. Konto zablokowane – skontaktuj się z nauczycielem." });

    const resumeSeconds = user.remaining_seconds != null && Number(user.remaining_seconds) > 0
      ? Number(user.remaining_seconds)
      : null;
    const sessionSeconds = resumeSeconds ?? (user.session_minutes ? user.session_minutes * 60 : null);
    const expiresAt = sessionSeconds
      ? new Date(Date.now() + sessionSeconds * 1000)
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
        session_minutes: sessionSeconds ? Math.max(1, Math.ceil(sessionSeconds / 60)) : user.session_minutes,
        session_locked: user.session_locked,
        active: user.active,
        sid: sess[0].id,
        exp: expiresAt?.toISOString() || null,
        remaining_seconds: sessionSeconds,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Błąd serwera." });
  }
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  const { sid, remaining_seconds } = req.body;
  if (sid) {
    const { rows } = await pool.query(
      `SELECT s.id, s.user_id, s.expires_at
       FROM sessions s
       WHERE s.id = $1
       LIMIT 1`,
      [sid]
    ).catch(() => ({ rows: [] }));

    const session = rows[0];
    const secondsLeft = typeof remaining_seconds === "number" && Number.isFinite(remaining_seconds)
      ? Math.max(0, Math.floor(remaining_seconds))
      : session?.expires_at
        ? Math.max(0, Math.ceil((new Date(session.expires_at).getTime() - Date.now()) / 1000))
        : null;

    await pool.query(
      "UPDATE sessions SET active = false WHERE id = $1",
      [sid]
    ).catch(() => {});

    if (session?.user_id && secondsLeft != null) {
      await pool.query(
        "UPDATE users SET remaining_seconds = $1 WHERE id = $2 AND session_locked = false",
        [secondsLeft, session.user_id]
      ).catch(() => {});
    }
  }
  res.json({ ok: true });
});

module.exports = router;