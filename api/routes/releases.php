<?php
// /v1/releases and /v1/releases/:id

try {
  $pdo = db();

  // Item routes when $route_id is present from front controller
  if (isset($route_id) && is_int($route_id)) {
    if ($method === 'GET') {
      $stmt = $pdo->prepare('SELECT id, title, primary_artist AS artist, status, DATE(created_at) AS date FROM releases WHERE id = ?');
      $stmt->execute([$route_id]);
      $row = $stmt->fetch();
      if (!$row) { json(['error'=>'Not Found'],404); return; }
      json($row);
      return;
    }
    if ($method === 'PUT') {
      $data = body();
      $title = trim($data['title'] ?? '');
      $artist = trim($data['artist'] ?? '');
      if ($title === '' || $artist === '') { json(['error'=>'title and artist required'],422); return; }
      $stmt = $pdo->prepare('UPDATE releases SET title = ?, primary_artist = ?, updated_at = NOW() WHERE id = ?');
      $stmt->execute([$title, $artist, $route_id]);
      json(['ok'=>true]);
      return;
    }
    if ($method === 'DELETE') {
      $stmt = $pdo->prepare('DELETE FROM releases WHERE id = ?');
      $stmt->execute([$route_id]);
      json(['ok'=>true]);
      return;
    }
    method_not_allowed();
    return;
  }

  if ($method === 'GET') {
    $q = trim($_GET['q'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $sort = trim($_GET['sort'] ?? 'Newest');
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = max(1, min(100, (int)($_GET['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;

    $where = '1=1';
    $params = [];
    if ($q !== '') { $where .= ' AND (title LIKE :like OR primary_artist LIKE :like)'; $params[':like'] = "%$q%"; }
    if ($status !== '' && $status !== 'Any') { $where .= ' AND status = :status'; $params[':status'] = $status; }
    $order = 'ORDER BY created_at DESC';
    if ($sort === 'Oldest') $order = 'ORDER BY created_at ASC';
    if ($sort === 'Title A-Z') $order = 'ORDER BY title ASC';

    // total count
    $countSql = "SELECT COUNT(*) AS cnt FROM releases WHERE $where";
    $cstmt = $pdo->prepare($countSql);
    foreach ($params as $k=>$v) $cstmt->bindValue($k, $v, PDO::PARAM_STR);
    $cstmt->execute();
    $total = (int)($cstmt->fetch()['cnt'] ?? 0);

    $sql = "SELECT id, title, primary_artist AS artist, status, DATE(created_at) AS date FROM releases WHERE $where $order LIMIT :lim OFFSET :off";
    $stmt = $pdo->prepare($sql);
    foreach ($params as $k=>$v) $stmt->bindValue($k, $v, PDO::PARAM_STR);
    $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();
    json(['items' => $rows, 'page' => $page, 'limit' => $limit, 'total' => $total]);
    return;
  }

  if ($method === 'POST') {
    $data = body();
    $title = trim($data['title'] ?? '');
    $artist = trim($data['artist'] ?? '');
    $status = $data['status'] ?? 'In Review';
    if ($title === '' || $artist === '') { json(['error' => 'title and artist are required'], 422); return; }

    $stmt = $pdo->prepare('INSERT INTO releases (user_id, title, primary_artist, status, created_at, updated_at) VALUES (1, ?, ?, ?, NOW(), NOW())');
    $stmt->execute([$title, $artist, $status]);
    $id = (int)$pdo->lastInsertId();

    // Optional tracks array
    if (!empty($data['tracks']) && is_array($data['tracks'])) {
      $ins = $pdo->prepare('INSERT INTO tracks (release_id, title, artist, duration_sec, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())');
      $i = 1;
      foreach ($data['tracks'] as $t) {
        $ins->execute([$id, trim($t['title'] ?? 'Untitled'), trim($t['artist'] ?? $artist), (int)($t['duration_sec'] ?? 0), $i++]);
      }
    }

    json(['id' => $id, 'title' => $title, 'artist' => $artist, 'status' => $status], 201);
    return;
  }

  method_not_allowed();
  return;
} catch (Throwable $e) {
  if ($method === 'GET') {
    // Fallback mock if DB not ready
    json(['items' => [
      ['id'=>1,'title'=>'Summer Vibes','artist'=>'K. Mahto','status'=>'Approved','date'=>date('Y-m-d')],
      ['id'=>2,'title'=>'City Lights','artist'=>'R. Sharma','status'=>'In Review','date'=>date('Y-m-d')]
    ], 'mock' => true]);
    return;
  }
  json(['error' => 'Server error', 'message' => $e->getMessage()], 500);
}
