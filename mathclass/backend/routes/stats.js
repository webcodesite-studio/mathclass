const router = require("express").Router();
const pool = require("../db");

// GET /api/stats/students  — odpowiednik widoku student_stats
router.get("/students", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id                                                        AS user_id,
        u.username,
        u.name,
        c.name                                                      AS class,
        u.class_id,
        COUNT(a.id)                                                 AS total_attempts,
        COUNT(a.id)         FILTER (WHERE a.correct)                AS correct_answers,
        COUNT(DISTINCT a.task_id) FILTER (WHERE a.correct)          AS tasks_solved,
        ROUND(
          100.0 * COUNT(a.id) FILTER (WHERE a.correct)
                  / NULLIF(COUNT(a.id), 0), 1
        )                                                           AS accuracy_pct,
        MAX(a.answered_at)                                          AS last_activity
      FROM users u
      LEFT JOIN classes c ON c.id = u.class_id
      LEFT JOIN answers a ON a.user_id = u.id
      WHERE u.role = 'student'
      GROUP BY u.id, u.username, u.name, c.name, u.class_id
      ORDER BY c.name ASC, u.name ASC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stats/db  — liczniki do panelu admina
router.get("/db", async (req, res) => {
  try {
    const [u, t, a, cl, ca] = await Promise.all([
      pool.query("SELECT role FROM users"),
      pool.query("SELECT active FROM tasks"),
      pool.query("SELECT id FROM answers"),
      pool.query("SELECT id FROM classes"),
      pool.query("SELECT id FROM categories"),
    ]);
    res.json({
      students:    u.rows.filter(x => x.role === "student").length,
      teachers:    u.rows.filter(x => x.role === "admin").length,
      tasks:       t.rows.length,
      activeTasks: t.rows.filter(x => x.active).length,
      answers:     a.rows.length,
      classes:     cl.rows.length,
      categories:  ca.rows.length,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
