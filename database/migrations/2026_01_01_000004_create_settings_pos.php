<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $t) {
            $t->string('key')->primary();
            $t->text('value')->nullable();
            $t->timestamps();
        });
        Schema::create('currencies', function (Blueprint $t) {
            $t->id();
            $t->string('name', 10);
            $t->string('symbol', 6);
            $t->decimal('rate', 12, 4)->default(1);
            $t->boolean('is_default')->default(false);
            $t->timestamps();
        });
        Schema::create('vat_taxes', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->decimal('percentage', 5, 2);
            $t->boolean('active')->default(true);
            $t->timestamps();
        });
        Schema::create('pos_drafts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('customer_id')->nullable()->constrained('users')->nullOnDelete();
            $t->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $t->json('items');
            $t->decimal('subtotal', 12, 2);
            $t->decimal('discount', 12, 2)->default(0);
            $t->decimal('total', 12, 2);
            $t->string('coupon')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['pos_drafts', 'vat_taxes', 'currencies', 'settings'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
