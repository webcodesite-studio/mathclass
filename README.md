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


================================================================
KROK 5 — INSTALACJA NGINX
================================================================

  sudo apt install -y nginx
  sudo systemctl enable nginx
  sudo systemctl start nginx


================================================================
KROK 6 — INSTALACJA PM2 (menedżer procesów Node.js)
================================================================

  sudo npm install -g pm2
  pm2 startup systemd
  # Skopiuj i wykonaj polecenie które PM2 wyświetli!


================================================================
KROK 7 — PRZESŁANIE PLIKÓW NA SERWER
================================================================

  Na lokalnym komputerze wykonaj:

  # Zbuduj frontend:
  cd frontend
  npm install
  npm run build
  # Powstanie folder frontend/dist/

  # Wyślij pliki na serwer (zamień USER i IP):
  scp -r backend/         USER@IP:/tmp/mathclass-backend/
  scp -r frontend/dist/   USER@IP:/tmp/mathclass-frontend/
  scp ecosystem.config.js USER@IP:/tmp/


================================================================
KROK 8 — ROZMIESZCZENIE PLIKÓW NA SERWERZE
================================================================

  Na serwerze Ubuntu:

  # Utwórz strukturę katalogów:
  sudo mkdir -p /var/www/mathclass/frontend
  sudo mkdir -p /var/www/mathclass/backend
  sudo mkdir -p /var/www/mathclass/uploads

  # Skopiuj pliki:
  sudo cp -r /tmp/mathclass-backend/*   /var/www/mathclass/backend/
  sudo cp -r /tmp/mathclass-frontend/*  /var/www/mathclass/frontend/
  sudo cp /tmp/ecosystem.config.js      /var/www/mathclass/

  # Ustaw właściciela:
  sudo chown -R $USER:$USER /var/www/mathclass/


================================================================
KROK 9 — KONFIGURACJA BACKENDU (.env)
================================================================

  cd /var/www/mathclass/backend
  cp .env.example .env
  nano .env

  Uzupełnij plik — zmień wartości:
  ─────────────────────────────────────────────────────────────
  DB_HOST=localhost
  DB_PORT=5432
  DB_NAME=mathclass
  DB_USER=mathclass_user
  DB_PASSWORD=TWOJE_HASLO_DO_BAZY        ← zmień to!

  JWT_SECRET=LOSOWY_STRING_MIN_32_ZNAKI  ← zmień to!
  # Przykład JWT_SECRET: openssl rand -hex 32

  PORT=3001

  UPLOADS_DIR=/var/www/mathclass/uploads
  API_URL=http://TWOJ_IP_LUB_DOMENA     ← zmień to!
  ─────────────────────────────────────────────────────────────

  # Wygeneruj bezpieczny JWT_SECRET:
  openssl rand -hex 32


================================================================
KROK 10 — INSTALACJA ZALEŻNOŚCI BACKENDU
================================================================

  cd /var/www/mathclass/backend
  npm install --omit=dev


================================================================
KROK 11 — URUCHOMIENIE BACKENDU PRZEZ PM2
================================================================

  cd /var/www/mathclass
  pm2 start ecosystem.config.js
  pm2 save

  # Sprawdź status:
  pm2 status
  pm2 logs mathclass-api

  # Powinieneś zobaczyć:
  # "MathClass API running on port 3001"

  # Test API:
  curl http://localhost:3001/api/health
  # Powinno zwrócić: {"ok":true}


================================================================
KROK 12 — KONFIGURACJA NGINX
================================================================

  # Skopiuj konfigurację:
  sudo cp /tmp/mathclass-backend/../nginx/mathclass.conf \
       /etc/nginx/sites-available/mathclass

  # LUB utwórz ręcznie:
  sudo nano /etc/nginx/sites-available/mathclass

  Wklej i dostosuj (zmień IP/domenę):
  ─────────────────────────────────────────────────────────────
  server {
      listen 80;
      server_name TWOJ_IP;   # lub np. mathclass.szkola.pl

      root /var/www/mathclass/frontend;
      index index.html;

      location / {
          try_files $uri $uri/ /index.html;
      }

      location /api/ {
          proxy_pass       http://localhost:3001;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
      }

      location /uploads/ {
          alias /var/www/mathclass/uploads/;
          expires 30d;
      }

      client_max_body_size 10M;
  }
  ─────────────────────────────────────────────────────────────

  # Aktywuj konfigurację:
  sudo ln -s /etc/nginx/sites-available/mathclass \
             /etc/nginx/sites-enabled/

  # Usuń domyślną stronę nginx (opcjonalnie):
  sudo rm -f /etc/nginx/sites-enabled/default

  # Sprawdź poprawność:
  sudo nginx -t

  # Przeładuj nginx:
  sudo systemctl reload nginx


================================================================
KROK 13 — UPRAWNIENIA DO KATALOGU UPLOADS
================================================================

  sudo chown -R www-data:www-data /var/www/mathclass/uploads
  sudo chmod 755 /var/www/mathclass/uploads

  # Backend też potrzebuje dostępu:
  sudo usermod -aG www-data $USER
  sudo chown -R $USER:www-data /var/www/mathclass/uploads


================================================================
KROK 14 — FIREWALL (opcjonalnie)
================================================================

  sudo ufw allow 22    # SSH
  sudo ufw allow 80    # HTTP
  sudo ufw allow 443   # HTTPS (jeśli będziesz mieć SSL)
  sudo ufw enable


================================================================
KROK 15 — SPRAWDZENIE DZIAŁANIA
================================================================

  Otwórz przeglądarkę: http://TWOJ_IP

  Zaloguj się:
  - Login: admin   Hasło: admin   → Panel Administratora
  - Login: piotr   Hasło: piotr   → Panel Nauczyciela

  !! WAŻNE: Zmień hasła domyślnych kont po pierwszym logowaniu !!


================================================================
SSL / HTTPS (opcjonalnie, wymaga domeny)
================================================================

  sudo apt install -y certbot python3-certbot-nginx
  sudo certbot --nginx -d twoja-domena.pl
  sudo systemctl reload nginx

  # Odnowienie certyfikatu (automatyczne):
  sudo certbot renew --dry-run


================================================================
AKTUALIZACJA APLIKACJI
================================================================

  # 1. Na lokalnym komputerze zbuduj nowy frontend:
  cd frontend && npm run build

  # 2. Wyślij na serwer:
  scp -r frontend/dist/* USER@IP:/var/www/mathclass/frontend/

  # 3. Jeśli zmieniał się backend:
  scp -r backend/*.js backend/routes/ USER@IP:/var/www/mathclass/backend/
  # Na serwerze:
  pm2 restart mathclass-api


================================================================
ROZWIĄZYWANIE PROBLEMÓW
================================================================

  Problem: Strona nie ładuje się
  → sudo nginx -t               # sprawdź konfigurację nginx
  → sudo systemctl status nginx # sprawdź czy nginx działa
  → curl http://localhost/      # sprawdź lokalnie

  Problem: API nie odpowiada
  → pm2 status                  # sprawdź status procesu
  → pm2 logs mathclass-api      # logi błędów
  → curl http://localhost:3001/api/health

  Problem: Błąd bazy danych
  → sudo systemctl status postgresql
  → psql -U mathclass_user -d mathclass -h localhost
  → Sprawdź hasło w pliku .env

  Problem: Upload obrazków nie działa
  → ls -la /var/www/mathclass/uploads/   # sprawdź uprawnienia
  → sudo chown -R www-data:www-data /var/www/mathclass/uploads

  Logi:
  → pm2 logs mathclass-api --lines 50
  → sudo tail -f /var/log/nginx/error.log
  → sudo journalctl -u postgresql -n 50


================================================================
BACKUP BAZY DANYCH
================================================================

  # Backup:
  pg_dump -U mathclass_user -d mathclass > backup_$(date +%Y%m%d).sql

  # Przywracanie:
  psql -U mathclass_user -d mathclass < backup_YYYYMMDD.sql

  # Automatyczny backup (cron):
  crontab -e
  # Dodaj linię (backup o 2:00 w nocy):
  0 2 * * * pg_dump -U mathclass_user mathclass > /var/backups/mathclass_$(date +\%Y\%m\%d).sql


================================================================
  Projekt: MathClass | github.com/mat-jan
================================================================
