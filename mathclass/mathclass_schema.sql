-- ============================================================
--  MathClass — Pełny schemat PostgreSQL / Supabase
--  Kolejność: rozszerzenia → tabele → widoki → RLS → dane
-- ============================================================

-- 0. ROZSZERZENIA
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
--  1. TABELE
-- ============================================================

-- 1.1 KLASY
CREATE TABLE IF NOT EXISTS classes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.2 UŻYTKOWNICY (uczniowie + adminowie + nauczyciele)
CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username         TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  password_hash    TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student', 'teacher')),
  class_id         UUID REFERENCES classes(id) ON DELETE SET NULL,
  active           BOOLEAN NOT NULL DEFAULT true,
  session_locked   BOOLEAN NOT NULL DEFAULT false,
  session_minutes  INTEGER,                          -- NULL = bez limitu
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- 1.3 SESJE LOGOWANIA
CREATE TABLE IF NOT EXISTS sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,                            -- NULL = brak limitu
  locked_at  TIMESTAMPTZ,                            -- NULL = sesja aktywna
  active     BOOLEAN NOT NULL DEFAULT true
);

-- 1.4 KATEGORIE ZADAŃ
CREATE TABLE IF NOT EXISTS categories (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

-- 1.5 ZADANIA
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'Różne',
  difficulty  TEXT NOT NULL DEFAULT 'łatwe' CHECK (difficulty IN ('łatwe', 'średnie', 'trudne')),
  image_url   TEXT,                                  -- opcjonalny obrazek do zadania
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 1.6 HISTORIA ODPOWIEDZI
CREATE TABLE IF NOT EXISTS answers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id      UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  given_answer TEXT NOT NULL,
  correct      BOOLEAN NOT NULL,
  attempt_no   INTEGER NOT NULL DEFAULT 1,
  answered_at  TIMESTAMPTZ DEFAULT now()
);

-- 1.7 PRZYPISANIE KATEGORII DO KLASY LUB UŻYTKOWNIKA
CREATE TABLE IF NOT EXISTS category_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type   TEXT NOT NULL CHECK (target_type IN ('class', 'user')),
  target_id     UUID NOT NULL,
  category_name TEXT NOT NULL
);

-- 1.8 RELACJA NAUCZYCIEL ↔ KLASA
CREATE TABLE IF NOT EXISTS teacher_classes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  UNIQUE (teacher_id, class_id)
);


-- ============================================================
--  2. WIDOKI
-- ============================================================

CREATE OR REPLACE VIEW student_stats AS
SELECT
  u.id                                                        AS user_id,
  u.username,
  u.name,
  c.name                                                      AS class,
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
GROUP BY u.id, u.username, u.name, c.name;


-- ============================================================
--  3. ROW LEVEL SECURITY
--  Wyłączone — aplikacja łączy się przez service_role key
-- ============================================================

ALTER TABLE classes              DISABLE ROW LEVEL SECURITY;
ALTER TABLE users                DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions             DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories           DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                DISABLE ROW LEVEL SECURITY;
ALTER TABLE answers              DISABLE ROW LEVEL SECURITY;
ALTER TABLE category_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_classes      DISABLE ROW LEVEL SECURITY;


-- ============================================================
--  4. DANE STARTOWE
-- ============================================================

-- 4.1 Klasy
INSERT INTO classes (name) VALUES
  ('1A'), ('1B'),
  ('2A'), ('2B'),
  ('3A'), ('3B')
ON CONFLICT (name) DO NOTHING;

-- 4.2 Administratorzy (hasła plain-text — zmień po wdrożeniu!)
INSERT INTO users (username, name, password_hash, role, active) VALUES
  ('admin',  'Administrator', 'admin',  'admin', true),
  ('piotr',  'Piotr',         'piotr',  'admin', true),
  ('monika', 'Monika',        'monika', 'admin', true)
ON CONFLICT (username) DO NOTHING;

-- 4.3 Kategorie
INSERT INTO categories (name) VALUES
  ('Mnożenie'),
  ('Dzielenie'),
  ('Potęgi'),
  ('Pierwiastki'),
  ('Równania'),
  ('Procenty'),
  ('Geometria'),
  ('Ułamki'),
  ('Ułamki dziesiętne'),
  ('Kombinatoryka'),
  ('Teoria liczb'),
  ('Różne')
ON CONFLICT (name) DO NOTHING;

-- 4.4 Przykładowe zadania
INSERT INTO tasks (question, answer, category, difficulty) VALUES
  ('Ile to 12 × 8?',                                          '96',   'Mnożenie',          'łatwe'),
  ('Ile to 7 × 13?',                                          '91',   'Mnożenie',          'łatwe'),
  ('Ile to 1000 × 0.001?',                                    '1',    'Mnożenie',          'łatwe'),
  ('Ile to 144 ÷ 12?',                                        '12',   'Dzielenie',         'łatwe'),
  ('Ile to 2³ + 3²?',                                         '17',   'Potęgi',            'średnie'),
  ('Ile to 2⁸?',                                              '256',  'Potęgi',            'średnie'),
  ('Ile to √169?',                                            '13',   'Pierwiastki',       'średnie'),
  ('Ile to √256?',                                            '16',   'Pierwiastki',       'średnie'),
  ('Rozwiąż: 2x + 6 = 14. Ile wynosi x?',                    '4',    'Równania',          'średnie'),
  ('Rozwiąż: 3x - 9 = 12. Ile wynosi x?',                    '7',    'Równania',          'średnie'),
  ('Rozwiąż: x² = 49. Podaj x > 0.',                         '7',    'Równania',          'średnie'),
  ('Ile to 15% z 200?',                                       '30',   'Procenty',          'łatwe'),
  ('Ile to 25% z 80?',                                        '20',   'Procenty',          'łatwe'),
  ('Obwód kwadratu o boku 7 cm?',                             '28',   'Geometria',         'łatwe'),
  ('Suma kątów trójkąta wynosi?',                             '180',  'Geometria',         'łatwe'),
  ('Pole koła o r=5? (π≈3.14, do 2 miejsc po przecinku)',     '78.5', 'Geometria',         'średnie'),
  ('Ile to 3/4 + 1/8?',                                       '7/8',  'Ułamki',            'średnie'),
  ('Ile to 0.75 × 120?',                                      '90',   'Ułamki dziesiętne', 'łatwe'),
  ('Ile to 5! (silnia)?',                                     '120',  'Kombinatoryka',     'trudne'),
  ('NWD(24, 36) = ?',                                         '12',   'Teoria liczb',      'średnie')
ON CONFLICT DO NOTHING;


-- ============================================================
--  5. PRZYDATNE ZAPYTANIA (tylko komentarze — nie wykonują się)
-- ============================================================

-- Statystyki wszystkich uczniów:
-- SELECT * FROM student_stats ORDER BY class, tasks_solved DESC;

-- Historia odpowiedzi ucznia:
-- SELECT a.*, t.question, t.category
-- FROM answers a JOIN tasks t ON t.id = a.task_id
-- WHERE a.user_id = '<UUID>'
-- ORDER BY a.answered_at DESC;

-- Zablokuj sesję ucznia:
-- UPDATE sessions SET locked_at = now(), active = false
-- WHERE user_id = '<UUID>' AND active = true;

-- Zablokuj konto ucznia:
-- UPDATE users SET session_locked = true WHERE id = '<UUID>';

-- ============================================================
--  KONIEC SCHEMATU
-- ============================================================
