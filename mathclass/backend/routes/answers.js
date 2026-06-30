const router = require("express").Router();
const pool = require("../db");

router.get("/", async (req, res) => {
  try {
    const { user_id, limit = 200 } = req.query;
    let q = `SELECT a.*, t.question, t.answer AS correct_answer, t.category
             FROM answers a LEFT JOIN tasks t ON t.id = a.task_id WHERE 1=1`;
    const params = [];
    if (user_id) { params.push(user_id); q += ` AND a.user_id = $${params.length}`; }
    q += ` ORDER BY a.answered_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { user_id, task_id, given_answer, correct, attempt_no = 1 } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO answers (user_id, task_id, given_answer, correct, attempt_no)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [user_id, task_id, given_answer, correct, attempt_no]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/answers?user_id=xxx  (wyczyść statystyki ucznia)
router.delete("/", async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      // Nuke all — tylko superadmin powinien to wywoływać
      await pool.query("DELETE FROM answers");
    } else {
      await pool.query("DELETE FROM answers WHERE user_id = $1", [user_id]);
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
