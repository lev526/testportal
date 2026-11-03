<?php

declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth.php';

/**
 * GET /api/tests — Список тестов + сколько попыток осталось текущему пользователю
 */
function handleGetTests(): void
{
    $user = requireLogin();
    $pdo = getDb();

    $sql = '
        SELECT
            t.id,
            t.title,
            t.description,
            t.max_attempts,
            (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) AS questions_count,
            (SELECT COUNT(*) FROM attempts a WHERE a.test_id = t.id AND a.user_id = ? AND a.finished_at IS NOT NULL) AS used_attempts,
            (SELECT COUNT(*) FROM attempts a WHERE a.test_id = t.id AND a.finished_at IS NOT NULL) AS total_attempts
        FROM tests t
        ORDER BY t.id DESC
    ';

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$user['id']]);
    $rows = $stmt->fetchAll();

    $result = [];
    foreach ($rows as $row) {
        $maxAttempts = (int)$row['max_attempts'];
        $usedAttempts = (int)$row['used_attempts'];

        $result[] = [
            'id'                 => (int)$row['id'],
            'title'              => $row['title'],
            'description'        => $row['description'] ?? '',
            'max_attempts'       => $maxAttempts,
            'questions_count'    => (int)$row['questions_count'],
            'used_attempts'      => $usedAttempts,
            'remaining_attempts' => max(0, $maxAttempts - $usedAttempts),
            'has_attempts'       => ((int)$row['total_attempts']) > 0,
        ];
    }

    jsonResponse($result);
}

/**
 * GET /api/tests/{id}/edit — Тест целиком с правильными ответами (для админа)
 */
