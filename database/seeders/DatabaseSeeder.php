<?php

namespace Database\Seeders;

use App\Models\BlogPost;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Color;
use App\Models\Coupon;
use App\Models\Currency;
use App\Models\Setting;
use App\Models\VatTax;
use App\Models\FlashSale;
use App\Models\Order;
use App\Models\Product;
use App\Models\Record;
use App\Models\Rider;
use App\Models\Shop;
use App\Models\Size;
use App\Models\SubCategory;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::create(['name' => 'Super Admin', 'email' => 'root@readyecommerce.com', 'role' => 'admin', 'password' => 'secret']);
        $owner = User::create(['name' => 'Demo Shop', 'email' => 'shop@readyecommerce.com', 'role' => 'shop', 'password' => 'secret']);

        $catNames = ['Electronics', 'Fashion & Clothing', 'Beauty & Personal Care', 'Home & Living', 'Grocery & Essentials', 'Toys & Games', 'Sports & Outdoors', 'Jewelry & Accessories', 'Books & Stationery', 'Automotive'];
        $cats = collect($catNames)->map(fn ($n, $i) => Category::create(['name' => $n, 'slug' => Str::slug($n), 'active' => $i < 7, 'order_by' => $i]));

        foreach (['Gift Sets', 'Watches', 'Phones', 'Laptops', 'Men', 'Women', 'Kids', 'Skincare', 'Furniture', 'Snacks'] as $i => $n) {
            SubCategory::create(['category_id' => $cats[[7, 7, 0, 0, 1, 1, 1, 2, 3, 4][$i]]->id, 'name' => $n, 'active' => $i % 4 !== 3]);
        }

        foreach ([['Red', '#e53935'], ['Green', '#43a047'], ['Blue', '#1e88e5'], ['Orange', '#fb8c00'], ['Gray', '#808080'], ['Purple', '#800080'], ['Black', '#000000'], ['White', '#ffffff'], ['Yellow', '#fdd835'], ['Pink', '#ec407a'], ['Brown', '#6d4c41'], ['Teal', '#00897b']] as [$n, $c]) {
            Color::create(['name' => $n, 'code' => $c]);
        }
        foreach (['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as $n) {
            Size::create(['name' => $n]);
        }
        foreach (['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'pack', 'dozen', 'meter', 'pair'] as $n) {
            Unit::create(['name' => $n]);
        }

        $shopNames = ['My Shop', 'Demo Shop', 'Urban Verse', 'NovaMart', 'Blue Harbor', 'Hazel & Co', 'Pickora', 'ABCDEFGH', 'Auyora', 'Shop Verse', 'Daily Basket', 'Gadget Hub', 'Style Street', 'Home Nest'];
        $shops = collect($shopNames)->map(fn ($n, $i) => Shop::create([
            'name' => $n, 'user_id' => $i === 1 ? $owner->id : null, 'online' => $i % 3 !== 1, 'active' => $i !== 9,
            'rating' => fake()->randomFloat(1, 2.5, 4.8), 'reviews_count' => fake()->numberBetween(5, 30),
            'address' => fake()->address(), 'description' => fake()->sentence(14),
        ]));

        // 148 real demo products (names, descriptions, prices, brands) from database/seeders/data/products.json.
        // Their photos are NOT stored here: `image` and `gallery` hold URLs to the hosted images.
        $data = json_decode(file_get_contents(database_path('seeders/data/products.json')), true)['products'];
        $brands = collect($data)->pluck('brand')->filter()->unique()->values()
            ->mapWithKeys(fn ($n) => [$n => Brand::create(['name' => $n, 'slug' => Str::slug($n)])->id]);
        $catIds = $cats->mapWithKeys(fn ($c) => [$c->name => $c->id]);
        foreach ($data as $i => $p) {
            Product::create([
                'shop_id' => $shops[$i % 14]->id, 'category_id' => $catIds[$p['category']], 'brand_id' => $brands[$p['brand']] ?? null,
                'name' => $p['name'], 'slug' => Str::slug($p['name']).'-'.($i + 1), 'short_description' => $p['short_description'], 'description' => $p['description'],
                'sku' => $p['sku'], 'unit' => 'pcs', 'weight' => $p['weight'], 'buy_price' => round($p['price'] * 0.7, 2), 'price' => $p['price'],
                'old_price' => $p['old_price'], 'discount_price' => $p['old_price'] ? $p['price'] : null,
                'favorites' => $i % 5, 'rating' => $p['rating'], 'reviews_count' => (int) round($p['rating'] * fake()->numberBetween(1, 6)), 'stock' => $p['stock'],
                'image' => $p['image'], 'gallery' => $p['gallery'], 'meta_keywords' => $p['keywords'], 'color_ids' => [], 'size_ids' => [],
                'is_digital' => false, 'is_preorder' => $i % 17 === 0, 'is_flash_sale' => $i % 9 === 0, 'active' => $i % 31 !== 0,
            ]);
        }
        $this->seedSampleVariants();
        // A category with no products stays switched off.
        foreach ($cats as $c) {
            $c->update(['active' => Product::where('category_id', $c->id)->exists()]);
        }

        $customers = collect(['test tuhin', 'Forest Mills', 'Alexa Windler', 'Doug Schulist', 'Johnpaul Effertz', 'Carmel Quigley', 'Ernie Beier', 'Lexus Gleason', 'Bettie Goyette', 'Reginald Gulgowski', 'Mara Kunde', 'Tobin Hartmann'])
            ->map(fn ($n, $i) => User::create([
                'name' => $n, 'email' => $i === 0 ? 'test@example.com' : fake()->unique()->safeEmail(), 'role' => 'customer', 'password' => 'secret',
                'phone' => fake()->phoneNumber(), 'gender' => fake()->randomElement(['male', 'female']),
                'birth_date' => fake()->dateTimeBetween('-55 years', '-18 years')->format('Y-m-d'),
            ]));

        foreach ([['Demo Rider', '01700000001'], ['Madison Webb', '01700000002'], ['Jonas Keller', '01700000003']] as [$n, $ph]) {
            Rider::create(['name' => $n, 'phone' => $ph]);
        }

        // 86 orders with realistic status spread.
        $statuses = array_merge(array_fill(0, 15, 'pending'), array_fill(0, 13, 'confirm'), array_fill(0, 14, 'processing'), array_fill(0, 13, 'pickup'), array_fill(0, 6, 'on_the_way'), array_fill(0, 13, 'delivered'), array_fill(0, 12, 'cancelled'));
        shuffle($statuses);
        $products = Product::all();
        foreach (range(1, 86) as $i) {
            $picked = $products->random(rand(1, 3));
            $sub = 0;
            $order = Order::create([
                'number' => 'RC'.str_pad($i, 6, '0', STR_PAD_LEFT), 'user_id' => $customers->random()->id,
                'shop_id' => $picked->first()->shop_id, 'status' => $statuses[$i - 1],
                'payment_status' => fake()->randomElement(['paid', 'paid', 'unpaid']),
                'payment_method' => fake()->randomElement(['Cash Payment', 'Stripe', 'Bkash', 'QiCard', 'cashFree']),
                'subtotal' => 0, 'total' => 0, 'shipping_address' => fake()->streetAddress(), 'address_name' => $customers->random()->name, 'address_phone' => fake()->phoneNumber(),
                'address_type' => fake()->randomElement(['home', 'office', 'other']), 'area' => fake()->city(), 'rider_id' => $statuses[$i - 1] === 'pending' ? null : rand(1, 3),
                'created_at' => now()->subDays($i <= 24 ? rand(0, 6) : rand(7, 90))->subMinutes(rand(0, 1400)),
            ]);
            foreach ($picked as $p) {
                $qty = rand(1, 3);
                $sub += $p->price * $qty;
                $order->items()->create(['product_id' => $p->id, 'name' => $p->name, 'size' => fake()->randomElement(['S', 'M', 'L', 'XL']), 'color' => fake()->randomElement(['Yellow', 'Red', 'Blue', 'Black']), 'price' => $p->price, 'qty' => $qty]);
            }
            $coupon = rand(0, 2) === 0 ? round($sub * fake()->randomFloat(2, 0.1, 0.3), 2) : 0;
            $ship = $sub > 999 ? 0 : fake()->randomElement([5, 10, 20, 76]);
            $order->update(['subtotal' => $sub, 'coupon_discount' => $coupon, 'shipping' => $ship, 'total' => $sub - $coupon + $ship,
                'delivered_at' => $order->status === 'delivered' ? $order->created_at->addDays(2) : null]);
        }

        Currency::create(['name' => 'USD', 'symbol' => '$', 'rate' => 1, 'is_default' => true]);
        Currency::create(['name' => 'EUR', 'symbol' => '€', 'rate' => 1]);
        VatTax::create(['name' => 'Standard VAT', 'percentage' => 5]);
        Setting::put(['name' => 'ReadyEcommerce', 'title' => 'ReadyEcommerce', 'currency' => 'USD', 'currency_position' => 'prefix', 'footer_phone' => '+880123456789', 'footer_text' => 'All right reserved by company', 'show_download_app' => true, 'show_footer' => true]);

        Coupon::create(['code' => 'Test123', 'discount' => 50, 'min_amount' => 30, 'starts_at' => '2026-08-01', 'expires_at' => '2026-09-01']);
        foreach (['SAVE10' => 10, 'WELCOME15' => 15, 'FLASH20' => 20, 'VIP25' => 25, 'EID30' => 30, 'NEW5' => 5, 'BONUS12' => 12, 'SUMMER40' => 40] as $code => $d) {
            Coupon::create(['code' => $code, 'discount' => $d, 'min_amount' => rand(20, 100), 'starts_at' => now()->subDays(rand(5, 60)), 'expires_at' => now()->addDays(rand(-10, 60)), 'active' => rand(0, 3) > 0]);
        }

        foreach ([['CRASH DEAL', '2026-07-08 15:00:00', '2026-07-31 07:00:00'], ['MEGA SALE', '2026-08-01 00:00:00', '2026-08-15 23:59:00'], ['WEEKEND OFFER', '2026-09-05 08:00:00', '2026-09-07 20:00:00']] as $i => [$n, $s, $e]) {
            FlashSale::create(['name' => $n, 'discount' => [50, 40, 30][$i], 'starts_at' => $s, 'ends_at' => $e, 'active' => $i === 0, 'description' => "Don't miss our Mega Flash Sale! Save up to 60% on thousands of products including electronics, fashion, beauty, home essentials, and fast nationwide delivery."]);
        }

        foreach (range(1, 9) as $i) {
            BlogPost::create(['title' => fake()->sentence(6), 'category' => $cats->random()->name, 'excerpt' => fake()->sentence(18), 'body' => fake()->paragraphs(4, true), 'views' => fake()->numberBetween(0, 400)]);
        }

        $this->seedReference();
        $this->call(StorefrontSeeder::class);
    }

    /** Resources without their own table + settings groups come from the reference spec's synthetic data. */
    private function seedReference(): void
    {
        $ref = json_decode(file_get_contents(database_path('seeders/data/reference_seed.json')), true);
        foreach ($ref['records'] as $resource => $rows) {
            foreach ($rows as $i => $row) {
                $rid = $row['id'] ?? $i + 1;
                $created = $row['created_at'] ?? null;
                unset($row['id'], $row['created_at']);
                Record::create(['resource' => $resource, 'rid' => $rid, 'data' => $row, 'created_at' => $created ? \Illuminate\Support\Carbon::parse($created) : now(), 'updated_at' => now()]);
            }
        }
        foreach ($ref['settings'] as $key => $values) {
            if ($key !== 'general') {
                Setting::put(["group.$key" => $values]);
            }
        }
        foreach ($ref['gateways'] as $g) {
            $rid = $g['id'];
            $created = $g['created_at'] ?? null;
            unset($g['id'], $g['created_at']);
            Record::create(['resource' => 'payment_gateways', 'rid' => $rid, 'data' => $g, 'created_at' => $created ? \Illuminate\Support\Carbon::parse($created) : now(), 'updated_at' => now()]);
        }
        // A few customer conversations so the Conversations screen has something to show.
        $customers = User::where('role', 'customer')->take(4)->get();
        foreach ($customers as $i => $c) {
            \App\Models\ChatMessage::create(['customer_id' => $c->id, 'body' => ['Hi, where is my order?', 'Is this item still in stock?', 'Can I change my delivery address?', 'Do you ship internationally?'][$i], 'created_at' => now()->subHours(5 - $i)]);
            if ($i % 2 === 0) {
                \App\Models\ChatMessage::create(['customer_id' => $c->id, 'from_staff' => true, 'body' => 'Thanks for reaching out — checking now.', 'created_at' => now()->subHours(4 - $i)]);
            }
        }
        // Shop-product approval states, in the same proportions as the reference seed.
        $approvals = $ref['product_approval'];
        Product::orderBy('id')->each(fn (Product $p, $i) => $p->update(['approval' => $approvals[$i % count($approvals)]]));
    }

    /** A few catalog products so color, size, and price can be tried on a fresh install. */
    private function seedSampleVariants(): void
    {
        $colors = Color::pluck('id', 'name');
        $sizes = Size::pluck('id', 'name');
        $specs = [
            'Tartan Dress' => ['colors' => ['Red', 'Blue', 'Black'], 'sizes' => ['S', 'M', 'L'], 'prices' => ['Red' => 39.99, 'Blue' => 44.99, 'Black' => 49.99]],
            'Brown Leather Belt Watch' => ['colors' => ['Brown', 'Black', 'Orange'], 'sizes' => [], 'prices' => ['Brown' => 89.99, 'Black' => 94.99, 'Orange' => 79.99]],
            'Nike Air Jordan 1 Red And Black' => ['colors' => ['Red', 'Black'], 'sizes' => ['M', 'L', 'XL'], 'prices' => ['Red' => 149.99, 'Black' => 159.99]],
        ];
        foreach ($specs as $name => $spec) {
            $p = Product::where('name', $name)->first();
            if (! $p) {
                continue;
            }
            $colorIds = array_values(array_filter(array_map(fn ($n) => $colors[$n] ?? null, $spec['colors'])));
            $sizeIds = array_values(array_filter(array_map(fn ($n) => $sizes[$n] ?? null, $spec['sizes'])));
            $cs = $colorIds ?: [null];
            $ss = $sizeIds ?: [null];
            $combos = count($cs) * count($ss);
            $each = intdiv(max(0, (int) $p->stock), $combos);
            $extra = max(0, (int) $p->stock) - $each * $combos;
            $i = 0;
            $variants = [];
            foreach ($cs as $c) {
                $cname = $c ? $colors->search($c) : null;
                foreach ($ss as $s) {
                    $variants[] = ['color_id' => $c, 'size_id' => $s, 'price' => $spec['prices'][$cname] ?? (float) $p->price, 'stock' => $each + ($i === 0 ? $extra : 0)];
                    $i++;
                }
            }
            $p->update([
                'variants' => $variants,
                'color_ids' => $colorIds,
                'size_ids' => $sizeIds,
                'stock' => (int) array_sum(array_column($variants, 'stock')),
                'price' => min(array_column($variants, 'price')),
            ]);
        }

        $this->fashionVariants();
        $this->staffRoles();
    }

    /** Clothing gets sizes and colors where each choice has its own price, so the variant UI has real data. */
    public function fashionVariants(): void
    {
        $colors = \App\Models\Color::pluck('id', 'name');
        $sizes = \App\Models\Size::pluck('id', 'name');
        $cat = \App\Models\Category::where('name', 'like', 'Fashion%')->value('id');
        $palette = ['Black', 'White', 'Blue', 'Red', 'Gray'];
        $steps = ['S' => 0, 'M' => 0, 'L' => 0.04, 'XL' => 0.08];
        foreach (Product::where('category_id', $cat)->get() as $p) {
            if (! empty($p->variants)) {
                continue;
            }
            $cn = [$palette[$p->id % 5], $palette[($p->id + 2) % 5]];
            $base = (float) $p->price;
            $variants = [];
            foreach ($cn as $ci => $name) {
                foreach ($steps as $sn => $step) {
                    $variants[] = [
                        'color_id' => $colors[$name], 'size_id' => $sizes[$sn],
                        'price' => round($base * (1 + $step) + $ci * 2, 2), 'stock' => 5 + (($p->id + $ci) % 7) * 3,
                    ];
                }
            }
            $p->update([
                'variants' => $variants, 'color_ids' => array_map(fn ($n) => $colors[$n], $cn), 'size_ids' => array_values(array_map(fn ($n) => $sizes[$n], array_keys($steps))),
                'stock' => array_sum(array_column($variants, 'stock')), 'price' => min(array_column($variants, 'price')),
            ]);
        }
    }

    /** Demo staff roles and one account per role (password "secret", like the other demo logins). */
    public function staffRoles(): void
    {
        $all = ['view', 'add', 'edit', 'delete'];
        $roles = [
            'Manager' => ['orders' => $all, 'pos' => $all, 'catalog' => $all, 'shops' => ['view', 'edit'], 'customers' => ['view', 'edit'], 'promotion' => $all, 'content' => $all, 'messages' => ['view', 'add'], 'reports' => ['view']],
            'Order Handler' => ['orders' => ['view', 'edit'], 'pos' => ['view', 'add'], 'customers' => ['view'], 'messages' => ['view', 'add']],
            'Content Editor' => ['content' => $all, 'promotion' => $all, 'catalog' => ['view']],
        ];
        foreach ($roles as $name => $perms) {
            $role = \App\Models\StaffRole::firstOrCreate(['name' => $name], ['permissions' => $perms]);
            $slug = strtolower(str_replace(' ', '.', $name));
            User::firstOrCreate(['email' => "{$slug}@readyecommerce.com"], ['name' => $name, 'role' => 'admin', 'password' => 'secret', 'staff_role_id' => $role->id]);
        }
    }
}
