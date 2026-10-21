<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('colors', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('code', 9)->default('#000000');
            $t->boolean('active')->default(true);
            $t->timestamps();
        });
        foreach (['sizes', 'units'] as $table) {
            Schema::create($table, function (Blueprint $t) {
                $t->id();
                $t->string('name');
                $t->boolean('active')->default(true);
                $t->timestamps();
            });
        }
        Schema::create('sub_categories', function (Blueprint $t) {
            $t->id();
            $t->foreignId('category_id')->constrained()->cascadeOnDelete();
            $t->string('name');
            $t->string('image')->nullable();
            $t->boolean('active')->default(true);
            $t->timestamps();
        });
        Schema::create('coupons', function (Blueprint $t) {
            $t->id();
            $t->string('code')->unique();
            $t->decimal('discount', 10, 2);
            $t->string('discount_type')->default('percent');
            $t->decimal('min_amount', 10, 2)->default(0);
            $t->dateTime('starts_at')->nullable();
            $t->dateTime('expires_at')->nullable();
            $t->boolean('active')->default(true);
            $t->timestamps();
        });
        Schema::create('flash_sales', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->text('description')->nullable();
            $t->string('image')->nullable();
            $t->dateTime('starts_at')->nullable();
            $t->dateTime('ends_at')->nullable();
            $t->boolean('active')->default(true);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['flash_sales', 'coupons', 'sub_categories', 'units', 'sizes', 'colors'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
