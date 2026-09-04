const router = require("express").Router();
const pool = require("../db");

router.get("/", async (req, res) => {
  try {
    const { active, category } = req.query;
    let q = "SELECT * FROM tasks WHERE 1=1";
    const params = [];
    if (active !== undefined) { params.push(active === "true"); q += ` AND active = $${params.length}`; }
    if (category)             { params.push(category);          q += ` AND category = $${params.length}`; }
    q += " ORDER BY category ASC, created_at DESC";
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM tasks WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Nie znaleziono." });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const result = [];
    for (const item of items) {
      const { question, answer, category = "Różne", difficulty = "łatwe", active = true, image_url } = item;
      const { rows } = await pool.query(
        `INSERT INTO tasks (question, answer, category, difficulty, active, image_url)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [question, answer, category, difficulty, active, image_url || null]
      );
      result.push(rows[0]);
    }
    res.status(201).json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch("/:id", async (req, res) => {
  try {
    const fields = Object.keys(req.body);
    if (!fields.length) return res.status(400).json({ error: "Brak danych." });
    const vals = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
    const params = [...fields.map(f => req.body[f]), req.params.id];
    const { rows } = await pool.query(
      `UPDATE tasks SET ${vals} WHERE id = $${params.length} RETURNING *`,
      params
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM tasks WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
