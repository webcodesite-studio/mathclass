-- ============================================================
--  Migracja 002: Indeksy wydajnościowe
--  Data: 2025-01
-- ============================================================

-- Szybsze wyszukiwanie odpowiedzi ucznia
CREATE INDEX IF NOT EXISTS idx_answers_user_id   ON answers(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_task_id   ON answers(task_id);
CREATE INDEX IF NOT EXISTS idx_answers_answered  ON answers(answered_at DESC);

-- Szybsze filtrowanie użytkowników po klasie i roli
CREATE INDEX IF NOT EXISTS idx_users_class_id    ON users(class_id);
CREATE INDEX IF NOT EXISTS idx_users_role        ON users(role);

-- Szybsze wyszukiwanie sesji
CREATE INDEX IF NOT EXISTS idx_sessions_user_id  ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active   ON sessions(active) WHERE active = true;

-- Szybkie wyszukiwanie zadań po kategorii i aktywności
CREATE INDEX IF NOT EXISTS idx_tasks_category    ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_active      ON tasks(active) WHERE active = true;
