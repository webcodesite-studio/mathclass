// ── API client — zastępuje Supabase ─────────────────────────────
// Ustaw adres backendu. W trybie dev: http://localhost:3001
// Na serwerze: ten sam host co frontend (nginx proxy)
const BASE = import.meta.env.VITE_API_URL || "/api";

const getToken = () => localStorage.getItem("mc_token");

async function req(method, path, body, params) {
  let url = `${BASE}${path}`;
  if (params) {
    const p = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
    );
    if ([...p].length) url += "?" + p.toString();
  }
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const r = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) return { data: null, error: data };
  return { data, error: null };
}

export const api = {
  // Auth
  login:  (username, password) => req("POST", "/auth/login",  { username, password }),
  logout: (sid)                => req("POST", "/auth/logout", { sid }),

  // Generic CRUD
  get:    (table, params)      => req("GET",    `/${table}`,      undefined, params),
  getOne: (table, id)          => req("GET",    `/${table}/${id}`),
  post:   (table, body)        => req("POST",   `/${table}`,      body),
  patch:  (table, id, body)    => req("PATCH",  `/${table}/${id}`, body),
  del:    (table, id, params)  => id
    ? req("DELETE", `/${table}/${id}`)
    : req("DELETE", `/${table}`, undefined, params),

  // Stats (odpowiednik widoku Supabase)
  studentStats: ()             => req("GET", "/stats/students"),
  dbStats:      ()             => req("GET", "/stats/db"),

  // Upload obrazka
  uploadImage: async (file) => {
    const form = new FormData();
    form.append("file", file);
    const token = getToken();
    const r = await fetch(`${BASE}/upload/image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.url || null;
  },

  // Check username uniqueness
  checkUsername: (base) => req("GET", `/users/check-username/${encodeURIComponent(base)}`),
};

// Pomocniki (były eq/lik w Supabase)
export const buildParams = (filters = {}) => filters;
