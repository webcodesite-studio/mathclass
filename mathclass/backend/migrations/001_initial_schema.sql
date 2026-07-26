-- ============================================================
--  Migracja 001: Schemat początkowy
--  Przeniesiony z mathclass_schema.sql
--  Data: 2025-01
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS classes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username         TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  password_hash    TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student', 'teacher')),
  class_id         UUID REFERENCES classes(id) ON DELETE SET NULL,
  active           BOOLEAN NOT NULL DEFAULT true,
  session_locked   BOOLEAN NOT NULL DEFAULT false,
  session_minutes  INTEGER,
  remaining_seconds INTEGER,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  locked_at  TIMESTAMPTZ,
  active     BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS categories (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'Różne',
  difficulty  TEXT NOT NULL DEFAULT 'łatwe' CHECK (difficulty IN ('łatwe', 'średnie', 'trudne')),
  image_url   TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS answers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id      UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  given_answer TEXT NOT NULL,
  correct      BOOLEAN NOT NULL,
  attempt_no   INTEGER NOT NULL DEFAULT 1,
  answered_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS category_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type   TEXT NOT NULL CHECK (target_type IN ('class', 'user')),
  target_id     UUID NOT NULL,
  category_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teacher_classes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  UNIQUE (teacher_id, class_id)
);

CREATE TABLE IF NOT EXISTS bug_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_username TEXT,
  reporter_role     TEXT,
  message           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE VIEW student_stats AS
SELECT
  u.id                                                        AS user_id,
  u.username,
  u.name,
  c.name                                                      AS class,
  COUNT(a.id)                                                 AS total_attempts,
  COUNT(a.id)         FILTER (WHERE a.correct)                AS correct_answers,
  COUNT(DISTINCT a.task_id) FILTER (WHERE a.correct)          AS tasks_solved,
  ROUND(100.0 * COUNT(a.id) FILTER (WHERE a.correct) / NULLIF(COUNT(a.id), 0), 1) AS accuracy_pct,
  MAX(a.answered_at)                                          AS last_activity
FROM users u
LEFT JOIN classes c ON c.id = u.class_id
LEFT JOIN answers a ON a.user_id = u.id
WHERE u.role = 'student'
GROUP BY u.id, u.username, u.name, c.name;
