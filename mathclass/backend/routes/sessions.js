const router = require("express").Router();
const pool = require("../db");

router.patch("/:id", async (req, res) => {
  try {
    const ALLOWED = ["active", "expires_at", "remaining_seconds"];
const fields = Object.keys(req.body).filter(f => ALLOWED.includes(f));
if (!fields.length) return res.status(400).json({ error: "Brak dozwolonych pól." });
    const vals = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
    const params = [...fields.map(f => req.body[f]), req.params.id, req.user.userId];
    await pool.query(`UPDATE sessions SET ${vals} WHERE id = $${params.length - 1} AND user_id = $${params.length}`, params);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH by user_id: /api/sessions?user_id=xxx
router.patch("/", async (req, res) => {
  try {
    const user_id = req.user.role === "superadmin" ? req.query.user_id : req.user.userId;
    const ALLOWED = ["active", "expires_at", "remaining_seconds"];
const fields = Object.keys(req.body).filter(f => ALLOWED.includes(f));
if (!fields.length) return res.status(400).json({ error: "Brak dozwolonych pól." });
    const vals = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
    const params = [...fields.map(f => req.body[f]), user_id];
    await pool.query(`UPDATE sessions SET ${vals} WHERE user_id = $${params.length} AND active = true`, params);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
