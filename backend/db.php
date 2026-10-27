<?php

function getDb(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        $host = '127.0.0.1';
        $db   = 'testportal';
        $user = 'root';
        $pass = ''; // В стандартном XAMPP пароль у root пустой
        $charset = 'utf8mb4';

        $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Ошибки БД как исключения
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Результат как ассоциативный массив
            PDO::ATTR_EMULATE_PREPARES   => false,                  // Настоящие подготовленные запросы и верные типы INT
        ];

        $pdo = new PDO($dsn, $user, $pass, $options);
    }

    return $pdo;
}