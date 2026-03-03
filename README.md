# MathClass - System Zadań Matematycznych

Kompletna aplikacja do zarządzania zadaniami matematycznymi dla uczniów z Docker + PostgreSQL.

## 🎯 Cechy

- ✅ **Unikalnych 6 zadań losowo** dla każdego ucznia
- ✅ **Base64 zdjęcia w bazie** (eleganckie rozwiązanie)
- ✅ **PostgreSQL w Docker**
- ✅ **Panel nauczyciela** do zarządzania uczniami i zadaniami
- ✅ **System sesji** z limitem czasowym
- ✅ **Statystyki uczniów** w rzeczywistym czasie
- ✅ **Responsywny UI** - działa na telefonie i desktopie

## 🚀 Szybki Start

### Wymagania
- Docker i Docker Compose
- Git (opcjonalnie)

### Instalacja

```bash
# 1. Klonuj lub skopiuj pliki projektu
cd mathclass

# 2. Uruchom Docker Compose
docker-compose up -d

# Czekaj ~30 sekund na uruchomienie PostgreSQL
sleep 30

# 3. Sprawdź status
docker-compose ps
```

### Dostęp do aplikacji
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001/api/health
- **PostgreSQL**: localhost:5432

### Dane logowania (seed)

**Nauczyciel (Admin):**
- Login: `admin`
- Hasło: `admin123`

**Uczniowie (już istnieją):**
- Login: `jan_1a` / Hasło: `haslo123`
- Login: `maria_1a` / Hasło: `haslo123`
- Login: `piotr_1b` / Hasło: `haslo123`

## 📁 Struktura plików

```
mathclass/
├── docker-compose.yml      # Konfiguracja Docker
├── init.sql                # SQL schema + seed data
├── server.js               # Backend Node.js/Express
├── package.json            # Zależności backendu
├── Dockerfile              # Image backendu
├── Dockerfile.frontend     # Image frontendu
├── App.jsx                 # React frontend
└── .gitignore             # Git config
```

## 🔧 Przydatne komendy

```bash
# Pokaż logi
docker-compose logs -f

# Logi konkretnego serwisu
docker-compose logs -f api
docker-compose logs -f postgres

# Wejście do PostgreSQL
docker exec -it mathclass-db psql -U mathclass_user -d mathclass

# Restart serwisów
docker-compose restart

# Wyłącz wszystko
docker-compose down

# Wyłącz i usuń dane (!!!)
docker-compose down -v
```

## 💾 Baza danych

### Tabele
- `users` - uczniowie i nauczyciele
- `classes` - klasy
- `tasks` - zadania (ze zdj. w BASE64!)
- `answers` - rozwiązania uczniów
- `sessions` - sesje logowania

### Kluczowe cechy
- Obrazki przechowywane jako **BASE64 TEXT** w kolumnie `image_data`
- Automatyczne generowanie loginów dla uczniów
- System sesji z limitem czasu
- Widok `student_stats` do statystyk

## 🎓 Jak używać

### Dla nauczyciela
1. Zaloguj się jako admin
2. Przejdź do "📝 Zadania"
3. Dodaj nowe zadania lub prześlij obrazki
4. Zarządzaj uczniami w "👥 Uczniowie"
5. Przeglądaj statystyki w "📊 Statystyki"

### Dla ucznia
1. Zaloguj się (np. jan_1a/haslo123)
2. Dostaniesz losowych 6 zadań
3. Wpisz odpowiedź i kliknij "Sprawdź"
4. Błędna odpowiedź = kara czasowa 10s (2. próba 20s, itd.)
5. Poprawna = nowe zadanie pojawi się automatycznie

## 🖼️ Dodawanie zdjęć do zadań

Zdjęcia są automatycznie konwertowane na Base64 i przechowywane w bazie:

```javascript
// Frontend - user wybiera plik
// Plik jest konwertowany na Base64
// Wysyłany do API
// API przechowuje jako TEXT w `image_data`
// Frontend wyświetla: <img src={task.image_data} />
```

## 🔐 Bezpieczeństwo (production)

**Dla produkcji zmień:**
1. Hasło PostgreSQL w `docker-compose.yml`
2. Dodaj JWT authentication w `server.js`
3. Zmień PASSWORD w `init.sql`
4. Dodaj HTTPS/SSL
5. Ustaw Environment variables zamiast hardcoded

## 🐛 Troubleshooting

**Błąd: "Brak połączenia z bazą"**
```bash
docker-compose logs postgres
docker-compose restart postgres
```

**Błąd: "Port 5432 już zajęty"**
```bash
# Zmień port w docker-compose.yml
# Z "5432:5432" na "5433:5432"
```

**Zdjęcia się nie wysyłają**
- Sprawdź rozmiar pliku (maks 50MB)
- Użyj JPEG lub PNG
- Sprawdź konsolę przeglądarki (F12)

## 📊 API Endpoints

```
POST   /api/login              # Zaloguj się
POST   /api/register           # Zarejestruj się
GET    /api/classes            # Lista klas
GET    /api/users?role=student # Lista uczniów
GET    /api/tasks              # Wszystkie zadania
GET    /api/tasks-for-student  # Losowych 6 dla ucznia
POST   /api/add-task           # Dodaj zadanie
POST   /api/add-tasks-bulk     # Dodaj wiele
PATCH  /api/tasks/:id          # Edytuj zadanie
DELETE /api/tasks/:id          # Usuń zadanie
POST   /api/submit-answer      # Prześlij odpowiedź
GET    /api/student-stats      # Statystyki
```

## 🎨 Personalizacja

Zmień kolory w `App.jsx`:
```javascript
// Kolory w obiekcie S (na dole pliku)
S.root       // Tło główne
S.card       // Karty
S.inp        // Inputy
```

## 📝 Licencja

Projekt edukacyjny - użytkowaj swobodnie!

---

**Pytania? Problemy?** Sprawdź logi lub kontaktuj supportu.
