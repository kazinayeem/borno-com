<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $t) {
            $t->id();
            $t->string('tran_id', 64)->unique();
            $t->string('gateway', 30);
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->json('order_ids');
            $t->decimal('amount', 12, 2);
            $t->string('currency', 8)->default('BDT');
            $t->string('status', 12)->default('initiated')->index(); // initiated | paid | failed | cancelled
            $t->string('gateway_ref')->nullable()->index();          // bKash paymentID, SSLCommerz val_id, Nagad payment ref
            $t->json('raw')->nullable();
            $t->timestamps();
        });
        Schema::table('orders', function (Blueprint $t) {
            $t->string('guest_name')->nullable();
            $t->string('guest_email')->nullable()->index();
            $t->string('guest_phone', 30)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', fn (Blueprint $t) => $t->dropColumn(['guest_name', 'guest_email', 'guest_phone']));
        Schema::dropIfExists('payments');
    }
};
