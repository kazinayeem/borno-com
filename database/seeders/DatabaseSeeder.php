<?php

namespace Database\Seeders;

use App\Models\BlogPost;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::create(['name' => 'Root Admin', 'email' => 'root@readyecommerce.com', 'role' => 'admin', 'password' => 'secret']);
        $owner = User::create(['name' => 'Demo Shop', 'email' => 'shop@readyecommerce.com', 'role' => 'shop', 'password' => 'secret']);

        $cats = collect(['Electronics', 'Fashion & Clothing', 'Beauty & Personal Care', 'Home & Living', 'Grocery & Essentials', 'Toys & Games', 'Sports & Outdoors', 'Jewelry & Accessories', 'Books & Stationery', 'Automotive'])
            ->map(fn ($n, $i) => Category::create(['name' => $n, 'slug' => Str::slug($n), 'active' => $i < 7]));

        $brands = collect(['Nike', 'Adidas', 'Gucci', 'Canon', 'Samsung', 'Apple', 'Sony', 'Philips', 'Zara', 'Lego', 'Puma', 'Dell', 'HP', 'LG', 'Asus', 'Lenovo', 'Xiaomi', 'Bosch', 'Casio'])
            ->map(fn ($n) => Brand::create(['name' => $n, 'slug' => Str::slug($n)]));

        $shops = collect(['My Shop', 'Demo Shop', 'Urban Verse', 'NovaMart', 'Blue Harbor', 'Hazel & Co'])
            ->map(fn ($n, $i) => Shop::create([
                'name' => $n, 'user_id' => $i === 1 ? $owner->id : null, 'online' => $i % 2 === 0,
                'rating' => [3.5, 3.0, 2.8, 2.6, 2.6, 3.0][$i], 'reviews_count' => [23, 22, 21, 13, 19, 16][$i],
            ]));

        $names = ['Oil Heater', 'Shower Gel', 'First Aid Kit', 'Gold Necklace Set', 'Trench Coat', 'Vitamin Serum', 'Desk Fan', 'Racing Helmet', 'Ice Skates', 'Wireless Headphones', 'Smart Watch', 'Running Shoes', 'Leather Wallet', 'Yoga Mat', 'Table Lamp', 'Board Game', 'Coffee Maker', 'Backpack', 'Sunglasses', 'Bluetooth Speaker'];
        foreach ($names as $i => $n) {
            $price = fake()->randomFloat(2, 12, 200);
            Product::create([
                'shop_id' => $shops[$i % 6]->id, 'category_id' => $cats[$i % 8]->id, 'brand_id' => $brands[$i % 19]->id,
                'name' => $n, 'slug' => Str::slug($n), 'short_description' => fake()->sentence(10), 'sku' => (string) fake()->numberBetween(100000, 999999), 'unit' => 'pcs', 'buy_price' => round($price * 0.7, 2), 'description' => fake()->paragraph(), 'price' => $price,
                'old_price' => $i % 3 === 0 ? round($price * 1.2, 2) : null, 'discount_price' => round($price * fake()->randomFloat(2, 0.3, 1), 2),
                'rating' => fake()->randomFloat(1, 0, 5), 'reviews_count' => fake()->numberBetween(0, 20),
                'stock' => fake()->numberBetween(0, 50), 'is_digital' => $i % 9 === 0, 'is_preorder' => $i % 11 === 0,
                'is_flash_sale' => $i < 5,
            ]);
        }

        $customers = collect(range(1, 15))->map(fn () => User::create([
            'name' => fake()->name(), 'email' => fake()->unique()->safeEmail(), 'role' => 'customer', 'password' => 'secret',
            'phone' => fake()->phoneNumber(), 'gender' => fake()->randomElement(['male', 'female']), 'birth_date' => fake()->dateTimeBetween('-55 years', '-18 years')->format('Y-m-d'),
        ]));
        $products = Product::all();
        foreach (range(1, 40) as $i) {
            $picked = $products->random(rand(1, 3));
            $sub = 0;
            $order = Order::create([
                'number' => 'RC'.str_pad(100 + $i, 6, '0', STR_PAD_LEFT), 'user_id' => $customers->random()->id,
                'shop_id' => $picked->first()->shop_id, 'status' => fake()->randomElement(Order::STATUSES),
                'payment_status' => fake()->randomElement(['paid', 'paid', 'unpaid']),
                'payment_method' => fake()->randomElement(['Cash Payment', 'Stripe', 'Bkash', 'QiCard', 'cashFree']),
                'subtotal' => 0, 'total' => 0, 'shipping_address' => fake()->address(),
                'created_at' => now()->subDays(rand(0, 60)),
            ]);
            foreach ($picked as $p) {
                $qty = rand(1, 3);
                $sub += $p->price * $qty;
                $order->items()->create(['product_id' => $p->id, 'name' => $p->name, 'price' => $p->price, 'qty' => $qty]);
            }
            $ship = $sub > 999 ? 0 : 5;
            $order->update(['subtotal' => $sub, 'shipping' => $ship, 'total' => $sub + $ship]);
        }

        foreach (range(1, 9) as $i) {
            BlogPost::create([
                'title' => fake()->sentence(6), 'category' => $cats->random()->name,
                'excerpt' => fake()->sentence(18), 'body' => fake()->paragraphs(4, true), 'views' => fake()->numberBetween(0, 400),
            ]);
        }
    }
}
