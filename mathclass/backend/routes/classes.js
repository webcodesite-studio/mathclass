const router = require("express").Router();
const pool = require("../db");

router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM classes ORDER BY name ASC");
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO classes (name) VALUES ($1) RETURNING *",
      [name.toUpperCase()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Klasa już istnieje." });
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM classes WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
