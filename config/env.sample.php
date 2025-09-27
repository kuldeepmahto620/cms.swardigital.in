<?php
// Rename this file to env.php and fill in your credentials
// Shared hosting friendly config (no dotenv)

define('DB_HOST', 'localhost:3306');
define('DB_NAME', 'swardigital_cms');
define('DB_USER', 'cms_user');
define('DB_PASS', 'Kuldeep@#62038');

define('APP_ENV', 'development'); // production | development

define('JWT_SECRET', 'replace_with_long_random_secret');

define('CORS_ORIGINS', 'https://cms.swardigital.in'); // e.g. https://cms.swardigital.in
