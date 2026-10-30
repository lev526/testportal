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
require_once __DIR__ . '/../handlers/tests.php';
require_once __DIR__ . '/../handlers/attempts.php';

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

    // --- Маршруты редактора тестов и загрузки (Сессия 3) ---
    if ($method === 'GET' && $uri === '/api/tests') {
        handleGetTests();
    }
    if ($method === 'POST' && $uri === '/api/tests') {
        handleCreateTest();
    }
    if ($method === 'POST' && $uri === '/api/upload') {
        handleUpload();
    }
    if ($method === 'GET' && preg_match('#^/api/tests/(\d+)/edit$#', $uri, $m)) {
        handleGetTestEdit((int)$m[1]);
    }
    if ($method === 'PUT' && preg_match('#^/api/tests/(\d+)$#', $uri, $m)) {
        handleUpdateTest((int)$m[1]);
    }
    if ($method === 'DELETE' && preg_match('#^/api/tests/(\d+)$#', $uri, $m)) {
        handleDeleteTest((int)$m[1]);
    }

    // --- Маршруты прохождения тестов и результатов (Сессия 4) ---
    if ($method === 'POST' && preg_match('#^/api/tests/(\d+)/start$#', $uri, $m)) {
        handleStartAttempt((int)$m[1]);
    }
    if ($method === 'POST' && preg_match('#^/api/attempts/(\d+)/submit$#', $uri, $m)) {
        handleSubmitAttempt((int)$m[1]);
    }
    if ($method === 'GET' && preg_match('#^/api/attempts/(\d+)$#', $uri, $m)) {
        handleGetAttempt((int)$m[1]);
    }
    if ($method === 'GET' && $uri === '/api/my/attempts') {
        handleGetMyAttempts();
    }
    if ($method === 'GET' && preg_match('#^/api/tests/(\d+)/results$#', $uri, $m)) {
        handleGetTestResults((int)$m[1]);
    }

    // Если ни один маршрут не подошёл
    jsonError('Маршрут не найден', 404);
} catch (Throwable $e) {
    jsonError('Внутренняя ошибка сервера: ' . $e->getMessage(), 500);
}