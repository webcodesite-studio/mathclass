const router = require("express").Router();
const pool = require("../db");

router.get("/", async (req, res) => {
  try {
    const { target_type, target_id } = req.query;
    let q = "SELECT * FROM category_assignments WHERE 1=1";
    const params = [];
    if (target_type) { params.push(target_type); q += ` AND target_type = $${params.length}`; }
    if (target_id)   { params.push(target_id);   q += ` AND target_id = $${params.length}`; }
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { target_type, target_id, category_name } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO category_assignments (target_type, target_id, category_name)
       VALUES ($1,$2,$3) RETURNING *`,
      [target_type, target_id, category_name]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM category_assignments WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE by target: /api/category-assignments?target_type=user&target_id=xxx
router.delete("/", async (req, res) => {
  try {
    const { target_type, target_id } = req.query;
    let q = "DELETE FROM category_assignments WHERE 1=1";
    const params = [];
    if (target_type) { params.push(target_type); q += ` AND target_type = $${params.length}`; }
    if (target_id)   { params.push(target_id);   q += ` AND target_id = $${params.length}`; }
    await pool.query(q, params);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
