<?php

use Illuminate\Support\Facades\Route;

// SPA catch-all: React Router handles every non-API URL.
Route::view('/{any?}', 'app')->where('any', '^(?!api|assets|build).*$');
