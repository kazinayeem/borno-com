<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_messages', function (Blueprint $t) {
            $t->id();
            $t->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('shop_id')->nullable()->constrained()->nullOnDelete();
            $t->boolean('from_staff')->default(false);
            $t->text('body');
            $t->timestamp('read_at')->nullable();
            $t->timestamps();
            $t->index(['customer_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_messages');
    }
};
