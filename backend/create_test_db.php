<?php
try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306', 'root', '');
    $pdo->exec('CREATE DATABASE IF NOT EXISTS sportup_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    echo "Database sportup_test created or already exists.\n";
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage() . "\n";
    exit(1);
}
