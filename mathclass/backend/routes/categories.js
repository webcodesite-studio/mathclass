const router = require("express").Router();
const pool = require("../db");

router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM categories ORDER BY name ASC");
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING *",
      [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch("/:id", async (req, res) => {
  try {
    const { name } = req.body;
    const old = await pool.query("SELECT name FROM categories WHERE id=$1", [req.params.id]);
    if (old.rows[0]) await pool.query("UPDATE tasks SET category=$1 WHERE category=$2", [name, old.rows[0].name]);
    const { rows } = await pool.query("UPDATE categories SET name=$1 WHERE id=$2 RETURNING *", [name, req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const old = await pool.query("SELECT name FROM categories WHERE id=$1", [req.params.id]);
    if (old.rows[0]) await pool.query("UPDATE tasks SET category='Różne' WHERE category=$1", [old.rows[0].name]);
    await pool.query("DELETE FROM categories WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
