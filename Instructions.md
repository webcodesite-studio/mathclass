# MathClass — Instrukcja instalacji i wdrożenia

Instrukcja obejmuje dwa scenariusze: **lokalny Ubuntu** (testy/dev) oraz **VPS OVH z Ubuntu** (produkcja).

---

## Wymagania systemowe

- Ubuntu 22.04 lub 24.04
- Node.js 18+
- PostgreSQL 14+
- Nginx
- PM2

---

## 1. Instalacja zależności

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL, Nginx
sudo apt install -y postgresql postgresql-contrib nginx

# PM2 (zarządzanie procesem Node.js)
sudo npm install -g pm2

# Weryfikacja
node -v        # powinno pokazać v20.x
psql --version
nginx -v
pm2 -v
```

---

## 2. Baza danych

```bash
# Ustaw hasło dla użytkownika postgres
sudo -u postgres psql -c "\password postgres"
# Wpisz i potwierdź hasło

# Utwórz bazę i załaduj schemat
sudo -u postgres createdb mathclass
sudo -u postgres psql mathclass < mathclass_schema.sql
```

Prawidłowe wykonanie powinno pokazać serię komunikatów `CREATE TABLE`, `INSERT` itp.

---

## 3. Klonowanie projektu

### Lokalnie (dev)
```bash
git clone https://github.com/webcodesite-studio/mathclass.git
cd mathclass/mathclass
```

### Na VPS (produkcja)
```bash
sudo mkdir -p /var/www/mathclass
sudo chown $USER:$USER /var/www/mathclass
git clone https://github.com/webcodesite-studio/mathclass.git /var/www/mathclass
cd /var/www/mathclass/mathclass
```

> Na VPS projekt musi być w `/var/www/mathclass/` — tak skonfigurowany jest `ecosystem.config.js`.

---

## 4. Konfiguracja backendu

```bash
cd backend
nano .env
```

Zawartość pliku `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mathclass
DB_USER=postgres
DB_PASSWORD=TWOJE_HASLO_DO_BAZY
JWT_SECRET=DLUGI_LOSOWY_CIAG_ZNAKOW
PORT=3001
```

> **Ważne:** Na produkcji użyj silnego `JWT_SECRET` (min. 32 znaki losowe). Możesz wygenerować: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

```bash
npm install
```

---

## 5. Uruchomienie backendu przez PM2

### Lokalnie (dev)
```bash
# Będąc w katalogu backend/
pm2 start server.js --name mathclass-api --cwd $(pwd)
pm2 logs mathclass-api --lines 20
```

Poprawny start pokazuje: `MathClass API running on port 3001`

### Na VPS (produkcja)
```bash
# Wróć do katalogu z ecosystem.config.js
cd /var/www/mathclass/mathclass
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # postępuj zgodnie z instrukcją którą wypisze
```

---

## 6. Build frontendu

```bash
cd frontend
npm install
npm run build
```

Pliki statyczne trafiają do katalogu `frontend/dist/`.

---

## 7. Konfiguracja Nginx

### Lokalnie (dev)

```bash
sudo nano /etc/nginx/sites-available/mathclass
```

```nginx
server {
    listen 80;
    server_name localhost;

    root /home/TWOJ_USER/mathclass/mathclass/frontend/dist;
    index index.html;

    # Uprawnienia - nginx musi mieć dostęp do katalogu domowego
    # Uruchom: chmod o+x /home/TWOJ_USER

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads {
        proxy_pass http://localhost:3001;
    }
}
```

Zamień `TWOJ_USER` na nazwę swojego użytkownika.

### Na VPS (produkcja)

```nginx
server {
    listen 80;
    server_name twoja-domena.pl;   # lub adres IP

    root /var/www/mathclass/mathclass/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /uploads {
        proxy_pass http://localhost:3001;
    }
}
```

Aktywacja Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/mathclass /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t                    # sprawdź konfigurację
sudo systemctl reload nginx
```

Uprawnienia (lokalnie):
```bash
chmod o+x /home/TWOJ_USER
```

---

## 8. HTTPS (tylko produkcja — VPS z domeną)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d twoja-domena.pl
```

Certbot automatycznie zaktualizuje konfigurację Nginx i ustawi auto-odnowienie certyfikatu.

---

## 9. Domyślne konta

| Login    | Hasło    | Rola       |
|----------|----------|------------|
| `admin`  | `admin`  | superadmin |
| `piotr`  | `piotr`  | nauczyciel |
| `monika` | `monika` | nauczyciel |

> ⚠️ **Zmień hasła natychmiast po pierwszym uruchomieniu!**

---

## 10. Zarządzanie aplikacją

```bash
# Status procesów
pm2 status

# Logi backendu (na żywo)
pm2 logs mathclass-api

# Restart backendu (np. po zmianach w kodzie)
pm2 restart mathclass-api

# Zatrzymanie
pm2 stop mathclass-api

# Przebudowanie frontendu po zmianach
cd frontend
npm run build
# (Nginx automatycznie serwuje nowe pliki — nie trzeba nic restartować)
```

---

## 11. Aktualizacja do nowej wersji

```bash
git pull

# Backend
cd backend
npm install
pm2 restart mathclass-api

# Frontend
cd ../frontend
npm install
npm run build
```

---

## 12. Rozwiązywanie problemów

**Błąd 500 / Permission denied w logach Nginx:**
```bash
sudo tail -20 /var/log/nginx/error.log
chmod o+x /home/TWOJ_USER   # lokalnie
```

**Backend nie łączy się z bazą (`SASL: client password must be a string`):**
```bash
# Sprawdź czy .env jest poprawny
cat backend/.env

# Uruchom backend z właściwego katalogu
pm2 delete mathclass-api
cd backend
pm2 start server.js --name mathclass-api --cwd $(pwd)
```

**Sprawdzenie czy API działa:**
```bash
curl http://localhost:3001/api/health
```

**Logi Nginx:**
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## Bezpieczeństwo (produkcja)

```bash
# Firewall — zezwól tylko na HTTP, HTTPS i SSH
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# NIE wystawiaj portu 3001 publicznie — backend działa tylko lokalnie przez Nginx
```