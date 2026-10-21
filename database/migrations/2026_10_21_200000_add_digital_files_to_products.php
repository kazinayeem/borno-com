<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $t) {
            $t->string('digital_file')->nullable();   // private file under storage/app/private/digital
            $t->string('digital_url', 500)->nullable(); // or a link to the file hosted elsewhere
        });
    }

    public function down(): void
    {
        Schema::table('products', fn (Blueprint $t) => $t->dropColumn(['digital_file', 'digital_url']));
    }
};
