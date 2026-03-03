const express = require("express");
const cors = require("cors");
const pg = require("pg");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3001;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://mathclass_user:mathclass_secure_password_123@localhost:5432/mathclass",
});

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT NOW()");
    res.json({ status: "ok" });
  } catch (err) {
    res.status(503).json({ error: "DB unavailable" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query(
      "SELECT u.*, c.name as class_name FROM users u LEFT JOIN classes c ON u.class_id = c.id WHERE u.username = $1 AND u.password_hash = $2",
      [username.trim(), password]
    );
    if (!result.rows.length) return res.status(401).json({ error: "Invalid" });
    const user = result.rows[0];
    if (!user.active) return res.status(403).json({ error: "Inactive" });
    const sid = uuidv4();
    const exp = user.session_minutes ? new Date(Date.now() + user.session_minutes * 60000).toISOString() : null;
    await pool.query("INSERT INTO sessions (id, user_id, expires_at, active) VALUES ($1, $2, $3, $4)", [sid, user.id, exp, true]);
    res.json({ id: user.id, username: user.username, name: user.name, role: user.role, class_name: user.class_name, session_minutes: user.session_minutes, sid, exp });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, class_id, password } = req.body;
    if (password.length < 4) return res.status(400).json({ error: "Short" });
    const cr = await pool.query("SELECT name FROM classes WHERE id = $1", [class_id]);
    if (!cr.rows.length) return res.status(400).json({ error: "No class" });
    const base = name.trim().toLowerCase().replace(/\s+/g, "") + "_" + cr.rows[0].name;
    const ex = await pool.query("SELECT username FROM users WHERE username ILIKE $1", [`${base}%`]);
    let u = base;
    if (ex.rows.length) {
      const ns = ex.rows.map(x => { const m = x.username.replace(base, ""); return m ? parseInt(m) : 0; });
      u = base + (Math.max(...ns) + 1);
    }
    const uid = uuidv4();
    await pool.query("INSERT INTO users (id, username, name, password_hash, role, class_id, active, session_minutes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [uid, u, name.trim(), password, "student", class_id, false, 60]);
    res.json({ success: true, username: u });
  } catch (err) {
    res.status(500).json({ error: "Register failed" });
  }
});

