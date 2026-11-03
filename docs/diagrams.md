# Диаграммы проекта «Тестовый веб-портал»

## 1. ER-диаграмма базы данных (Mermaid)

Отражает 6 таблиц БД `testportal` (`db/schema.sql`) и связи `1:N` через внешние ключи с `ON DELETE CASCADE`.

```mermaid
erDiagram
    users ||--o{ attempts : "проходит (user_id)"
    tests ||--o{ questions : "содержит (test_id)"
    tests ||--o{ attempts : "имеет попытки (test_id)"
    questions ||--o{ answers : "имеет варианты (question_id)"
    questions ||--o{ attempt_answers : "отвечен в (question_id)"
    answers ||--o{ attempt_answers : "выбран как (answer_id)"
    attempts ||--o{ attempt_answers : "включает выбор (attempt_id)"

    users {
        int id PK
        varchar login UK "Уникальный логин"
        varchar password_hash "Bcrypt-хеш пароля"
        enum role "admin | user"
    }

    tests {
        int id PK
        varchar title "Название теста"
        text description "Описание"
        int max_attempts "Лимит попыток"
    }

    questions {
        int id PK
        int test_id FK
        text text "Текст вопроса"
        enum type "single | multiple"
        int weight "Вес в баллах"
        varchar image_path "Путь к картинке (NULL)"
    }

    answers {
        int id PK
        int question_id FK
        text text "Текст ответа"
        tinyint is_correct "0 или 1"
    }

    attempts {
        int id PK
        int user_id FK
        int test_id FK
        datetime started_at "Время старта"
        datetime finished_at "NULL = в процессе"
        int score "Набранный балл"
        int max_score "Сумма весов"
    }

    attempt_answers {
        int id PK
        int attempt_id FK
        int question_id FK
        int answer_id FK
    }
```

---

## 2. Диаграмма классов и модулей системы (Mermaid Class Diagram)

Отражает реальную модульную структуру бэкенда на PHP (`backend/`) и клиентских компонентов React (`frontend/src/`).

```mermaid
classDiagram
    direction TB

    class Router_IndexPHP {
        <<backend/public/index.php>>
        +parse_url()
        +routeRequest(method, uri)
    }

    class Database_DbPHP {
        <<backend/db.php>>
        -PDO pdo
        +getDb() PDO
    }

    class AuthMiddleware_AuthPHP {
        <<backend/auth.php>>
        +jsonResponse(data, status)
        +jsonError(message, status)
        +getJsonBody() array
        +requireLogin() array
        +requireAdmin() array
    }

    class AuthHandler {
        <<backend/handlers/auth.php>>
        +handleRegister()
        +handleLogin()
        +handleLogout()
        +handleMe()
    }

    class TestsHandler {
        <<backend/handlers/tests.php>>
        +handleGetTests()
        +handleGetTestEdit(testId)
        +validateQuestions(questions) array
        +insertQuestionsAndAnswers(pdo, testId, questions)
        +handleCreateTest()
        +handleUpdateTest(testId)
        +handleDeleteTest(testId)
        +handleUpload()
    }

    class AttemptsHandler {
        <<backend/handlers/attempts.php>>
        +calcPercentage(score, maxScore) float
        +handleStartAttempt(testId)
        +handleCancelAttempt(attemptId)
        +handleSubmitAttempt(attemptId)
        +handleGetAttempt(attemptId)
        +handleGetMyAttempts()
        +handleGetTestResults(testId)
    }

    class FrontendApp {
        <<frontend/src/App.jsx>>
        +user : Object
        +RequireAuth()
        +RequireAdmin()
    }

    class ApiClient {
        <<frontend/src/api.js>>
        +apiRequest(url, options) Promise
    }

    class UserPages {
        <<React (User) Pages>>
        +LoginPage
        +RegisterPage
        +TestsListPage
        +TakeTestPage
        +AttemptResultPage
        +MyAttemptsPage
    }

    class AdminPages {
        <<React (Admin) Pages>>
        +AdminTestsPage
        +TestEditorPage
        +AdminTestResultsPage
    }

    FrontendApp --> UserPages : маршрутизирует
    FrontendApp --> AdminPages : защищает ролью admin
    UserPages --> ApiClient : вызывает
    AdminPages --> ApiClient : вызывает
    ApiClient ..> Router_IndexPHP : HTTP JSON / FormData (credentials include)

    Router_IndexPHP --> AuthHandler
    Router_IndexPHP --> TestsHandler
    Router_IndexPHP --> AttemptsHandler

    AuthHandler --> Database_DbPHP
    AuthHandler --> AuthMiddleware_AuthPHP
    TestsHandler --> Database_DbPHP
    TestsHandler --> AuthMiddleware_AuthPHP
    AttemptsHandler --> Database_DbPHP
    AttemptsHandler --> AuthMiddleware_AuthPHP
```

---

## 3. Диаграмма прецедентов (Use Case Diagram)

### Вариант А: Код для PlantUML (классический стандарт UML)
Скопируй этот код на сайт `https://www.plantuml.com/plantuml/uml` или в плагин PlantUML в VS Code / Obsidian, чтобы сохранить PNG/SVG для печати.

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "Гость" as Guest
actor "Пользователь (user)" as User
actor "Администратор (admin)" as Admin

User --|> Guest
Admin --|> User

rectangle "Тестовый веб-портал" {
    usecase "Регистрация (/api/register)" as UC_Reg
    usecase "Вход по логину и паролю (/api/login)" as UC_Login
    usecase "Выход из системы (/api/logout)" as UC_Logout

    usecase "Просмотр списка тестов и остатка попыток" as UC_List
    usecase "Старт и прохождение теста (single / multiple)" as UC_Take
    usecase "Выход из теста без списания попытки" as UC_Cancel
    usecase "Отправка ответов и расчёт баллов с весами" as UC_Submit
    usecase "Просмотр своей истории попыток" as UC_History

    usecase "Создание и редактирование теста (JSON)" as UC_EditTest
    usecase "Загрузка картинки к вопросу (/api/upload)" as UC_Upload
    usecase "Удаление теста" as UC_DeleteTest
    usecase "Просмотр результатов всех пользователей" as UC_AllResults
}

Guest --> UC_Reg
Guest --> UC_Login

User --> UC_Logout
User --> UC_List
User --> UC_Take
User --> UC_History
UC_Take ..> UC_Cancel : <<extend>>
UC_Take ..> UC_Submit : <<include>>

Admin --> UC_EditTest
Admin --> UC_DeleteTest
Admin --> UC_AllResults
UC_EditTest ..> UC_Upload : <<extend>>
@enduml
```

### Вариант Б: Схема прецедентов в Mermaid (для просмотра прямо в Obsidian)

```mermaid
flowchart LR
    Guest(["👤 Гость"])
    User(["👤 Пользователь (user)"])
    Admin(["👤 Администратор (admin)"])

    subgraph Portal["Тестовый веб-портал"]
        UC1("Регистрация и вход")
        UC2("Просмотр тестов и остатка попыток")
        UC3("Прохождение теста (single / multiple)")
        UC4("Выход без потери попытки")
        UC5("Завершение и подсчёт баллов по весам")
        UC6("Просмотр личной истории попыток")
        UC7("Создание / редактирование теста и весов")
        UC8("Загрузка картинки к вопросу")
        UC9("Удаление теста")
        UC10("Просмотр результатов всех пользователей")
    end

    Guest --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6

    Admin --> UC7
    Admin --> UC8
    Admin --> UC9
    Admin --> UC10
```