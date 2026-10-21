<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Coupon;
use App\Models\Currency;
use App\Models\Order;
use App\Models\Rider;
use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ShopApiTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return tap(User::create(['name' => 'Admin', 'email' => 'a@x.test', 'role' => 'admin', 'password' => 'secret']), fn ($u) => Sanctum::actingAs($u));
    }

    private function seller(): array
    {
        $u = User::create(['name' => 'Seller', 'email' => 's@x.test', 'role' => 'shop', 'password' => 'secret']);
        $shop = Shop::create(['name' => 'Mine', 'user_id' => $u->id]);
        Sanctum::actingAs($u);

        return [$u, $shop];
    }

    private function product(Shop $shop, array $o = []): Product
    {
        $cat = Category::firstOrCreate(['slug' => 'c'], ['name' => 'C']);

        return Product::create($o + ['shop_id' => $shop->id, 'category_id' => $cat->id, 'name' => 'Mug', 'price' => 10, 'stock' => 5]);
    }

    public function test_login_rejects_bad_credentials_and_customers(): void
    {
        User::create(['name' => 'A', 'email' => 'a@x.test', 'role' => 'admin', 'password' => 'secret']);
        User::create(['name' => 'C', 'email' => 'c@x.test', 'role' => 'customer', 'password' => 'secret']);

        $this->postJson('/api/auth/login', ['email' => 'a@x.test', 'password' => 'nope'])->assertStatus(422);
        $this->postJson('/api/auth/login', ['email' => 'c@x.test', 'password' => 'secret'])->assertStatus(403);
        $this->postJson('/api/auth/login', ['email' => 'a@x.test', 'password' => 'secret'])->assertOk()->assertJsonStructure(['token', 'user']);
    }

    public function test_admin_routes_need_a_login_and_the_right_role(): void
    {
        $this->getJson('/api/admin/products')->assertUnauthorized();

        [, $shop] = $this->seller();
        $this->getJson('/api/admin/products')->assertOk();
        $this->getJson('/api/admin/categories')->assertForbidden();
        $this->getJson('/api/admin/settings')->assertForbidden();
        $this->getJson('/api/admin/customers')->assertForbidden();
    }

    public function test_storefront_filters_products_and_hides_inactive(): void
    {
        $shop = Shop::create(['name' => 'S']);
        $this->product($shop, ['name' => 'Red Mug', 'price' => 5]);
        $this->product($shop, ['name' => 'Blue Lamp', 'price' => 50]);
        $this->product($shop, ['name' => 'Hidden Mug', 'active' => false]);

        $this->getJson('/api/products?search=Mug')->assertOk()->assertJsonPath('total', 1);
        $this->getJson('/api/products?min_price=20')->assertJsonPath('total', 1);
        $this->getJson('/api/products?sort=price_desc')->assertJsonPath('data.0.name', 'Blue Lamp');
    }

    public function test_contact_form_validates_and_stores(): void
    {
        $this->postJson('/api/contact', [])->assertStatus(422)->assertJsonValidationErrors(['name', 'email', 'subject', 'message']);
        $this->postJson('/api/contact', ['name' => 'N', 'email' => 'n@x.test', 'subject' => 'S', 'message' => 'M'])->assertCreated();
        $this->assertDatabaseCount('contact_messages', 1);
    }

    public function test_admin_crud_validation_and_unique_coupon_code(): void
    {
        $this->admin();
        $this->postJson('/api/admin/categories', [])->assertJsonValidationErrors('name');
        $id = $this->postJson('/api/admin/categories', ['name' => 'Pets'])->assertCreated()->json('id');
        $this->putJson("/api/admin/categories/$id", ['active' => false])->assertOk()->assertJsonPath('active', false);
        $this->deleteJson("/api/admin/categories/$id")->assertNoContent();

        Coupon::create(['code' => 'A1', 'discount' => 5]);
        $this->postJson('/api/admin/coupons', ['code' => 'A1', 'discount' => 5, 'discount_type' => 'percent'])->assertJsonValidationErrors('code');
        $this->postJson('/api/admin/colors', ['name' => 'X', 'code' => 'red'])->assertJsonValidationErrors('code');
    }

    public function test_image_paths_must_live_under_uploads(): void
    {
        $this->admin();
        $this->postJson('/api/admin/categories', ['name' => 'Evil', 'icon' => '../../.env'])->assertJsonValidationErrors('icon');
        $this->postJson('/api/admin/categories', ['name' => 'Ok', 'icon' => 'uploads/a.png'])->assertCreated();
    }

    public function test_settings_roundtrip_and_public_master_reflects_it(): void
    {
        Currency::create(['name' => 'USD', 'symbol' => '$', 'is_default' => true]);
        $this->admin();
        $this->putJson('/api/admin/settings', ['name' => 'My Store', 'title' => 'T', 'currency' => 'USD', 'currency_position' => 'prefix', 'email' => 'bad'])->assertJsonValidationErrors('email');
        $this->putJson('/api/admin/settings', ['name' => 'My Store', 'title' => 'T', 'currency' => 'USD', 'currency_position' => 'prefix'])->assertOk();
        $this->getJson('/api/master')->assertJsonPath('data.app_name', 'My Store');
    }

    public function test_default_currency_cannot_be_deleted(): void
    {
        $this->admin();
        $c = Currency::create(['name' => 'USD', 'symbol' => '$', 'is_default' => true]);
        $this->deleteJson("/api/admin/currencies/{$c->id}")->assertStatus(422);
    }

    public function test_pos_prices_come_from_the_server_and_stock_is_enforced(): void
    {
        $this->admin();
        $shop = Shop::create(['name' => 'S']);
        $p = $this->product($shop, ['price' => 10, 'stock' => 5]);

        $this->postJson('/api/admin/pos/quote', ['items' => [['product_id' => $p->id, 'qty' => 2, 'price' => 0.01]]])->assertJsonPath('total', 20);

        $this->postJson('/api/admin/pos/checkout', ['items' => [['product_id' => $p->id, 'qty' => 6]], 'payment_method' => 'Cash Payment'])
            ->assertStatus(422)->assertJsonValidationErrors('items');
        $this->assertSame(5, $p->fresh()->stock);

        $this->postJson('/api/admin/pos/checkout', ['items' => [['product_id' => $p->id, 'qty' => 2]], 'payment_method' => 'Cash Payment'])
            ->assertCreated()->assertJsonPath('source', 'pos');
        $this->assertSame(3, $p->fresh()->stock);
        $this->assertDatabaseHas('orders', ['source' => 'pos', 'status' => 'delivered', 'total' => 20]);
    }

    public function test_pos_coupon_rules(): void
    {
        $this->admin();
        $p = $this->product(Shop::create(['name' => 'S']), ['price' => 100]);
        Coupon::create(['code' => 'TEN', 'discount' => 10, 'discount_type' => 'percent', 'min_amount' => 50]);
        Coupon::create(['code' => 'OLD', 'discount' => 10, 'expires_at' => now()->subDay()]);
        $items = [['product_id' => $p->id, 'qty' => 1]];

        $this->postJson('/api/admin/pos/quote', ['items' => $items, 'coupon' => 'TEN'])->assertJsonPath('discount', 10)->assertJsonPath('total', 90);
        $this->postJson('/api/admin/pos/quote', ['items' => $items, 'coupon' => 'OLD'])->assertJsonValidationErrors('coupon');
        $this->postJson('/api/admin/pos/quote', ['items' => $items, 'coupon' => 'NOPE'])->assertJsonValidationErrors('coupon');
    }

    public function test_seller_cannot_sell_another_shops_product_or_see_its_orders(): void
    {
        $other = Shop::create(['name' => 'Other']);
        $theirs = $this->product($other);
        [, $mine] = $this->seller();

        $this->postJson('/api/admin/pos/quote', ['items' => [['product_id' => $theirs->id, 'qty' => 1]]])->assertForbidden();
        $this->getJson('/api/admin/dashboard')->assertJsonPath('scope', 'shop')->assertJsonPath('stats.products', 0);
        $this->assertNotNull($mine);
    }

    public function test_drafts_belong_to_their_creator(): void
    {
        $admin = $this->admin();
        $p = $this->product(Shop::create(['name' => 'S']));
        $id = $this->postJson('/api/admin/pos/drafts', ['items' => [['product_id' => $p->id, 'qty' => 1]]])->assertCreated()->json('id');

        Sanctum::actingAs(User::create(['name' => 'B', 'email' => 'b@x.test', 'role' => 'admin', 'password' => 'secret']));
        $this->deleteJson("/api/admin/pos/drafts/$id")->assertNotFound();

        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/pos/drafts')->assertJsonPath('data.0.lines.0.qty', 1);
        $this->deleteJson("/api/admin/pos/drafts/$id")->assertNoContent();
    }

    private function order(Shop $shop, User $customer, string $status = 'pending'): Order
    {
        return Order::create(['number' => 'RC'.random_int(1000, 9999), 'user_id' => $customer->id, 'shop_id' => $shop->id, 'status' => $status, 'subtotal' => 40, 'coupon_discount' => 10, 'shipping' => 5, 'total' => 35]);
    }

    public function test_order_status_payment_rider_and_delivery_date(): void
    {
        $this->admin();
        $cust = User::create(['name' => 'Cu', 'email' => 'cu@x.test', 'role' => 'customer', 'password' => 'secret']);
        $o = $this->order(Shop::create(['name' => 'S']), $cust);
        $rider = Rider::create(['name' => 'Rae']);

        $this->patchJson("/api/admin/orders/{$o->id}", ['status' => 'bogus'])->assertJsonValidationErrors('status');
        $this->patchJson("/api/admin/orders/{$o->id}", ['status' => 'processing', 'rider_id' => 999])->assertJsonValidationErrors('rider_id');
        $this->patchJson("/api/admin/orders/{$o->id}", ['status' => 'processing', 'rider_id' => $rider->id])->assertOk()->assertJsonPath('rider.name', 'Rae');
        $this->assertNull($o->fresh()->delivered_at);

        $this->patchJson("/api/admin/orders/{$o->id}", ['status' => 'delivered', 'payment_status' => 'paid'])->assertOk();
        $this->assertNotNull($o->fresh()->delivered_at);
        $this->patchJson("/api/admin/orders/{$o->id}", ['status' => 'cancelled'])->assertOk();
        $this->assertNull($o->fresh()->delivered_at);

        $this->getJson('/api/admin/riders-with-load')->assertJsonPath('0.incomplete_orders', 0);
        $this->getJson("/api/admin/orders/{$o->id}")->assertOk()->assertJsonPath('coupon_discount', 10)->assertJsonPath('shipping', 5);
    }

    public function test_seller_sees_only_own_orders_and_cannot_change_them(): void
    {
        $cust = User::create(['name' => 'Cu', 'email' => 'cu@x.test', 'role' => 'customer', 'password' => 'secret']);
        $other = $this->order(Shop::create(['name' => 'Other']), $cust);
        [, $mine] = $this->seller();
        $own = $this->order($mine, $cust);

        $this->getJson("/api/admin/orders/{$own->id}")->assertOk();
        $this->getJson("/api/admin/orders/{$other->id}")->assertNotFound();
        $this->patchJson("/api/admin/orders/{$own->id}", ['status' => 'delivered'])->assertForbidden();
        $this->getJson('/api/admin/riders-with-load')->assertForbidden();
        $this->getJson('/api/admin/orders')->assertJsonCount(1, 'data');
    }
}
