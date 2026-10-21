<?php

use App\Http\Controllers\PlaceholderController;
use Illuminate\Support\Facades\Route;

Route::get('/placeholder/{label}', [PlaceholderController::class, 'show'])->where('label', '[^/]+');

// SPA catch-all: React Router handles every non-API URL.
Route::view('/{any?}', 'app')->where('any', '^(?!api|assets|build|placeholder|storage).*$');
