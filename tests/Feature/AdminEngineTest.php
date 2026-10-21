<?php

namespace Tests\Feature;

use App\Models\ChatMessage;
use App\Models\FlashSale;
use App\Models\Order;
use App\Models\Record;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminEngineTest extends TestCase
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

    public function test_generic_resources_are_admin_only_and_unknown_ones_404(): void
    {
        $this->seller();
        $this->getJson('/api/admin/r/banners')->assertForbidden();
        $this->admin();
        $this->getJson('/api/admin/r/banners')->assertOk();
        $this->getJson('/api/admin/r/not_a_resource')->assertNotFound();
        $this->getJson('/api/admin/r/payment_gateways')->assertNotFound(); // credentials are only reachable via the masked gateway API
    }

    public function test_generic_crud_validates_from_the_spec_and_ignores_undeclared_fields(): void
    {
        $this->admin();
        $this->postJson('/api/admin/r/coupons_x', [])->assertNotFound();
        $this->postJson('/api/admin/r/suppliers', [])->assertJsonValidationErrors(['name', 'email', 'phone']);
        $id = $this->postJson('/api/admin/r/suppliers', ['name' => 'Acme', 'email' => 'acme@x.test', 'phone' => '1', 'is_admin' => true, 'evil' => 'x'])->assertCreated()->assertJsonMissingPath('evil')->json('id');
        $this->assertSame(1, $id);
        $this->assertSame(2, $this->postJson('/api/admin/r/suppliers', ['name' => 'Beta', 'email' => 'beta@x.test', 'phone' => '2'])->json('id'));
        $this->putJson("/api/admin/r/suppliers/$id", ['phone' => '99'])->assertOk()->assertJsonPath('phone', '99')->assertJsonPath('name', 'Acme');
        $this->patchJson("/api/admin/r/suppliers/$id/toggle")->assertOk()->assertJsonPath('is_active', false);
        $this->patchJson("/api/admin/r/suppliers/$id/toggle?field=name")->assertStatus(422);
        $this->getJson('/api/admin/r/suppliers?search=Beta')->assertJsonPath('total', 1);
        $this->deleteJson("/api/admin/r/suppliers/$id")->assertNoContent();
        $this->getJson("/api/admin/r/suppliers/$id")->assertNotFound();
    }

    public function test_ids_are_per_resource_not_global(): void
    {
        $this->admin();
        $this->postJson('/api/admin/r/suppliers', ['name' => 'S', 'email' => 's@x.test', 'phone' => '3'])->assertCreated()->assertJsonPath('id', 1);
        Record::create(['resource' => 'languages', 'rid' => 1, 'data' => ['name' => 'English']]);
        $this->getJson('/api/admin/r/languages/1')->assertOk()->assertJsonPath('name', 'English');
    }

    public function test_settings_groups_mask_secrets_and_keep_them_when_the_mask_is_sent_back(): void
    {
        $this->admin();
        $key = 'mail';
        $this->putJson("/api/admin/settings-group/$key", ['host' => 'smtp.test', 'password' => 's3cret', 'from_address' => 'a@b.co'])->assertOk()->assertJsonPath('password', '********')->assertJsonPath('host', 'smtp.test');
        $this->putJson("/api/admin/settings-group/$key", ['host' => 'smtp2.test', 'password' => '********', 'from_address' => 'a@b.co'])->assertOk();
        $this->assertSame('s3cret', \App\Models\Setting::all_()['group.mail']['password']);
        $this->getJson("/api/admin/settings-group/$key")->assertJsonPath('password', '********')->assertJsonPath('host', 'smtp2.test');
        $this->putJson("/api/admin/settings-group/$key", ['from_address' => 'not-an-email'])->assertJsonValidationErrors('from_address');
        $this->getJson('/api/admin/settings-group/general')->assertNotFound();
        $this->getJson('/api/admin/settings-group/nope')->assertNotFound();
    }

    public function test_gateways_never_leak_credentials(): void
    {
        $this->admin();
        Record::create(['resource' => 'payment_gateways', 'rid' => 1, 'data' => ['name' => 'Stripe', 'title' => 'Stripe', 'mode' => 'test', 'is_active' => false, 'config' => ['key' => 'sk_live_abc', 'empty' => '']]]);
        $this->getJson('/api/admin/gateways')->assertJsonPath('0.config.key', '********')->assertJsonPath('0.config.empty', '');
        $this->putJson('/api/admin/gateways/1', ['is_active' => true, 'mode' => 'live', 'config' => ['key' => '********', 'empty' => 'new', 'injected' => 'x']])->assertOk()
            ->assertJsonPath('is_active', true)->assertJsonMissingPath('config.injected');
        $this->assertSame('sk_live_abc', Record::first()->data['config']['key']);
        $this->assertSame('new', Record::first()->data['config']['empty']);
        $this->putJson('/api/admin/gateways/1', ['mode' => 'banana'])->assertJsonValidationErrors('mode');
    }

    public function test_product_import_is_all_or_nothing_and_export_defuses_formulas(): void
    {
        $this->admin();
        $shop = Shop::create(['name' => 'S']);
        \App\Models\Category::create(['name' => 'Electronics', 'slug' => 'e']);
        $bad = "name,sku,price,buy_price,category\nGood,G1,5,3,Electronics\nBad,,x,1,Nope";
        $this->postJson('/api/admin/products-import', ['csv' => $bad, 'shop_id' => $shop->id])->assertStatus(422)->assertJsonPath('row_errors.0.row', 3);
        $this->assertDatabaseCount('products', 0);
        $this->postJson('/api/admin/products-import', ['csv' => "name,sku,price,buy_price,category\n=CMD(),G1,5,3,Electronics", 'shop_id' => $shop->id])->assertCreated()->assertJsonPath('imported', 1);
        $this->postJson('/api/admin/products-import', ['csv' => "name,price\nA,1"])->assertStatus(422);
        $csv = $this->get('/api/admin/products-export')->assertOk()->getContent();
        $this->assertStringContainsString("\"'=CMD()\"", $csv);
        $this->assertStringNotContainsString('"=CMD()"', $csv);
    }

    public function test_sellers_import_as_pending_into_their_own_shop(): void
    {
        [, $mine] = $this->seller();
        \App\Models\Category::create(['name' => 'Electronics', 'slug' => 'e']);
        Shop::create(['name' => 'Other']);
        $this->postJson('/api/admin/products-import', ['csv' => "name,sku,price,buy_price,category\nX,X1,5,3,Electronics", 'shop_id' => 2])->assertCreated();
        $this->assertDatabaseHas('products', ['name' => 'X', 'shop_id' => $mine->id, 'approval' => 'pending']);
    }

    public function test_product_approval_flow(): void
    {
        [, $mine] = $this->seller();
        $cat = \App\Models\Category::create(['name' => 'C', 'slug' => 'c']);
        $id = $this->postJson('/api/admin/products', ['name' => 'P', 'shop_id' => $mine->id, 'category_id' => $cat->id, 'short_description' => 's', 'description' => 'd', 'sku' => '1', 'buy_price' => 1, 'price' => 2])->assertCreated()->assertJsonPath('approval', 'pending')->json('id');
        $this->patchJson("/api/admin/products/$id/approve")->assertForbidden();
        $this->admin();
        $this->getJson('/api/admin/products?approval=pending')->assertJsonPath('total', 1);
        $this->patchJson("/api/admin/products/$id/approve")->assertOk()->assertJsonPath('approval', 'accepted');
        $this->getJson('/api/admin/products?approval=pending')->assertJsonPath('total', 0);
    }

    public function test_chat_flow_and_unread_counts(): void
    {
        $this->admin();
        $c = User::create(['name' => 'Cu', 'email' => 'cu@x.test', 'role' => 'customer', 'password' => 'secret']);
        ChatMessage::create(['customer_id' => $c->id, 'body' => 'hello']);
        $this->getJson('/api/admin/chats')->assertJsonPath('0.unread', 1)->assertJsonPath('0.name', 'Cu');
        $this->getJson("/api/admin/chats/{$c->id}")->assertJsonCount(1);
        $this->getJson('/api/admin/chats')->assertJsonPath('0.unread', 0);
        $this->postJson("/api/admin/chats/{$c->id}", ['body' => '  hi  '])->assertCreated()->assertJsonPath('body', 'hi');
        $this->postJson("/api/admin/chats/{$c->id}", ['body' => ''])->assertJsonValidationErrors('body');
        $this->getJson('/api/admin/chats/9999')->assertNotFound();
    }

    public function test_profile_and_password_change(): void
    {
        $u = $this->admin();
        $this->putJson('/api/admin/profile', ['name' => 'New', 'email' => 'a@x.test'])->assertOk()->assertJsonPath('name', 'New');
        User::create(['name' => 'B', 'email' => 'b@x.test', 'role' => 'admin', 'password' => 'secret']);
        $this->putJson('/api/admin/profile', ['name' => 'New', 'email' => 'b@x.test'])->assertJsonValidationErrors('email');
        $this->putJson('/api/admin/profile/password', ['current_password' => 'wrong', 'password' => 'abcdef', 'password_confirmation' => 'abcdef'])->assertStatus(422);
        $this->putJson('/api/admin/profile/password', ['current_password' => 'secret', 'password' => 'abc', 'password_confirmation' => 'abc'])->assertJsonValidationErrors('password');
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('secret', $u->fresh()->password));
    }

    public function test_reports_are_scoped_for_sellers(): void
    {
        $cust = User::create(['name' => 'Cu', 'email' => 'cu@x.test', 'role' => 'customer', 'password' => 'secret']);
        $other = Shop::create(['name' => 'Other']);
        Order::create(['number' => 'R1', 'user_id' => $cust->id, 'shop_id' => $other->id, 'status' => 'delivered', 'payment_status' => 'paid', 'subtotal' => 100, 'total' => 100]);
        [, $mine] = $this->seller();
        Order::create(['number' => 'R2', 'user_id' => $cust->id, 'shop_id' => $mine->id, 'status' => 'delivered', 'payment_status' => 'paid', 'subtotal' => 10, 'total' => 10]);
        Order::create(['number' => 'R3', 'user_id' => $cust->id, 'shop_id' => $mine->id, 'status' => 'cancelled', 'payment_status' => 'paid', 'subtotal' => 50, 'total' => 50]);

        $this->getJson('/api/admin/reports/earning-summary')->assertJsonPath('total_sales', 10)->assertJsonPath('total_orders', 1);
        $this->getJson('/api/admin/reports/analytics?type=sale')->assertJsonPath('total', 10);
        $this->getJson('/api/admin/reports/analytics?type=bogus')->assertStatus(422);
        $this->admin();
        $this->getJson('/api/admin/reports/earning-summary')->assertJsonPath('total_sales', 110);
    }

    public function test_placeholder_svg_is_safe(): void
    {
        $r = $this->get('/placeholder/'.rawurlencode('<img src=x onerror=alert(1)>').'.svg?h=200');
        $r->assertOk();
        $this->assertStringContainsString('image/svg+xml', $r->headers->get('Content-Type'));
        $this->assertStringNotContainsString('<img', $r->getContent());
        $this->get('/placeholder/Ab%20Cd.svg')->assertOk()->assertSee('>AC<', false);
    }

    public function test_seller_dashboard_has_wallet_chart_and_top_products_for_their_shop_only(): void
    {
        $cust = User::create(['name' => 'Cu', 'email' => 'cu@x.test', 'role' => 'customer', 'password' => 'secret']);
        $other = Shop::create(['name' => 'Other']);
        $theirs = Order::create(['number' => 'T1', 'user_id' => $cust->id, 'shop_id' => $other->id, 'status' => 'delivered', 'subtotal' => 999, 'total' => 999]);
        $theirs->items()->create(['name' => 'Hidden', 'price' => 999, 'qty' => 9]);
        [, $mine] = $this->seller();
        $o1 = Order::create(['number' => 'M1', 'user_id' => $cust->id, 'shop_id' => $mine->id, 'status' => 'delivered', 'subtotal' => 100, 'shipping' => 5, 'total' => 105]);
        $o1->items()->create(['name' => 'Mug', 'price' => 50, 'qty' => 2]);
        $o2 = Order::create(['number' => 'M2', 'user_id' => $cust->id, 'shop_id' => $mine->id, 'source' => 'pos', 'status' => 'pending', 'subtotal' => 20, 'total' => 20]);
        $o2->items()->create(['name' => 'Pen', 'price' => 20, 'qty' => 1]);
        $o3 = Order::create(['number' => 'M3', 'user_id' => $cust->id, 'shop_id' => $mine->id, 'status' => 'cancelled', 'subtotal' => 500, 'total' => 500]);
        $o3->items()->create(['name' => 'Cancelled item', 'price' => 500, 'qty' => 1]);
        Record::create(['resource' => 'withdraws', 'rid' => 1, 'data' => ['shop_id' => $mine->id, 'amount' => 30, 'status' => 'Approved']]);
        Record::create(['resource' => 'withdraws', 'rid' => 2, 'data' => ['shop_id' => $mine->id, 'amount' => 10, 'status' => 'Pending']]);
        Record::create(['resource' => 'withdraws', 'rid' => 3, 'data' => ['shop_id' => $mine->id, 'amount' => 999, 'status' => 'Rejected']]);
        Record::create(['resource' => 'withdraws', 'rid' => 4, 'data' => ['shop_id' => $other->id, 'amount' => 50, 'status' => 'Approved']]);

        $d = $this->getJson('/api/admin/dashboard')->assertOk()->assertJsonPath('scope', 'shop')->assertJsonPath('shop_name', 'Mine')->assertJsonPath('stats.orders', 3)->json();
        $this->assertSame(105.0, (float) $d['wallet']['total_sales']);
        $this->assertSame(65.0, (float) $d['wallet']['balance']);        // 105 delivered - 30 approved - 10 pending (rejected ignored)
        $this->assertSame(10.0, (float) $d['wallet']['pending_withdraw']);
        $this->assertSame(30.0, (float) $d['wallet']['already_withdraw']);
        $this->assertSame(5.0, (float) $d['wallet']['delivery_charge']);
        $this->assertSame(20.0, (float) $d['wallet']['pos_sales']);
        $this->assertCount(7, $d['last7']);
        $this->assertSame(3, array_sum(array_column($d['last7'], 'count')));
        $names = array_column($d['top_products'], 'name');
        $this->assertSame(['Mug', 'Pen'], $names);                      // cancelled + other shop's items excluded
    }

    public function test_seeded_url_images_can_be_kept_but_arbitrary_urls_are_rejected(): void
    {
        $this->admin();
        $shop = Shop::create(['name' => 'S']);
        $cat = \App\Models\Category::create(['name' => 'C', 'slug' => 'c']);
        $url = 'https://cdn.dummyjson.com/product-images/x/thumbnail.webp';
        $p = \App\Models\Product::create(['shop_id' => $shop->id, 'category_id' => $cat->id, 'name' => 'Seeded', 'price' => 5, 'image' => $url, 'gallery' => ['https://cdn.dummyjson.com/product-images/x/1.webp']]);

        $this->getJson("/api/products/{$p->id}")->assertJsonPath('image_url', $url)->assertJsonPath('gallery.0', 'https://cdn.dummyjson.com/product-images/x/1.webp');
        $this->putJson("/api/admin/products/{$p->id}", ['name' => 'Renamed', 'image' => $url])->assertOk()->assertJsonPath('name', 'Renamed')->assertJsonPath('image_url', $url);
        $this->putJson("/api/admin/products/{$p->id}", ['image' => 'https://evil.example/x.png'])->assertJsonValidationErrors('image');
        $this->putJson("/api/admin/products/{$p->id}", ['image' => 'uploads/new.png'])->assertOk()->assertJsonPath('image_url', '/storage/uploads/new.png');
    }

    public function test_admin_dashboard_has_the_shop_admin_shape(): void
    {
        $this->admin();
        $shop = Shop::create(['name' => 'Alpha']);
        \App\Models\Rider::create(['name' => 'R']);
        $cust = User::create(['name' => 'Cu', 'email' => 'cu@x.test', 'role' => 'customer', 'password' => 'secret']);
        $cat = \App\Models\Category::create(['name' => 'C', 'slug' => 'c']);
        $p = \App\Models\Product::create(['shop_id' => $shop->id, 'category_id' => $cat->id, 'name' => 'Mug', 'price' => 10, 'favorites' => 3]);
        $o = Order::create(['number' => 'RC1', 'user_id' => $cust->id, 'shop_id' => $shop->id, 'status' => 'delivered', 'payment_status' => 'paid', 'subtotal' => 20, 'total' => 20]);
        $o->items()->create(['product_id' => $p->id, 'name' => 'Mug', 'price' => 10, 'qty' => 2]);
        Order::create(['number' => 'RC2', 'user_id' => $cust->id, 'shop_id' => $shop->id, 'status' => 'cancelled', 'payment_status' => 'paid', 'subtotal' => 99, 'total' => 99]);
        Record::create(['resource' => 'withdraws', 'rid' => 1, 'data' => ['amount' => 5, 'status' => 'Approved']]);
        Record::create(['resource' => 'withdraws', 'rid' => 2, 'data' => ['amount' => 7, 'status' => 'Pending']]);

        $d = $this->getJson('/api/admin/dashboard')->assertOk()->json();
        $this->assertSame(['shops' => 1, 'products' => 1, 'orders' => 2, 'customers' => 1], $d['totals']);
        $this->assertSame(1, $d['order_analytics']['delivered']);
        $this->assertEquals(20, $d['wallet']['total_earning']);              // cancelled orders never count as earnings
        $this->assertEquals(5, $d['wallet']['already_withdraw']);
        $this->assertEquals(7, $d['wallet']['pending_withdraw']);
        $this->assertSame(['customer' => 1, 'shop' => 1, 'rider' => 1], $d['user_overview']);
        $this->assertSame('Alpha', $d['top_shops'][0]['name']);
        $this->assertSame(3, $d['favorite_products'][0]['favorites']);
        $this->assertSame(2, $d['top_selling'][0]['sold']);
        $this->assertSame(2, $d['latest_orders'][1]['qty']);
    }

    public function test_statistics_buckets_orders_and_validates_input(): void
    {
        $this->admin();
        $cust = User::create(['name' => 'Cu', 'email' => 'cu@x.test', 'role' => 'customer', 'password' => 'secret']);
        $shop = Shop::create(['name' => 'S']);
        foreach (['2026-03-10 09:30:00', '2026-03-10 09:45:00', '2026-07-01 12:00:00'] as $i => $when) {
            Order::create(['number' => "S$i", 'user_id' => $cust->id, 'shop_id' => $shop->id, 'status' => 'pending', 'subtotal' => 1, 'total' => 1, 'created_at' => $when]);
        }
        $y = $this->getJson('/api/admin/statistics?type=yearly&date=2026-05-05')->assertOk()->json();
        $this->assertCount(12, $y['labels']);
        $this->assertSame(3, $y['total']);
        $this->assertSame(2, $y['values'][2]);                                // March
        $this->assertSame(1, $y['values'][6]);                                // July
        $m = $this->getJson('/api/admin/statistics?type=monthly&date=2026-03-15')->json();
        $this->assertCount(31, $m['labels']);
        $this->assertSame(2, $m['values'][9]);                                // 10 March
        $d = $this->getJson('/api/admin/statistics?type=daily&date=2026-03-10')->json();
        $this->assertCount(24, $d['labels']);
        $this->assertSame(2, $d['values'][9]);                                // 09:00 bucket
        $this->getJson('/api/admin/statistics?type=hourly')->assertStatus(422);
        $this->getJson('/api/admin/statistics')->assertStatus(422);
        Sanctum::actingAs(User::create(['name' => 'Sel', 'email' => 'sel@x.test', 'role' => 'shop', 'password' => 'secret']));
        $this->getJson('/api/admin/statistics?type=yearly')->assertForbidden();
    }

    public function test_notification_bell_counts_unread_and_mark_all_read(): void
    {
        $this->admin();
        foreach ([1, 2, 3] as $n) {
            Record::create(['resource' => 'notifications', 'rid' => $n, 'data' => ['title' => "N$n", 'content' => 'c', 'is_read' => $n === 3]]);
        }
        $this->getJson('/api/admin/bell')->assertOk()->assertJsonPath('count', 2)->assertJsonCount(3, 'notifications')->assertJsonPath('notifications.0.title', 'N3');
        $this->postJson('/api/admin/notifications/read-all')->assertNoContent();
        $this->getJson('/api/admin/bell')->assertJsonPath('count', 0);
    }

    public function test_approve_and_reject_only_apply_to_pending_requests_of_resources_that_allow_it(): void
    {
        $this->admin();
        Record::create(['resource' => 'rider_cash_submissions', 'rid' => 1, 'data' => ['status' => 'Pending', 'amount' => 10]]);
        Record::create(['resource' => 'rider_cash_submissions', 'rid' => 2, 'data' => ['status' => 'Pending', 'amount' => 20]]);
        Record::create(['resource' => 'banners', 'rid' => 1, 'data' => ['title' => 'B', 'status' => 'Pending']]);

        $this->postJson('/api/admin/r/rider_cash_submissions/1/approve')->assertOk()->assertJsonPath('status', 'Approved');
        $this->postJson('/api/admin/r/rider_cash_submissions/1/reject')->assertStatus(422);       // already decided
        $this->postJson('/api/admin/r/rider_cash_submissions/2/reject')->assertOk()->assertJsonPath('status', 'Rejected');
        $this->postJson('/api/admin/r/banners/1/approve')->assertNotFound();                      // banners have no approve action
        $this->postJson('/api/admin/r/rider_cash_submissions/2/explode')->assertNotFound();
        Sanctum::actingAs(User::create(['name' => 'Sel', 'email' => 'sel@x.test', 'role' => 'shop', 'password' => 'secret']));
        $this->postJson('/api/admin/r/rider_cash_submissions/1/approve')->assertForbidden();
    }

    public function test_admin_can_change_flash_sale_end_time(): void
    {
        $this->admin();
        $id = $this->postJson('/api/admin/flash-sales', [
            'name' => 'Weekend',
            'discount' => 25,
            'description' => 'Hurry',
            'starts_at' => '2026-10-21 10:00:00',
            'ends_at' => '2026-10-28 18:30:00',
            'active' => true,
        ])->assertCreated()->json('id');

        $this->putJson("/api/admin/flash-sales/{$id}", [
            'discount' => 150,
            'starts_at' => '2026-10-21 10:00:00',
            'ends_at' => '2026-10-01 00:00:00',
        ])->assertUnprocessable();

        $this->putJson("/api/admin/flash-sales/{$id}", [
            'name' => 'Weekend',
            'discount' => 30,
            'starts_at' => '2026-10-21 10:00:00',
            'ends_at' => '2026-11-01 21:00:00',
            'active' => true,
        ])->assertOk();

        $row = FlashSale::find($id);
        $this->assertSame(30, $row->discount);
        $this->assertSame('2026-11-01 21:00:00', $row->ends_at->timezone('UTC')->format('Y-m-d H:i:s'));
    }

    public function test_seller_cannot_move_a_product_into_another_shop_or_touch_other_shops_products(): void
    {
        $other = Shop::create(['name' => 'Other']);
        $cat = \App\Models\Category::create(['name' => 'C', 'slug' => 'c']);
        $theirs = \App\Models\Product::create(['shop_id' => $other->id, 'category_id' => $cat->id, 'name' => 'Theirs', 'price' => 5]);
        [, $mine] = $this->seller();
        $own = \App\Models\Product::create(['shop_id' => $mine->id, 'category_id' => $cat->id, 'name' => 'Mine', 'price' => 5]);

        $this->putJson("/api/admin/products/{$own->id}", ['name' => 'Renamed', 'shop_id' => $other->id])->assertOk()->assertJsonPath('name', 'Renamed')->assertJsonPath('shop_id', $mine->id);
        $this->assertSame($mine->id, $own->fresh()->shop_id);
        $this->putJson("/api/admin/products/{$theirs->id}", ['name' => 'HACKED'])->assertForbidden();
        $this->deleteJson("/api/admin/products/{$theirs->id}")->assertForbidden();
        $this->getJson("/api/admin/products/{$theirs->id}")->assertForbidden();
        $this->assertSame('Theirs', $theirs->fresh()->name);
    }

    public function test_rich_text_is_sanitized_on_save(): void
    {
        $out = \App\Support\Html::clean('<p class="ql-align-center evil" onclick="x()">Hi <strong>there</strong><script>alert(1)</script><a href="javascript:alert(1)">bad</a> <a href="https://ok.test">ok</a><span style="color:#ff0000;position:fixed">c</span><img src="x" onerror="y()"></p>');
        $this->assertStringContainsString('<strong>there</strong>', $out);
        $this->assertStringContainsString('ql-align-center', $out);
        $this->assertStringContainsString('style="color:#ff0000"', $out);
        $this->assertStringContainsString('https://ok.test', $out);
        foreach (['<script', 'onclick', 'onerror', 'javascript:', 'evil', 'position'] as $bad) {
            $this->assertStringNotContainsString($bad, $out);
        }
    }

    public function test_product_gallery_is_limited_to_five_uploaded_images(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
        Sanctum::actingAs(\App\Models\User::where('role', 'admin')->first());
        $p = \App\Models\Product::first();
        $this->putJson("/api/admin/products/{$p->id}", ['gallery' => ['uploads/a.png', 'uploads/b.png']])->assertOk();
        $this->assertCount(2, $p->refresh()->gallery);
        $this->putJson("/api/admin/products/{$p->id}", ['gallery' => array_map(fn ($i) => "uploads/$i.png", range(1, 6))])->assertStatus(422);
        $this->putJson("/api/admin/products/{$p->id}", ['gallery' => ['https://evil.test/x.png']])->assertStatus(422);
    }

    public function test_collection_holds_up_to_ten_products_and_shows_publicly(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
        Sanctum::actingAs(\App\Models\User::where('role', 'admin')->first());
        $ids = \App\Models\Product::where('approval', '!=', 'pending')->orderBy('id')->limit(11)->pluck('id')->all();

        $this->postJson('/api/admin/collections', ['title' => 'New Sell', 'product_ids' => $ids])->assertStatus(422);
        $this->postJson('/api/admin/collections', ['title' => 'New Sell', 'product_ids' => array_slice($ids, 0, 10), 'description' => '<p>Hot <script>x()</script></p>'])
            ->assertCreated()->assertJsonPath('slug', 'new-sell')->assertJsonPath('count', 10);

        app('auth')->forgetGuards();
        $this->getJson('/api/collections/new-sell')->assertOk()->assertJsonCount(10, 'products')->assertJsonMissingPath('products.0.buy_price');
        $this->assertStringNotContainsString('script', $this->getJson('/api/collections/new-sell')->json('description'));
        $this->getJson('/api/collections')->assertOk()->assertJsonPath('0.slug', 'new-sell');
        \App\Models\Collection::first()->update(['active' => false]);
        $this->getJson('/api/collections/new-sell')->assertNotFound();
        $this->getJson('/api/collections')->assertOk()->assertJsonCount(0);
    }

    public function test_promotion_pages_create_edit_delete_and_reach_the_storefront(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
        Sanctum::actingAs(\App\Models\User::where('role', 'admin')->first());
        $img = 'https://cdn.test/x.png';

        foreach (['banners' => ['title' => 'B1', 'url' => '/products'], 'ads' => ['title' => 'A1', 'url' => '/products'], 'grid_ads' => ['title' => 'G1', 'section' => 'home_top', 'url' => '/products']] as $res => $body) {
            $id = $this->postJson("/api/admin/r/$res", $body)->assertCreated()->json('id');
            $this->putJson("/api/admin/r/$res/$id", ['title' => 'Edited'])->assertOk()->assertJsonPath('title', 'Edited');
            $this->postJson("/api/admin/r/$res", [])->assertStatus(422);
            $this->deleteJson("/api/admin/r/$res/$id")->assertNoContent();
        }
        $this->postJson('/api/admin/r/grid_ads', ['title' => 'G', 'section' => 'nowhere'])->assertStatus(422);

        // seeded rows with an image URL show up on the storefront; an inactive one does not
        $row = \App\Models\Record::where('resource', 'grid_ads')->get()->first(fn ($r) => ($r->data['section'] ?? '') === 'home_top');
        $row->update(['data' => array_merge($row->data, ['thumbnail' => $img, 'is_active' => true])]);
        $home = $this->getJson('/api/home')->assertOk()->json();
        $this->assertContains($img, array_column($home['grid_ads']['home_top'], 'image'));
        $row->update(['data' => array_merge($row->data, ['is_active' => false])]);
        $this->assertNotContains($img, array_column($this->getJson('/api/home')->json('grid_ads.home_top'), 'image'));
    }

    public function test_third_party_settings_pages_load_save_and_never_leak_secrets(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
        Sanctum::actingAs(\App\Models\User::where('role', 'admin')->first());
        $cases = [
            'courier' => ['api_key' => 'ck-123', 'secret_key' => 'cs-456', 'base_url' => 'https://courier.test', 'is_active' => true],
            'sms' => ['provider' => 'twilio', 'twilio_sid' => 'AC1', 'twilio_token' => 'tok-secret'],
            'pusher' => ['app_id' => '1', 'app_key' => 'k', 'app_secret' => 'pusher-secret', 'app_cluster' => 'ap2'],
            'google_maps' => ['google_maps_key' => 'maps-secret'],
            'mail' => ['mailer' => 'smtp', 'host' => 'smtp.test', 'port' => '587', 'username' => 'u', 'password' => 'mail-secret', 'from_address' => 'a@b.test'],
            'openai' => ['api_key' => 'sk-secret', 'organization' => 'org'],
            'firebase' => ['fcm_web_config' => '{"apiKey":"x"}'],
            'recaptcha' => ['is_active' => true, 'site_key' => 'site', 'secret_key' => 'recaptcha-secret'],
        ];
        foreach ($cases as $key => $body) {
            $this->getJson("/api/admin/settings-group/$key")->assertOk();
            $res = $this->putJson("/api/admin/settings-group/$key", $body)->assertOk();
            foreach ($body as $f => $v) {
                if (in_array($f, ['api_key', 'secret_key', 'twilio_token', 'app_secret', 'google_maps_key', 'password'], true)) {
                    $this->assertNotSame($v, $res->json($f), "$key.$f leaked");
                }
            }
            // sending the mask back must not overwrite the stored secret
            $this->putJson("/api/admin/settings-group/$key", $res->json())->assertOk();
            $dump = json_encode($this->getJson("/api/admin/settings-group/$key")->json());
            foreach (['ck-123', 'cs-456', 'tok-secret', 'pusher-secret', 'maps-secret', 'mail-secret', 'sk-secret', 'recaptcha-secret'] as $plain) {
                $this->assertStringNotContainsString($plain, $dump);
            }
        }
        $this->assertSame('mail-secret', \App\Models\Setting::group('mail')['password']);
    }

    public function test_staff_role_limits_what_a_staff_member_can_do_and_actions_are_logged(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);

        // sign in as the "Order Handler" demo staff: login is logged with an IP and the response carries permissions
        $login = $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.7'])->postJson('/api/auth/login', ['email' => 'order.handler@readyecommerce.com', 'password' => 'secret'])->assertOk();
        $this->assertSame(['view', 'edit'], $login->json('user.permissions.orders'));
        $this->assertDatabaseHas('activity_logs', ['action' => 'login', 'ip' => '203.0.113.7', 'email' => 'order.handler@readyecommerce.com']);
        $this->postJson('/api/auth/login', ['email' => 'order.handler@readyecommerce.com', 'password' => 'nope'])->assertStatus(422);
        $this->assertDatabaseHas('activity_logs', ['action' => 'login_failed']);

        $staff = \App\Models\User::where('email', 'order.handler@readyecommerce.com')->first();
        Sanctum::actingAs($staff);
        $this->getJson('/api/admin/orders')->assertOk();
        $this->getJson('/api/admin/dashboard')->assertOk();                          // open to every staff member
        $this->getJson('/api/admin/products')->assertForbidden();                    // no catalog access
        $this->deleteJson('/api/admin/orders/1')->assertForbidden();                 // view+edit only, no delete
        $this->getJson('/api/admin/roles')->assertForbidden();                       // not even a super admin area
        $this->postJson('/api/admin/roles', ['name' => 'x', 'permissions' => []])->assertForbidden();
        $this->getJson('/api/admin/settings-group/mail')->assertForbidden();

        $order = \App\Models\Order::first();
        $this->patchJson("/api/admin/orders/{$order->id}", ['status' => 'confirm'])->assertOk();
        $this->assertDatabaseHas('activity_logs', ['action' => 'update', 'subject' => 'orders', 'subject_id' => (string) $order->id, 'user_id' => $staff->id]);

        // the super admin sees the log and can manage roles
        Sanctum::actingAs(\App\Models\User::where('role', 'admin')->whereNull('staff_role_id')->first());
        $this->getJson('/api/admin/activity-logs?kind=login')->assertOk()->assertJsonPath('data.0.action', 'login_failed');
        $role = $this->postJson('/api/admin/roles', ['name' => 'Viewer', 'permissions' => ['orders' => ['delete']]])->assertCreated();
        $this->assertSame(['view', 'delete'], $role->json('permissions.orders'));      // view is implied
        $this->postJson('/api/admin/staff', ['name' => 'V', 'email' => 'v@x.test', 'password' => 'password1', 'password_confirmation' => 'password1', 'staff_role_id' => $role->json('id')])->assertCreated();
        $this->deleteJson('/api/admin/roles/'.$role->json('id'))->assertStatus(422);   // still assigned
    }

    public function test_email_templates_switch_and_sms_providers(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
        Sanctum::actingAs(\App\Models\User::where('role', 'admin')->whereNull('staff_role_id')->first());

        $this->assertCount(5, $this->getJson('/api/admin/email-templates')->assertOk()->json('templates'));
        $this->putJson('/api/admin/email-templates/welcome', ['subject' => 'Hi {customer_name}', 'body' => '<p>Hello <script>x()</script><b>{customer_name}</b></p>'])->assertOk();
        $this->assertStringNotContainsString('script', \App\Support\EmailTemplates::get('welcome')['body']);

        // register sends the welcome email with the edited subject
        app('auth')->forgetGuards();
        $this->postJson('/api/account/register', ['name' => 'Ann', 'email' => 'ann@x.test', 'password' => 'password1', 'password_confirmation' => 'password1'])->assertCreated();
        $sent = fn () => app('mail.manager')->mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(1, $sent());
        $this->assertStringContainsString('Hi Ann', $sent()[0]->getOriginalMessage()->getSubject());
        $this->assertStringContainsString('bornosoft.bd', $sent()[0]->getOriginalMessage()->getHtmlBody());

        // master switch off: nothing goes out; a single template off: that one stays quiet
        Sanctum::actingAs(\App\Models\User::where('role', 'admin')->whereNull('staff_role_id')->first());
        $this->putJson('/api/admin/settings-group/mail', ['is_active' => false])->assertOk();
        $this->assertFalse(\App\Services\Mailer::send('welcome', 'z@x.test', ['customer_name' => 'Z'])[0]);
        $this->putJson('/api/admin/settings-group/mail', ['is_active' => true])->assertOk();
        $this->putJson('/api/admin/email-templates/welcome', ['enabled' => false])->assertOk();
        $this->assertFalse(\App\Services\Mailer::send('welcome', 'z@x.test', ['customer_name' => 'Z'])[0]);
        $before = count($sent());
        $this->postJson('/api/admin/send-test-mail', ['to' => 'me@x.test', 'template' => 'welcome'])->assertOk(); // tests ignore the switches
        $this->assertCount($before + 1, $sent());
        $this->putJson('/api/admin/email-templates/welcome', ['reset' => true])->assertOk()->assertJsonPath('customized', false);

        // SMS: every Bangladesh provider formats the request as its docs describe
        \Illuminate\Support\Facades\Http::fake(['*' => \Illuminate\Support\Facades\Http::response(['status' => 'SUCCESS', 'response_code' => 202, 'error' => 0, 'statusCode' => '200', 'api_response_code' => 200], 200)]);
        $this->putJson('/api/admin/settings-group/sms', ['provider' => 'bulksmsbd', 'bulksmsbd_api_key' => 'k', 'bulksmsbd_sender_id' => 'Shop'])->assertOk();
        $this->postJson('/api/admin/test-sms', ['to' => '01712345678'])->assertOk();
        \Illuminate\Support\Facades\Http::assertSent(fn ($r) => str_contains($r->url(), 'bulksmsbd.net') && $r['number'] === '8801712345678' && $r['senderid'] === 'Shop');
        $this->putJson('/api/admin/settings-group/sms', ['provider' => 'ssl_wireless', 'ssl_api_token' => 't', 'ssl_sid' => 'S'])->assertOk();
        $this->postJson('/api/admin/test-sms', ['to' => '01712345678'])->assertOk();
        $this->putJson('/api/admin/settings-group/sms', ['provider' => 'greenweb'])->assertOk();
        $this->postJson('/api/admin/test-sms', ['to' => '01712345678'])->assertStatus(422)->assertJsonPath('message', 'Missing setting: greenweb_token.');
    }

    public function test_recaptcha_guards_public_forms_only_when_switched_on(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
        $form = ['name' => 'A', 'email' => 'a@x.test', 'subject' => 'Hi', 'message' => 'Hello there'];
        $this->postJson("/api/contact", $form)->assertSuccessful();                       // off by default
        $this->assertNull($this->getJson('/api/master')->json('data.recaptcha_site_key'));

        Sanctum::actingAs(\App\Models\User::where('role', 'admin')->whereNull('staff_role_id')->first());
        $this->putJson('/api/admin/settings-group/recaptcha', ['is_active' => true, 'site_key' => 'SITE', 'secret_key' => 'SECRET'])->assertOk();
        app('auth')->forgetGuards();
        $this->assertSame('SITE', $this->getJson('/api/master')->json('data.recaptcha_site_key'));

        \Illuminate\Support\Facades\Http::fake(['www.google.com/*' => fn ($r) => \Illuminate\Support\Facades\Http::response(['success' => ($r['response'] ?? '') === 'tok'])]);
        $this->postJson('/api/contact', $form)->assertStatus(422)->assertJsonValidationErrors('recaptcha');
        $this->postJson('/api/account/login', ['email' => 'test@example.com', 'password' => 'secret'])->assertStatus(422)->assertJsonValidationErrors('recaptcha');

        $this->postJson('/api/contact', $form + ["recaptcha_token" => "tok"])->assertSuccessful();
        $this->postJson('/api/account/login', ['email' => 'test@example.com', 'password' => 'secret', 'recaptcha_token' => 'tok'])->assertOk();
    }

    public function test_blog_thumbnail_upload_path_is_validated_and_exposed_as_a_url(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
        Sanctum::actingAs(\App\Models\User::where('role', 'admin')->whereNull('staff_role_id')->first());
        $res = $this->postJson('/api/admin/blogs', ['title' => 'Hello', 'image' => 'uploads/thumb.png', 'body' => '<p>x</p>'])->assertCreated();
        $this->assertSame('/storage/uploads/thumb.png', $res->json('image_url'));
        $this->postJson('/api/admin/blogs', ['title' => 'Bad', 'image' => '../../.env'])->assertStatus(422);
        $this->assertStringStartsWith('https://picsum.photos/', $this->getJson('/api/blogs')->json('posts.data.0.image_url'));
    }
}
