<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_roles', function (Blueprint $t) {
            $t->id();
            $t->string('name')->unique();
            $t->json('permissions'); // { module: ["view","add","edit","delete"] }
            $t->timestamps();
        });
        Schema::table('users', function (Blueprint $t) {
            $t->foreignId('staff_role_id')->nullable()->constrained('staff_roles')->nullOnDelete();
        });
        Schema::create('activity_logs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('user_name')->nullable();
            $t->string('email')->nullable();
            $t->string('action', 30)->index();   // login, login_failed, logout, create, update, delete
            $t->string('subject')->nullable();   // e.g. products, orders
            $t->string('subject_id')->nullable();
            $t->string('description')->nullable();
            $t->string('ip', 45)->nullable()->index();
            $t->string('device', 255)->nullable();
            $t->timestamp('created_at')->useCurrent()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::table('users', fn (Blueprint $t) => $t->dropConstrainedForeignId('staff_role_id'));
        Schema::dropIfExists('staff_roles');
    }
};
