<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pos_drafts', function (Blueprint $t) {
            $t->string('discount_type', 10)->nullable();
            $t->decimal('discount_value', 12, 2)->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('pos_drafts', fn (Blueprint $t) => $t->dropColumn(['discount_type', 'discount_value']));
    }
};
