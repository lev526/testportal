<?php

declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth.php';

/**
 * Считает процент правильных ответов: сумма баллов / сумма весов * 100%
 */
function calcPercentage(int $score, int $maxScore): float
{
    if ($maxScore <= 0) {
        return 0.0;
    }
    return round(($score / $maxScore) * 100, 1);
}

/**
 * POST /api/tests/{id}/start — Начать попытку, вернуть вопросы БЕЗ is_correct
 */
function handleStartAttempt(int $testId): void
{
    $user = requireLogin();
    $pdo = getDb();

    // 1. Проверяем существование теста
    $stmt = $pdo->prepare('SELECT id, title, description, max_attempts FROM tests WHERE id = ?');
    $stmt->execute([$testId]);
    $test = $stmt->fetch();

    if (!$test) {
        jsonError('Тест не найден', 404);
    }

    // 2. Проверяем лимит попыток (попытка тратится при старте)
    $stmtCount = $pdo->prepare('SELECT COUNT(*) FROM attempts WHERE test_id = ? AND user_id = ?');
    $stmtCount->execute([$testId, $user['id']]);
    $usedAttempts = (int)$stmtCount->fetchColumn();
    $maxAttempts = (int)$test['max_attempts'];

    if ($usedAttempts >= $maxAttempts) {
        jsonError('Исчерпан лимит попыток для этого теста', 409);
    }

    // 3. Загружаем вопросы теста
    $stmtQ = $pdo->prepare('SELECT id, text, type, weight, image_path FROM questions WHERE test_id = ? ORDER BY id ASC');
    $stmtQ->execute([$testId]);
    $questions = $stmtQ->fetchAll();

    if (count($questions) === 0) {
        jsonError('В тесте нет вопросов', 400);
    }

    // Считаем максимальный балл (сумма весов всех вопросов)
    $maxScore = 0;
    foreach ($questions as $q) {
        $maxScore += (int)$q['weight'];
    }

    // 4. Создаём запись попытки (finished_at = NULL означает, что попытка идёт)
    $stmtIns = $pdo->prepare('
        INSERT INTO attempts (user_id, test_id, started_at, finished_at, score, max_score)
        VALUES (?, ?, NOW(), NULL, 0, ?)
    ');
    $stmtIns->execute([$user['id'], $testId, $maxScore]);
    $attemptId = (int)$pdo->lastInsertId();

    // 5. Загружаем варианты ответов строго БЕЗ поля is_correct
    $stmtA = $pdo->prepare('SELECT id, text FROM answers WHERE question_id = ? ORDER BY id ASC');

    $formattedQuestions = [];
    foreach ($questions as $q) {
        $stmtA->execute([$q['id']]);
        $answers = $stmtA->fetchAll();

        $formattedAnswers = [];
        foreach ($answers as $a) {
            $formattedAnswers[] = [
                'id'   => (int)$a['id'],
                'text' => $a['text'],
            ];
        }

        $formattedQuestions[] = [
            'id'         => (int)$q['id'],
            'text'       => $q['text'],
            'type'       => $q['type'],
            'weight'     => (int)$q['weight'],
            'image_path' => $q['image_path'],
            'answers'    => $formattedAnswers,
        ];
    }

    jsonResponse([
        'attempt_id' => $attemptId,
        'test'       => [
            'id'          => (int)$test['id'],
            'title'       => $test['title'],
            'description' => $test['description'] ?? '',
        ],
        'questions'  => $formattedQuestions,
    ], 201);
}

/**
 * POST /api/attempts/{id}/submit — Принять ответы, посчитать баллы на сервере, вернуть результат
 * Ожидаемый формат JSON: { "answers": { "questionId": [answerId1, answerId2], ... } }
 */
function handleSubmitAttempt(int $attemptId): void
{
    $user = requireLogin();
    $pdo = getDb();

    // 1. Загружаем попытку и проверяем права и статус
    $stmt = $pdo->prepare('SELECT id, user_id, test_id, started_at, finished_at FROM attempts WHERE id = ?');
    $stmt->execute([$attemptId]);
    $attempt = $stmt->fetch();

    if (!$attempt) {
        jsonError('Попытка не найдена', 404);
    }
    if ((int)$attempt['user_id'] !== (int)$user['id']) {
        jsonError('Доступ запрещён: это чужая попытка', 403);
    }
    if ($attempt['finished_at'] !== null) {
        jsonError('Эта попытка уже была завершена', 409);
    }

    $body = getJsonBody();
    $submittedAnswers = $body['answers'] ?? [];
    if (!is_array($submittedAnswers)) {
        jsonError('Поле answers должно быть объектом или массивом', 400);
    }

    $testId = (int)$attempt['test_id'];

    // 2. Загружаем вопросы и правильные ответы из БД
    $stmtQ = $pdo->prepare('SELECT id, weight FROM questions WHERE test_id = ?');
    $stmtQ->execute([$testId]);
    $questions = $stmtQ->fetchAll();

    $stmtA = $pdo->prepare('SELECT id, is_correct FROM answers WHERE question_id = ?');

    $totalScore = 0;
    $maxScore = 0;
    $rowsToInsert = []; // [question_id, answer_id]

    foreach ($questions as $q) {
        $qId = (int)$q['id'];
        $weight = (int)$q['weight'];
        $maxScore += $weight;

        $stmtA->execute([$qId]);
        $dbAnswers = $stmtA->fetchAll();

        $validAnswerIds = [];
        $correctAnswerIds = [];

        foreach ($dbAnswers as $a) {
            $aId = (int)$a['id'];
            $validAnswerIds[$aId] = true;
            if ((bool)$a['is_correct']) {
                $correctAnswerIds[] = $aId;
            }
        }
        sort($correctAnswerIds);

        // Извлекаем ответы пользователя для данного вопроса (поддерживаем и массив, и одиночный ID)
        $rawSelected = $submittedAnswers[(string)$qId] ?? $submittedAnswers[$qId] ?? [];
        if (!is_array($rawSelected)) {
            $rawSelected = [$rawSelected];
        }

        // Оставляем только реально существующие у этого вопроса ID ответов без дубликатов
        $userSelectedIds = [];
        foreach ($rawSelected as $val) {
            $aId = filter_var($val, FILTER_VALIDATE_INT);
            if ($aId !== false && isset($validAnswerIds[$aId])) {
                $userSelectedIds[$aId] = $aId;
            }
        }
        $userSelectedIds = array_values($userSelectedIds);
        sort($userSelectedIds);

        foreach ($userSelectedIds as $aId) {
            $rowsToInsert[] = [$qId, $aId];
        }

        // Правило контракта: балл = вес, если выбран РОВНО правильный набор, иначе 0
        if ($userSelectedIds === $correctAnswerIds) {
            $totalScore += $weight;
        }
    }

    // 3. Сохраняем выбранные ответы и закрываем попытку в транзакции
    $pdo->beginTransaction();
    try {
        $stmtInsAns = $pdo->prepare('
            INSERT INTO attempt_answers (attempt_id, question_id, answer_id)
            VALUES (?, ?, ?)
        ');
        foreach ($rowsToInsert as [$qId, $aId]) {
            $stmtInsAns->execute([$attemptId, $qId, $aId]);
        }

        $stmtUpd = $pdo->prepare('
            UPDATE attempts
            SET finished_at = NOW(), score = ?, max_score = ?
            WHERE id = ?
        ');
        $stmtUpd->execute([$totalScore, $maxScore, $attemptId]);

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    // Возвращаем готовый результат попытки
    handleGetAttempt($attemptId);
}

/**
 * GET /api/attempts/{id} — Результат конкретной попытки
 */
function handleGetAttempt(int $attemptId): void
{
    $user = requireLogin();
    $pdo = getDb();

    $stmt = $pdo->prepare('
        SELECT
            a.id,
            a.user_id,
            a.test_id,
            t.title AS test_title,
            a.started_at,
            a.finished_at,
            a.score,
            a.max_score
        FROM attempts a
        JOIN tests t ON t.id = a.test_id
        WHERE a.id = ?
    ');
    $stmt->execute([$attemptId]);
    $row = $stmt->fetch();

    if (!$row) {
        jsonError('Попытка не найдена', 404);
    }

    // Смотреть попытку может только её автор или админ
    if ((int)$row['user_id'] !== (int)$user['id'] && ($user['role'] ?? '') !== 'admin') {
        jsonError('Доступ запрещён: это чужая попытка', 403);
    }

    $score = (int)$row['score'];
    $maxScore = (int)$row['max_score'];

    jsonResponse([
        'id'          => (int)$row['id'],
        'test_id'     => (int)$row['test_id'],
        'test_title'  => $row['test_title'],
        'started_at'  => $row['started_at'],
        'finished_at' => $row['finished_at'],
        'score'       => $score,
        'max_score'   => $maxScore,
        'percentage'  => calcPercentage($score, $maxScore),
    ]);
}

/**
 * GET /api/my/attempts — История попыток текущего пользователя
 */
function handleGetMyAttempts(): void
{
    $user = requireLogin();
    $pdo = getDb();

    $stmt = $pdo->prepare('
        SELECT
            a.id,
            a.test_id,
            t.title AS test_title,
            a.started_at,
            a.finished_at,
            a.score,
            a.max_score
        FROM attempts a
        JOIN tests t ON t.id = a.test_id
        WHERE a.user_id = ?
        ORDER BY a.started_at DESC, a.id DESC
    ');
    $stmt->execute([$user['id']]);
    $rows = $stmt->fetchAll();

    $result = [];
    foreach ($rows as $row) {
        $score = (int)$row['score'];
        $maxScore = (int)$row['max_score'];

        $result[] = [
            'id'          => (int)$row['id'],
            'test_id'     => (int)$row['test_id'],
            'test_title'  => $row['test_title'],
            'started_at'  => $row['started_at'],
            'finished_at' => $row['finished_at'],
            'score'       => $score,
            'max_score'   => $maxScore,
            'percentage'  => calcPercentage($score, $maxScore),
        ];
    }

    jsonResponse($result);
}

/**
 * GET /api/tests/{id}/results — Результаты всех пользователей по тесту (для админа)
 */
function handleGetTestResults(int $testId): void
{
    requireAdmin();
    $pdo = getDb();

    $stmtTest = $pdo->prepare('SELECT id, title FROM tests WHERE id = ?');
    $stmtTest->execute([$testId]);
    $test = $stmtTest->fetch();

    if (!$test) {
        jsonError('Тест не найден', 404);
    }

    $stmt = $pdo->prepare('
        SELECT
            a.id,
            a.user_id,
            u.login AS user_login,
            a.started_at,
            a.finished_at,
            a.score,
            a.max_score
        FROM attempts a
        JOIN users u ON u.id = a.user_id
        WHERE a.test_id = ?
        ORDER BY a.started_at DESC, a.id DESC
    ');
    $stmt->execute([$testId]);
    $rows = $stmt->fetchAll();

    $attempts = [];
    foreach ($rows as $row) {
        $score = (int)$row['score'];
        $maxScore = (int)$row['max_score'];

        $attempts[] = [
            'id'          => (int)$row['id'],
            'user_id'     => (int)$row['user_id'],
            'user_login'  => $row['user_login'],
            'started_at'  => $row['started_at'],
            'finished_at' => $row['finished_at'],
            'score'       => $score,
            'max_score'   => $maxScore,
            'percentage'  => calcPercentage($score, $maxScore),
        ];
    }

    jsonResponse([
        'test'     => [
            'id'    => (int)$test['id'],
            'title' => $test['title'],
        ],
        'attempts' => $attempts,
    ]);
}