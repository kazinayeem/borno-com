<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\CustomerAuthController;
use App\Http\Controllers\Api\CatalogIoController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\GatewayController;
use App\Http\Controllers\Api\LookupController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PushController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\PosController;
use App\Http\Controllers\Api\RecordController;
use App\Http\Controllers\Api\SettingsGroupController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StoreController;
use App\Http\Controllers\Api\UploadController;
use Illuminate\Support\Facades\Route;

Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

// ---- storefront customers --------------------------------------------------------------------------------------
Route::post('account/register', [CustomerAuthController::class, 'register'])->middleware('throttle:6,1');
Route::post('account/login', [CustomerAuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('account/google', [CustomerAuthController::class, 'google'])->middleware('throttle:20,1');
Route::post('checkout/quote', [CheckoutController::class, 'quote'])->middleware('throttle:60,1');

Route::middleware(['auth:sanctum', 'customer'])->prefix('account')->group(function () {
    Route::post('logout', [CustomerAuthController::class, 'logout']);
    Route::controller(AccountController::class)->group(function () {
        Route::get('me', 'me');
        Route::put('me', 'update');
        Route::put('password', 'password');
        Route::get('summary', 'summary');
        Route::get('addresses', 'addresses');
        Route::post('addresses', 'storeAddress');
        Route::put('addresses/{id}', 'updateAddress')->whereNumber('id');
        Route::delete('addresses/{id}', 'destroyAddress')->whereNumber('id');
        Route::get('orders', 'orders');
        Route::get('orders/{id}', 'order')->whereNumber('id');
        Route::post('orders/{id}/cancel', 'cancel')->whereNumber('id');
    });
    Route::post('checkout', [CheckoutController::class, 'place'])->middleware('throttle:20,1');
});

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
        Route::get('shop-catalog/{res}', 'shopCatalog')->middleware('staff:shop');
        Route::get('messages', 'messages')->middleware('staff:admin');
        Route::patch('messages/{id}/read', 'markMessage')->middleware('staff:admin');
        Route::get('options', 'options');
        Route::get('statistics', 'statistics')->middleware('staff:admin');
        Route::get('bell', 'bell')->middleware('staff:admin');
        Route::post('notifications/read-all', 'readAllNotifications')->middleware('staff:admin');
        Route::get('reports/analytics', [ReportController::class, 'analytics']);
        Route::get('reports/earning-summary', [ReportController::class, 'earningSummary']);
        Route::get('reports/preorder', [ReportController::class, 'preorderAnalytics'])->middleware('staff:admin');
        Route::get('profile', [ProfileController::class, 'show']);
        Route::put('profile', [ProfileController::class, 'update']);
        Route::put('profile/password', [ProfileController::class, 'password']);
        Route::get('my-shop', [ProfileController::class, 'shopShow'])->middleware('staff:shop');
        Route::put('my-shop', [ProfileController::class, 'shopUpdate'])->middleware('staff:shop');
        Route::get('products-export', [CatalogIoController::class, 'export']);
        Route::post('products-import', [CatalogIoController::class, 'import']);
        Route::get('gallery', [CatalogIoController::class, 'gallery']);
        Route::delete('gallery/{name}', [CatalogIoController::class, 'destroyImage'])->middleware('staff:admin');
        Route::middleware('staff:admin')->group(function () {
            Route::get('gateways', [GatewayController::class, 'index']);
            Route::put('gateways/{id}', [GatewayController::class, 'update'])->whereNumber('id');
            Route::post('push-notifications', [PushController::class, 'send']);
        });
        Route::get('chats', [ChatController::class, 'users']);
        Route::get('chats/{customer}', [ChatController::class, 'messages'])->whereNumber('customer');
        Route::post('chats/{customer}', [ChatController::class, 'send'])->whereNumber('customer');
        Route::get('lookup/{resource}', [LookupController::class, 'show']);
        Route::get('settings-group/{key}', [SettingsGroupController::class, 'show'])->middleware('staff:admin');
        Route::put('settings-group/{key}', [SettingsGroupController::class, 'update'])->middleware('staff:admin');
        Route::prefix('r/{res}')->controller(RecordController::class)->middleware('staff')->group(function () {
            Route::get('/', 'index');
            Route::post('/', 'store');
            Route::get('{id}', 'show')->whereNumber('id');
            Route::put('{id}', 'update')->whereNumber('id');
            Route::delete('{id}', 'destroy')->whereNumber('id');
            Route::patch('{id}/toggle', 'toggle')->whereNumber('id');
            Route::post('{id}/{decision}', 'decide')->whereNumber('id')->whereIn('decision', ['approve', 'reject']);
        });
        Route::get('settings', [SettingsController::class, 'show'])->middleware('staff:admin');
        Route::put('settings', [SettingsController::class, 'update'])->middleware('staff:admin');
        Route::prefix('pos')->controller(PosController::class)->group(function () {
            Route::get('products', 'products');
            Route::get('customers', 'customers');
            Route::post('customers', 'storeCustomer');
            Route::post('quote', 'quote');
            Route::post('checkout', 'checkout');
            Route::get('sales', 'sales');
            Route::get('drafts', 'drafts');
            Route::post('drafts', 'storeDraft');
            Route::delete('drafts/{id}', 'destroyDraft');
        });
        Route::post('uploads', [UploadController::class, 'image']);
        Route::get('orders', 'orders');
        Route::get('orders/{id}', 'order');
        Route::get('riders-with-load', 'riders')->middleware('staff:admin');
        Route::patch('products/{id}/approve', 'approveProduct')->middleware('staff:admin');
        Route::patch('orders/{id}', 'updateOrder')->middleware('staff:admin');
        Route::get('customers', 'customers')->middleware('staff:admin');
        Route::get('{res}', 'index');
        Route::post('{res}', 'store');
        Route::get('{res}/{id}', 'show');
        Route::put('{res}/{id}', 'update');
        Route::delete('{res}/{id}', 'destroy');
    });
});