app.get("/api/classes", async (req, res) => {
  try {
    const r = await pool.query("SELECT id, name FROM classes ORDER BY name");
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.post("/api/add-class", async (req, res) => {
  try {
    const { name } = req.body;
    const id = uuidv4();
    await pool.query("INSERT INTO classes (id, name) VALUES ($1, $2)", [id, name.toUpperCase()]);
    res.json({ id, name: name.toUpperCase() });
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.delete("/api/classes/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM classes WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const { role } = req.query;
    let q = "SELECT * FROM users";
    let p = [];
    if (role) { q += " WHERE role = $1"; p.push(role); }
    q += " ORDER BY name";
    const r = await pool.query(q, p);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.patch("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, password_hash, class_id, session_minutes, active } = req.body;
    const f = [];
    const v = [];
    let pc = 1;
    if (name !== undefined) { f.push(`name = $${pc}`); v.push(name); pc++; }
    if (password_hash !== undefined) { f.push(`password_hash = $${pc}`); v.push(password_hash); pc++; }
    if (class_id !== undefined) { f.push(`class_id = $${pc}`); v.push(class_id); pc++; }
    if (session_minutes !== undefined) { f.push(`session_minutes = $${pc}`); v.push(session_minutes); pc++; }
    if (active !== undefined) { f.push(`active = $${pc}`); v.push(active); pc++; }
    if (!f.length) return res.status(400).json({ error: "No fields" });
    f.push(`updated_at = NOW()`);
    v.push(id);
    const q = `UPDATE users SET ${f.join(", ")} WHERE id = $${pc} RETURNING *`;
    const r = await pool.query(q, v);
    res.json(r.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.post("/api/add-student", async (req, res) => {
  try {
    const { name, class_id, password, session_minutes } = req.body;
    const cr = await pool.query("SELECT name FROM classes WHERE id = $1", [class_id]);
    const base = name.trim().toLowerCase().replace(/\s+/g, "") + "_" + cr.rows[0].name;
    const ex = await pool.query("SELECT username FROM users WHERE username ILIKE $1", [`${base}%`]);
    let u = base;
    if (ex.rows.length) { const ns = ex.rows.map(x => { const m = x.username.replace(base, ""); return m ? parseInt(m) : 0; }); u = base + (Math.max(...ns) + 1); }
    const uid = uuidv4();
    await pool.query("INSERT INTO users (id, username, name, password_hash, role, class_id, active, session_minutes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [uid, u, name.trim(), password, "student", class_id, true, session_minutes || null]);
    res.json({ success: true, username: u });
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.get("/api/user-sessions/:user_id", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10", [req.params.user_id]);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.patch("/api/sessions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { active, locked_at } = req.body;
    const f = [];
    const v = [];
    let pc = 1;
    if (active !== undefined) { f.push(`active = $${pc}`); v.push(active); pc++; }
    if (locked_at !== undefined) { f.push(`locked_at = $${pc}`); v.push(locked_at); pc++; }
    v.push(id);
    const q = `UPDATE sessions SET ${f.join(", ")} WHERE id = $${pc} RETURNING *`;
    const r = await pool.query(q, v);
    res.json(r.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.get("/api/tasks", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM tasks ORDER BY category");
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.get("/api/tasks-for-student", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM tasks WHERE active = true ORDER BY RANDOM() LIMIT 6");
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.post("/api/add-task", async (req, res) => {
  try {
    const { question, answer, category, difficulty, image_data } = req.body;
    const id = uuidv4();
    await pool.query("INSERT INTO tasks (id, question, answer, category, difficulty, image_data, active) VALUES ($1, $2, $3, $4, $5, $6, $7)", [id, question, answer, category || "Różne", difficulty || "łatwe", image_data || null, true]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.post("/api/add-tasks-bulk", async (req, res) => {
  try {
    const { tasks } = req.body;
    for (const t of tasks) {
      const id = uuidv4();
      await pool.query("INSERT INTO tasks (id, question, answer, category, difficulty, active) VALUES ($1, $2, $3, $4, $5, $6)", [id, t.question, t.answer, t.category || "Różne", t.difficulty || "łatwe", true]);
    }
    res.json({ success: true, count: tasks.length });
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.patch("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, category, difficulty, image_data, active } = req.body;
    const f = [];
    const v = [];
    let pc = 1;
    if (question !== undefined) { f.push(`question = $${pc}`); v.push(question); pc++; }
    if (answer !== undefined) { f.push(`answer = $${pc}`); v.push(answer); pc++; }
    if (category !== undefined) { f.push(`category = $${pc}`); v.push(category); pc++; }
    if (difficulty !== undefined) { f.push(`difficulty = $${pc}`); v.push(difficulty); pc++; }
    if (image_data !== undefined) { f.push(`image_data = $${pc}`); v.push(image_data); pc++; }
    if (active !== undefined) { f.push(`active = $${pc}`); v.push(active); pc++; }
    f.push(`updated_at = NOW()`);
    v.push(id);
    const q = `UPDATE tasks SET ${f.join(", ")} WHERE id = $${pc} RETURNING *`;
    const r = await pool.query(q, v);
    res.json(r.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM tasks WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.post("/api/submit-answer", async (req, res) => {
  try {
    const { task_id, given_answer, correct, user_id } = req.body;
    const id = uuidv4();
    await pool.query("INSERT INTO answers (id, user_id, task_id, given_answer, correct) VALUES ($1, $2, $3, $4, $5)", [id, user_id, task_id, given_answer, correct]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.get("/api/student-answers/:user_id", async (req, res) => {
  try {
    const r = await pool.query("SELECT a.*, t.question, t.category FROM answers a LEFT JOIN tasks t ON a.task_id = t.id WHERE a.user_id = $1 ORDER BY a.answered_at DESC LIMIT 50", [req.params.user_id]);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.get("/api/student-stats", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM student_stats ORDER BY class");
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.post("/api/upload-image", async (req, res) => {
  try {
    const { image } = req.body;
    res.json({ image_data: image });
  } catch (err) {
    res.status(500).json({ error: "Error" });
  }
});

app.listen(PORT, () => console.log(`🚀 API on ${PORT}`));
