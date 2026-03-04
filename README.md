# MathClass 📐

System zadań matematycznych dla szkół — działa **lokalnie**, bez Supabase.  
Stack: **React + Vite** (frontend) · **Node.js/Express** (API) · **PostgreSQL** (baza danych)

---

## Funkcje

- 👩‍🏫 **Panel nauczyciela** — zarządzanie uczniami, zadaniami, klasami, kategoriami i przydziałami
- ⚙️ **Panel administratora** (superadmin) — zarządzanie nauczycielami, pełna kontrola nad bazą
- 🎓 **Panel ucznia** — rozwiązywanie zadań z limitem czasu sesji, karami za błędy
- 📊 **Statystyki** — historia odpowiedzi, eksport do CSV/Excel
- 🖼️ **Obrazki** — kadrowanie i upload zdjęć do zadań
- 🏷️ **Przydziały kategorii** — per klasa lub per uczeń

---

## Struktura projektu

```
mathclass/
├── backend/              # Node.js + Express API
│   ├── routes/           # Endpointy REST
│   ├── db.js             # Połączenie z PostgreSQL
│   ├── server.js         # Główny serwer
│   ├── .env.example      # Przykładowa konfiguracja
│   └── package.json
├── frontend/             # React + Vite
│   ├── src/
│   │   ├── App.jsx       # Cała aplikacja
│   │   ├── api.js        # Klient API (zastępuje Supabase)
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── nginx/
│   └── mathclass.conf    # Konfiguracja nginx
├── ecosystem.config.js   # Konfiguracja PM2
└── mathclass_schema.sql  # Schemat bazy danych
```

---

## Szybki start (dev lokalnie)

### Wymagania
- Node.js 18+
- PostgreSQL 14+

### 1. Baza danych
```bash
createdb mathclass
psql mathclass < mathclass_schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Uzupełnij .env: DB_PASSWORD, JWT_SECRET
npm install
npm run dev
# API działa na http://localhost:3001
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
# Aplikacja działa na http://localhost:5173
```

### Domyślne konta
| Login   | Hasło   | Rola        |
|---------|---------|-------------|
| `admin` | `admin` | superadmin  |
| `piotr` | `piotr` | nauczyciel  |
| `monika`| `monika`| nauczyciel  |

> ⚠️ Zmień hasła po pierwszym uruchomieniu!

---

## Deploy na Ubuntu

Szczegółowe instrukcje krok po kroku: **[INSTRUCTIONS.txt](INSTRUCTIONS.txt)**

---

## API — endpointy

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/auth/login` | Logowanie |
| POST | `/api/auth/logout` | Wylogowanie |
| GET/POST/PATCH/DELETE | `/api/users` | Użytkownicy |
| GET/POST/DELETE | `/api/classes` | Klasy |
| GET/POST/PATCH/DELETE | `/api/tasks` | Zadania |
| GET/POST/DELETE | `/api/answers` | Odpowiedzi |
| GET/POST/PATCH/DELETE | `/api/categories` | Kategorie |
| GET/POST/DELETE | `/api/category-assignments` | Przydziały |
| GET/POST/DELETE | `/api/teacher-classes` | Klasy nauczyciela |
| GET | `/api/stats/students` | Statystyki uczniów |
| GET | `/api/stats/db` | Liczniki bazy |
| POST | `/api/upload/image` | Upload obrazka |
| GET | `/api/health` | Status API |

---

## Licencja

MIT
  # (poprosi o hasło)
