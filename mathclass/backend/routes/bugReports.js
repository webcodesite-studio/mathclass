const router = require("express").Router();
const pool = require("../db");

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

async function notifyDiscordBugReport(report) {
  if (!DISCORD_WEBHOOK_URL) return;

  const reporter = report.reporter_username || "nieznany";
  const role = report.reporter_role || "nieznana rola";
  const message = String(report.message || "").trim().slice(0, 1400);

  await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: [
        "Nowy ticket w MathClass",
        `Autor: ${reporter}`,
        `Rola: ${role}`,
        `Treść: ${message}`,
      ].join("\n"),
    }),
  });
}

// GET /api/bug-reports
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    let q = "SELECT * FROM bug_reports WHERE 1=1";
    const params = [];
    if (status) { params.push(status); q += ` AND status = $${params.length}`; }
    q += " ORDER BY created_at DESC";
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/bug-reports
router.post("/", async (req, res) => {
  try {
    const { reporter_username, reporter_role, message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: "Treść zgłoszenia jest wymagana." });
    const { rows } = await pool.query(
      `INSERT INTO bug_reports (reporter_username, reporter_role, message)
       VALUES ($1,$2,$3) RETURNING *`,
      [reporter_username || null, reporter_role || null, message.trim()]
    );
    notifyDiscordBugReport(rows[0]).catch(err => console.error("Discord webhook error:", err.message));
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/bug-reports/:id
router.patch("/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const { rows } = await pool.query(
      "UPDATE bug_reports SET status = $1 WHERE id = $2 RETURNING *",
      [status, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/bug-reports/:id
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM bug_reports WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;