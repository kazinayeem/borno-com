<?php

namespace Tests\Feature;

use App\Models\ChatMessage;
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
}
