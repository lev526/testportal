<?php

declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function jsonResponse(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}


function jsonError(string $message, int $status = 400): never
{
    jsonResponse(['error' => $message], $status);
}


function getJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }


    if (str_starts_with($raw, "\xEF\xBB\xBF")) {
        $raw = substr($raw, 3);
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        jsonError('Некорректный формат JSON', 400);
    }

    return $data;
}


function requireLogin(): array
{
    if (empty($_SESSION['user'])) {
        jsonError('Требуется авторизация', 401);
    }

    return $_SESSION['user'];
}


function requireAdmin(): array
{
    $user = requireLogin();

    if (($user['role'] ?? '') !== 'admin') {
        jsonError('Доступ запрещён: требуются права администратора', 403);
    }

    return $user;
}