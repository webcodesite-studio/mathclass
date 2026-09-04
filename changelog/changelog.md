# Changelog

Wszystkie istotne zmiany w projekcie są dokumentowane w tym pliku.  
Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.0.0/).  
Projekt stosuje [Semantic Versioning](https://semver.org/lang/pl/).

---

## [1.1.0] — 2025-09-03

### Bezpieczeństwo

- Dodano middleware `backend/middleware/auth.js` — weryfikacja tokenu JWT na wszystkich chronionych endpointach
- Dodano `requireRole()` — kontrola dostępu według roli (`superadmin`, `admin`, `student`)
- Wszystkie trasy poza `/api/auth` i `/api/bug-reports` wymagają teraz ważnego tokenu
- Dodano rate limiting na `/api/auth/login` — max 20 prób na 15 minut (`express-rate-limit`)
- Serwer kończy pracę (`process.exit(1)`) jeśli `JWT_SECRET` nie jest ustawiony w `.env`
- CORS ograniczony z `*` do konkretnej domeny produkcyjnej
- Naprawiono `DELETE /api/answers` bez `user_id` — poprzednio kasował całą tabelę odpowiedzi
- Dodano whitelist dozwolonych pól w `PATCH /api/users/:id` — ochrona przed SQL injection przez nazwy kolumn
- Dodano whitelist dozwolonych pól w `PATCH /api/sessions` — ochrona przed SQL injection przez nazwy kolumn
- Upload obrazków: dodano weryfikację rozszerzenia pliku obok sprawdzania MIME type
- Nginx: dodano nagłówki `Strict-Transport-Security` i `Referrer-Policy`

### Zależności

- Dodano `express-rate-limit`

---

## [1.0.0] — 2025-09-03

### Pierwsze wydanie

- Panel nauczyciela — zarządzanie uczniami, zadaniami, klasami, kategoriami, przydziałami
- Panel administratora (superadmin) — pełna kontrola nad bazą i nauczycielami
- Panel ucznia — rozwiązywanie zadań z limitem czasu sesji i karami za błędy
- Statystyki — historia odpowiedzi, eksport do CSV/Excel
- Upload i kadrowanie zdjęć do zadań
- Przydziały kategorii per klasa lub per uczeń
- Generowanie kont uczniów z losowym PIN-em
- Zgłaszanie błędów z powiadomieniem przez Discord Webhook
- Stack: React + Vite / Node.js + Express / PostgreSQL / nginx / PM2

---

## Instalacja produkcyjna — co uzupełnić

### `.env` (backend)

Skopiuj `backend/.env.example` → `backend/.env` i uzupełnij:

```env
JWT_SECRET=<losowy_ciąg_min_32_znaki>        # np. wynik: openssl rand -hex 32
DB_PASSWORD=<silne_hasło_do_postgresql>
DB_NAME=mathclass
DB_USER=mathclass
DB_HOST=localhost
DB_PORT=5432
PORT=3001
API_URL=https://twojadomena.pl
UPLOADS_DIR=/var/www/mathclass/uploads
DISCORD_WEBHOOK_URL=                          # opcjonalne — powiadomienia o zgłoszeniach
```

Wygeneruj `JWT_SECRET` poleceniem:
```bash
openssl rand -hex 32
```

### `backend/server.js`

Zmień domenę w konfiguracji CORS:
```js
app.use(cors({ origin: "https://twojadomena.pl" }));
```

### `nginx/mathclass.conf`

Zmień `server_name`:
```nginx
server_name twojadomena.pl;
```

Po deploygu uruchom Certbot (HTTPS):
```bash
certbot --nginx -d twojadomena.pl
```

### Baza danych

```bash
createdb mathclass
psql mathclass < mathclass_schema.sql
```

Zmień domyślne hasło admina (`admin`/`admin`) natychmiast po pierwszym logowaniu.

### PM2 — autostart po rebootcie

```bash
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```