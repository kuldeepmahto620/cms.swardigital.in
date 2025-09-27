<?php
// bootstrap.php - loads config, sets up DB (PDO), and utility functions

// Load config
$envPath = __DIR__ . '/../config/env.php';
$envSample = __DIR__ . '/../config/env.sample.php';
if (file_exists($envPath)) {
  require_once $envPath;
} else {
  require_once $envSample; // fallback so the app can run in dev
}

// CORS (basic; tighten in production)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
$allowed = defined('CORS_ORIGINS') ? CORS_ORIGINS : '*';
header('Access-Control-Allow-Origin: ' . ($allowed === '*' ? '*' : $origin));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// JSON header default
header('Content-Type: application/json');

// DB connect (PDO)
function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  try {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
  } catch (Throwable $e) {
    // In dev, expose message; in prod, hide
    if (APP_ENV !== 'production') {
      http_response_code(500);
      echo json_encode(['error' => 'DB connection failed', 'message' => $e->getMessage()]);
    } else {
      http_response_code(500);
      echo json_encode(['error' => 'DB connection failed']);
    }
    exit;
  }
  return $pdo;
}

function json($data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data);
}

function body(): array {
  $raw = file_get_contents('php://input') ?: '';
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function not_found(): void { json(['error' => 'Not Found'], 404); }
function method_not_allowed(): void { json(['error' => 'Method Not Allowed'], 405); }
