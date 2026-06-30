const router = require("express").Router();
const pool = require("../db");

router.get("/", async (req, res) => {
  try {
    const { teacher_id } = req.query;
    let q = "SELECT * FROM teacher_classes WHERE 1=1";
    const params = [];
    if (teacher_id) { params.push(teacher_id); q += ` AND teacher_id = $${params.length}`; }
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { teacher_id, class_id } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO teacher_classes (teacher_id, class_id)
       VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *`,
      [teacher_id, class_id]
    );
    res.status(201).json(rows[0] || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM teacher_classes WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE by teacher: /api/teacher-classes?teacher_id=xxx
router.delete("/", async (req, res) => {
  try {
    const { teacher_id } = req.query;
    if (teacher_id) await pool.query("DELETE FROM teacher_classes WHERE teacher_id=$1", [teacher_id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
