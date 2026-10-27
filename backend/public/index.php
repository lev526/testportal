<?php

declare(strict_types=1);

require_once __DIR__ . '/../db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = getDb();
    // Проверим, что таблица users читается и админ на месте
    $stmt = $pdo->query('SELECT id, login, role FROM users LIMIT 1');
    $admin = $stmt->fetch();

    echo json_encode([
        'status' => 'ok',
        'message' => 'Бэкенд и подключение к MySQL работают!',
        'first_user' => $admin,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Ошибка подключения к БД: ' . $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}