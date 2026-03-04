import React, { useState, useEffect, useRef, useCallback } from "react";

const SURL = "https://qpoarmquzrwzbhqmffdn.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb2FybXF1enJ3emJocW1mZmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MzYxMzEsImV4cCI6MjA4ODExMjEzMX0.qvypDSMiWTYTCYOFUhuMFY5iVeV3GQGJIw-Z-2weW88";

const H = () => ({ "Content-Type": "application/json", "apikey": ANON, "Authorization": `Bearer ${ANON}`, "Prefer": "return=representation" });
function qs(f = [], o = {}) { const p = new URLSearchParams(); f.forEach(({ col, op, val }) => p.append(col, `${op}.${val}`)); if (o.order) p.append("order", o.order); if (o.limit) p.append("limit", String(o.limit)); if (o.select) p.append("select", o.select); return p.toString() ? "?" + p.toString() : ""; }
const db = {
  async get(t, f = [], o = {}) { const r = await fetch(`${SURL}/rest/v1/${t}${qs(f, o)}`, { headers: H() }); if (!r.ok) return { data: null, error: await r.json() }; return { data: await r.json(), error: null } },
  async ins(t, b) { const r = await fetch(`${SURL}/rest/v1/${t}`, { method: "POST", headers: H(), body: JSON.stringify(b) }); if (!r.ok) return { data: null, error: await r.json() }; const tx = await r.text(); return { data: tx ? JSON.parse(tx) : [], error: null } },
  async upd(t, b, f = []) { const r = await fetch(`${SURL}/rest/v1/${t}${qs(f)}`, { method: "PATCH", headers: H(), body: JSON.stringify(b) }); if (!r.ok) return { data: null, error: await r.json() }; const tx = await r.text(); return { data: tx ? JSON.parse(tx) : [], error: null } },
  async del(t, f = []) { const r = await fetch(`${SURL}/rest/v1/${t}${qs(f)}`, { method: "DELETE", headers: H() }); return { error: r.ok ? null : await r.json() } },
};
const eq = (c, v) => ({ col: c, op: "eq", val: v });
const lik = (c, v) => ({ col: c, op: "ilike", val: v });
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

async function uploadImage(file) {
  const ext = file.name.split(".").pop();
  const name = `task_${Date.now()}.${ext}`;
  const r = await fetch(`${SURL}/storage/v1/object/task-images/${name}`, {
    method: "POST",
    headers: { "apikey": ANON, "Authorization": `Bearer ${ANON}`, "Content-Type": file.type },
    body: file,
  });
  if (!r.ok) return null;
  return `${SURL}/storage/v1/object/public/task-images/${name}`;
}

