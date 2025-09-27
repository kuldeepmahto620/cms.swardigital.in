<?php
// api/index.php - front controller
require_once __DIR__ . '/bootstrap.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Normalize base path dynamically (works if this index.php is under /api or any subdir)
$scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
if ($scriptDir !== '' && $scriptDir !== '/') {
  if (str_starts_with($uri, $scriptDir)) { $uri = substr($uri, strlen($scriptDir)); }
}

// Simple router map
switch (true) {
  case $uri === '/' || $uri === '':
    json(['ok' => true, 'name' => 'DreamRecords API', 'time' => date('c')]);
    break;

  case $uri === '/v1/ping':
    json(['pong' => true, 'time' => date('c')]);
    break;

  case $uri === '/v1/db-check':
    try {
      $pdo = db();
      $stmt = $pdo->query('SELECT 1 AS ok');
      $row = $stmt->fetch();
      json(['ok' => (int)$row['ok'] === 1, 'driver' => 'mysql', 'time' => date('c')]);
    } catch (Throwable $e) {
      json(['ok' => false, 'error' => 'DB connect failed', 'message' => $e->getMessage()], 500);
    }
    break;

  // Artists
  case $uri === '/v1/artists' && $method === 'GET':
    require __DIR__ . '/routes/artists.php';
    break;
  case $uri === '/v1/artists' && $method === 'POST':
    require __DIR__ . '/routes/artists.php';
    break;

  // Labels
  case $uri === '/v1/labels' && $method === 'GET':
    require __DIR__ . '/routes/labels.php';
    break;
  case $uri === '/v1/labels' && $method === 'POST':
    require __DIR__ . '/routes/labels.php';
    break;

  // Releases (collection)
  case $uri === '/v1/releases' && $method === 'GET':
    require __DIR__ . '/routes/releases.php';
    break;
  case $uri === '/v1/releases' && $method === 'POST':
    require __DIR__ . '/routes/releases.php';
    break;
  // Releases (item)
  case preg_match('#^/v1/releases/(\d+)$#', $uri, $m) && in_array($method, ['GET','PUT','DELETE'], true):
    $route_id = (int)$m[1];
    require __DIR__ . '/routes/releases.php';
    break;

  default:
    not_found();
}
