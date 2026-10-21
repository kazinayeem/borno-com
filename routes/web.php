<?php

use App\Http\Controllers\PlaceholderController;
use Illuminate\Support\Facades\Route;

Route::match(['get', 'post'], '/payments/{gateway}/{event}', [App\Http\Controllers\PaymentCallbackController::class, 'handle'])->where('event', 'success|fail|cancel|ipn|callback')->middleware('throttle:60,1');
Route::get('/placeholder/{label}', [PlaceholderController::class, 'show'])->where('label', '[^/]+');

// SPA catch-all: React Router handles every non-API URL.
Route::view('/{any?}', 'app')->where('any', '^(?!api|assets|build|placeholder|storage).*$');