// ── Image Cropper Component ──────────────────────────────────────
function ImageCropper({ src, onCrop, onCancel }) {
  const canvasRef = useRef();
  const [drag, setDrag] = useState(false);
  const [box, setBox] = useState({ x: 20, y: 20, w: 260, h: 200 });
  const [start, setStart] = useState(null);
  const [mode, setMode] = useState(null); // "move" | "resize"
  const [imgEl, setImgEl] = useState(null);
  const [imgSize, setImgSize] = useState({ w: 400, h: 300 });
  const DISPLAY_W = 480;

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const scale = DISPLAY_W / img.naturalWidth;
      const h = img.naturalHeight * scale;
      setImgSize({ w: DISPLAY_W, h });
      setImgEl(img);
      setBox({ x: 20, y: 20, w: DISPLAY_W - 40, h: h - 40 });
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    if (!canvasRef.current || !imgEl) return;
    const c = canvasRef.current;
    c.width = imgSize.w; c.height = imgSize.h;
    const ctx = c.getContext("2d");
    ctx.drawImage(imgEl, 0, 0, imgSize.w, imgSize.h);
    // Overlay
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, imgSize.w, imgSize.h);
    // Clear crop area
    ctx.clearRect(box.x, box.y, box.w, box.h);
    ctx.drawImage(imgEl, 0, 0, imgSize.w, imgSize.h);
    ctx.clearRect(box.x, box.y, box.w, box.h);
    ctx.drawImage(imgEl, (box.x / imgSize.w) * imgEl.naturalWidth, (box.y / imgSize.h) * imgEl.naturalHeight,
      (box.w / imgSize.w) * imgEl.naturalWidth, (box.h / imgSize.h) * imgEl.naturalHeight,
      box.x, box.y, box.w, box.h);
    // Border
    ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    // Handles
    const hs = 10;
    [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]].forEach(([hx, hy]) => {
      ctx.fillStyle = "#38bdf8"; ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
    });
    // Grid lines
    ctx.strokeStyle = "rgba(56,189,248,0.3)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(box.x + box.w / 3, box.y); ctx.lineTo(box.x + box.w / 3, box.y + box.h);
    ctx.moveTo(box.x + (box.w * 2) / 3, box.y); ctx.lineTo(box.x + (box.w * 2) / 3, box.y + box.h);
    ctx.moveTo(box.x, box.y + box.h / 3); ctx.lineTo(box.x + box.w, box.y + box.h / 3);
    ctx.moveTo(box.x, box.y + (box.h * 2) / 3); ctx.lineTo(box.x + box.w, box.y + (box.h * 2) / 3);
    ctx.stroke();
  }, [box, imgEl, imgSize]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const onDown = (e) => {
    const pos = getPos(e, canvasRef.current);
    const hs = 14;
    const corners = [
      { x: box.x, y: box.y, dx: 1, dy: 1, ox: "left", oy: "top" },
      { x: box.x + box.w, y: box.y, dx: -1, dy: 1, ox: "right", oy: "top" },
      { x: box.x, y: box.y + box.h, dx: 1, dy: -1, ox: "left", oy: "bottom" },
      { x: box.x + box.w, y: box.y + box.h, dx: -1, dy: -1, ox: "right", oy: "bottom" },
    ];
    for (const corner of corners) {
      if (Math.abs(pos.x - corner.x) < hs && Math.abs(pos.y - corner.y) < hs) {
        setMode({ type: "resize", corner }); setStart(pos); setDrag(true); return;
      }
    }
    if (pos.x > box.x && pos.x < box.x + box.w && pos.y > box.y && pos.y < box.y + box.h) {
      setMode({ type: "move" }); setStart({ x: pos.x - box.x, y: pos.y - box.y }); setDrag(true);
    }
  };

  const onMove = (e) => {
    if (!drag || !mode) return;
    e.preventDefault();
    const pos = getPos(e, canvasRef.current);
    if (mode.type === "move") {
      const nx = Math.max(0, Math.min(imgSize.w - box.w, pos.x - start.x));
      const ny = Math.max(0, Math.min(imgSize.h - box.h, pos.y - start.y));
      setBox(b => ({ ...b, x: nx, y: ny }));
    } else if (mode.type === "resize") {
      const c = mode.corner;
      let nb = { ...box };
      if (c.ox === "right") { nb.w = Math.max(40, pos.x - nb.x); }
      if (c.ox === "left") { const nr = nb.x + nb.w; nb.x = Math.min(nr - 40, pos.x); nb.w = nr - nb.x; }
      if (c.oy === "bottom") { nb.h = Math.max(30, pos.y - nb.y); }
      if (c.oy === "top") { const nb2 = nb.y + nb.h; nb.y = Math.min(nb2 - 30, pos.y); nb.h = nb2 - nb.y; }
      nb.x = Math.max(0, nb.x); nb.y = Math.max(0, nb.y);
      nb.w = Math.min(imgSize.w - nb.x, nb.w); nb.h = Math.min(imgSize.h - nb.y, nb.h);
      setBox(nb);
    }
  };

  const onUp = () => { setDrag(false); setMode(null); };

  const doCrop = () => {
    if (!imgEl) return;
    const out = document.createElement("canvas");
    const scaleX = imgEl.naturalWidth / imgSize.w;
    const scaleY = imgEl.naturalHeight / imgSize.h;
    out.width = Math.round(box.w * scaleX);
    out.height = Math.round(box.h * scaleY);
    out.getContext("2d").drawImage(imgEl,
      box.x * scaleX, box.y * scaleY, box.w * scaleX, box.h * scaleY,
      0, 0, out.width, out.height);
    out.toBlob(blob => {
      const f = new File([blob], `crop_${Date.now()}.jpg`, { type: "image/jpeg" });
      onCrop(f, URL.createObjectURL(blob));
    }, "image/jpeg", 0.92);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(2,8,23,0.95)", zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#0f172a", borderRadius: 16, border: "1px solid #1e3a5f", padding: 20, maxWidth: 540, width: "100%" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#38bdf8" }}>✂️ Kadruj zdjęcie</h3>
        <p style={{ color: "#64748b", fontSize: 11, margin: "0 0 12px" }}>Przeciągnij ramkę lub narożniki, aby wybrać obszar</p>
        <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #1e293b", touchAction: "none", cursor: drag ? (mode?.type === "move" ? "grabbing" : "nwse-resize") : "default" }}>
          <canvas ref={canvasRef}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
            onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
            style={{ display: "block", width: "100%", maxWidth: DISPLAY_W }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={doCrop} style={{ flex: 1, padding: "11px", background: "linear-gradient(135deg,#0369a1,#0ea5e9)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>✅ Wytnij i użyj</button>
          <button onClick={onCancel} style={{ flex: 1, padding: "11px", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>Anuluj</button>
        </div>
      </div>
    </div>
  );
}

// ── Image Upload with Crop ───────────────────────────────────────
function ImageUploadCrop({ imgUrl, setImgUrl }) {
  const [cropSrc, setCropSrc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCrop = async (croppedFile, previewUrl) => {
    setCropSrc(null);
    setUploading(true);
    const url = await uploadImage(croppedFile);
    if (url) setImgUrl(url);
    else { setImgUrl(previewUrl); alert("Upload do Supabase nie powiódł się – użyto lokalnego podglądu."); }
    setUploading(false);
  };

  return (
    <>
      {cropSrc && <ImageCropper src={cropSrc} onCrop={handleCrop} onCancel={() => setCropSrc(null)} />}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => fileRef.current?.click()} style={{ padding: "7px 14px", borderRadius: 7, border: "1px dashed #334155", background: "#0f172a", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>
          {uploading ? "⏳ Wysyłanie..." : "📁 Dodaj obrazek"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        {imgUrl && (
          <>
            <img src={imgUrl} alt="preview" style={{ height: 56, borderRadius: 6, objectFit: "contain", background: "#1e293b", border: "1px solid #334155" }} />
            <button onClick={() => setImgUrl("")} style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: "#3a1a1a", color: "#ef4444", cursor: "pointer", fontSize: 11 }}>Usuń</button>
          </>
        )}
      </div>
      <p style={{ color: "#475569", fontSize: 10, marginTop: 4 }}>Zdjęcie zostanie przycięte przed uploadem</p>
    </>
  );
}

// ── Main App ─────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("login");
  const [dbOk, setDbOk] = useState(null);
  useEffect(() => {
    db.get("users", [], { limit: 1, select: "id" })
      .then(({ error }) => setDbOk(!error))
      .catch(() => setDbOk(false));
  }, []);
  const logout = async () => {
    if (user?.sid) await db.upd("sessions", { active: false }, [eq("id", user.sid)]);
    setUser(null); setPage("login");
  };
  return (
    <div style={S.root}>
      <BgGrid />
      {dbOk === null && <Spin text="Łączenie z bazą..." />}
      {dbOk === false && <NoDb />}
      {dbOk === true && <>
        {page === "login" && <Login onLogin={u => { setUser(u); setPage(u.role === "admin" ? "admin" : "student"); }} />}
        {page === "student" && <Student user={user} onLogout={logout} />}
        {page === "admin" && <Admin onLogout={logout} />}
      </>}
    </div>
  );
}

function NoDb() {
  return <div style={S.cx}><div style={{ textAlign: "center", maxWidth: 480, padding: 40 }}>
    <div style={{ fontSize: 56 }}>🔌</div>
    <h2 style={{ color: "#f87171" }}>Brak połączenia z bazą</h2>
    <p style={{ color: "#94a3b8" }}>Uruchom <b>supabase_schema.sql</b> w Supabase SQL Editor.</p>
  </div></div>;
}

function Login({ onLogin }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [ld, setLd] = useState(false);
  const [tab, setTab] = useState("in");

  const go = async () => {
    if (!u.trim() || !p.trim()) { setErr("Wypełnij oba pola."); return; }
    setLd(true); setErr("");
    const { data: rows } = await db.get("users", [eq("username", u.trim()), eq("password_hash", p)], { select: "*", limit: 1 });
    if (!rows?.length) { setErr("Nieprawidłowy login lub hasło."); setLd(false); return; }
    const usr = rows[0];
    if (!usr.active) { setErr("Konto zablokowane. Skontaktuj się z nauczycielem."); setLd(false); return; }

    // ── NOWE: sprawdź czy konto jest zablokowane przez wygaśnięcie sesji ──
    if (usr.role === "student") {
      // Sprawdź flagę session_locked bezpośrednio na koncie ucznia
      if (usr.session_locked) {
        setErr("Czas sesji minął. Konto zablokowane – skontaktuj się z nauczycielem.");
        setLd(false); return;
      }
    }

    let cn = "";
    if (usr.class_id) { const { data: cl } = await db.get("classes", [eq("id", usr.class_id)], { limit: 1 }); cn = cl?.[0]?.name || ""; }
    const exp = usr.session_minutes ? new Date(Date.now() + usr.session_minutes * 60000).toISOString() : null;
    const { data: sess } = await db.ins("sessions", { user_id: usr.id, expires_at: exp, active: true });
    onLogin({ ...usr, className: cn, sid: sess?.[0]?.id, exp });
    setLd(false);
  };

  return (
    <div style={S.cx}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48 }}>∑</div>
          <h1 style={{ ...S.gr, fontSize: 28, fontWeight: 900, margin: 0, fontFamily: "Georgia,serif" }}>MathClass</h1>
          <p style={{ color: "#64748b", marginTop: 6, fontSize: 13 }}>System zadań matematycznych</p>
        </div>
        <div style={{ ...S.card, padding: "24px 20px" }}>
          <div style={{ display: "flex", marginBottom: 20, background: "#0f172a", borderRadius: 8, padding: 3 }}>
            {[["in", "Logowanie"], ["reg", "Rejestracja"]].map(([k, l]) => (
              <button key={k} onClick={() => { setTab(k); setErr(""); }} style={{ flex: 1, padding: "8px", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13, background: tab === k ? "#1e3a5f" : "transparent", color: tab === k ? "#38bdf8" : "#64748b" }}>{l}</button>
            ))}
          </div>
          {tab === "in" ? (<>
            <Lb>Login (np. jan_2A)</Lb>
            <In v={u} s={setU} ph="imię_klasa" oe={go} />
            <Lb style={{ marginTop: 14 }}>Hasło</Lb>
            <In type="password" v={p} s={setP} ph="••••••" oe={go} />
            {err && <Eb>{err}</Eb>}
            <Bt onClick={go} loading={ld} style={{ marginTop: 20 }}>Zaloguj się →</Bt>
          </>) : <Reg />}
        </div>
      </div>
    </div>
  );
}

function Reg() {
  const [n, setN] = useState(""); const [c, setC] = useState(""); const [p, setP] = useState(""); const [c2, setC2] = useState("");
  const [cls, setCls] = useState([]); const [err, setErr] = useState(""); const [ok, setOk] = useState("");
  useEffect(() => { db.get("classes", [], { order: "name.asc" }).then(({ data }) => setCls(data || [])); }, []);
  const go = async () => {
    if (!n.trim() || !c || !p) { setErr("Wypełnij wszystkie pola."); return; }
    if (p !== c2) { setErr("Hasła nie pasują."); return; }
    if (p.length < 4) { setErr("Hasło min 4 znaki."); return; }
    setErr("");
    const cr = cls.find(x => x.id === c);
    const base = n.trim().toLowerCase().replace(/\s+/g, "") + "_" + cr.name;
    const { data: ex } = await db.get("users", [lik("username", `${base}%`)], { select: "username" });
    let uname = base;
    if (ex?.length) { const nums = ex.map(u => { const m = u.username.replace(base, ""); return m ? parseInt(m) || 0 : 0; }); uname = base + (Math.max(...nums) + 1); }
    await db.ins("users", { username: uname, name: n.trim(), password_hash: p, role: "student", class_id: c, active: true, session_minutes: 60 });
    setOk(`✅ Konto: ${uname}\nCzekaj na aktywację przez nauczyciela.`);
  };
  if (ok) return <div style={{ color: "#4ade80", lineHeight: 1.8, whiteSpace: "pre-line", padding: "8px 0" }}>{ok}</div>;
  return (<>
    <Lb>Imię</Lb><In v={n} s={setN} ph="np. Jan" />
    <Lb style={{ marginTop: 14 }}>Klasa</Lb>
    <select value={c} onChange={e => setC(e.target.value)} style={S.inp}><option value="">Wybierz klasę...</option>{cls.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
    <Lb style={{ marginTop: 14 }}>Hasło</Lb><In type="password" v={p} s={setP} />
    <Lb style={{ marginTop: 14 }}>Potwierdź hasło</Lb><In type="password" v={c2} s={setC2} />
    {err && <Eb>{err}</Eb>}
    <Bt onClick={go} style={{ marginTop: 20 }}>Zarejestruj się</Bt>
  </>);
}

function Student({ user, onLogout }) {
  const [slots, setSlots] = useState([]);
  const [ans, setAns] = useState({});
  const [fb, setFb] = useState({});
  const [cd, setCd] = useState({});
  const [tl, setTl] = useState(null);
  const [exp, setExp] = useState(false);

  useEffect(() => {
    const loadTasks = async () => {
      // Pobierz przydziały kategorii dla ucznia i jego klasy
      const [{ data: userAs }, { data: classAs }] = await Promise.all([
        db.get("category_assignments", [eq("target_type", "user"), eq("target_id", user.id)]),
        user.class_id ? db.get("category_assignments", [eq("target_type", "class"), eq("target_id", user.class_id)]) : Promise.resolve({ data: [] }),
      ]);
      // Priorytet: uczeń > klasa > wszystkie
      const assigned = userAs?.length ? userAs : (classAs?.length ? classAs : null);
      const allowedCats = assigned ? new Set(assigned.map(a => a.category_name)) : null;

      const { data } = await db.get("tasks", [eq("active", true)]);
      if (!data) return;
      const filtered = allowedCats ? data.filter(t => allowedCats.has(t.category)) : data;
      setSlots([...filtered].sort(() => Math.random() - .5).slice(0, 6));
    };
    loadTasks();
  }, []);

  useEffect(() => {
    if (!user.exp) return;
    const tick = async () => {
      const left = Math.max(0, new Date(user.exp) - Date.now());
      setTl(Math.ceil(left / 1000));
      if (left <= 0 && !exp) {
        setExp(true);
        // ── NOWE: zapisz blokadę na koncie ucznia (session_locked = true) ──
        await db.upd("users", { session_locked: true }, [eq("id", user.id)]);
        if (user.sid) await db.upd("sessions", { active: false, locked_at: new Date().toISOString() }, [eq("id", user.sid)]);
      }
    };
    tick(); const iv = setInterval(tick, 1000); return () => clearInterval(iv);
  }, [user.exp]);

  useEffect(() => {
    const ivs = {};
    Object.entries(cd).forEach(([id, x]) => {
      if (x.r > 0) {
        ivs[id] = setInterval(() => {
          setCd(prev => {
            const cur = prev[id];
            if (!cur || cur.r <= 1) { clearInterval(ivs[id]); const { [id]: _, ...rest } = prev; return rest; }
            return { ...prev, [id]: { ...cur, r: cur.r - 1 } };
          });
        }, 1000);
      }
    });
    return () => Object.values(ivs).forEach(clearInterval);
  }, [Object.keys(cd).join()]);

  const sub = async (idx) => {
    const t = slots[idx]; if (!t || cd[t.id]) return;
    const g = (ans[t.id] || "").trim().toLowerCase();
    const isOk = g === t.answer.trim().toLowerCase();
    await db.ins("answers", { user_id: user.id, task_id: t.id, given_answer: g, correct: isOk, attempt_no: (cd[t.id]?.a || 0) + 1 });
    if (isOk) {
      setFb(p => ({ ...p, [t.id]: "ok" }));
      setTimeout(async () => {
        const { data } = await db.get("tasks", [eq("active", true)]);
        // Filter by assigned categories (same logic as initial load)
        const [{ data: userAs }, { data: classAs }] = await Promise.all([
          db.get("category_assignments", [eq("target_type", "user"), eq("target_id", user.id)]),
          user.class_id ? db.get("category_assignments", [eq("target_type", "class"), eq("target_id", user.class_id)]) : Promise.resolve({ data: [] }),
        ]);
        const assigned = userAs?.length ? userAs : (classAs?.length ? classAs : null);
        const allowedCats = assigned ? new Set(assigned.map(a => a.category_name)) : null;
        const ids = slots.map(x => x.id);
        const pool = (data || []).filter(x => !ids.includes(x.id) && (!allowedCats || allowedCats.has(x.category)));
        const next = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
        setSlots(p => { const s = [...p]; s[idx] = next || t; return s; });
        setAns(p => { const { [t.id]: _, ...r } = p; return r; });
        setFb(p => { const { [t.id]: _, ...r } = p; return r; });
      }, 900);
    } else {
      const att = (cd[t.id]?.a || 0) + 1;
      setCd(p => ({ ...p, [t.id]: { r: att * 10, a: att } }));
      setFb(p => ({ ...p, [t.id]: "bad" }));
      setTimeout(() => setFb(p => ({ ...p, [t.id]: null })), 1400);
    }
  };

  if (exp) return (
    <div style={S.cx}>
      <div style={{ textAlign: "center", background: "#0f172a", borderRadius: 20, padding: "40px 24px", border: "1px solid #ef4444", maxWidth: 360, margin: "0 16px" }}>
        <div style={{ fontSize: 56 }}>⌛</div>
        <h2 style={{ color: "#ef4444", fontSize: 20 }}>Czas sesji minął</h2>
        <p style={{ color: "#64748b", fontSize: 14 }}>Twoje konto zostało zablokowane.<br />Skontaktuj się z nauczycielem w celu odblokowania.</p>
        <Bt onClick={onLogout} style={{ marginTop: 24 }}>Wróć do logowania</Bt>
      </div>
    </div>
  );

  const pct = user.exp ? Math.max(0, (new Date(user.exp) - Date.now()) / (user.session_minutes * 60000) * 100) : 100;
  const tc = pct > 50 ? "#22c55e" : pct > 20 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Witaj, <span style={{ color: "#38bdf8" }}>{user.name}</span></h1>
          <p style={{ margin: "3px 0 0", color: "#475569", fontSize: 12 }}>Klasa {user.className || "–"} · @{user.username}</p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {tl !== null && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>Czas sesji</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: tc }}>{fmt(tl)}</div>
              <div style={{ width: 80, height: 3, background: "#1e293b", borderRadius: 4, marginTop: 3 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: tc, borderRadius: 4, transition: "width 1s" }} />
              </div>
            </div>
          )}
          <button onClick={onLogout} style={{ ...S.gh, fontSize: 12, padding: "6px 12px" }}>Wyloguj</button>
        </div>
      </div>
      <p style={{ color: "#475569", fontSize: 12, marginBottom: 16 }}>Po poprawnej odpowiedzi pojawi się nowe zadanie. Błędna = kara czasowa.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,260px),1fr))", gap: 12 }}>
        {slots.map((t, idx) => {
          if (!t) return null;
          const c = cd[t.id]; const f = fb[t.id];
          const bc = f === "ok" ? "#22c55e" : f === "bad" ? "#ef4444" : "#1e293b";
          return (
            <div key={t.id + idx} style={{ ...S.card, border: `2px solid ${bc}`, transition: "border-color .3s", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 10, background: "#1e293b", padding: "2px 8px", borderRadius: 20, color: "#7dd3fc" }}>{t.category}</span>
                <span style={{ fontSize: 10, color: t.difficulty === "łatwe" ? "#22c55e" : t.difficulty === "średnie" ? "#f59e0b" : "#ef4444" }}>{t.difficulty}</span>
              </div>
              {/* ── NOWE: lepszy podgląd obrazka ── */}
              {t.image_url && (
                <div style={{ width: "100%", borderRadius: 8, marginBottom: 8, background: "#020817", border: "1px solid #1e293b", overflow: "hidden", cursor: "pointer" }}
                  onClick={() => window.open(t.image_url, "_blank")}>
                  <img src={t.image_url} alt="zadanie"
                    style={{ width: "100%", maxHeight: 200, objectFit: "contain", display: "block", padding: "4px" }}
                  />
                  <div style={{ textAlign: "center", fontSize: 9, color: "#334155", paddingBottom: 4 }}>🔍 kliknij aby powiększyć</div>
                </div>
              )}
              <p style={{ fontSize: 14, fontWeight: 600, margin: "8px 0 12px", lineHeight: 1.5, minHeight: 40 }}>{t.question}</p>
              <In v={ans[t.id] || ""} s={v => setAns(p => ({ ...p, [t.id]: v }))} ph="Wpisz odpowiedź…" disabled={!!c} oe={() => sub(idx)} />
              {c?.r ? (
                <div style={{ marginTop: 8, textAlign: "center", background: "#1c0a0a", borderRadius: 8, padding: "9px", color: "#ef4444", fontWeight: 700, fontSize: 13 }}>
                  ⏱ Odczekaj {c.r}s (próba {c.a})
                </div>
              ) : (
                <Bt onClick={() => sub(idx)} style={{ marginTop: 8, padding: "9px", fontSize: 13 }}>
                  {f === "ok" ? "✅ Poprawnie!" : f === "bad" ? "❌ Błąd" : "Sprawdź →"}
                </Bt>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Excel export utility (no external lib needed – CSV with BOM for Excel) ──
function exportToExcel(rows, filename) {
  const headers = Object.keys(rows[0]);
  const csv = [
    "\uFEFF" + headers.join(";"),
    ...rows.map(r => headers.map(h => {
      const v = r[h] == null ? "" : String(r[h]);
      return v.includes(";") || v.includes('"') || v.includes("\n") ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(";"))
  ].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename + ".csv"; a.click();
  URL.revokeObjectURL(url);
}

function Admin({ onLogout }) {
  const [tab, setTab] = useState("s");
  const tabs = [["s", "👥 Uczniowie"], ["t", "📝 Zadania"], ["st", "📊 Statystyki"], ["as", "➕ Uczeń"], ["at", "➕ Zadanie"], ["cl", "🏫 Klasy"], ["cat", "🏷️ Kategorie"], ["assign", "📋 Przydziały"]];
  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "16px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ ...S.gr, margin: 0, fontSize: 22, fontWeight: 900, fontFamily: "Georgia,serif" }}>Panel Nauczyciela</h1>
          <p style={{ color: "#475569", fontSize: 12, marginTop: 3 }}>MathClass</p>
        </div>
        <button onClick={onLogout} style={S.gh}>Wyloguj</button>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: tab === k ? "#0369a1" : "#1e293b", color: tab === k ? "#fff" : "#64748b" }}>{l}</button>
        ))}
      </div>
      {tab === "s" && <StudTab />}
      {tab === "t" && <TaskTab />}
      {tab === "st" && <StatTab />}
      {tab === "as" && <AddStud />}
      {tab === "at" && <AddTask />}
      {tab === "cl" && <ClsTab />}
      {tab === "cat" && <CatTab />}
      {tab === "assign" && <AssignTab />}
    </div>
  );
}

function StudTab() {
  const [list, setList] = useState([]);
  const [cls, setCls] = useState([]);
  const [fil, setFil] = useState("ALL");
  const [eid, setEid] = useState(null);
  const [msg, setMsg] = useState("");
  const [sel, setSel] = useState(new Set());
  const [bulkMins, setBulkMins] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState("");

  const load = async () => {
    const [{ data: u }, { data: c }] = await Promise.all([
      db.get("users", [eq("role", "student")], { order: "name.asc", select: "*" }),
      db.get("classes", [], { order: "name.asc" }),
    ]);
    setList(u || []); setCls(c || []);
  };
  useEffect(() => { load(); }, []);

  const sm = m => { setMsg(m); setTimeout(() => setMsg(""), 3000); };
  const gc = id => cls.find(c => c.id === id)?.name || "–";
  const tog = async u => { await db.upd("users", { active: !u.active }, [eq("id", u.id)]); setList(p => p.map(x => x.id === u.id ? { ...x, active: !x.active } : x)); sm(u.active ? "Zablokowano." : "Odblokowano."); };
  const rm = async u => { if (!confirm(`Usunąć ${u.username}?`)) return; await db.del("users", [eq("id", u.id)]); setList(p => p.filter(x => x.id !== u.id)); sm("Usunięto."); };

  const ulSess = async u => {
    // Nowa sesja: wyczyść stare statystyki (answers) tego ucznia
    await db.del("answers", [eq("user_id", u.id)]);
    await db.upd("users", { session_locked: false }, [eq("id", u.id)]);
    await db.upd("sessions", { active: false }, [eq("user_id", u.id)]);
    setList(p => p.map(x => x.id === u.id ? { ...x, session_locked: false } : x));
    sm(`✅ Nowa sesja dla ${u.name} – statystyki wyczyszczone.`);
  };

  const selectClass = (clsName) => {
    const ids = list.filter(u => gc(u.class_id) === clsName).map(u => u.id);
    setSel(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next; });
  };
  const toggleSel = (id) => { setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };

  const applyBulkTime = async () => {
    const val = bulkMins === "" ? null : parseInt(bulkMins);
    for (const id of sel) await db.upd("users", { session_minutes: val }, [eq("id", id)]);
    setList(p => p.map(x => sel.has(x.id) ? { ...x, session_minutes: val } : x));
    sm(`⏱ Ustawiono czas sesji dla ${sel.size} uczniów.`);
    setSel(new Set()); setBulkMins(""); setShowBulk(false);
  };

  const applyBulkUnlock = async () => {
    for (const id of sel) {
      // Nowa sesja: wyczyść stare statystyki
      await db.del("answers", [eq("user_id", id)]);
      await db.upd("users", { session_locked: false }, [eq("id", id)]);
      await db.upd("sessions", { active: false }, [eq("user_id", id)]);
    }
    setList(p => p.map(x => sel.has(x.id) ? { ...x, session_locked: false } : x));
    sm(`🔓 Nowe sesje dla ${sel.size} uczniów – statystyki wyczyszczone.`);
    setSel(new Set());
  };

  // ── NOWE: promowanie klasy – zmień login i class_id dla zaznaczonych ──
  const applyBulkPromote = async () => {
    if (!promoteTarget) return;
    const newCls = cls.find(c => c.id === promoteTarget);
    if (!newCls) return;

    let promoted = 0;
    for (const id of sel) {
      const u = list.find(x => x.id === id);
      if (!u) continue;
      // nowy login: imię_nowaKlasa
      const namePart = u.name.trim().toLowerCase().replace(/\s+/g, "");
      const base = `${namePart}_${newCls.name}`;
      const { data: ex } = await db.get("users", [lik("username", `${base}%`)], { select: "username,id" });
      const oth = (ex || []).filter(x => x.id !== id);
      let uname = base;
      if (oth.length) {
        const ns = oth.map(x => { const mx = x.username.replace(base, ""); return mx ? parseInt(mx) || 0 : 0; });
        uname = base + (Math.max(...ns) + 1);
      }
      await db.upd("users", { class_id: promoteTarget, username: uname }, [eq("id", id)]);
      promoted++;
    }
    await load();
    sm(`🎓 Przeniesiono ${promoted} uczniów do klasy ${newCls.name}.`);
    setSel(new Set()); setShowPromote(false); setPromoteTarget("");
  };

  const allCls = ["ALL", ...new Set(list.map(u => gc(u.class_id)))].sort();
  const visible = list.filter(u => fil === "ALL" || gc(u.class_id) === fil);

  return (
    <div>
      {msg && <Ok style={{ marginBottom: 12 }}>{msg}</Ok>}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {allCls.map(c => <Pi key={c} a={fil === c} onClick={() => setFil(c)}>{c === "ALL" ? "Wszystkie" : c}</Pi>)}
      </div>

      {/* Bulk toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {allCls.filter(c => c !== "ALL").map(c => (
          <button key={c} onClick={() => selectClass(c)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#7dd3fc", fontSize: 12, cursor: "pointer" }}>
            Zaznacz {c}
          </button>
        ))}
        {sel.size > 0 && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
            <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 600 }}>Zaznaczono: {sel.size}</span>
            <button onClick={applyBulkUnlock} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#16a34a", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>🔓 Odblokuj sesje</button>
            <button onClick={() => { setShowPromote(!showPromote); setShowBulk(false); }} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#7c3aed", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>🎓 Przenieś do klasy</button>
            <button onClick={() => { setShowBulk(!showBulk); setShowPromote(false); }} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#0369a1", color: "#fff", fontSize: 12, cursor: "pointer" }}>⏱ Czas sesji</button>
            <button onClick={() => setSel(new Set())} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "#374151", color: "#ccc", fontSize: 12, cursor: "pointer" }}>✕</button>
          </div>
        )}
      </div>

      {/* Bulk time setter */}
      {showBulk && sel.size > 0 && (
        <div style={{ ...S.card, padding: 16, marginBottom: 12, border: "1px solid #0369a1", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "#94a3b8", fontSize: 13 }}>Czas sesji dla {sel.size} uczniów:</span>
          <In v={bulkMins} s={setBulkMins} ph="minuty (puste=∞)" type="number" style={{ width: 160, flex: "none" }} />
          <Bt onClick={applyBulkTime} style={{ margin: 0, padding: "8px 16px", width: "auto", fontSize: 13 }}>✅ Zastosuj</Bt>
          <button onClick={() => setShowBulk(false)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#374151", color: "#ccc", cursor: "pointer", fontSize: 13 }}>Anuluj</button>
        </div>
      )}

      {/* ── NOWE: Bulk promote panel ── */}
      {showPromote && sel.size > 0 && (
        <div style={{ ...S.card, padding: 16, marginBottom: 12, border: "1px solid #7c3aed", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "#c4b5fd", fontSize: 13, fontWeight: 600 }}>🎓 Przenieś {sel.size} uczniów do klasy:</span>
          <select value={promoteTarget} onChange={e => setPromoteTarget(e.target.value)} style={{ ...S.inp, width: 160, flex: "none" }}>
            <option value="">Wybierz klasę…</option>
            {cls.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <p style={{ color: "#64748b", fontSize: 11, margin: 0, flex: "1 1 200px" }}>Loginy uczniów zostaną automatycznie zaktualizowane (np. jan_2B → jan_3C)</p>
          <Bt onClick={applyBulkPromote} style={{ margin: 0, padding: "8px 16px", width: "auto", fontSize: 13, background: "linear-gradient(135deg,#6d28d9,#7c3aed)" }} disabled={!promoteTarget}>🎓 Przenieś</Bt>
          <button onClick={() => setShowPromote(false)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#374151", color: "#ccc", cursor: "pointer", fontSize: 13 }}>Anuluj</button>
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {visible.map(u => eid === u.id
          ? <EdStud key={u.id} user={u} cls={cls} onSave={async d => { await db.upd("users", d, [eq("id", u.id)]); setEid(null); load(); sm("Zapisano."); }} onCancel={() => setEid(null)} />
          : (
            <div key={u.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 14px", borderLeft: `3px solid ${u.session_locked ? "#f59e0b" : u.active ? "#0ea5e9" : "#ef4444"}`, opacity: sel.size > 0 && !sel.has(u.id) ? 0.6 : 1 }}>
              <input type="checkbox" checked={sel.has(u.id)} onChange={() => toggleSel(u.id)} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#0ea5e9" }} />
              <div style={{ flex: 1, minWidth: 140 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</span>
                <span style={{ marginLeft: 8, fontSize: 10, background: "#1e293b", padding: "2px 7px", borderRadius: 20, color: "#7dd3fc" }}>{gc(u.class_id)}</span>
                {u.session_locked && <span style={{ marginLeft: 6, fontSize: 10, background: "#431407", padding: "2px 7px", borderRadius: 20, color: "#fb923c" }}>⌛ sesja wygasła</span>}
                <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>@{u.username}</div>
              </div>
              <span style={{ fontSize: 11, color: "#64748b" }}>{u.session_minutes ? `⏱ ${u.session_minutes}min` : "⏱ ∞"}</span>
              <span style={{ fontSize: 11, color: u.session_locked ? "#fb923c" : u.active ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                {u.session_locked ? "⌛ zablok.sesją" : u.active ? "● aktywny" : "● zablok."}
              </span>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                <Sm onClick={() => setEid(u.id)}>✏️</Sm>
                <Sm onClick={() => tog(u)} col={u.active ? "#1c1000" : "#001c0a"}>{u.active ? "🔒" : "🔓"}</Sm>
                <Sm onClick={() => ulSess(u)} col="#001c0a" title="Odblokuj sesję">🔓⌛</Sm>
                <Sm onClick={() => rm(u)} col="#1c0505">🗑️</Sm>
              </div>
            </div>
          )
        )}
        {visible.length === 0 && <Em>Brak uczniów.</Em>}
      </div>
    </div>
  );
}

function EdStud({ user, cls, onSave, onCancel }) {
  const [n, setN] = useState(user.name); const [c, setC] = useState(user.class_id || "");
  const [p, setP] = useState(user.password_hash); const [m, setM] = useState(user.session_minutes || "");
  const save = async () => {
    if (!n.trim() || !p.trim()) return;
    const cr = cls.find(x => x.id === c);
    const base = n.trim().toLowerCase().replace(/\s+/g, "") + "_" + (cr?.name || "");
    const { data: ex } = await db.get("users", [lik("username", `${base}%`)], { select: "username,id" });
    let uname = base;
    const oth = (ex || []).filter(u => u.id !== user.id);
    if (oth.length) { const ns = oth.map(u => { const mx = u.username.replace(base, ""); return mx ? parseInt(mx) || 0 : 0; }); uname = base + (Math.max(...ns) + 1); }
    onSave({ name: n.trim(), username: uname, class_id: c || null, password_hash: p, session_minutes: m ? parseInt(m) : null });
  };
  return (
    <div style={{ ...S.card, border: "2px solid #0ea5e9", padding: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10 }}>
        <div><Lb>Imię</Lb><In v={n} s={setN} /></div>
        <div><Lb>Klasa</Lb><select value={c} onChange={e => setC(e.target.value)} style={S.inp}><option value="">brak</option>{cls.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
        <div><Lb>Hasło</Lb><In v={p} s={setP} /></div>
        <div><Lb>Sesja (min)</Lb><In type="number" v={m} s={setM} ph="∞" /></div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <Bt onClick={save} style={{ flex: 1, margin: 0, padding: "9px" }}>💾 Zapisz</Bt>
        <Bt onClick={onCancel} style={{ flex: 1, margin: 0, padding: "9px", background: "#1e293b" }}>Anuluj</Bt>
      </div>
    </div>
  );
}

function TaskTab() {
  const [tasks, setTasks] = useState([]);
  const [eid, setEid] = useState(null);
  const [fil, setFil] = useState("ALL");
  const [msg, setMsg] = useState("");
  const reload = () => db.get("tasks", [], { order: "category.asc" }).then(({ data }) => setTasks(data || []));
  useEffect(() => { reload(); }, []);
  const sm = m => { setMsg(m); setTimeout(() => setMsg(""), 3000); };
  const rm = async t => { if (!confirm("Usunąć?")) return; await db.del("tasks", [eq("id", t.id)]); setTasks(p => p.filter(x => x.id !== t.id)); sm("Usunięto."); };
  const togA = async t => { await db.upd("tasks", { active: !t.active }, [eq("id", t.id)]); setTasks(p => p.map(x => x.id === t.id ? { ...x, active: !x.active } : x)); };
  const cats = ["ALL", ...new Set(tasks.map(t => t.category))].sort();
  const vi = tasks.filter(t => fil === "ALL" || t.category === fil);
  return (
    <div>
      {msg && <Ok style={{ marginBottom: 12 }}>{msg}</Ok>}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>{cats.map(c => <Pi key={c} a={fil === c} onClick={() => setFil(c)}>{c === "ALL" ? "Wszystkie" : c}</Pi>)}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {vi.map(t => eid === t.id
          ? <EdTask key={t.id} task={t} onSave={async d => { await db.upd("tasks", d, [eq("id", t.id)]); setEid(null); reload(); sm("Zaktualizowano."); }} onCancel={() => setEid(null)} />
          : (
            <div key={t.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 14px", opacity: t.active ? 1 : 0.5, borderLeft: `3px solid ${t.active ? "#0ea5e9" : "#475569"}` }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, background: "#1e293b", padding: "2px 7px", borderRadius: 20, color: "#7dd3fc" }}>{t.category}</span>
                  <span style={{ fontSize: 10, color: t.difficulty === "łatwe" ? "#22c55e" : t.difficulty === "średnie" ? "#f59e0b" : "#ef4444" }}>{t.difficulty}</span>
                  {t.image_url && <span style={{ fontSize: 10, color: "#a78bfa" }}>🖼️ obrazek</span>}
                </div>
                <p style={{ margin: "3px 0", fontWeight: 500, fontSize: 13 }}>{t.question}</p>
                <p style={{ margin: 0, color: "#22c55e", fontSize: 12 }}>Odp: <b>{t.answer}</b></p>
              </div>
              {t.image_url && <img src={t.image_url} alt="" style={{ height: 48, width: 72, objectFit: "contain", borderRadius: 6, background: "#0f172a", border: "1px solid #1e293b" }} />}
              <div style={{ display: "flex", gap: 5 }}>
                <Sm onClick={() => setEid(t.id)}>✏️</Sm>
                <Sm onClick={() => togA(t)} col={t.active ? "#1e293b" : "#001c0a"}>{t.active ? "👁️" : "👁️‍🗨️"}</Sm>
                <Sm onClick={() => rm(t)} col="#1c0505">🗑️</Sm>
              </div>
            </div>
          )
        )}
        {vi.length === 0 && <Em>Brak zadań.</Em>}
      </div>
    </div>
  );
}

function EdTask({ task, onSave, onCancel }) {
  const [q, setQ] = useState(task.question); const [a, setA] = useState(task.answer);
  const [cat, setCat] = useState(task.category); const [dif, setDif] = useState(task.difficulty);
  const [imgUrl, setImgUrl] = useState(task.image_url || "");
  const [cats, setCats] = useState([]);
  const [newCat, setNewCat] = useState("");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    db.get("categories", [], { order: "name.asc" }).then(({ data }) => {
      const list = data || [];
      setCats(list);
      if (!list.find(c => c.name === task.category)) setShowNew(true);
    });
  }, []);

  const addCat = async () => {
    if (!newCat.trim()) return;
    const { data } = await db.ins("categories", { name: newCat.trim() });
    setCats(p => [...p, ...(data || [])].sort((a, b) => a.name.localeCompare(b.name)));
    setCat(newCat.trim()); setNewCat(""); setShowNew(false);
  };

  return (
    <div style={{ ...S.card, border: "2px solid #0ea5e9", padding: 16 }}>
      <Lb>Treść</Lb>
      <textarea value={q} onChange={e => setQ(e.target.value)} style={{ ...S.inp, height: 60, resize: "vertical" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10, marginTop: 10 }}>
        <div><Lb>Odpowiedź</Lb><In v={a} s={setA} /></div>
        <div>
          <Lb>Kategoria</Lb>
          {showNew ? (
            <div style={{ display: "flex", gap: 4 }}>
              <In v={newCat} s={setNewCat} ph="nowa kategoria" oe={addCat} style={{ flex: 1 }} />
              <button onClick={addCat} style={{ padding: "4px 8px", background: "#0369a1", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 12 }}>+</button>
              <button onClick={() => setShowNew(false)} style={{ padding: "4px 7px", background: "#374151", border: "none", borderRadius: 6, color: "#ccc", cursor: "pointer", fontSize: 12 }}>✕</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 4 }}>
              <select value={cat} onChange={e => setCat(e.target.value)} style={{ ...S.inp, flex: 1 }}>
                <option value="">Wybierz…</option>
                {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <button onClick={() => setShowNew(true)} title="Dodaj nową" style={{ padding: "4px 8px", background: "#0369a1", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 14 }}>+</button>
            </div>
          )}
        </div>
        <div><Lb>Trudność</Lb><select value={dif} onChange={e => setDif(e.target.value)} style={S.inp}><option value="łatwe">łatwe</option><option value="średnie">średnie</option><option value="trudne">trudne</option></select></div>
      </div>
      <div style={{ marginTop: 12 }}>
        <Lb>Obrazek (opcjonalnie)</Lb>
        <ImageUploadCrop imgUrl={imgUrl} setImgUrl={setImgUrl} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Bt onClick={() => onSave({ question: q, answer: a, category: cat || "Różne", difficulty: dif, image_url: imgUrl || null })} style={{ flex: 1, margin: 0, padding: "9px" }}>💾 Zapisz</Bt>
        <Bt onClick={onCancel} style={{ flex: 1, margin: 0, padding: "9px", background: "#1e293b" }}>Anuluj</Bt>
      </div>
    </div>
  );
}

function StatTab() {
  const [stats, setStats] = useState([]);
  const [det, setDet] = useState(null);
  const [hist, setHist] = useState([]);
  const [ld, setLd] = useState(true);
  const [fil, setFil] = useState("ALL");
  const [exporting, setExporting] = useState(false);

  const loadStats = () => db.get("student_stats", [], { order: "class.asc" }).then(({ data }) => { setStats(data || []); setLd(false); });
  useEffect(() => { loadStats(); }, []);

  const showH = async u => {
    setDet(u);
    const { data } = await db.get("answers", [eq("user_id", u.user_id)], { order: "answered_at.desc", limit: 200 });
    const rows = data || []; const tm = {};
    for (const tid of [...new Set(rows.map(a => a.task_id))]) {
      const { data: t } = await db.get("tasks", [eq("id", tid)], { limit: 1, select: "id,question,answer,category" });
      if (t?.[0]) tm[tid] = t[0];
    }
    setHist(rows.map(a => ({ ...a, task: tm[a.task_id] })));
  };

  // Export SINGLE student to Excel
  const exportStudent = (u, histRows) => {
    const rows = histRows.map(h => ({
      "Imię": u.name,
      "Klasa": u.class || "–",
      "Login": u.username,
      "Kategoria": h.task?.category || "–",
      "Pytanie": h.task?.question || h.task_id,
      "Poprawna odpowiedź": h.task?.answer || "–",
      "Odpowiedź ucznia": h.given_answer,
      "Wynik": h.correct ? "TAK" : "NIE",
      "Próba nr": h.attempt_no || "–",
      "Data": new Date(h.answered_at).toLocaleString("pl-PL"),
    }));
    if (!rows.length) { alert("Brak danych do eksportu."); return; }
    exportToExcel(rows, `statystyki_${u.name}_${new Date().toLocaleDateString("pl-PL").replace(/\./g, "-")}`);
  };

  // Export ALL students (class or all) to Excel
  const exportAll = async () => {
    setExporting(true);
    const visible = stats.filter(s => fil === "ALL" || (s.class || "–") === fil);
    const rows = [];
    for (const s of visible) {
      const { data: ans } = await db.get("answers", [eq("user_id", s.user_id)], { order: "answered_at.asc", limit: 500 });
      const taskIds = [...new Set((ans || []).map(a => a.task_id))];
      const tm = {};
      for (const tid of taskIds) {
        const { data: t } = await db.get("tasks", [eq("id", tid)], { limit: 1, select: "id,question,answer,category" });
        if (t?.[0]) tm[tid] = t[0];
      }
      (ans || []).forEach(h => {
        rows.push({
          "Imię": s.name,
          "Klasa": s.class || "–",
          "Login": s.username,
          "Kategoria": tm[h.task_id]?.category || "–",
          "Pytanie": tm[h.task_id]?.question || h.task_id,
          "Poprawna odpowiedź": tm[h.task_id]?.answer || "–",
          "Odpowiedź ucznia": h.given_answer,
          "Wynik": h.correct ? "TAK" : "NIE",
          "Próba nr": h.attempt_no || "–",
          "Data": new Date(h.answered_at).toLocaleString("pl-PL"),
        });
      });
    }
    setExporting(false);
    if (!rows.length) { alert("Brak danych do eksportu."); return; }
    const label = fil === "ALL" ? "wszyscy" : fil;
    exportToExcel(rows, `statystyki_${label}_${new Date().toLocaleDateString("pl-PL").replace(/\./g, "-")}`);
  };

  // Export summary (one row per student)
  const exportSummary = () => {
    const visible = stats.filter(s => fil === "ALL" || (s.class || "–") === fil);
    const rows = visible.map(s => ({
      "Imię": s.name,
      "Klasa": s.class || "–",
      "Login": s.username,
      "Rozwiązane zadania": s.tasks_solved,
      "Poprawne odpowiedzi": s.correct_answers,
      "Łącznie prób": s.total_attempts,
      "Skuteczność %": s.accuracy_pct || 0,
    }));
    if (!rows.length) { alert("Brak danych."); return; }
    const label = fil === "ALL" ? "wszyscy" : fil;
    exportToExcel(rows, `podsumowanie_${label}_${new Date().toLocaleDateString("pl-PL").replace(/\./g, "-")}`);
  };

  if (ld) return <Spin text="Ładowanie…" />;

  if (det) return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => { setDet(null); setHist([]); }} style={{ ...S.gh, fontSize: 12 }}>← Wróć</button>
        <button onClick={() => exportStudent(det, hist)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #16a34a", background: "#052e16", color: "#4ade80", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
          📥 Eksport Excel
        </button>
      </div>
      <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>{det.name} <span style={{ color: "#64748b", fontSize: 13 }}>@{det.username}</span></h2>
      <p style={{ color: "#475569", fontSize: 12, marginBottom: 16 }}>Klasa {det.class || "–"}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(100px,1fr))", gap: 10, marginBottom: 20 }}>
        {[["Rozwiązane", det.tasks_solved, "#22c55e"], ["Poprawne", det.correct_answers, "#38bdf8"], ["Prób", det.total_attempts, "#a78bfa"], ["Skuteczność", `${det.accuracy_pct || 0}%`, "#f59e0b"]].map(([l, v, c]) => (
          <div key={l} style={{ ...S.card, textAlign: "center", padding: 12 }}><div style={{ fontSize: 22, fontWeight: 800, color: c }}>{v}</div><div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{l}</div></div>
        ))}
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {hist.map(h => (
          <div key={h.id} style={{ ...S.card, padding: "10px 14px", display: "flex", gap: 10, alignItems: "center", borderLeft: `3px solid ${h.correct ? "#22c55e" : "#ef4444"}` }}>
            <span>{h.correct ? "✅" : "❌"}</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>{h.task?.question || h.task_id}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#475569" }}>Odp: <b style={{ color: h.correct ? "#22c55e" : "#ef4444" }}>{h.given_answer}</b> · {h.task?.category}</p>
            </div>
            <span style={{ fontSize: 10, color: "#475569", whiteSpace: "nowrap" }}>{new Date(h.answered_at).toLocaleString("pl-PL")}</span>
          </div>
        ))}
        {!hist.length && <Em>Brak historii.</Em>}
      </div>
    </div>
  );

  const ac = ["ALL", ...new Set(stats.map(s => s.class || "–"))].sort();
  const vi = stats.filter(s => fil === "ALL" || (s.class || "–") === fil);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ac.map(c => <Pi key={c} a={fil === c} onClick={() => setFil(c)}>{c === "ALL" ? "Wszystkie" : c}</Pi>)}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={exportSummary} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #0369a1", background: "#0c1a2e", color: "#38bdf8", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
            📊 Podsumowanie Excel
          </button>
          <button onClick={exportAll} disabled={exporting} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #16a34a", background: "#052e16", color: "#4ade80", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
            {exporting ? "⏳ Eksport…" : "📥 Szczegóły Excel"}
          </button>
        </div>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {vi.map(s => (
          <div key={s.user_id} style={{ ...S.card, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", cursor: "pointer" }} onClick={() => showH(s)}>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</span>
              <span style={{ marginLeft: 8, fontSize: 10, background: "#1e293b", padding: "2px 7px", borderRadius: 20, color: "#7dd3fc" }}>{s.class || "–"}</span>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>@{s.username}</div>
            </div>
            {[[`✅ ${s.tasks_solved}`, "#22c55e"], [`🎯 ${s.accuracy_pct || 0}%`, "#f59e0b"], [`📝 ${s.total_attempts}`, "#64748b"]].map(([t, c]) => <span key={t} style={{ fontSize: 12, color: c, fontWeight: 600 }}>{t}</span>)}
            <span style={{ color: "#334155", fontSize: 12 }}>→</span>
          </div>
        ))}
        {vi.length === 0 && <Em>Brak danych.</Em>}
      </div>
    </div>
  );
}

function AddStud() {
  const [n, setN] = useState(""); const [c, setC] = useState(""); const [p, setP] = useState(""); const [m, setM] = useState("45");
  const [cls, setCls] = useState([]); const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  useEffect(() => { db.get("classes", [], { order: "name.asc" }).then(({ data }) => setCls(data || [])); }, []);
  const add = async () => {
    if (!n.trim() || !c || !p.trim()) { setErr("Wypełnij wszystkie pola."); return; }
    if (p.length < 4) { setErr("Hasło min 4 znaki."); return; } setErr("");
    const cr = cls.find(x => x.id === c);
    const base = n.trim().toLowerCase().replace(/\s+/g, "") + "_" + cr.name;
    const { data: ex } = await db.get("users", [lik("username", `${base}%`)], { select: "username" });
    let uname = base;
    if (ex?.length) { const ns = ex.map(u => { const mx = u.username.replace(base, ""); return mx ? parseInt(mx) || 0 : 0; }); uname = base + (Math.max(...ns) + 1); }
    const { error } = await db.ins("users", { username: uname, name: n.trim(), password_hash: p, role: "student", class_id: c, active: true, session_minutes: m ? parseInt(m) : null, session_locked: false });
    if (error) { setErr("Błąd: " + JSON.stringify(error)); return; }
    setMsg(`✅ Dodano: ${uname}`); setN(""); setC(""); setP(""); setM("45");
    setTimeout(() => setMsg(""), 4000);
  };
  return (
    <div style={{ ...S.card, maxWidth: 480, padding: 24 }}>
      <h2 style={{ margin: "0 0 18px", fontSize: 17 }}>➕ Dodaj ucznia</h2>
      {msg && <Ok style={{ marginBottom: 14 }}>{msg}</Ok>}
      <Lb>Imię</Lb><In v={n} s={setN} ph="np. Jan" />
      <Lb style={{ marginTop: 12 }}>Klasa</Lb>
      <select value={c} onChange={e => setC(e.target.value)} style={S.inp}><option value="">Wybierz klasę…</option>{cls.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <p style={{ margin: "3px 0 0", fontSize: 10, color: "#475569" }}>Login: {n && c ? `${n.toLowerCase().replace(/\s+/g, "")}_${cls.find(x => x.id === c)?.name || ""}` : "–"}</p>
      <Lb style={{ marginTop: 12 }}>Hasło</Lb><In v={p} s={setP} ph="min. 4 znaki" />
      <Lb style={{ marginTop: 12 }}>Czas sesji (min, puste = bez limitu)</Lb><In type="number" v={m} s={setM} />
      {err && <Eb>{err}</Eb>}
      <Bt onClick={add} style={{ marginTop: 18 }}>✅ Dodaj ucznia</Bt>
    </div>
  );
}

function AddTask() {
  const [mode, setMode] = useState("s");
  const [q, setQ] = useState(""); const [a, setA] = useState(""); const [cat, setCat] = useState(""); const [dif, setDif] = useState("łatwe");
  const [imgUrl, setImgUrl] = useState("");
  const [cats, setCats] = useState([]);
  const [newCat, setNewCat] = useState(""); const [showNew, setShowNew] = useState(false);
  const [bk, setBk] = useState(""); const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const sm = m => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  useEffect(() => {
    db.get("categories", [], { order: "name.asc" }).then(({ data }) => setCats(data || []));
  }, []);

  const addCat = async () => {
    if (!newCat.trim()) return;
    const { data } = await db.ins("categories", { name: newCat.trim() });
    const updated = [...cats, ...(data || [])].sort((a, b) => a.name.localeCompare(b.name));
    setCats(updated); setCat(newCat.trim()); setNewCat(""); setShowNew(false);
  };

  const addS = async () => {
    if (!q.trim() || !a.trim()) { setErr("Treść i odpowiedź wymagane."); return; }
    const finalCat = cat || "Różne";
    // Upewnij się, że kategoria istnieje w tabeli
    if (!cats.find(c => c.name === finalCat)) {
      await db.ins("categories", { name: finalCat });
    }
    const { error } = await db.ins("tasks", { question: q.trim(), answer: a.trim(), category: finalCat, difficulty: dif, active: true, image_url: imgUrl || null });
    if (error) { setErr("Błąd: " + JSON.stringify(error)); return; }
    setErr(""); setQ(""); setA(""); setCat(""); setDif("łatwe"); setImgUrl(""); sm("✅ Zadanie dodane!");
  };

  const addB = async () => {
    const lines = bk.split("\n").filter(l => l.trim());
    const rows = []; const errs = [];
    lines.forEach((l, i) => {
      const p = l.split("|").map(x => x.trim());
      if (p.length < 2) { errs.push(`L${i + 1}`); return; }
      rows.push({ question: p[0], answer: p[1], category: p[2] || "Różne", difficulty: p[3] || "łatwe", active: true, image_url: null });
    });
    if (errs.length) { setErr("Błędne linie: " + errs.join(", ")); return; }
    // Sync new categories
    const newCats = [...new Set(rows.map(r => r.category))].filter(n => !cats.find(c => c.name === n));
    for (const name of newCats) await db.ins("categories", { name });
    if (newCats.length) db.get("categories", [], { order: "name.asc" }).then(({ data }) => setCats(data || []));
    const { error } = await db.ins("tasks", rows);
    if (error) { setErr("Błąd: " + JSON.stringify(error)); return; }
    setErr(""); setBk(""); sm(`✅ Dodano ${rows.length} zadań!`);
  };

  return (
    <div style={{ ...S.card, maxWidth: 600, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>➕ Dodaj zadanie</h2>
        <div style={{ display: "flex", gap: 5 }}>
          {[["s", "Pojedyncze"], ["b", "Masowe"]].map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: mode === k ? "#0369a1" : "#1e293b", color: mode === k ? "#fff" : "#64748b" }}>{l}</button>
          ))}
        </div>
      </div>
      {msg && <Ok style={{ marginBottom: 14 }}>{msg}</Ok>}
      {mode === "s" ? (<>
        <Lb>Treść zadania</Lb>
        <textarea value={q} onChange={e => setQ(e.target.value)} placeholder="np. Ile to 5 × 7?" style={{ ...S.inp, height: 68, resize: "vertical" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10, marginTop: 10 }}>
          <div><Lb>Odpowiedź</Lb><In v={a} s={setA} ph="np. 35" /></div>
          <div>
            <Lb>Kategoria</Lb>
            {showNew ? (
              <div style={{ display: "flex", gap: 4 }}>
                <In v={newCat} s={setNewCat} ph="nowa nazwa" oe={addCat} style={{ flex: 1 }} />
                <button onClick={addCat} style={{ padding: "4px 8px", background: "#0369a1", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 12 }}>+</button>
                <button onClick={() => setShowNew(false)} style={{ padding: "4px 7px", background: "#374151", border: "none", borderRadius: 6, color: "#ccc", cursor: "pointer", fontSize: 12 }}>✕</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 4 }}>
                <select value={cat} onChange={e => setCat(e.target.value)} style={{ ...S.inp, flex: 1 }}>
                  <option value="">Wybierz…</option>
                  {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <button onClick={() => setShowNew(true)} title="Dodaj nową kategorię" style={{ padding: "4px 10px", background: "#0369a1", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>+</button>
              </div>
            )}
          </div>
          <div><Lb>Trudność</Lb><select value={dif} onChange={e => setDif(e.target.value)} style={S.inp}><option value="łatwe">łatwe</option><option value="średnie">średnie</option><option value="trudne">trudne</option></select></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Lb>Obrazek (opcjonalnie)</Lb>
          <ImageUploadCrop imgUrl={imgUrl} setImgUrl={setImgUrl} />
        </div>
        {err && <Eb>{err}</Eb>}
        <Bt onClick={addS} style={{ marginTop: 14 }}>✅ Dodaj zadanie</Bt>
      </>) : (<>
        <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 4px" }}>Format: <code style={{ background: "#1e293b", padding: "2px 5px", borderRadius: 4 }}>pytanie | odpowiedź | kategoria | trudność</code></p>
        <p style={{ color: "#475569", fontSize: 11, margin: "0 0 8px" }}>Nowe kategorie zostaną automatycznie dodane do listy.</p>
        <textarea value={bk} onChange={e => setBk(e.target.value)} placeholder={"Ile to 5 × 7? | 35 | Mnożenie | łatwe\nIle to √25? | 5 | Pierwiastki | łatwe"} style={{ ...S.inp, height: 140, resize: "vertical", fontFamily: "monospace", fontSize: 12 }} />
        {err && <Eb>{err}</Eb>}
        <Bt onClick={addB} style={{ marginTop: 10 }}>✅ Dodaj wszystkie</Bt>
      </>)}
    </div>
  );
}

// ── Przydziały kategorii dla klas/uczniów ───────────────────────
// Stores assignments in a table: category_assignments (id, target_type='class'|'user', target_id, category_name)
// Student sees only tasks whose category is in their assignment list (or all if no assignments set)

function AssignTab() {
  const [mode, setMode] = useState("class"); // "class" | "user"
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [cats, setCats] = useState([]);
  const [assignments, setAssignments] = useState([]); // { id, target_type, target_id, category_name }
  const [selTarget, setSelTarget] = useState("");
  const [msg, setMsg] = useState("");
  const sm = m => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const load = async () => {
    const [{ data: cl }, { data: us }, { data: ca }, { data: as }] = await Promise.all([
      db.get("classes", [], { order: "name.asc" }),
      db.get("users", [eq("role", "student")], { order: "name.asc", select: "id,name,class_id,username" }),
      db.get("categories", [], { order: "name.asc" }),
      db.get("category_assignments", [], {}),
    ]);
    setClasses(cl || []); setUsers(us || []); setCats(ca || []); setAssignments(as || []);
  };
  useEffect(() => { load(); }, []);

  const gc = id => classes.find(c => c.id === id)?.name || "–";

  const targetAssignments = selTarget
    ? assignments.filter(a => a.target_type === mode && a.target_id === selTarget)
    : [];
  const assignedCats = new Set(targetAssignments.map(a => a.category_name));

  const toggle = async (catName) => {
    if (!selTarget) return;
    if (assignedCats.has(catName)) {
      // Remove
      const ex = targetAssignments.find(a => a.category_name === catName);
      if (ex) {
        await db.del("category_assignments", [eq("id", ex.id)]);
        setAssignments(p => p.filter(a => a.id !== ex.id));
      }
    } else {
      // Add
      const { data } = await db.ins("category_assignments", { target_type: mode, target_id: selTarget, category_name: catName });
      if (data?.[0]) setAssignments(p => [...p, data[0]]);
    }
  };

  const selectAll = async () => {
    if (!selTarget) return;
    for (const c of cats) {
      if (!assignedCats.has(c.name)) {
        const { data } = await db.ins("category_assignments", { target_type: mode, target_id: selTarget, category_name: c.name });
        if (data?.[0]) setAssignments(p => [...p, data[0]]);
      }
    }
    sm("✅ Przydzielono wszystkie kategorie.");
  };

  const clearAll = async () => {
    if (!selTarget) return;
    for (const a of targetAssignments) await db.del("category_assignments", [eq("id", a.id)]);
    setAssignments(p => p.filter(a => !(a.target_type === mode && a.target_id === selTarget)));
    sm("🗑️ Usunięto wszystkie przydziały – uczeń/klasa widzi wszystkie tematy.");
  };

  // Show which categories a class has in summary
  const classSummary = (clsId) => {
    const as = assignments.filter(a => a.target_type === "class" && a.target_id === clsId);
    if (!as.length) return <span style={{ color: "#475569", fontSize: 11 }}>wszystkie (brak przydziału)</span>;
    return <span style={{ color: "#7dd3fc", fontSize: 11 }}>{as.map(a => a.category_name).join(", ")}</span>;
  };

  const userSummary = (uid) => {
    const as = assignments.filter(a => a.target_type === "user" && a.target_id === uid);
    if (!as.length) {
      // Check if class has assignment
      const u = users.find(x => x.id === uid);
      const clsAs = u ? assignments.filter(a => a.target_type === "class" && a.target_id === u.class_id) : [];
      if (clsAs.length) return <span style={{ color: "#a78bfa", fontSize: 11 }}>z klasy: {clsAs.map(a => a.category_name).join(", ")}</span>;
      return <span style={{ color: "#475569", fontSize: 11 }}>wszystkie</span>;
    }
    return <span style={{ color: "#7dd3fc", fontSize: 11 }}>{as.map(a => a.category_name).join(", ")}</span>;
  };

  const targets = mode === "class" ? classes : users;

  return (
    <div>
      <div style={{ ...S.card, padding: 16, marginBottom: 14, border: "1px solid #334155" }}>
        <p style={{ color: "#94a3b8", fontSize: 12, margin: "0 0 10px" }}>
          Przydziel konkretne kategorie zadań klasie lub pojedynczemu uczniowi. Jeśli brak przydziału – uczeń widzi <b>wszystkie</b> kategorie. Przydzielenie uczniowi nadpisuje przydział klasy.
        </p>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {[["class", "🏫 Dla klasy"], ["user", "👤 Dla ucznia"]].map(([k, l]) => (
            <button key={k} onClick={() => { setMode(k); setSelTarget(""); }} style={{ padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: mode === k ? "#0369a1" : "#1e293b", color: mode === k ? "#fff" : "#64748b" }}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 200px" }}>
            <Lb>Wybierz {mode === "class" ? "klasę" : "ucznia"}</Lb>
            <select value={selTarget} onChange={e => setSelTarget(e.target.value)} style={S.inp}>
              <option value="">Wybierz…</option>
              {targets.map(t => <option key={t.id} value={t.id}>{mode === "class" ? t.name : `${t.name} (${gc(t.class_id)})`}</option>)}
            </select>
          </div>
          {selTarget && (
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Lb>Kategorie ({assignedCats.size === 0 ? "wszystkie" : `${assignedCats.size} wybranych`})</Lb>
                <div style={{ display: "flex", gap: 5 }}>
                  <button onClick={selectAll} style={{ padding: "3px 9px", borderRadius: 5, border: "1px solid #334155", background: "#1e293b", color: "#7dd3fc", fontSize: 11, cursor: "pointer" }}>Zaznacz wszystko</button>
                  <button onClick={clearAll} style={{ padding: "3px 9px", borderRadius: 5, border: "1px solid #334155", background: "#1e293b", color: "#f87171", fontSize: 11, cursor: "pointer" }}>Wyczyść</button>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {cats.map(c => {
                  const on = assignedCats.has(c.name);
                  return (
                    <button key={c.id} onClick={() => toggle(c.name)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${on ? "#0ea5e9" : "#334155"}`, background: on ? "#0c2a3a" : "#1e293b", color: on ? "#38bdf8" : "#64748b", fontSize: 12, cursor: "pointer", fontWeight: on ? 700 : 400, transition: "all .15s" }}>
                      {on ? "✓ " : ""}{c.name}
                    </button>
                  );
                })}
                {!cats.length && <span style={{ color: "#475569", fontSize: 12 }}>Brak kategorii – dodaj je w zakładce "Kategorie".</span>}
              </div>
              {assignedCats.size === 0 && <p style={{ color: "#475569", fontSize: 11, marginTop: 8 }}>⚠️ Brak przydziału = widoczne wszystkie kategorie.</p>}
            </div>
          )}
        </div>
        {msg && <Ok style={{ marginTop: 10 }}>{msg}</Ok>}
      </div>

      {/* Summary list */}
      <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#94a3b8" }}>{mode === "class" ? "Przegląd klas" : "Przegląd uczniów"}</h3>
      <div style={{ display: "grid", gap: 7 }}>
        {mode === "class"
          ? classes.map(c => (
            <div key={c.id} onClick={() => setSelTarget(c.id)} style={{ ...S.card, padding: "10px 14px", cursor: "pointer", borderLeft: `3px solid ${assignments.some(a => a.target_type === "class" && a.target_id === c.id) ? "#0ea5e9" : "#334155"}` }}>
              <span style={{ fontWeight: 700, fontSize: 13, marginRight: 10 }}>{c.name}</span>{classSummary(c.id)}
            </div>
          ))
          : users.map(u => (
            <div key={u.id} onClick={() => setSelTarget(u.id)} style={{ ...S.card, padding: "10px 14px", cursor: "pointer", borderLeft: `3px solid ${assignments.some(a => a.target_type === "user" && a.target_id === u.id) ? "#0ea5e9" : "#334155"}` }}>
              <span style={{ fontWeight: 700, fontSize: 13, marginRight: 6 }}>{u.name}</span>
              <span style={{ fontSize: 10, background: "#1e293b", padding: "2px 7px", borderRadius: 20, color: "#7dd3fc", marginRight: 8 }}>{gc(u.class_id)}</span>
              {userSummary(u.id)}
            </div>
          ))
        }
        {!targets.length && <Em>Brak {mode === "class" ? "klas" : "uczniów"}.</Em>}
      </div>
    </div>
  );
}

// ── Zarządzanie kategoriami ──────────────────────────────────────
function CatTab() {
  const [cats, setCats] = useState([]); const [n, setN] = useState(""); const [msg, setMsg] = useState("");
  const [editId, setEditId] = useState(null); const [editName, setEditName] = useState("");
  const load = () => db.get("categories", [], { order: "name.asc" }).then(({ data }) => setCats(data || []));
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!n.trim()) return;
    const { error } = await db.ins("categories", { name: n.trim() });
    if (error) { setMsg("Błąd: " + JSON.stringify(error)); return; }
    setN(""); load(); setMsg("✅ Dodano."); setTimeout(() => setMsg(""), 3000);
  };
  const save = async (id) => {
    if (!editName.trim()) return;
    // Update category name in tasks too
    await db.upd("categories", { name: editName.trim() }, [eq("id", id)]);
    const old = cats.find(c => c.id === id)?.name;
    if (old) await db.upd("tasks", { category: editName.trim() }, [eq("category", old)]);
    setEditId(null); load(); setMsg("✅ Zapisano."); setTimeout(() => setMsg(""), 3000);
  };
  const rm = async c => {
    if (!confirm(`Usunąć kategorię "${c.name}"?\nZadania z tą kategorią dostaną kategorię "Różne".`)) return;
    await db.upd("tasks", { category: "Różne" }, [eq("category", c.name)]);
    await db.del("categories", [eq("id", c.id)]);
    load(); setMsg("Usunięto."); setTimeout(() => setMsg(""), 3000);
  };
  // Default categories to seed
  const defaults = ["Dodawanie", "Odejmowanie", "Mnożenie", "Dzielenie", "Ułamki", "Procenty", "Pierwiastki", "Potęgi", "Geometria", "Równania", "Różne"];
  const seedDefaults = async () => {
    const existing = cats.map(c => c.name);
    const toAdd = defaults.filter(d => !existing.includes(d));
    if (!toAdd.length) { setMsg("Wszystkie domyślne kategorie już istnieją."); setTimeout(() => setMsg(""), 3000); return; }
    for (const name of toAdd) await db.ins("categories", { name });
    load(); setMsg(`✅ Dodano ${toAdd.length} kategorii.`); setTimeout(() => setMsg(""), 3000);
  };

  return (
    <div style={{ maxWidth: 480 }}>
      {msg && <Ok style={{ marginBottom: 12 }}>{msg}</Ok>}
      <div style={{ ...S.card, padding: 18, marginBottom: 12 }}>
        <Lb>Nowa kategoria</Lb>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <In v={n} s={setN} ph="np. Mnożenie" oe={add} style={{ flex: 1 }} />
          <Bt onClick={add} style={{ margin: 0, padding: "10px 16px", width: "auto" }}>Dodaj</Bt>
        </div>
        <button onClick={seedDefaults} style={{ marginTop: 10, padding: "7px 14px", borderRadius: 7, border: "1px dashed #334155", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 12, width: "100%" }}>
          📋 Załaduj domyślne kategorie matematyczne
        </button>
      </div>
      <div style={{ display: "grid", gap: 7 }}>
        {cats.map(c => (
          <div key={c.id} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", gap: 8 }}>
            {editId === c.id ? (
              <>
                <In v={editName} s={setEditName} oe={() => save(c.id)} style={{ flex: 1 }} />
                <Sm onClick={() => save(c.id)} col="#001c0a">💾</Sm>
                <Sm onClick={() => setEditId(null)}>✕</Sm>
              </>
            ) : (
              <>
                <span style={{ fontWeight: 600, fontSize: 14, color: "#e2e8f0" }}>{c.name}</span>
                <div style={{ display: "flex", gap: 5 }}>
                  <Sm onClick={() => { setEditId(c.id); setEditName(c.name); }}>✏️</Sm>
                  <Sm onClick={() => rm(c)} col="#1c0505">🗑️</Sm>
                </div>
              </>
            )}
          </div>
        ))}
        {cats.length === 0 && <Em>Brak kategorii. Dodaj pierwszą lub załaduj domyślne.</Em>}
      </div>
    </div>
  );
}

function ClsTab() {
  const [cls, setCls] = useState([]);
  const [counts, setCounts] = useState({});
  const [n, setN] = useState("");
  const [msg, setMsg] = useState("");
  const [delConfirm, setDelConfirm] = useState(null); // class object awaiting confirm

  const load = async () => {
    const { data } = await db.get("classes", [], { order: "name.asc" });
    setCls(data || []);
    // Load student counts per class
    const { data: users } = await db.get("users", [eq("role", "student")], { select: "class_id" });
    const cnt = {};
    (users || []).forEach(u => { if (u.class_id) cnt[u.class_id] = (cnt[u.class_id] || 0) + 1; });
    setCounts(cnt);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!n.trim()) return;
    const { error } = await db.ins("classes", { name: n.trim().toUpperCase() });
    if (error) { setMsg("Błąd: " + JSON.stringify(error)); return; }
    setN(""); load(); setMsg("✅ Dodano."); setTimeout(() => setMsg(""), 3000);
  };

  // Step 1: ask what to do
  const askDelete = (c) => setDelConfirm(c);

  // Step 2a: delete class + all students in it
  const rmWithStudents = async () => {
    const c = delConfirm;
    // Get students in class
    const { data: studs } = await db.get("users", [eq("class_id", c.id)], { select: "id" });
    for (const s of (studs || [])) {
      await db.del("sessions", [eq("user_id", s.id)]);
      await db.del("answers", [eq("user_id", s.id)]);
      await db.del("users", [eq("id", s.id)]);
    }
    await db.del("classes", [eq("id", c.id)]);
    setDelConfirm(null); load();
    setMsg(`🗑️ Usunięto klasę ${c.name} i ${studs?.length || 0} uczniów.`);
    setTimeout(() => setMsg(""), 4000);
  };

  // Step 2b: delete class only, unassign students
  const rmClassOnly = async () => {
    const c = delConfirm;
    await db.upd("users", { class_id: null }, [eq("class_id", c.id)]);
    await db.del("classes", [eq("id", c.id)]);
    setDelConfirm(null); load();
    setMsg(`🗑️ Usunięto klasę ${c.name}. Uczniowie pozostali bez klasy.`);
    setTimeout(() => setMsg(""), 4000);
  };

  return (
    <div style={{ maxWidth: 480 }}>
      {msg && <Ok style={{ marginBottom: 12 }}>{msg}</Ok>}

      {/* Delete confirmation dialog */}
      {delConfirm && (
        <div style={{ ...S.card, padding: 20, marginBottom: 16, border: "2px solid #ef4444" }}>
          <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#f87171", fontSize: 15 }}>🗑️ Usunąć klasę <span style={{ color: "#fff" }}>{delConfirm.name}</span>?</p>
          <p style={{ margin: "0 0 14px", color: "#64748b", fontSize: 12 }}>
            W tej klasie jest <b style={{ color: "#f59e0b" }}>{counts[delConfirm.id] || 0}</b> uczniów. Co zrobić z ich kontami?
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={rmWithStudents} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ef4444", background: "#1c0505", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left" }}>
              🗑️ Usuń klasę <b>i wszystkich uczniów</b> z niej
            </button>
            <button onClick={rmClassOnly} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #f59e0b", background: "#1c1200", color: "#fbbf24", cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left" }}>
              📂 Usuń tylko klasę – uczniowie pozostają bez klasy
            </button>
            <button onClick={() => setDelConfirm(null)} style={{ padding: "9px", borderRadius: 8, border: "none", background: "#1e293b", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>
              Anuluj
            </button>
          </div>
        </div>
      )}

      <div style={{ ...S.card, padding: 18, marginBottom: 12 }}>
        <Lb>Nowa klasa</Lb>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <In v={n} s={setN} ph="np. 4C" oe={add} style={{ flex: 1 }} />
          <Bt onClick={add} style={{ margin: 0, padding: "10px 16px", width: "auto" }}>Dodaj</Bt>
        </div>
      </div>
      <div style={{ display: "grid", gap: 7 }}>
        {cls.map(c => (
          <div key={c.id} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px" }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</span>
              <span style={{ marginLeft: 10, fontSize: 11, color: "#475569" }}>{counts[c.id] || 0} uczniów</span>
            </div>
            <Sm onClick={() => askDelete(c)} col="#1c0505">🗑️ Usuń</Sm>
          </div>
        ))}
        {cls.length === 0 && <Em>Brak klas.</Em>}
      </div>
    </div>
  );
}

// ── Primitives ───────────────────────────────────────────────────
function In({ v, s, ph, type = "text", disabled, oe, style = {} }) {
  return <input type={type} value={v} disabled={disabled} placeholder={ph} onChange={e => s(e.target.value)} onKeyDown={e => e.key === "Enter" && oe && oe()} style={{ ...S.inp, ...style }} />;
}
function Lb({ children, style = {} }) { return <label style={{ display: "block", marginBottom: 4, color: "#94a3b8", fontSize: 12, ...style }}>{children}</label>; }
function Bt({ children, onClick, loading, style = {} }) {
  return <button onClick={onClick} disabled={loading} style={{ display: "block", width: "100%", padding: "11px", margin: 0, background: "linear-gradient(135deg,#0369a1,#0ea5e9)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", ...style }}>{loading ? "Ładowanie…" : children}</button>;
}
function Sm({ children, onClick, col = "#1e293b", title }) {
  return <button onClick={onClick} title={title} style={{ padding: "5px 10px", background: col, border: "1px solid #334155", borderRadius: 6, color: "#cbd5e1", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>{children}</button>;
}
function Pi({ children, a, onClick }) {
  return <button onClick={onClick} style={{ padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, background: a ? "#0ea5e9" : "#1e293b", color: a ? "#fff" : "#64748b" }}>{children}</button>;
}
function Eb({ children }) { return <div style={{ marginTop: 8, padding: "8px 12px", background: "#1c0505", border: "1px solid #dc2626", borderRadius: 8, color: "#f87171", fontSize: 12 }}>{children}</div>; }
function Ok({ children, style = {} }) { return <div style={{ padding: "8px 12px", background: "#052e16", border: "1px solid #16a34a", borderRadius: 8, color: "#4ade80", fontSize: 12, ...style }}>{children}</div>; }
function Spin({ text }) { return <div style={S.cx}><div style={{ textAlign: "center", color: "#475569" }}><p style={{ fontSize: 28 }}>⚙️</p><p style={{ fontSize: 13 }}>{text}</p></div></div>; }
function Em({ children }) { return <div style={{ textAlign: "center", padding: "32px", color: "#475569", fontSize: 13 }}>{children}</div>; }
function BgGrid() { return <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", backgroundImage: "linear-gradient(#1e293b22 1px,transparent 1px),linear-gradient(90deg,#1e293b22 1px,transparent 1px)", backgroundSize: "40px 40px" }} />; }

const S = {
  root: { minHeight: "100vh", background: "#020817", fontFamily: "'Segoe UI',system-ui,sans-serif", color: "#e2e8f0", position: "relative" },
  cx: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 16 },
  card: { background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", position: "relative", zIndex: 1 },
  inp: { width: "100%", background: "#020817", border: "1px solid #1e293b", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box", display: "block" },
  gr: { background: "linear-gradient(135deg,#38bdf8,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  gh: { background: "#0f172a", border: "1px solid #1e293b", color: "#94a3b8", padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12 },
};
