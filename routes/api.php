<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\StoreController;
use Illuminate\Support\Facades\Route;

Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::controller(StoreController::class)->group(function () {
    Route::get('home', 'home');
    Route::get('master', 'master');
    Route::get('categories', 'categories');
    Route::get('products', 'products');
    Route::get('products/{product}', 'product');
    Route::get('shops', 'shops');
    Route::get('shops/{shop}', 'shop');
    Route::get('brands', 'brands');
    Route::get('blogs', 'blogs');
    Route::get('blogs/{post}', 'blog');
    Route::post('contact', 'contact')->middleware('throttle:5,1');
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);

    Route::prefix('admin')->middleware('staff')->controller(AdminController::class)->group(function () {
        Route::get('dashboard', 'dashboard');
        Route::get('messages', 'messages')->middleware('staff:admin');
        Route::patch('messages/{id}/read', 'markMessage')->middleware('staff:admin');
        Route::get('options', 'options');
        Route::get('orders', 'orders');
        Route::get('orders/{id}', 'order');
        Route::patch('orders/{id}', 'updateOrder')->middleware('staff:admin');
        Route::get('customers', 'customers')->middleware('staff:admin');
        Route::get('{res}', 'index');
        Route::post('{res}', 'store');
        Route::get('{res}/{id}', 'show');
        Route::put('{res}/{id}', 'update');
        Route::delete('{res}/{id}', 'destroy');
    });
});
