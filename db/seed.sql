USE testportal;
SET NAMES utf8mb4;

-- Очищаем таблицы от дочерних к родительским
DELETE FROM attempt_answers;
DELETE FROM attempts;
DELETE FROM answers;
DELETE FROM questions;
DELETE FROM tests;
DELETE FROM users;

-- Пользователи: admin (пароль admin123) и student (пароль student123)
INSERT INTO users (id, login, password_hash, role) VALUES
(1, 'admin', '$2y$10$hyzG6d/2NX7jsMyyZL7IA.UuOdD4QPqG1Nlu3QN3kU1pTZ5SIS2i.', 'admin'),
(2, 'student', '$2y$10$eFIQbvpdnzXPMvN5Dp68QOqE97gIqEFrw.vMv1efuGuDgCVkWe2aC', 'user');

-- 3 демонстрационных теста
INSERT INTO tests (id, title, description, max_attempts) VALUES
(1, 'Основы веб-разработки и протокола HTTP', 'Проверка знаний по методам HTTP, кодам ответа и работе сессий в PHP.', 2),
(2, 'Реляционные базы данных и язык SQL', 'Вопросы по первичным и внешним ключам, нормализации и транзакциям в MySQL.', 3),
(3, 'Фронтенд-разработка на React', 'Компоненты, хуки состояния useState/useEffect и маршрутизация.', 1);

-- Вопросы к Тесту 1
INSERT INTO questions (id, test_id, text, type, weight, image_path) VALUES
(1, 1, 'Какой HTTP-код означает успешное создание нового ресурса на сервере?', 'single', 2, '/uploads/demo_http.png'),
(2, 1, 'Какие из перечисленных HTTP-методов обычно содержат тело запроса (Request Body)?', 'multiple', 3, NULL),
(3, 1, 'Где по умолчанию хранятся данные массива $_SESSION в PHP?', 'single', 1, NULL);

INSERT INTO answers (id, question_id, text, is_correct) VALUES
(1, 1, '200 OK', 0),
(2, 1, '201 Created', 1),
(3, 1, '404 Not Found', 0),
(4, 2, 'POST', 1),
(5, 2, 'PUT', 1),
(6, 2, 'GET', 0),
(7, 3, 'На сервере (в браузере хранится только cookie с ID сессии)', 1),
(8, 3, 'В открытом виде внутри localStorage браузера', 0);

-- Вопросы к Тесту 2
INSERT INTO questions (id, test_id, text, type, weight, image_path) VALUES
(4, 2, 'Что обеспечивает ограничение FOREIGN KEY ... ON DELETE CASCADE?', 'single', 2, '/uploads/demo_sql.png'),
(5, 2, 'Выберите команды, которые относятся к управлению транзакциями в SQL:', 'multiple', 3, NULL);

INSERT INTO answers (id, question_id, text, is_correct) VALUES
(9, 4, 'Автоматическое удаление дочерних записей при удалении родительской записи', 1),
(10, 4, 'Шифрование паролей пользователей в таблице', 0),
(11, 5, 'COMMIT', 1),
(12, 5, 'ROLLBACK', 1),
(13, 5, 'SELECT', 0);

-- Вопросы к Тесту 3
INSERT INTO questions (id, test_id, text, type, weight, image_path) VALUES
(6, 3, 'Какой хук используется в React для выполнения запроса к API при монтировании компонента?', 'single', 2, '/uploads/demo_react.png'),
(7, 3, 'Какие правила обязательно соблюдать при рендеринге списков в React?', 'multiple', 2, NULL);

INSERT INTO answers (id, question_id, text, is_correct) VALUES
(14, 6, 'useEffect', 1),
(15, 6, 'useMemo', 0),
(16, 7, 'Передавать уникальный и стабильный проп key каждому элементу', 1),
(17, 7, 'Не мутировать массив состояния напрямую перед вызовом setState', 1),
(18, 7, 'Обязательно использовать Redux для каждого списка', 0);

-- Демонстрационная завершённая попытка студента по Тесту 1 (5 из 6 баллов = 83.3%)
INSERT INTO attempts (id, user_id, test_id, started_at, finished_at, score, max_score) VALUES
(1, 2, 1, '2026-10-30 14:00:00', '2026-10-30 14:04:15', 5, 6);

INSERT INTO attempt_answers (attempt_id, question_id, answer_id) VALUES
(1, 1, 2),
(1, 2, 4),
(1, 2, 5),
(1, 3, 8);