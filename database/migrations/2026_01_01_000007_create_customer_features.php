<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->string('google_id')->nullable()->unique();
            // false for accounts created through Google (they have a random password until one is chosen).
            $t->boolean('password_set')->default(true);
        });

        Schema::table('orders', fn (Blueprint $t) => $t->text('notes')->nullable());

        Schema::create('addresses', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('name');
            $t->string('phone', 30);
            $t->string('type', 20)->default('home');
            $t->string('area')->nullable();
            $t->string('address_line');
            $t->boolean('is_default')->default(false);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('addresses');
        Schema::table('orders', fn (Blueprint $t) => $t->dropColumn('notes'));
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['google_id', 'password_set']));
    }
};
