<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DigitalProductsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
        Storage::fake('local');
    }

    private function admin(): void
    {
        Sanctum::actingAs(User::where('role', 'admin')->whereNull('staff_role_id')->first());
    }

    private function physical(): Product
    {
        return Product::where('active', true)->where('approval', '!=', 'pending')->where('stock', '>', 5)->where('is_digital', false)->where(fn ($q) => $q->whereNull('variants')->orWhere('variants', '[]'))->firstOrFail();
    }

    private function makeDigital(array $extra = []): Product
    {
        $p = $this->physical();
        $this->admin();
        $this->putJson("/api/admin/products/{$p->id}", ['is_digital' => true] + $extra);

        return $p->fresh();
    }

    public function test_product_detail_never_exposes_cost_price_or_download_location(): void
    {
        $p = $this->physical();
        $p->update(['is_digital' => true, 'digital_url' => 'https://files.test/secret.zip']);
        $json = $this->getJson("/api/products/{$p->id}")->assertOk()->json();
        foreach (['buy_price', 'approval', 'digital_file', 'digital_url'] as $k) {
            $this->assertArrayNotHasKey($k, $json);
        }
        $this->assertTrue($json['is_digital']);
    }

    public function test_a_digital_product_needs_a_file_or_link_and_the_file_stays_private(): void
    {
        $p = $this->physical();
        $this->admin();
        $this->putJson("/api/admin/products/{$p->id}", ['is_digital' => true])->assertStatus(422)->assertJsonValidationErrors('digital_file');

        $up = $this->post('/api/admin/uploads/digital', ['file' => UploadedFile::fake()->create('guide.pdf', 200, 'application/pdf')], ['Accept' => 'application/json'])->assertCreated();
        $this->assertMatchesRegularExpression('#^digital/[\w.\-]+\.pdf$#', $up->json('path'));
        Storage::disk('local')->assertExists($up->json('path'));
        $this->putJson("/api/admin/products/{$p->id}", ['is_digital' => true, 'digital_file' => $up->json('path')])->assertOk();
        $this->putJson("/api/admin/products/{$p->id}", ['digital_file' => '../.env'])->assertStatus(422);                   // path tricks are rejected
        $this->post('/api/admin/uploads/digital', ['file' => UploadedFile::fake()->create('evil.php', 10)], ['Accept' => 'application/json'])->assertStatus(422);
        $this->putJson("/api/admin/products/{$p->id}", ['is_digital' => false])->assertOk();                               // switching back clears the file
        $this->assertNull($p->fresh()->digital_file);
    }

    public function test_digital_orders_ship_free_and_download_only_after_payment(): void
    {
        $p = $this->makeDigital(['digital_url' => 'https://files.test/book.zip']);
        $this->assertTrue($p->is_digital);
        $user = User::where('role', 'customer')->first();
        app('auth')->forgetGuards();
        $quote = $this->postJson('/api/checkout/quote', ['items' => [['product_id' => $p->id, 'qty' => 1]]])->assertOk();
        $this->assertSame(0, (int) $quote->json('shipping'));

        Sanctum::actingAs($user);
        $res = $this->postJson('/api/account/checkout', ['items' => [['product_id' => $p->id, 'qty' => 1]], 'payment_method' => 'Cash Payment', 'address' => ['name' => 'A', 'phone' => '017', 'address_line' => 'X']])->assertCreated();
        $order = Order::findOrFail($res->json('orders.0.id'));
        $itemId = $order->items()->first()->id;
        $this->assertEquals(0, $order->shipping);

        $this->getJson("/api/account/orders/{$order->id}/items/{$itemId}/download")->assertForbidden();     // unpaid cash order
        $order->update(['payment_status' => 'paid']);
        $this->getJson("/api/account/orders/{$order->id}/items/{$itemId}/download")->assertOk()->assertJsonPath('url', 'https://files.test/book.zip');
        Sanctum::actingAs(User::where('role', 'customer')->where('id', '!=', $user->id)->first());
        $this->getJson("/api/account/orders/{$order->id}/items/{$itemId}/download")->assertNotFound();      // someone else's order
    }

    public function test_guests_cannot_buy_digital_products(): void
    {
        $p = $this->makeDigital(['digital_url' => 'https://files.test/book.zip']);
        Setting::put(['group.business' => ['guest_checkout' => true, 'cash_on_delivery' => true]]);
        app('auth')->forgetGuards();
        $this->postJson('/api/checkout/guest', ['items' => [['product_id' => $p->id, 'qty' => 1]], 'payment_method' => 'Cash Payment', 'address' => ['name' => 'A', 'phone' => '017', 'address_line' => 'X'],
            'guest_name' => 'G', 'guest_email' => 'g@x.test', 'guest_phone' => '017'])->assertStatus(422)->assertJsonValidationErrors('items');
    }
}
