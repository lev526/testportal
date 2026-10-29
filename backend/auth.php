<?php

declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Отправляет JSON-ответ с нужным HTTP-кодом и завершает скрипт
 */
function jsonResponse(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Отправляет JSON с текстом ошибки и HTTP-кодом (400, 401, 403, 404, 409, 500)
 */
function jsonError(string $message, int $status = 400): never
{
    jsonResponse(['error' => $message], $status);
}

/**
 * Читает тело запроса и декодирует JSON в массив
 */
function getJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        jsonError('Некорректный формат JSON', 400);
    }

    return $data;
}

/**
 * Проверяет, что пользователь вошёл в систему, и возвращает его данные
 */
function requireLogin(): array
{
    if (empty($_SESSION['user'])) {
        jsonError('Требуется авторизация', 401);
    }

    return $_SESSION['user'];
}

/**
 * Проверяет, что пользователь — администратор
 */
function requireAdmin(): array
{
    $user = requireLogin();

    if (($user['role'] ?? '') !== 'admin') {
        jsonError('Доступ запрещён: требуются права администратора', 403);
    }

    return $user;
}