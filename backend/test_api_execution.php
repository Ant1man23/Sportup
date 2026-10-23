<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;

function callApi($app, $method, $uri, $data = [])
{
    $request = Request::create($uri, $method, $data);
    $request->headers->set('Accept', 'application/json');
    $response = $app->handle($request);

    return [
        'status' => $response->getStatusCode(),
        'content' => json_decode($response->getContent(), true),
    ];
}

$email = 'test_'.time().'@sportup.app';

echo "1. Testing Registration...\n";
$regRes = callApi($app, 'POST', '/api/v1/auth/register', [
    'first_name' => 'John',
    'last_name' => 'Doe',
    'username' => 'johndoe_'.rand(100, 999),
    'email' => $email,
    'password' => 'Password123!',
    'password_confirmation' => 'Password123!',
    'level' => 'intermediate',
]);
echo 'Status: '.$regRes['status']."\n";
echo 'Response: '.json_encode($regRes['content'])."\n\n";

echo "2. Testing Login...\n";
$loginRes = callApi($app, 'POST', '/api/v1/auth/login', [
    'email' => $email,
    'password' => 'Password123!',
]);
echo 'Status: '.$loginRes['status']."\n";
echo 'Token generated: '.(isset($loginRes['content']['access_token']) ? 'YES' : 'NO')."\n";
