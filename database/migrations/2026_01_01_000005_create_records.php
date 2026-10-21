<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Generic JSON store for the admin resources that do not have their own table.
        Schema::create('records', function (Blueprint $t) {
            $t->id();
            $t->string('resource', 60);
            $t->unsignedInteger('rid');
            $t->json('data');
            $t->timestamps();
            $t->unique(['resource', 'rid']);
        });

        Schema::table('products', function (Blueprint $t) {
            $t->string('approval')->default('accepted')->index();
        });

        Schema::table('riders', function (Blueprint $t) {
            $t->string('first_name')->nullable();
            $t->string('last_name')->nullable();
            $t->string('email')->nullable();
            $t->string('gender')->nullable();
            $t->string('driving_licence')->nullable();
            $t->string('vehicle_type')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('riders', fn (Blueprint $t) => $t->dropColumn(['first_name', 'last_name', 'email', 'gender', 'driving_licence', 'vehicle_type']));
        Schema::table('products', fn (Blueprint $t) => $t->dropColumn('approval'));
        Schema::dropIfExists('records');
    }
};
