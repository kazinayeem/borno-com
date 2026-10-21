<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\Record;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerShopTest extends TestCase
{
    use RefreshDatabase;

    private const CLIENT = 'test-client.apps.googleusercontent.com';

    private function customer(string $email = 'c@x.test'): User
    {
        return User::create(['name' => 'Cu', 'email' => $email, 'role' => 'customer', 'password' => 'password1']);
    }

    private function product(Shop $shop, array $o = []): Product
    {
        $cat = Category::firstOrCreate(['slug' => 'c'], ['name' => 'C']);

        return Product::create($o + ['shop_id' => $shop->id, 'category_id' => $cat->id, 'name' => 'Mug', 'price' => 10, 'stock' => 5]);
    }

    private function addr(): array
    {
        return ['name' => 'Ann', 'phone' => '0171', 'address_line' => '1 Main St', 'area' => 'Dhaka'];
    }

    // ---- sign up / sign in -------------------------------------------------------------------------------------------
    public function test_register_validates_and_signs_in(): void
    {
        $this->postJson('/api/account/register', [])->assertJsonValidationErrors(['name', 'email', 'password']);
        $this->postJson('/api/account/register', ['name' => 'A', 'email' => 'a@x.test', 'password' => 'short', 'password_confirmation' => 'short'])->assertJsonValidationErrors('password');
        $r = $this->postJson('/api/account/register', ['name' => 'A', 'email' => 'a@x.test', 'password' => 'longenough1', 'password_confirmation' => 'longenough1'])->assertCreated()->assertJsonStructure(['token', 'user' => ['id', 'email']]);
        $this->assertSame('customer', User::first()->role);
        $this->postJson('/api/account/register', ['name' => 'A', 'email' => 'a@x.test', 'password' => 'longenough1', 'password_confirmation' => 'longenough1'])->assertJsonValidationErrors('email');
        $this->withToken($r->json('token'))->getJson('/api/account/me')->assertOk()->assertJsonPath('email', 'a@x.test')->assertJsonMissingPath('password');
    }

    public function test_login_gives_one_message_for_unknown_user_and_bad_password_and_blocks_staff(): void
    {
        $this->customer();
        User::create(['name' => 'Boss', 'email' => 'boss@x.test', 'role' => 'admin', 'password' => 'password1']);
        $bad = $this->postJson('/api/account/login', ['email' => 'c@x.test', 'password' => 'wrong'])->assertStatus(422)->json('message');
        $this->assertSame($bad, $this->postJson('/api/account/login', ['email' => 'nobody@x.test', 'password' => 'wrong'])->json('message'));
        $this->postJson('/api/account/login', ['email' => 'boss@x.test', 'password' => 'password1'])->assertForbidden();
        $this->postJson('/api/account/login', ['email' => 'c@x.test', 'password' => 'password1'])->assertOk()->assertJsonStructure(['token']);
    }

    public function test_staff_and_customer_tokens_cannot_cross_over(): void
    {
        $this->getJson('/api/account/me')->assertUnauthorized();
        Sanctum::actingAs(User::create(['name' => 'Boss', 'email' => 'boss@x.test', 'role' => 'admin', 'password' => 'password1']));
        $this->getJson('/api/account/me')->assertForbidden();
        $this->getJson('/api/account/orders')->assertForbidden();
        Sanctum::actingAs($this->customer());
        $this->getJson('/api/admin/products')->assertForbidden();
        $this->getJson('/api/admin/dashboard')->assertForbidden();
    }

    // ---- Google ------------------------------------------------------------------------------------------------------
    private function google(array $claims, int $status = 200)
    {
        config(['services.google.client_id' => self::CLIENT]);
        Http::fake(['oauth2.googleapis.com/*' => Http::response($claims, $status)]);

        return $this->postJson('/api/account/google', ['credential' => 'tok']);
    }

    private function claims(array $o = []): array
    {
        return $o + ['aud' => self::CLIENT, 'iss' => 'https://accounts.google.com', 'sub' => 'g-1', 'email' => 'g@x.test', 'email_verified' => 'true', 'exp' => (string) (time() + 600), 'name' => 'Gina'];
    }

    public function test_google_creates_a_customer_and_signs_in(): void
    {
        $this->google($this->claims())->assertOk()->assertJsonPath('user.email', 'g@x.test')->assertJsonPath('user.has_password', false)->assertJsonPath('user.google', true)->assertJsonStructure(['token']);
        $u = User::where('email', 'g@x.test')->first();
        $this->assertSame('customer', $u->role);
        $this->assertSame('g-1', $u->google_id);
        $this->google($this->claims())->assertOk();
        $this->assertSame(1, User::where('email', 'g@x.test')->count());
    }

    public function test_google_links_an_existing_manual_account_by_verified_email(): void
    {
        $c = $this->customer('g@x.test');
        $this->google($this->claims())->assertOk()->assertJsonPath('user.id', $c->id);
        $this->assertSame('g-1', $c->fresh()->google_id);
    }

    public function test_google_rejects_bad_tokens(): void
    {
        $this->google($this->claims(['aud' => 'someone-elses-app']))->assertUnauthorized();
        $this->google($this->claims(['email_verified' => 'false']))->assertUnauthorized();
        $this->google($this->claims(['exp' => (string) (time() - 5)]))->assertUnauthorized();
        $this->google($this->claims(['iss' => 'https://evil.example']))->assertUnauthorized();
        $this->google([], 400)->assertUnauthorized();
        $this->assertSame(0, User::count());
    }

    public function test_google_can_never_sign_into_a_staff_account_and_is_off_without_a_client_id(): void
    {
        User::create(['name' => 'Boss', 'email' => 'g@x.test', 'role' => 'admin', 'password' => 'password1']);
        $this->google($this->claims())->assertForbidden();
        config(['services.google.client_id' => null]);
        $this->postJson('/api/account/google', ['credential' => 'tok'])->assertStatus(503);
    }

    public function test_google_only_account_can_set_a_password_without_a_current_one(): void
    {
        $token = $this->google($this->claims())->json('token');
        $this->withToken($token)->putJson('/api/account/password', ['password' => 'brandnew123', 'password_confirmation' => 'brandnew123'])->assertNoContent();
        $this->assertTrue(User::where('email', 'g@x.test')->first()->password_set);
        $this->withToken($token)->putJson('/api/account/password', ['password' => 'another123', 'password_confirmation' => 'another123'])->assertJsonValidationErrors('current_password');
        $this->postJson('/api/account/login', ['email' => 'g@x.test', 'password' => 'brandnew123'])->assertOk();
    }

    // ---- public catalogue --------------------------------------------------------------------------------------------
    public function test_pending_and_inactive_products_are_not_public(): void
    {
        $shop = Shop::create(['name' => 'S']);
        $live = $this->product($shop, ['name' => 'Live']);
        $pending = $this->product($shop, ['name' => 'Pending', 'approval' => 'pending']);
        $off = $this->product($shop, ['name' => 'Off', 'active' => false]);
        $this->getJson('/api/products')->assertJsonPath('total', 1);
        $this->getJson("/api/products/{$live->id}")->assertOk();
        $this->getJson("/api/products/{$pending->id}")->assertNotFound();
        $this->getJson("/api/products/{$off->id}")->assertNotFound();
        $this->getJson("/api/products?ids={$live->id},{$pending->id}")->assertJsonPath('total', 1);
    }

    // ---- checkout ----------------------------------------------------------------------------------------------------
    public function test_checkout_prices_on_the_server_splits_by_shop_and_updates_stock(): void
    {
        $a = Shop::create(['name' => 'A']);
        $b = Shop::create(['name' => 'B']);
        $p1 = $this->product($a, ['price' => 10, 'stock' => 5]);
        $p2 = $this->product($b, ['price' => 20, 'stock' => 5]);
        Sanctum::actingAs($this->customer());

        $r = $this->postJson('/api/account/checkout', ['items' => [['product_id' => $p1->id, 'qty' => 2, 'price' => 0.01], ['product_id' => $p2->id, 'qty' => 1]], 'payment_method' => 'Cash Payment', 'address' => $this->addr(), 'save_address' => true])->assertCreated();
        $this->assertCount(2, $r->json('orders'));
        $this->assertEquals(20 + 5 + 20 + 5, $r->json('total'));            // each shop order = items + $5 shipping, client price ignored
        $this->assertSame(3, $p1->fresh()->stock);
        $this->assertSame(4, $p2->fresh()->stock);
        $this->assertDatabaseHas('orders', ['user_id' => User::first()->id, 'status' => 'pending', 'payment_status' => 'unpaid', 'source' => 'web', 'address_name' => 'Ann']);
        $this->assertStringStartsWith('RC', Order::first()->number);
        $this->assertDatabaseCount('addresses', 1);
    }

    public function test_free_shipping_and_coupon_are_applied_and_shared_across_shop_orders(): void
    {
        $a = Shop::create(['name' => 'A']);
        $b = Shop::create(['name' => 'B']);
        $big = $this->product($a, ['price' => 1000, 'stock' => 5]);
        $small = $this->product($b, ['price' => 100, 'stock' => 5]);
        Coupon::create(['code' => 'TEN', 'discount' => 10, 'discount_type' => 'percent', 'min_amount' => 50]);
        $q = $this->postJson('/api/checkout/quote', ['items' => [['product_id' => $big->id, 'qty' => 1], ['product_id' => $small->id, 'qty' => 1]], 'coupon' => 'TEN'])->assertOk();
        $this->assertEquals(1100, $q->json('subtotal'));
        $this->assertEquals(110, $q->json('discount'));
        $this->assertEquals(5, $q->json('shipping'));                       // the $1000 shop order ships free, the $100 one pays $5
        $this->assertEquals(1100 - 110 + 5, $q->json('total'));
        $this->postJson('/api/checkout/quote', ['items' => [['product_id' => $small->id, 'qty' => 1]], 'coupon' => 'NOPE'])->assertJsonValidationErrors('coupon');
    }

    public function test_checkout_refuses_oversell_unavailable_items_and_rolls_back_everything(): void
    {
        $shop = Shop::create(['name' => 'S']);
        $ok = $this->product($shop, ['stock' => 5]);
        $low = $this->product($shop, ['name' => 'Low', 'stock' => 1]);
        $pending = $this->product($shop, ['name' => 'Pend', 'approval' => 'pending']);
        Sanctum::actingAs($this->customer());
        $body = fn (array $items) => ['items' => $items, 'payment_method' => 'Cash Payment', 'address' => $this->addr()];

        $this->postJson('/api/account/checkout', $body([['product_id' => $ok->id, 'qty' => 1], ['product_id' => $low->id, 'qty' => 2]]))->assertStatus(422)->assertJsonValidationErrors('items');
        $this->postJson('/api/account/checkout', $body([['product_id' => $pending->id, 'qty' => 1]]))->assertStatus(422);
        $this->postJson('/api/account/checkout', $body([['product_id' => 9999, 'qty' => 1]]))->assertStatus(422);
        $this->postJson('/api/account/checkout', ['items' => [['product_id' => $ok->id, 'qty' => 1]], 'payment_method' => 'Bitcoin', 'address' => $this->addr()])->assertJsonValidationErrors('payment_method');
        $this->postJson('/api/account/checkout', ['items' => [['product_id' => $ok->id, 'qty' => 1]], 'payment_method' => 'Cash Payment'])->assertStatus(422);
        $this->assertDatabaseCount('orders', 0);
        $this->assertSame(5, $ok->fresh()->stock);
        $this->assertSame(1, $low->fresh()->stock);
    }

    public function test_quote_reports_problems_instead_of_failing(): void
    {
        $shop = Shop::create(['name' => 'S']);
        $ok = $this->product($shop);
        $out = $this->product($shop, ['name' => 'Gone', 'stock' => 0]);
        $q = $this->postJson('/api/checkout/quote', ['items' => [['product_id' => $ok->id, 'qty' => 1], ['product_id' => $out->id, 'qty' => 1]]])->assertOk();
        $this->assertCount(1, $q->json('issues'));
        $this->assertEquals(10, $q->json('subtotal'));
    }

    public function test_saved_address_must_belong_to_the_buyer(): void
    {
        $shop = Shop::create(['name' => 'S']);
        $p = $this->product($shop);
        $other = $this->customer('o@x.test');
        $theirs = \App\Models\Address::create(['user_id' => $other->id, 'name' => 'X', 'phone' => '1', 'address_line' => 'Secret Rd']);
        Sanctum::actingAs($this->customer());
        $this->postJson('/api/account/checkout', ['items' => [['product_id' => $p->id, 'qty' => 1]], 'payment_method' => 'Cash Payment', 'address_id' => $theirs->id])->assertStatus(422)->assertJsonValidationErrors('address_id');
        $this->assertDatabaseCount('orders', 0);
    }

    // ---- order history -----------------------------------------------------------------------------------------------
    public function test_customers_only_see_and_cancel_their_own_pending_orders(): void
    {
        $shop = Shop::create(['name' => 'S']);
        $p = $this->product($shop, ['stock' => 5]);
        $me = $this->customer();
        $other = $this->customer('o@x.test');
        Sanctum::actingAs($me);
        $mine = $this->postJson('/api/account/checkout', ['items' => [['product_id' => $p->id, 'qty' => 2]], 'payment_method' => 'Cash Payment', 'address' => $this->addr()])->assertCreated()->json('orders.0.id');
        $this->assertSame(3, $p->fresh()->stock);
        $theirs = Order::create(['number' => 'RCX', 'user_id' => $other->id, 'shop_id' => $shop->id, 'status' => 'pending', 'subtotal' => 1, 'total' => 1]);

        $this->getJson('/api/account/orders')->assertJsonPath('total', 1);
        $this->getJson("/api/account/orders/$mine")->assertOk()->assertJsonPath('items.0.qty', 2);
        $this->getJson("/api/account/orders/{$theirs->id}")->assertNotFound();
        $this->postJson("/api/account/orders/{$theirs->id}/cancel")->assertNotFound();
        $this->getJson('/api/account/summary')->assertJsonPath('orders', 1)->assertJsonPath('by_status.pending', 1);

        $this->postJson("/api/account/orders/$mine/cancel")->assertOk()->assertJsonPath('status', 'cancelled');
        $this->assertSame(5, $p->fresh()->stock);                                    // stock is returned
        $this->postJson("/api/account/orders/$mine/cancel")->assertStatus(422);       // cannot cancel twice
        $this->assertSame(5, $p->fresh()->stock);
        Order::whereKey($mine)->update(['status' => 'processing']);
        $this->postJson("/api/account/orders/$mine/cancel")->assertStatus(422);       // or once it is being processed
    }

    public function test_address_book_keeps_one_default_and_is_private(): void
    {
        $me = $this->customer();
        $other = $this->customer('o@x.test');
        Sanctum::actingAs($me);
        $a = $this->postJson('/api/account/addresses', $this->addr())->assertCreated()->assertJsonPath('is_default', true)->json('id');
        $b = $this->postJson('/api/account/addresses', $this->addr() + ['is_default' => true])->assertCreated()->json('id');
        $this->assertFalse(\App\Models\Address::find($a)->is_default);
        $this->postJson('/api/account/addresses', ['name' => 'X'])->assertJsonValidationErrors(['phone', 'address_line']);
        $this->deleteJson("/api/account/addresses/$b")->assertNoContent();
        $this->assertTrue(\App\Models\Address::find($a)->is_default);                 // a default is promoted automatically
        $theirs = \App\Models\Address::create(['user_id' => $other->id, 'name' => 'X', 'phone' => '1', 'address_line' => 'Secret']);
        $this->putJson("/api/account/addresses/{$theirs->id}", $this->addr())->assertNotFound();
        $this->deleteJson("/api/account/addresses/{$theirs->id}")->assertNotFound();
        $this->getJson('/api/account/addresses')->assertJsonCount(1);
    }

    public function test_profile_update_cannot_change_email_or_role(): void
    {
        $me = $this->customer();
        Sanctum::actingAs($me);
        $this->putJson('/api/account/me', ['name' => 'New', 'email' => 'evil@x.test', 'role' => 'admin', 'phone' => '1'])->assertOk()->assertJsonPath('name', 'New');
        $me->refresh();
        $this->assertSame('c@x.test', $me->email);
        $this->assertSame('customer', $me->role);
    }

    public function test_home_serves_admin_banners_and_flash_filter(): void
    {
        $shop = Shop::create(['name' => 'S']);
        $this->product($shop, ['is_flash_sale' => true, 'name' => 'Flash']);
        $this->product($shop, ['name' => 'Plain']);
        Record::create(['resource' => 'banners', 'rid' => 1, 'data' => ['title' => 'Banner 1', 'thumbnail' => '/assets/storefront/banner-watch.png', 'url' => '/products', 'is_active' => true]]);

        $this->getJson('/api/home')->assertOk()->assertJsonPath('banners.0.image', '/assets/storefront/banner-watch.png');
        $names = collect($this->getJson('/api/products?flash=1')->assertOk()->json('data'))->pluck('name');
        $this->assertTrue($names->contains('Flash'));
        $this->assertFalse($names->contains('Plain'));
    }
}