function handleGetTestEdit(int $testId): void
{
    requireAdmin();
    $pdo = getDb();

    $stmt = $pdo->prepare('SELECT id, title, description, max_attempts FROM tests WHERE id = ?');
    $stmt->execute([$testId]);
    $test = $stmt->fetch();

    if (!$test) {
        jsonError('Тест не найден', 404);
    }

    $stmtAtt = $pdo->prepare('SELECT COUNT(*) FROM attempts WHERE test_id = ? AND finished_at IS NOT NULL');
    $stmtAtt->execute([$testId]);
    $hasAttempts = ((int)$stmtAtt->fetchColumn()) > 0;

    $stmtQ = $pdo->prepare('SELECT id, text, type, weight, image_path FROM questions WHERE test_id = ? ORDER BY id ASC');
    $stmtQ->execute([$testId]);
    $questions = $stmtQ->fetchAll();

    $stmtA = $pdo->prepare('SELECT id, text, is_correct FROM answers WHERE question_id = ? ORDER BY id ASC');

    $formattedQuestions = [];
    foreach ($questions as $q) {
        $stmtA->execute([$q['id']]);
        $answers = $stmtA->fetchAll();

        $formattedAnswers = [];
        foreach ($answers as $a) {
            $formattedAnswers[] = [
                'id'         => (int)$a['id'],
                'text'       => $a['text'],
                'is_correct' => (bool)$a['is_correct'],
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
        'id'           => (int)$test['id'],
        'title'        => $test['title'],
        'description'  => $test['description'] ?? '',
        'max_attempts' => (int)$test['max_attempts'],
        'has_attempts' => $hasAttempts,
        'questions'    => $formattedQuestions,
    ]);
}

/**
 * Валидация структуры вопросов и ответов по контракту
 */
function validateQuestions(mixed $questions): array
{
    if (!is_array($questions) || count($questions) === 0) {
        jsonError('В тесте должен быть хотя бы один вопрос', 400);
    }

    $cleanQuestions = [];

    foreach ($questions as $qIndex => $q) {
        $qNum = $qIndex + 1;
        if (!is_array($q)) {
            jsonError("Вопрос №$qNum имеет некорректный формат", 400);
        }

        $text = trim((string)($q['text'] ?? ''));
        $type = (string)($q['type'] ?? 'single');
        $weight = filter_var($q['weight'] ?? 1, FILTER_VALIDATE_INT);
        $imagePath = isset($q['image_path']) && trim((string)$q['image_path']) !== ''
            ? trim((string)$q['image_path'])
            : null;
        $answers = $q['answers'] ?? null;

        if ($text === '') {
            jsonError("Вопрос №$qNum: текст вопроса не может быть пустым", 400);
        }
        if (!in_array($type, ['single', 'multiple'], true)) {
            jsonError("Вопрос №$qNum: тип должен быть 'single' или 'multiple'", 400);
        }
        if ($weight === false || $weight < 1) {
            jsonError("Вопрос №$qNum: вес вопроса должен быть целым числом больше 0", 400);
        }
        if (!is_array($answers) || count($answers) < 2) {
            jsonError("Вопрос №$qNum: должно быть минимум 2 варианта ответа", 400);
        }

        $cleanAnswers = [];
        $correctCount = 0;

        foreach ($answers as $aIndex => $a) {
            $aNum = $aIndex + 1;
            if (!is_array($a)) {
                jsonError("Вопрос №$qNum, ответ №$aNum: некорректный формат", 400);
            }

            $aText = trim((string)($a['text'] ?? ''));
            if ($aText === '') {
                jsonError("Вопрос №$qNum, ответ №$aNum: текст ответа не может быть пустым", 400);
            }

            $isCorrect = !empty($a['is_correct']);
            if ($isCorrect) {
                $correctCount++;
            }

            $cleanAnswers[] = [
                'text'       => $aText,
                'is_correct' => $isCorrect ? 1 : 0,
            ];
        }

        if ($correctCount < 1) {
            jsonError("Вопрос №$qNum: должен быть выбран минимум 1 правильный ответ", 400);
        }
        if ($type === 'single' && $correctCount !== 1) {
            jsonError("Вопрос №$qNum: у вопроса типа 'single' должен быть ровно 1 правильный ответ", 400);
        }

        $cleanQuestions[] = [
            'text'       => $text,
            'type'       => $type,
            'weight'     => $weight,
            'image_path' => $imagePath,
            'answers'    => $cleanAnswers,
        ];
    }

    return $cleanQuestions;
}

/**
 * Сохраняет вопросы и ответы теста (вызывается внутри транзакции)
 */
function insertQuestionsAndAnswers(PDO $pdo, int $testId, array $questions): void
{
    $stmtQ = $pdo->prepare('
        INSERT INTO questions (test_id, text, type, weight, image_path)
        VALUES (?, ?, ?, ?, ?)
    ');
    $stmtA = $pdo->prepare('
        INSERT INTO answers (question_id, text, is_correct)
        VALUES (?, ?, ?)
    ');

    foreach ($questions as $q) {
        $stmtQ->execute([
            $testId,
            $q['text'],
            $q['type'],
            $q['weight'],
            $q['image_path'],
        ]);
        $questionId = (int)$pdo->lastInsertId();

        foreach ($q['answers'] as $a) {
            $stmtA->execute([
                $questionId,
                $a['text'],
                $a['is_correct'],
            ]);
        }
    }
}

/**
 * POST /api/tests — Создать тест целиком (вложенный JSON)
 */
function handleCreateTest(): void
{
    requireAdmin();
    $body = getJsonBody();

    $title = trim((string)($body['title'] ?? ''));
    $description = trim((string)($body['description'] ?? ''));
    $maxAttempts = filter_var($body['max_attempts'] ?? 1, FILTER_VALIDATE_INT);

    if ($title === '') {
        jsonError('Название теста обязательно', 400);
    }
    if ($maxAttempts === false || $maxAttempts < 1) {
        jsonError('Лимит попыток должен быть целым числом не меньше 1', 400);
    }

    $cleanQuestions = validateQuestions($body['questions'] ?? null);

    $pdo = getDb();
    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare('INSERT INTO tests (title, description, max_attempts) VALUES (?, ?, ?)');
        $stmt->execute([$title, $description, $maxAttempts]);
        $testId = (int)$pdo->lastInsertId();

        insertQuestionsAndAnswers($pdo, $testId, $cleanQuestions);

        $pdo->commit();
        jsonResponse(['id' => $testId], 201);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

/**
 * PUT /api/tests/{id} — Заменить тест целиком (или только шапку, если есть попытки)
 */
function handleUpdateTest(int $testId): void
{
    requireAdmin();
    $pdo = getDb();

    $stmt = $pdo->prepare('SELECT id FROM tests WHERE id = ?');
    $stmt->execute([$testId]);
    if (!$stmt->fetch()) {
        jsonError('Тест не найден', 404);
    }

    $body = getJsonBody();
    $title = trim((string)($body['title'] ?? ''));
    $description = trim((string)($body['description'] ?? ''));
    $maxAttempts = filter_var($body['max_attempts'] ?? 1, FILTER_VALIDATE_INT);

    if ($title === '') {
        jsonError('Название теста обязательно', 400);
    }
    if ($maxAttempts === false || $maxAttempts < 1) {
        jsonError('Лимит попыток должен быть целым числом не меньше 1', 400);
    }

    // Проверяем, есть ли уже завершённые попытки по этому тесту
    $stmtAtt = $pdo->prepare('SELECT COUNT(*) FROM attempts WHERE test_id = ? AND finished_at IS NOT NULL');
    $stmtAtt->execute([$testId]);
    $hasAttempts = ((int)$stmtAtt->fetchColumn()) > 0;

    if ($hasAttempts) {
        if (array_key_exists('questions', $body)) {
            jsonError(
                'Нельзя менять вопросы и ответы у теста с существующими попытками (можно изменить только название, описание и лимит)',
                409
            );
        }

        $stmtUpd = $pdo->prepare('UPDATE tests SET title = ?, description = ?, max_attempts = ? WHERE id = ?');
        $stmtUpd->execute([$title, $description, $maxAttempts, $testId]);

        jsonResponse(['id' => $testId, 'status' => 'updated_meta_only']);
    }

    $cleanQuestions = validateQuestions($body['questions'] ?? null);

    $pdo->beginTransaction();
    try {
        // Удаляем незавершённые черновые попытки перед обновлением структуры вопросов
        $pdo->prepare('DELETE FROM attempts WHERE test_id = ? AND finished_at IS NULL')->execute([$testId]);

        $stmtUpd = $pdo->prepare('UPDATE tests SET title = ?, description = ?, max_attempts = ? WHERE id = ?');
        $stmtUpd->execute([$title, $description, $maxAttempts, $testId]);

        $stmtDel = $pdo->prepare('DELETE FROM questions WHERE test_id = ?');
        $stmtDel->execute([$testId]);

        insertQuestionsAndAnswers($pdo, $testId, $cleanQuestions);

        $pdo->commit();
        jsonResponse(['id' => $testId, 'status' => 'updated']);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

/**
 * DELETE /api/tests/{id} — Удалить тест
 */
function handleDeleteTest(int $testId): void
{
    requireAdmin();
    $pdo = getDb();

    $stmt = $pdo->prepare('DELETE FROM tests WHERE id = ?');
    $stmt->execute([$testId]);

    if ($stmt->rowCount() === 0) {
        jsonError('Тест не найден', 404);
    }

    jsonResponse(['status' => 'deleted']);
}

/**
 * POST /api/upload — Загрузить картинку к вопросу и вернуть путь
 */
function handleUpload(): void
{
    requireAdmin();

    if (empty($_FILES['image']) || !is_array($_FILES['image'])) {
        jsonError('Файл не передан (ожидается поле image)', 400);
    }

    $file = $_FILES['image'];

    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        jsonError('Ошибка при загрузке файла (код ' . (int)$file['error'] . ')', 400);
    }

    $maxSize = 5 * 1024 * 1024;
    if (($file['size'] ?? 0) > $maxSize) {
        jsonError('Размер файла не должен превышать 5 МБ', 400);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);

    $allowedTypes = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/gif'  => 'gif',
        'image/webp' => 'webp',
    ];

    if (!isset($allowedTypes[$mime])) {
        jsonError('Разрешены только изображения: JPG, PNG, GIF, WEBP', 400);
    }

    $ext = $allowedTypes[$mime];
    $filename = bin2hex(random_bytes(16)) . '.' . $ext;
    $uploadDir = __DIR__ . '/../public/uploads';

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $destination = $uploadDir . '/' . $filename;
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        jsonError('Не удалось сохранить загруженный файл', 500);
    }

    jsonResponse(['path' => '/uploads/' . $filename], 201);
}