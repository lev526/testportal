# Тестовый веб-портал (Курсовая работа)

Веб-приложение для создания и прохождения тестов с поддержкой вопросов одиночного (`single`) и множественного (`multiple`) выбора, весовых коэффициентов, загрузки иллюстраций и ограничения количества попыток.

## Стек технологий
- **Бэкенд:** PHP 8 (без фреймворков, PDO, сессии)
- **База данных:** MySQL / MariaDB (XAMPP + phpMyAdmin)
- **Фронтенд:** React (Vite, JavaScript, React Router, Bootstrap 5)

## Шаги запуска с нуля

### 1. База данных (XAMPP и phpMyAdmin)
1. Запустите **Apache** и **MySQL** в панели **XAMPP Control Panel**.
2. Откройте `http://localhost/phpmyadmin`.
3. На вкладке **SQL** выполните содержимое файла `db/schema.sql` (создаст БД `testportal` и 6 таблиц).
4. На вкладке **SQL** выполните содержимое файла `db/seed.sql` (добавит демо-пользователей и 3 теста).

### 2. Запуск бэкенда
В первом окне PowerShell из корня проекта `testportal` выполните:
```powershell
C:\xampp\php\php.exe -S 127.0.0.1:8000 -t backend/public backend/public/index.php