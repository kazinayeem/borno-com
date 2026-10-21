<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->string('role')->default('customer')->after('email');
            $t->string('phone')->nullable();
            $t->string('gender')->nullable();
            $t->date('birth_date')->nullable();
        });

        Schema::create('categories', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('slug')->unique();
            $t->string('icon')->nullable();
            $t->string('name_ar')->nullable();
            $t->unsignedInteger('order_by')->default(0);
            $t->text('description')->nullable();
            $t->text('description_ar')->nullable();
            $t->boolean('active')->default(true);
            $t->timestamps();
        });

        Schema::create('brands', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('slug')->unique();
            $t->string('logo')->nullable();
            $t->boolean('active')->default(true);
            $t->timestamps();
        });

        Schema::create('shops', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('name');
            $t->string('logo')->nullable();
            $t->string('name_ar')->nullable();
            $t->string('address')->nullable();
            $t->text('description')->nullable();
            $t->boolean('online')->default(true);
            $t->boolean('active')->default(true);
            $t->decimal('rating', 2, 1)->default(0);
            $t->unsignedInteger('reviews_count')->default(0);
            $t->timestamps();
        });

        Schema::create('products', function (Blueprint $t) {
            $t->id();
            $t->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $t->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('brand_id')->nullable()->constrained()->nullOnDelete();
            $t->string('name');
            $t->text('description')->nullable();
            $t->string('name_ar')->nullable();
            $t->string('slug')->nullable();
            $t->text('short_description')->nullable();
            $t->text('short_description_ar')->nullable();
            $t->string('sku')->nullable();
            $t->decimal('weight', 8, 2)->nullable();
            $t->decimal('buy_price', 12, 2)->nullable();
            $t->string('discount_type')->default('fixed');
            $t->string('unit')->nullable();
            $t->json('color_ids')->nullable();
            $t->json('size_ids')->nullable();
            $t->string('video_type')->nullable();
            $t->string('video_url')->nullable();
            $t->string('meta_title')->nullable();
            $t->text('meta_description')->nullable();
            $t->json('meta_keywords')->nullable();
            $t->string('image')->nullable();
            $t->decimal('price', 12, 2);
            $t->decimal('old_price', 12, 2)->nullable();
            $t->decimal('discount_price', 12, 2)->nullable();
            $t->decimal('rating', 2, 1)->default(0);
            $t->unsignedInteger('reviews_count')->default(0);
            $t->unsignedInteger('stock')->default(0);
            $t->boolean('is_digital')->default(false);
            $t->boolean('is_preorder')->default(false);
            $t->boolean('is_flash_sale')->default(false);
            $t->boolean('active')->default(true);
            $t->timestamps();
        });

        Schema::create('blog_posts', function (Blueprint $t) {
            $t->id();
            $t->string('title');
            $t->string('category')->nullable();
            $t->text('excerpt')->nullable();
            $t->longText('body')->nullable();
            $t->string('image')->nullable();
            $t->unsignedInteger('views')->default(0);
            $t->boolean('published')->default(true);
            $t->timestamps();
        });

        Schema::create('contact_messages', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('email');
            $t->string('subject');
            $t->text('message');
            $t->boolean('read')->default(false);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['contact_messages', 'blog_posts', 'products', 'shops', 'brands', 'categories'] as $t) {
            Schema::dropIfExists($t);
        }
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['role', 'phone', 'gender', 'birth_date']));
    }
};
