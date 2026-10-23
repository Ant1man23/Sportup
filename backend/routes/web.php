<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['message' => 'SportUp API Backend is running.'], 200);
});

Route::get('/storage/{path}', function ($path) {
    $candidates = [
        storage_path('app/public/' . $path),
        storage_path('app/' . $path),
        public_path('storage/' . $path),
    ];
    foreach ($candidates as $filePath) {
        if (file_exists($filePath) && !is_dir($filePath)) {
            $mimeType = mime_content_type($filePath) ?: 'image/jpeg';
            return response()->file($filePath, ['Content-Type' => $mimeType]);
        }
    }
    abort(404);
})->where('path', '.*');
