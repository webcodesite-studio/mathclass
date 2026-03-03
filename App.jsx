import React, { useState, useEffect, useRef } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// ============ API FUNCTIONS ============
const api = {
  async request(method, endpoint, body = null) {
    const opts = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body) opts.body = JSON.stringify(body);
    
    const res = await fetch(`${API_URL}${endpoint}`, opts);
    if (!res.ok) {
      const err = await res.json();
      return { data: null, error: err };
    }
    return { data: await res.json(), error: null };
  },
  get: (ep, params) => api.request("GET", ep + (params ? "?" + new URLSearchParams(params) : ""), null),
  post: (ep, b) => api.request("POST", ep, b),
  patch: (ep, b) => api.request("PATCH", ep, b),
  delete: (ep) => api.request("DELETE", ep, null),
};

const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// Upload image to API (will be converted to base64 on backend)
async function uploadImage(file) {
  const reader = new FileReader();
  return new Promise((resolve) => {
    reader.onload = async (e) => {
      const base64 = e.target.result;
      const { data, error } = await api.post("/api/upload-image", { 
        image: base64, 
        filename: file.name 
      });
      if (error) { alert("Błąd uploadu"); resolve(null); return; }
      resolve(data?.image_data || null);
    };
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("login");
  const [dbOk, setDbOk] = useState(null);

  useEffect(() => {
    api.get("/api/health").then(({ error }) => setDbOk(!error)).catch(() => setDbOk(false));
  }, []);

  const logout = async () => {
    if (user?.sid) await api.patch(`/api/sessions/${user.sid}`, { active: false });
    setUser(null);
    setPage("login");
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
    <p style={{ color: "#94a3b8" }}>Upewnij się że API serwer działa na http://localhost:3001</p>
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
    setLd(true);
    setErr("");
    
    const { data: user, error } = await api.post("/api/login", { username: u.trim(), password: p });
    if (error || !user) { setErr("Nieprawidłowy login lub hasło."); setLd(false); return; }
    
    onLogin(user);
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
            <Lb>Login (np. jan_1a)</Lb>
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
  const [n, setN] = useState("");
  const [c, setC] = useState("");
  const [p, setP] = useState("");
  const [c2, setC2] = useState("");
  const [cls, setCls] = useState([]);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    api.get("/api/classes").then(({ data }) => setCls(data || []));
  }, []);

  const go = async () => {
    if (!n.trim() || !c || !p) { setErr("Wypełnij wszystkie pola."); return; }
    if (p !== c2) { setErr("Hasła nie pasują."); return; }
    if (p.length < 4) { setErr("Hasło min 4 znaki."); return; }
    
    setErr("");
    const { error } = await api.post("/api/register", { 
      name: n.trim(), 
      class_id: c, 
      password: p 
    });
    
    if (error) { setErr("Błąd rejestracji"); return; }
    setOk(`✅ Konto utworzone!\nCzekaj na aktywację przez nauczyciela.`);
  };

  if (ok) return <div style={{ color: "#4ade80", lineHeight: 1.8, whiteSpace: "pre-line", padding: "8px 0" }}>{ok}</div>;
  
  return (<>
    <Lb>Imię i nazwisko</Lb><In v={n} s={setN} ph="np. Jan Kowalski" />
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
    api.get("/api/tasks-for-student").then(({ data }) => {
      if (data) setSlots(data);
    });
  }, []);

  useEffect(() => {
    if (!user.exp) return;
    const tick = () => {
      const left = Math.max(0, new Date(user.exp) - Date.now());
      setTl(Math.ceil(left / 1000));
      if (left <= 0) {
        setExp(true);
        api.patch(`/api/sessions/${user.sid}`, { active: false, locked_at: new Date().toISOString() });
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [user.exp, user.sid]);

  useEffect(() => {
    const ivs = {};
    Object.entries(cd).forEach(([id, x]) => {
      if (x.r > 0) {
        ivs[id] = setInterval(() => {
          setCd(prev => {
            const cur = prev[id];
            if (!cur || cur.r <= 1) {
              clearInterval(ivs[id]);
              const { [id]: _, ...rest } = prev;
              return rest;
            }
            return { ...prev, [id]: { ...cur, r: cur.r - 1 } };
          });
        }, 1000);
      }
    });
    return () => Object.values(ivs).forEach(clearInterval);
  }, [Object.keys(cd).join()]);

  const sub = async (idx) => {
    const t = slots[idx];
    if (!t || cd[t.id]) return;

    const g = (ans[t.id] || "").trim().toLowerCase();
    const isOk = g === t.answer.trim().toLowerCase();

    await api.post("/api/submit-answer", {
      task_id: t.id,
      given_answer: g,
      correct: isOk,
    });

    if (isOk) {
      setFb(p => ({ ...p, [t.id]: "ok" }));
      setTimeout(async () => {
        const { data } = await api.get("/api/tasks-for-student");
        const ids = slots.map(x => x.id);
        const pool = (data || []).filter(x => !ids.includes(x.id));
        const next = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
        setSlots(p => {
          const s = [...p];
          s[idx] = next || t;
          return s;
        });
        setAns(p => {
          const { [t.id]: _, ...r } = p;
          return r;
        });
        setFb(p => {
          const { [t.id]: _, ...r } = p;
          return r;
        });
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
        <p style={{ color: "#64748b", fontSize: 14 }}>Skontaktuj się z nauczycielem.</p>
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
          <p style={{ margin: "3px 0 0", color: "#475569", fontSize: 12 }}>Klasa {user.class_name || "–"} · @{user.username}</p>
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
          const c = cd[t.id];
          const f = fb[t.id];
          const bc = f === "ok" ? "#22c55e" : f === "bad" ? "#ef4444" : "#1e293b";
          return (
            <div key={t.id + idx} style={{ ...S.card, border: `2px solid ${bc}`, transition: "border-color .3s", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 10, background: "#1e293b", padding: "2px 8px", borderRadius: 20, color: "#7dd3fc" }}>{t.category}</span>
                <span style={{ fontSize: 10, color: t.difficulty === "łatwe" ? "#22c55e" : t.difficulty === "średnie" ? "#f59e0b" : "#ef4444" }}>{t.difficulty}</span>
              </div>
              {t.image_data && <img src={t.image_data} alt="zadanie" style={{ width: "100%", borderRadius: 8, marginBottom: 8, maxHeight: 160, objectFit: "contain", background: "#0f172a" }} />}
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

function Admin({ onLogout }) {
  const [tab, setTab] = useState("s");
  const tabs = [["s", "👥 Uczniowie"], ["t", "📝 Zadania"], ["st", "📊 Statystyki"], ["as", "➕ Uczeń"], ["at", "➕ Zadanie"], ["cl", "🏫 Klasy"]];
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

  const load = async () => {
    const [{ data: u }, { data: c }] = await Promise.all([
      api.get("/api/users?role=student"),
      api.get("/api/classes"),
    ]);
    setList(u || []);
    setCls(c || []);
  };

  useEffect(() => {
    load();
  }, []);

  const sm = m => {
    setMsg(m);
    setTimeout(() => setMsg(""), 3000);
  };

  const gc = id => cls.find(c => c.id === id)?.name || "–";
  
  const tog = async u => {
    await api.patch(`/api/users/${u.id}`, { active: !u.active });
    setList(p => p.map(x => x.id === u.id ? { ...x, active: !x.active } : x));
    sm(u.active ? "Zablokowano." : "Odblokowano.");
  };

  const rm = async u => {
    if (!confirm(`Usunąć ${u.username}?`)) return;
    await api.delete(`/api/users/${u.id}`);
    setList(p => p.filter(x => x.id !== u.id));
    sm("Usunięto.");
  };

  const ulSess = async u => {
    const { data: sess } = await api.get(`/api/user-sessions/${u.id}`);
    if (sess && sess.length > 0) {
      await api.patch(`/api/sessions/${sess[0].id}`, { active: true, locked_at: null });
    }
    sm(`Sesja ${u.username} odblokowana.`);
  };

  const selectClass = (clsName) => {
    const ids = list.filter(u => gc(u.class_id) === clsName).map(u => u.id);
    setSel(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  };

  const toggleSel = (id) => {
    setSel(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const applyBulkTime = async () => {
    if (!bulkMins && bulkMins !== "") return;
    const val = bulkMins === "" ? null : parseInt(bulkMins);
    for (const id of sel) {
      await api.patch(`/api/users/${id}`, { session_minutes: val });
    }
    load();
    sm(`Ustawiono czas sesji dla ${sel.size} uczniów.`);
    setSel(new Set());
    setBulkMins("");
    setShowBulk(false);
  };

  const allCls = ["ALL", ...new Set(list.map(u => gc(u.class_id)))].sort();
  const visible = list.filter(u => fil === "ALL" || gc(u.class_id) === fil);

  return (
    <div>
      {msg && <Ok style={{ marginBottom: 12 }}>{msg}</Ok>}

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {allCls.map(c => <Pi key={c} a={fil === c} onClick={() => setFil(c)}>{c === "ALL" ? "Wszystkie" : c}</Pi>)}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {allCls.filter(c => c !== "ALL").map(c => (
          <button key={c} onClick={() => selectClass(c)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#7dd3fc", fontSize: 12, cursor: "pointer" }}>
            Zaznacz klasę {c}
          </button>
        ))}
        {sel.size > 0 && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
            <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 600 }}>Zaznaczono: {sel.size}</span>
            <button onClick={() => setShowBulk(!showBulk)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#0369a1", color: "#fff", fontSize: 12, cursor: "pointer" }}>
              ⏱ Ustaw czas sesji
            </button>
            <button onClick={() => setSel(new Set())} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "#374151", color: "#ccc", fontSize: 12, cursor: "pointer" }}>
              ✕ Odznacz
            </button>
          </div>
        )}
      </div>

      {showBulk && sel.size > 0 && (
        <div style={{ ...S.card, padding: 16, marginBottom: 12, border: "1px solid #0369a1", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "#94a3b8", fontSize: 13 }}>Czas sesji dla {sel.size} uczniów:</span>
          <In v={bulkMins} s={setBulkMins} ph="minuty (puste=∞)" type="number" style={{ width: 160, flex: "none" }} />
          <Bt onClick={applyBulkTime} style={{ margin: 0, padding: "8px 16px", width: "auto", fontSize: 13 }}>✅ Zastosuj</Bt>
          <button onClick={() => setShowBulk(false)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#374151", color: "#ccc", cursor: "pointer", fontSize: 13 }}>Anuluj</button>
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {visible.map(u => eid === u.id
          ? <EdStud key={u.id} user={u} cls={cls} onSave={async d => { await api.patch(`/api/users/${u.id}`, d); setEid(null); load(); sm("Zapisano."); }} onCancel={() => setEid(null)} />
          : (
            <div key={u.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 14px", borderLeft: `3px solid ${u.active ? "#0ea5e9" : "#ef4444"}`, opacity: sel.size > 0 && !sel.has(u.id) ? 0.6 : 1 }}>
              <input type="checkbox" checked={sel.has(u.id)} onChange={() => toggleSel(u.id)} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#0ea5e9" }} />
              <div style={{ flex: 1, minWidth: 140 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</span>
                <span style={{ marginLeft: 8, fontSize: 10, background: "#1e293b", padding: "2px 7px", borderRadius: 20, color: "#7dd3fc" }}>{gc(u.class_id)}</span>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>@{u.username}</div>
              </div>
              <span style={{ fontSize: 11, color: "#64748b" }}>{u.session_minutes ? `⏱ ${u.session_minutes}min` : "⏱ ∞"}</span>
              <span style={{ fontSize: 11, color: u.active ? "#22c55e" : "#ef4444", fontWeight: 600 }}>{u.active ? "● aktywny" : "● zablok."}</span>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                <Sm onClick={() => setEid(u.id)}>✏️</Sm>
                <Sm onClick={() => tog(u)} col={u.active ? "#1c1000" : "#001c0a"}>{u.active ? "🔒" : "🔓"}</Sm>
                <Sm onClick={() => ulSess(u)}>🔄</Sm>
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
  const [n, setN] = useState(user.name);
  const [c, setC] = useState(user.class_id || "");
  const [p, setP] = useState(user.password_hash);
  const [m, setM] = useState(user.session_minutes || "");

  const save = async () => {
    if (!n.trim() || !p.trim()) return;
    onSave({ name: n.trim(), password_hash: p, class_id: c || null, session_minutes: m ? parseInt(m) : null });
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

  const reload = () => api.get("/api/tasks").then(({ data }) => setTasks(data || []));
  
  useEffect(() => {
    reload();
  }, []);

  const sm = m => {
    setMsg(m);
    setTimeout(() => setMsg(""), 3000);
  };

  const rm = async t => {
    if (!confirm("Usunąć?")) return;
    await api.delete(`/api/tasks/${t.id}`);
    setTasks(p => p.filter(x => x.id !== t.id));
    sm("Usunięto.");
  };

  const togA = async t => {
    await api.patch(`/api/tasks/${t.id}`, { active: !t.active });
    setTasks(p => p.map(x => x.id === t.id ? { ...x, active: !x.active } : x));
  };

  const cats = ["ALL", ...new Set(tasks.map(t => t.category))].sort();
  const vi = tasks.filter(t => fil === "ALL" || t.category === fil);

  return (
    <div>
      {msg && <Ok style={{ marginBottom: 12 }}>{msg}</Ok>}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>{cats.map(c => <Pi key={c} a={fil === c} onClick={() => setFil(c)}>{c === "ALL" ? "Wszystkie" : c}</Pi>)}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {vi.map(t => eid === t.id
          ? <EdTask key={t.id} task={t} onSave={async d => { await api.patch(`/api/tasks/${t.id}`, d); setEid(null); reload(); sm("Zaktualizowano."); }} onCancel={() => setEid(null)} />
          : (
            <div key={t.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 14px", opacity: t.active ? 1 : 0.5, borderLeft: `3px solid ${t.active ? "#0ea5e9" : "#475569"}` }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, background: "#1e293b", padding: "2px 7px", borderRadius: 20, color: "#7dd3fc" }}>{t.category}</span>
                  <span style={{ fontSize: 10, color: t.difficulty === "łatwe" ? "#22c55e" : t.difficulty === "średnie" ? "#f59e0b" : "#ef4444" }}>{t.difficulty}</span>
                  {t.image_data && <span style={{ fontSize: 10, color: "#a78bfa" }}>🖼️ obrazek</span>}
                </div>
                <p style={{ margin: "3px 0", fontWeight: 500, fontSize: 13 }}>{t.question}</p>
                <p style={{ margin: 0, color: "#22c55e", fontSize: 12 }}>Odp: <b>{t.answer}</b></p>
              </div>
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
  const [q, setQ] = useState(task.question);
  const [a, setA] = useState(task.answer);
  const [cat, setCat] = useState(task.category);
  const [dif, setDif] = useState(task.difficulty);
  const [imgData, setImgData] = useState(task.image_data || "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleImg = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const base64 = await uploadImage(file);
    if (base64) setImgData(base64);
    else alert("Błąd uploadu.");
    setUploading(false);
  };

  return (
    <div style={{ ...S.card, border: "2px solid #0ea5e9", padding: 16 }}>
      <Lb>Treść</Lb>
      <textarea value={q} onChange={e => setQ(e.target.value)} style={{ ...S.inp, height: 60, resize: "vertical" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10, marginTop: 10 }}>
        <div><Lb>Odpowiedź</Lb><In v={a} s={setA} /></div>
        <div><Lb>Kategoria</Lb><In v={cat} s={setCat} /></div>
        <div><Lb>Trudność</Lb><select value={dif} onChange={e => setDif(e.target.value)} style={S.inp}><option value="łatwe">łatwe</option><option value="średnie">średnie</option><option value="trudne">trudne</option></select></div>
      </div>
      <div style={{ marginTop: 12 }}>
        <Lb>Obrazek (opcjonalnie)</Lb>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => fileRef.current?.click()} style={{ padding: "7px 14px", borderRadius: 7, border: "1px dashed #334155", background: "#0f172a", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>
            {uploading ? "Uploading..." : "📁 Wybierz plik"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} style={{ display: "none" }} />
          {imgData && <><img src={imgData} alt="preview" style={{ height: 48, borderRadius: 6, objectFit: "contain", background: "#1e293b" }} /><button onClick={() => setImgData("")} style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: "#3a1a1a", color: "#ef4444", cursor: "pointer", fontSize: 11 }}>Usuń</button></>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Bt onClick={() => onSave({ question: q, answer: a, category: cat, difficulty: dif, image_data: imgData || null })} style={{ flex: 1, margin: 0, padding: "9px" }}>💾 Zapisz</Bt>
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

  useEffect(() => {
    api.get("/api/student-stats").then(({ data }) => {
      setStats(data || []);
      setLd(false);
    });
  }, []);

  const showH = async u => {
    setDet(u);
    const { data } = await api.get(`/api/student-answers/${u.user_id}`);
    setHist(data || []);
  };

  if (ld) return <Spin text="Ładowanie…" />;
  if (det) return (
    <div>
      <button onClick={() => { setDet(null); setHist([]); }} style={{ ...S.gh, marginBottom: 16, fontSize: 12 }}>← Wróć</button>
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
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>{h.question}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#475569" }}>Odp: <b style={{ color: h.correct ? "#22c55e" : "#ef4444" }}>{h.given_answer}</b> · {h.category}</p>
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
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>{ac.map(c => <Pi key={c} a={fil === c} onClick={() => setFil(c)}>{c === "ALL" ? "Wszystkie" : c}</Pi>)}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {vi.map(s => (
          <div key={s.user_id} style={{ ...S.card, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", cursor: "pointer" }} onClick={() => showH(s)}>
            <div style={{ flex: 1 }}><span style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</span><span style={{ marginLeft: 8, fontSize: 10, background: "#1e293b", padding: "2px 7px", borderRadius: 20, color: "#7dd3fc" }}>{s.class || "–"}</span><div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>@{s.username}</div></div>
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
  const [n, setN] = useState("");
  const [c, setC] = useState("");
  const [p, setP] = useState("");
  const [m, setM] = useState("45");
  const [cls, setCls] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/api/classes").then(({ data }) => setCls(data || []));
  }, []);

  const add = async () => {
    if (!n.trim() || !c || !p.trim()) { setErr("Wypełnij wszystkie pola."); return; }
    if (p.length < 4) { setErr("Hasło min 4 znaki."); return; }
    setErr("");

    const { error } = await api.post("/api/add-student", {
      name: n.trim(),
      class_id: c,
      password: p,
      session_minutes: m ? parseInt(m) : null,
    });

    if (error) { setErr("Błąd: " + JSON.stringify(error)); return; }
    setMsg(`✅ Dodano: nowy uczeń`);
    setN("");
    setC("");
    setP("");
    setM("45");
    setTimeout(() => setMsg(""), 4000);
  };

  return (
    <div style={{ ...S.card, maxWidth: 480, padding: 24 }}>
      <h2 style={{ margin: "0 0 18px", fontSize: 17 }}>➕ Dodaj ucznia</h2>
      {msg && <Ok style={{ marginBottom: 14 }}>{msg}</Ok>}
      <Lb>Imię i nazwisko</Lb>
      <In v={n} s={setN} ph="np. Jan Kowalski" />
      <Lb style={{ marginTop: 12 }}>Klasa</Lb>
      <select value={c} onChange={e => setC(e.target.value)} style={S.inp}><option value="">Wybierz klasę…</option>{cls.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <Lb style={{ marginTop: 12 }}>Hasło</Lb>
      <In v={p} s={setP} ph="min. 4 znaki" />
      <Lb style={{ marginTop: 12 }}>Czas sesji (min, puste = bez limitu)</Lb>
      <In type="number" v={m} s={setM} />
      {err && <Eb>{err}</Eb>}
      <Bt onClick={add} style={{ marginTop: 18 }}>✅ Dodaj ucznia</Bt>
    </div>
  );
}

function AddTask() {
  const [mode, setMode] = useState("s");
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [cat, setCat] = useState("");
  const [dif, setDif] = useState("łatwe");
  const [imgData, setImgData] = useState("");
  const [uploading, setUploading] = useState(false);
  const [bk, setBk] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const fileRef = useRef();

  const sm = m => {
    setMsg(m);
    setTimeout(() => setMsg(""), 4000);
  };

  const handleImg = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const base64 = await uploadImage(file);
    if (base64) setImgData(base64);
    else alert("Błąd uploadu");
    setUploading(false);
  };

  const addS = async () => {
    if (!q.trim() || !a.trim()) { setErr("Treść i odpowiedź wymagane."); return; }
    const { error } = await api.post("/api/add-task", {
      question: q.trim(),
      answer: a.trim(),
      category: cat.trim() || "Różne",
      difficulty: dif,
      image_data: imgData || null,
    });
    if (error) { setErr("Błąd: " + JSON.stringify(error)); return; }
    setErr("");
    setQ("");
    setA("");
    setCat("");
    setDif("łatwe");
    setImgData("");
    sm("✅ Zadanie dodane!");
  };

  const addB = async () => {
    const lines = bk.split("\n").filter(l => l.trim());
    const rows = [];
    const errs = [];
    lines.forEach((l, i) => {
      const p = l.split("|").map(x => x.trim());
      if (p.length < 2) { errs.push(`L${i + 1}`); return; }
      rows.push({ question: p[0], answer: p[1], category: p[2] || "Różne", difficulty: p[3] || "łatwe", image_data: null });
    });
    if (errs.length) { setErr("Błędne linie: " + errs.join(", ")); return; }
    const { error } = await api.post("/api/add-tasks-bulk", { tasks: rows });
    if (error) { setErr("Błąd: " + JSON.stringify(error)); return; }
    setErr("");
    setBk("");
    sm(`✅ Dodano ${rows.length} zadań!`);
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
          <div><Lb>Kategoria</Lb><In v={cat} s={setCat} ph="np. Mnożenie" /></div>
          <div><Lb>Trudność</Lb><select value={dif} onChange={e => setDif(e.target.value)} style={S.inp}><option value="łatwe">łatwe</option><option value="średnie">średnie</option><option value="trudne">trudne</option></select></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Lb>Obrazek (opcjonalnie)</Lb>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => fileRef.current?.click()} style={{ padding: "7px 14px", borderRadius: 7, border: "1px dashed #334155", background: "#0f172a", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>
              {uploading ? "⏳ Wysyłanie..." : "📁 Dodaj obrazek"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} style={{ display: "none" }} />
            {imgData && <><img src={imgData} alt="preview" style={{ height: 48, borderRadius: 6, objectFit: "contain", background: "#1e293b" }} /><button onClick={() => setImgData("")} style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: "#3a1a1a", color: "#ef4444", cursor: "pointer", fontSize: 11 }}>Usuń</button></>}
          </div>
        </div>
        {err && <Eb>{err}</Eb>}
        <Bt onClick={addS} style={{ marginTop: 14 }}>✅ Dodaj zadanie</Bt>
      </>) : (<>
        <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 8px" }}>Format: <code style={{ background: "#1e293b", padding: "2px 5px", borderRadius: 4 }}>pytanie | odpowiedź | kategoria | trudność</code></p>
        <textarea value={bk} onChange={e => setBk(e.target.value)} placeholder={"Ile to 5 × 7? | 35 | Mnożenie | łatwe\nIle to √25? | 5 | Pierwiastki | łatwe"} style={{ ...S.inp, height: 140, resize: "vertical", fontFamily: "monospace", fontSize: 12 }} />
        {err && <Eb>{err}</Eb>}
        <Bt onClick={addB} style={{ marginTop: 10 }}>✅ Dodaj wszystkie</Bt>
      </>)}
    </div>
  );
}

function ClsTab() {
  const [cls, setCls] = useState([]);
  const [n, setN] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => api.get("/api/classes").then(({ data }) => setCls(data || []));
  
  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!n.trim()) return;
    const { error } = await api.post("/api/add-class", { name: n.trim().toUpperCase() });
    if (error) { setMsg("Błąd: " + JSON.stringify(error)); return; }
    setN("");
    load();
    setMsg("✅ Dodano.");
    setTimeout(() => setMsg(""), 3000);
  };

  const rm = async c => {
    if (!confirm(`Usunąć klasę ${c.name}?`)) return;
    await api.delete(`/api/classes/${c.id}`);
    load();
    setMsg("Usunięto.");
    setTimeout(() => setMsg(""), 3000);
  };

  return (
    <div style={{ maxWidth: 380 }}>
      {msg && <Ok style={{ marginBottom: 12 }}>{msg}</Ok>}
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
            <span style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</span>
            <Sm onClick={() => rm(c)} col="#1c0505">🗑️ Usuń</Sm>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PRIMITIVES ─────────────────────────────────────────
function In({ v, s, ph, type = "text", disabled, oe, style = {} }) {
  return <input type={type} value={v} disabled={disabled} placeholder={ph} onChange={e => s(e.target.value)} onKeyDown={e => e.key === "Enter" && oe && oe()} style={{ ...S.inp, ...style }} />;
}
function Lb({ children, style = {} }) { return <label style={{ display: "block", marginBottom: 4, color: "#94a3b8", fontSize: 12, ...style }}>{children}</label>; }
function Bt({ children, onClick, loading, style = {} }) { return <button onClick={onClick} disabled={loading} style={{ display: "block", width: "100%", padding: "11px", margin: 0, background: "linear-gradient(135deg,#0369a1,#0ea5e9)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", ...style }}>{loading ? "Ładowanie…" : children}</button>; }
function Sm({ children, onClick, col = "#1e293b" }) { return <button onClick={onClick} style={{ padding: "5px 10px", background: col, border: "1px solid #334155", borderRadius: 6, color: "#cbd5e1", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>{children}</button>; }
function Pi({ children, a, onClick }) { return <button onClick={onClick} style={{ padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, background: a ? "#0ea5e9" : "#1e293b", color: a ? "#fff" : "#64748b" }}>{children}</button>; }
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

export default App;
