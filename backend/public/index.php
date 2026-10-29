<?php

declare(strict_types=1);

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'];

// Позволяем встроенному серверу PHP отдавать загруженные картинки напрямую
if (str_starts_with($uri, '/uploads/') && is_file(__DIR__ . $uri)) {
    return false;
}

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../handlers/auth.php';

try {
    // --- Маршруты авторизации (Сессия 2) ---
    if ($method === 'POST' && $uri === '/api/register') {
        handleRegister();
    }
    if ($method === 'POST' && $uri === '/api/login') {
        handleLogin();
    }
    if ($method === 'POST' && $uri === '/api/logout') {
        handleLogout();
    }
    if ($method === 'GET' && $uri === '/api/me') {
        handleMe();
    }

    // Если ни один маршрут не подошёл
    jsonError('Маршрут не найден', 404);
} catch (Throwable $e) {
    jsonError('Внутренняя ошибка сервера: ' . $e->getMessage(), 500);
}