-- MathClass Schema - PostgreSQL

-- ============ DROP & CREATE DATABASE ============
DROP DATABASE IF EXISTS mathclass;
CREATE DATABASE mathclass;

-- Connect to database
\c mathclass;

-- ============ TABLES ============

-- Klasy
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT now()
);

-- Użytkownicy (nauczyciele i uczniowie)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'admin')),
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT true,
  session_minutes INTEGER, -- NULL = bez limitu
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Sesje użytkowników
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP,
  active BOOLEAN DEFAULT true,
  locked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Zadania matematyczne (ze zdj. w BASE64)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  difficulty VARCHAR(20) CHECK (difficulty IN ('łatwe', 'średnie', 'trudne')),
  image_data TEXT, -- BASE64 encoded image
  image_type VARCHAR(20), -- e.g., 'image/png', 'image/jpeg'
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Odpowiedzi studentów
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  given_answer VARCHAR(255) NOT NULL,
  correct BOOLEAN,
  attempt_no INTEGER DEFAULT 1,
  answered_at TIMESTAMP DEFAULT now()
);

-- ============ INDEXES ============
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_class_id ON users(class_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_active ON sessions(active);
CREATE INDEX idx_tasks_active ON tasks(active);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_answers_user_id ON answers(user_id);
CREATE INDEX idx_answers_task_id ON answers(task_id);
CREATE INDEX idx_answers_answered_at ON answers(answered_at);

-- ============ VIEW: STUDENT STATISTICS ============
CREATE VIEW student_stats AS
SELECT 
  u.id as user_id,
  u.name,
  u.username,
  c.name as class,
  COUNT(DISTINCT a.task_id) as tasks_solved,
  SUM(CASE WHEN a.correct = true THEN 1 ELSE 0 END)::INTEGER as correct_answers,
  COUNT(a.id)::INTEGER as total_attempts,
  ROUND(100.0 * SUM(CASE WHEN a.correct = true THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0))::INTEGER as accuracy_pct
FROM users u
LEFT JOIN classes c ON u.class_id = c.id
LEFT JOIN answers a ON u.id = a.user_id
WHERE u.role = 'student'
GROUP BY u.id, u.name, u.username, c.name;

-- ============ SEED DATA ============

-- Dodaj przykładowe klasy
INSERT INTO classes (name) VALUES ('1A'), ('1B'), ('2A'), ('2B'), ('3A') 
ON CONFLICT (name) DO NOTHING;

-- Dodaj nauczyciela (admin)
INSERT INTO users (username, name, password_hash, role, active) 
VALUES ('admin', 'Nauczyciel Admin', 'admin123', 'admin', true)
ON CONFLICT (username) DO NOTHING;

-- Dodaj przykładowych uczniów
INSERT INTO users (username, name, password_hash, role, class_id, active, session_minutes)
SELECT 'jan_1a', 'Jan Kowalski', 'haslo123', 'student', (SELECT id FROM classes WHERE name = '1A'), true, 60
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'jan_1a')
UNION ALL
SELECT 'maria_1a', 'Maria Lewandowska', 'haslo123', 'student', (SELECT id FROM classes WHERE name = '1A'), true, 60
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'maria_1a')
UNION ALL
SELECT 'piotr_1b', 'Piotr Nowak', 'haslo123', 'student', (SELECT id FROM classes WHERE name = '1B'), true, 60
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'piotr_1b');

-- Dodaj przykładowe zadania (BASE64 zdjęcia mogą być dodane później)
INSERT INTO tasks (question, answer, category, difficulty, image_data, image_type, active)
VALUES 
  ('Ile to 5 × 7?', '35', 'Mnożenie', 'łatwe', NULL, NULL, true),
  ('Ile to √25?', '5', 'Pierwiastki', 'łatwe', NULL, NULL, true),
  ('Ile to 12 + 8?', '20', 'Dodawanie', 'łatwe', NULL, NULL, true),
  ('Ile to 50 ÷ 2?', '25', 'Dzielenie', 'łatwe', NULL, NULL, true),
  ('Ile to 2³?', '8', 'Potęgi', 'średnie', NULL, NULL, true),
  ('Ile to |-15|?', '15', 'Wartość bezwzględna', 'średnie', NULL, NULL, true),
  ('Rozwiąż: 2x + 3 = 11', '4', 'Równania', 'średnie', NULL, NULL, true),
  ('Ile to √144?', '12', 'Pierwiastki', 'średnie', NULL, NULL, true),
  ('Ile to (3 + 2)²?', '25', 'Potęgi', 'średnie', NULL, NULL, true),
  ('Rozwiąż: x² - 5x + 6 = 0', '2, 3', 'Równania kwadratowe', 'trudne', NULL, NULL, true),
  ('Ile to sin(90°)?', '1', 'Trygonometria', 'trudne', NULL, NULL, true),
  ('Ile to log₂(8)?', '3', 'Logarytmy', 'trudne', NULL, NULL, true)
ON CONFLICT DO NOTHING;

-- ============ FUNCTIONS ============

-- Funkcja do pobierania losowych unikalnych zadań dla ucznia
CREATE OR REPLACE FUNCTION get_random_tasks_for_student(p_user_id UUID, p_limit INT DEFAULT 6)
RETURNS TABLE(id UUID, question TEXT, answer VARCHAR, category VARCHAR, difficulty VARCHAR, image_data TEXT, image_type VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.question, t.answer, t.category, t.difficulty, t.image_data, t.image_type
  FROM tasks t
  WHERE t.active = true
    AND t.id NOT IN (
      SELECT task_id FROM answers WHERE user_id = p_user_id AND correct = true
    )
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============ GRANTS (dla aplikacji) ============
GRANT CONNECT ON DATABASE mathclass TO mathclass_user;
GRANT USAGE ON SCHEMA public TO mathclass_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mathclass_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mathclass_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO mathclass_user;
