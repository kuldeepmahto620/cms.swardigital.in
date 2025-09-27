<?php
// /v1/labels

try {
  $pdo = db();
  if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $q = trim($_GET['q'] ?? '');
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    $sql = 'SELECT id, name FROM labels WHERE (:q = "" OR name LIKE :like) ORDER BY id DESC LIMIT :lim OFFSET :off';
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':q', $q, PDO::PARAM_STR);
    $stmt->bindValue(':like', "%$q%", PDO::PARAM_STR);
    $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();
    json(['items' => $rows, 'page' => $page, 'limit' => $limit]);
    return;
  }

  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = body();
    $name = trim($data['name'] ?? '');
    if ($name === '') { json(['error' => 'Name is required'], 422); return; }
    $stmt = $pdo->prepare('INSERT INTO labels (name, created_at, updated_at) VALUES (?, NOW(), NOW())');
    $stmt->execute([$name]);
    $id = (int)$pdo->lastInsertId();
    json(['id' => $id, 'name' => $name], 201);
    return;
  }

  method_not_allowed();
  return;
} catch (Throwable $e) {
  // Fallback mock if table not ready
  if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    json(['items' => [ ['id' => 1, 'name' => 'Swar Digital'], ['id' => 2, 'name' => 'Independent'] ], 'mock' => true]);
    return;
  }
  json(['error' => 'Server error', 'message' => $e->getMessage()], 500);
}
