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
    /** Product name bank per category (index matches the category list below). */
    private const PRODUCTS = [
        ['Wireless Headphones', 'Smart Watch', 'Bluetooth Speaker', 'Gaming Mouse', 'Mechanical Keyboard', '4K Action Camera', 'Power Bank 20000mAh', 'Laptop Stand', 'USB-C Hub', 'Electric Heater', 'Desk Fan', 'LED Monitor 27"', 'Smartphone Case', 'Wi-Fi Router', 'Webcam HD'],
        ['Trench Coat', 'Denim Jacket', 'Cotton T-Shirt', 'Slim Fit Jeans', 'Hooded Sweatshirt', 'Summer Dress', 'Leather Belt', 'Wool Scarf', 'Running Shoes', 'Canvas Sneakers', 'Formal Shirt', 'Cargo Shorts', 'Rain Jacket', 'Polo Shirt', 'Knit Cardigan'],
        ['Vitamin C Serum', 'Moisturizing Cream', 'Argan Shampoo', 'Sunscreen SPF 50', 'Lip Balm Set', 'Face Wash Gel', 'Hair Dryer', 'Beard Trimmer', 'Perfume Eau de Parfum', 'Body Lotion', 'Nail Care Kit', 'Charcoal Face Mask', 'Shower Gel', 'Hair Oil', 'Eye Cream'],
        ['Table Lamp', 'Throw Pillow Set', 'Ceramic Vase', 'Wall Clock', 'Bed Sheet Set', 'Coffee Maker', 'Non-stick Pan', 'Storage Basket', 'Scented Candle', 'Bath Towel Set', 'Kitchen Knife Set', 'Floor Rug', 'Curtain Panel', 'Wooden Shelf', 'Air Purifier'],
        ['Basmati Rice 5kg', 'Olive Oil 1L', 'Organic Honey', 'Green Tea Pack', 'Whole Wheat Pasta', 'Almond Butter', 'Farm Fresh Crate', 'Mixed Nuts 500g', 'Instant Coffee', 'Dark Chocolate Bar', 'Oat Cereal', 'Peanut Butter', 'Spice Collection', 'Quinoa 1kg', 'Dried Fruit Box'],
        ['Building Blocks Set', 'Remote Control Car', 'Board Game Classic', 'Puzzle 1000 Pieces', 'Plush Teddy Bear', 'Art & Craft Kit', 'Toy Train Set', 'Doll House', 'Card Game Deck', 'Water Gun', 'Science Experiment Kit', 'Magnetic Tiles', 'Toy Kitchen Set', 'Kids Drum Set', 'Chess Set'],
        ['Yoga Mat', 'Adjustable Dumbbells', 'Racing Helmet', 'Ice Skates', 'Camping Tent', 'Hiking Backpack', 'Cycling Gloves', 'Football Size 5', 'Jump Rope', 'Resistance Bands', 'Water Bottle 1L', 'Badminton Racket', 'Swim Goggles', 'Fishing Rod', 'Sleeping Bag'],
        ['Gold Necklace Set', 'Silver Bracelet', 'Pearl Earrings', 'Diamond Ring', 'Leather Wallet', 'Aviator Sunglasses', 'Analog Wrist Watch', 'Crossbody Bag', 'Charm Pendant', 'Hair Accessories Set', 'Cufflinks', 'Tote Bag', 'Anklet', 'Brooch', 'Key Holder'],
        ['Notebook Pack', 'Fountain Pen', 'Desk Organizer', 'Sketch Pad', 'Highlighter Set', 'Hardcover Planner', 'Novel Collection', 'Cookbook', 'Gel Pen Box', 'Sticky Notes'],
        ['Car Phone Holder', 'Seat Cover Set', 'Dash Cam', 'Tyre Inflator', 'Car Vacuum Cleaner', 'Engine Oil 4L', 'Wiper Blades', 'Steering Wheel Cover', 'Jump Starter', 'Floor Mats'],
    ];

    public function run(): void
    {
        User::create(['name' => 'Root Admin', 'email' => 'root@readyecommerce.com', 'role' => 'admin', 'password' => 'secret']);
        $owner = User::create(['name' => 'Demo Shop', 'email' => 'shop@readyecommerce.com', 'role' => 'shop', 'password' => 'secret']);

        $catNames = ['Electronics', 'Fashion & Clothing', 'Beauty & Personal Care', 'Home & Living', 'Grocery & Essentials', 'Toys & Games', 'Sports & Outdoors', 'Jewelry & Accessories', 'Books & Stationery', 'Automotive'];
        $cats = collect($catNames)->map(fn ($n, $i) => Category::create(['name' => $n, 'slug' => Str::slug($n), 'active' => $i < 7, 'order_by' => $i]));

        foreach (['Gift Sets', 'Watches', 'Phones', 'Laptops', 'Men', 'Women', 'Kids', 'Skincare', 'Furniture', 'Snacks'] as $i => $n) {
            SubCategory::create(['category_id' => $cats[[7, 7, 0, 0, 1, 1, 1, 2, 3, 4][$i]]->id, 'name' => $n, 'active' => $i % 4 !== 3]);
        }

        $brands = collect(['Nike', 'Adidas', 'Gucci', 'Canon', 'Samsung', 'Apple', 'Sony', 'Philips', 'Zara', 'Lego', 'Puma', 'Dell', 'HP', 'LG', 'Asus', 'Lenovo', 'Xiaomi', 'Bosch', 'Casio'])
            ->map(fn ($n) => Brand::create(['name' => $n, 'slug' => Str::slug($n)]));

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

        // 148 products spread across categories, shops and brands.
        $count = 0;
        while ($count < 148) {
            foreach (self::PRODUCTS as $ci => $names) {
                if ($count >= 148) {
                    break;
                }
                $name = $names[intdiv($count, 10) % count($names)];
                $name .= $count >= 100 ? ' #'.($count - 99) : '';
                $price = fake()->randomFloat(2, 8, 600);
                Product::create([
                    'shop_id' => $shops[$count % 14]->id, 'category_id' => $cats[$ci]->id, 'brand_id' => $brands[$count % 19]->id,
                    'name' => $name, 'slug' => Str::slug($name).'-'.($count + 1),
                    'short_description' => fake()->sentence(10), 'description' => fake()->paragraphs(2, true),
                    'sku' => (string) fake()->unique()->numberBetween(100000, 999999), 'unit' => fake()->randomElement(['pcs', 'kg', 'pack', 'box']),
                    'buy_price' => round($price * 0.7, 2), 'price' => $price,
                    'old_price' => $count % 3 === 0 ? round($price * 1.2, 2) : null,
                    'discount_price' => round($price * fake()->randomFloat(2, 0.5, 1), 2),
                    'color_ids' => fake()->randomElements([1, 2, 3, 4, 5, 6], rand(0, 3)), 'size_ids' => $ci === 1 ? fake()->randomElements([1, 2, 3, 4, 5], rand(2, 4)) : [],
                    'rating' => fake()->randomFloat(1, 0, 5), 'reviews_count' => fake()->numberBetween(0, 25),
                    'stock' => fake()->numberBetween(0, 120), 'is_digital' => $count % 23 === 0, 'is_preorder' => $count % 17 === 0,
                    'is_flash_sale' => $count % 9 === 0, 'active' => $count % 31 !== 0,
                ]);
                $count++;
            }
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
            FlashSale::create(['name' => $n, 'starts_at' => $s, 'ends_at' => $e, 'active' => $i === 0, 'description' => "Don't miss our Mega Flash Sale! Save up to 60% on thousands of products including electronics, fashion, beauty, home essentials, and fast nationwide delivery."]);
        }

        foreach (range(1, 9) as $i) {
            BlogPost::create(['title' => fake()->sentence(6), 'category' => $cats->random()->name, 'excerpt' => fake()->sentence(18), 'body' => fake()->paragraphs(4, true), 'views' => fake()->numberBetween(0, 400)]);
        }

        $this->seedReference();
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
}
