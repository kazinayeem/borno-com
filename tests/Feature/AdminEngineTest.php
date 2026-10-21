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
}
