<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $t) {
            $t->id();
            $t->string('number')->unique();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('shop_id')->nullable()->constrained()->nullOnDelete();
            $t->string('status')->default('pending');
            $t->string('payment_status')->default('unpaid');
            $t->string('payment_method')->default('Cash Payment');
            $t->decimal('subtotal', 12, 2);
            $t->decimal('shipping', 12, 2)->default(0);
            $t->decimal('total', 12, 2);
            $t->string('shipping_address')->nullable();
            $t->timestamps();
        });

        Schema::create('order_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained()->cascadeOnDelete();
            $t->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $t->string('name');
            $t->decimal('price', 12, 2);
            $t->unsignedInteger('qty');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
