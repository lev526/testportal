<?php

declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth.php';

/**
 * POST /api/register — Регистрация нового пользователя
 */
function handleRegister(): void
{
    $body = getJsonBody();
    $login = trim((string)($body['login'] ?? ''));
    $password = (string)($body['password'] ?? '');

    if ($login === '' || $password === '') {
        jsonError('Логин и пароль обязательны', 400);
    }

    if (mb_strlen($login) > 100) {
        jsonError('Логин не должен превышать 100 символов', 400);
    }

    $pdo = getDb();

    // Проверяем, не занят ли логин
    $stmt = $pdo->prepare('SELECT id FROM users WHERE login = ?');
    $stmt->execute([$login]);
    if ($stmt->fetch()) {
        jsonError('Пользователь с таким логином уже существует', 409);
    }

    // Хешируем пароль и сохраняем пользователя с ролью user
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('INSERT INTO users (login, password_hash, role) VALUES (?, ?, ?)');
    $stmt->execute([$login, $hash, 'user']);

    $user = [
        'id' => (int)$pdo->lastInsertId(),
        'login' => $login,
        'role' => 'user',
    ];

    // Сразу авторизуем пользователя после регистрации
    session_regenerate_id(true);
    $_SESSION['user'] = $user;

    jsonResponse($user, 201);
}

/**
 * POST /api/login — Вход по логину и паролю
 */
function handleLogin(): void
{
    $body = getJsonBody();
    $login = trim((string)($body['login'] ?? ''));
    $password = (string)($body['password'] ?? '');

    if ($login === '' || $password === '') {
        jsonError('Введите логин и пароль', 400);
    }

    $pdo = getDb();
    $stmt = $pdo->prepare('SELECT id, login, password_hash, role FROM users WHERE login = ?');
    $stmt->execute([$login]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($password, $row['password_hash'])) {
        jsonError('Неверный логин или пароль', 401);
    }

    $user = [
        'id' => (int)$row['id'],
        'login' => $row['login'],
        'role' => $row['role'],
    ];

    // Обновляем ID сессии для защиты от атаки фиксации сессии (Session Fixation)
    session_regenerate_id(true);
    $_SESSION['user'] = $user;

    jsonResponse($user);
}

/**
 * POST /api/logout — Выход из системы
 */
function handleLogout(): void
{
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );
    }

    session_destroy();
    jsonResponse(['status' => 'ok']);
}

/**
 * GET /api/me — Получение текущего пользователя
 */
function handleMe(): void
{
    $user = requireLogin();
    jsonResponse($user);
}