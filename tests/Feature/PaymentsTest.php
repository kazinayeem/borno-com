<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Record;
use App\Models\Setting;
use App\Services\Payments\Nagad;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\DatabaseSeeder::class);
    }

    private function gateway(string $name, array $config, bool $active = true): void
    {
        $r = Record::where('resource', 'payment_gateways')->get()->first(fn ($x) => $x->data['name'] === $name);
        $r->update(['data' => array_merge($r->data, ['is_active' => $active, 'config' => array_merge($r->data['config'], $config)])]);
    }

    private function product(): Product
    {
        return Product::where('active', true)->where('approval', '!=', 'pending')->where('stock', '>', 5)->where(fn ($q) => $q->whereNull('variants')->orWhere('variants', '[]'))->firstOrFail();
    }

    private function body(Product $p, string $method, array $extra = []): array
    {
        return [
            'items' => [['product_id' => $p->id, 'qty' => 1]], 'payment_method' => $method,
            'address' => ['name' => 'Rafi', 'phone' => '01712345678', 'address_line' => 'House 1, Road 2', 'area' => 'Dhaka'],
            'guest_name' => 'Rafi Ahmed', 'guest_email' => 'rafi@x.test', 'guest_phone' => '01712345678',
        ] + $extra;
    }

    public function test_guest_checkout_is_off_by_default_and_works_when_enabled(): void
    {
        $p = $this->product();
        $this->postJson('/api/checkout/guest', $this->body($p, 'Cash Payment'))->assertForbidden();

        Setting::put(['group.business' => array_merge(Setting::storedGroup('business'), ['guest_checkout' => true])]);
        $this->assertTrue($this->getJson('/api/master')->json('data.guest_checkout'));
        $stock = $p->stock;
        $res = $this->postJson('/api/checkout/guest', $this->body($p, 'Cash Payment'))->assertCreated();
        $order = Order::findOrFail($res->json('orders.0.id'));
        $this->assertSame('rafi@x.test', $order->guest_email);
        $this->assertSame('Rafi Ahmed', $order->buyer['name']);
        $this->assertTrue($order->buyer['guest']);
        $this->assertSame($stock - 1, $p->fresh()->stock);
        $this->assertCount(1, app('mail.manager')->mailer('array')->getSymfonyTransport()->messages());      // confirmation goes to the guest's email

        $this->postJson('/api/checkout/guest', array_merge($this->body($p, 'Cash Payment'), ['guest_email' => 'nope']))->assertStatus(422)->assertJsonValidationErrors('guest_email');
        $this->postJson('/api/checkout/guest', array_merge($this->body($p, 'Cash Payment'), ['address_id' => 1]))->assertStatus(422);   // guests cannot borrow someone's saved address
    }

    public function test_gateway_must_be_active_and_fully_configured(): void
    {
        Setting::put(['group.business' => ['guest_checkout' => true, 'online_payment' => true, 'cash_on_delivery' => true]]);
        $p = $this->product();
        $this->postJson('/api/checkout/guest', $this->body($p, 'sslcommerz'))->assertStatus(422)->assertJsonValidationErrors('payment_method');
        $this->gateway('SSLCommerz', ['store_id' => 'x'], true);                                                // password still missing
        $this->postJson('/api/checkout/guest', $this->body($p, 'sslcommerz'))->assertStatus(422);
        $this->assertSame([], array_column($this->getJson('/api/master')->json('data.payment_gateways'), 'key'));
        $this->assertStringNotContainsString('store_passwd', json_encode($this->getJson('/api/master')->json()));
    }

    public function test_sslcommerz_pay_then_validate_and_ignore_a_repeat(): void
    {
        Setting::put(['group.business' => ['guest_checkout' => true, 'online_payment' => true, 'cash_on_delivery' => true]]);
        $this->gateway('SSLCommerz', ['store_id' => 'store1', 'store_passwd' => 'pw', 'currency' => 'BDT']);
        $p = $this->product();
        Http::fake(['sandbox.sslcommerz.com/gwprocess/*' => Http::response(['status' => 'SUCCESS', 'GatewayPageURL' => 'https://sandbox.sslcommerz.com/pay/abc'])]);

        $res = $this->postJson('/api/checkout/guest', $this->body($p, 'sslcommerz'))->assertCreated();
        $this->assertSame('https://sandbox.sslcommerz.com/pay/abc', $res->json('redirect_url'));
        $pay = Payment::firstOrFail();
        $this->assertSame('initiated', $pay->status);
        $this->assertSame('unpaid', Order::latest('id')->first()->payment_status);
        Http::assertSent(fn ($r) => str_contains($r->url(), 'gwprocess') && $r['tran_id'] === $pay->tran_id && $r['success_url'] === url('/payments/sslcommerz/success'));

        Http::fake(['sandbox.sslcommerz.com/validator/*' => Http::response(['status' => 'VALID', 'tran_id' => $pay->tran_id, 'amount' => (string) number_format($pay->amount, 2, '.', ''), 'currency_type' => 'BDT'])]);
        $this->post('/payments/sslcommerz/success', ['tran_id' => $pay->tran_id, 'val_id' => 'V1'])->assertRedirect('/order-success?tran='.$pay->tran_id);
        $this->assertSame('paid', $pay->fresh()->status);
        $this->assertSame('paid', Order::latest('id')->first()->payment_status);
        $this->post('/payments/sslcommerz/ipn', ['tran_id' => $pay->tran_id, 'val_id' => 'V1'])->assertOk();   // the server notification arrives too
        $this->assertSame('paid', Order::latest('id')->first()->payment_status);
        $this->getJson('/api/payments/'.$pay->tran_id)->assertOk()->assertJsonPath('status', 'paid');
    }

    public function test_failed_cancelled_or_tampered_payments_cancel_the_order_and_restore_stock(): void
    {
        Setting::put(['group.business' => ['guest_checkout' => true, 'online_payment' => true, 'cash_on_delivery' => true]]);
        $this->gateway('SSLCommerz', ['store_id' => 'store1', 'store_passwd' => 'pw', 'currency' => 'BDT']);
        $p = $this->product();
        $stock = $p->stock;
        Http::fake(['sandbox.sslcommerz.com/gwprocess/*' => Http::response(['status' => 'SUCCESS', 'GatewayPageURL' => 'https://pay.test/x'])]);

        $this->postJson('/api/checkout/guest', $this->body($p, 'sslcommerz'))->assertCreated();
        $this->assertSame($stock - 1, $p->fresh()->stock);
        $pay = Payment::firstOrFail();
        $this->post('/payments/sslcommerz/cancel', ['tran_id' => $pay->tran_id])->assertRedirect();
        $this->assertSame('cancelled', $pay->fresh()->status);
        $this->assertSame('cancelled', Order::latest('id')->first()->status);
        $this->assertSame($stock, $p->fresh()->stock);

        // second try: the gateway says VALID but for a smaller amount, so the browser-supplied success is not trusted
        $this->postJson('/api/checkout/guest', $this->body($p, 'sslcommerz'))->assertCreated();
        $pay = Payment::latest('id')->first();
        Http::fake(['sandbox.sslcommerz.com/validator/*' => Http::response(['status' => 'VALID', 'tran_id' => $pay->tran_id, 'amount' => '0.01', 'currency_type' => 'BDT'])]);
        $this->post('/payments/sslcommerz/success', ['tran_id' => $pay->tran_id, 'val_id' => 'V2'])->assertRedirect();
        $this->assertSame('failed', $pay->fresh()->status);
        $this->assertSame($stock, $p->fresh()->stock);
    }

    public function test_a_gateway_that_refuses_to_start_leaves_no_order_behind(): void
    {
        Setting::put(['group.business' => ['guest_checkout' => true, 'online_payment' => true, 'cash_on_delivery' => true]]);
        $this->gateway('SSLCommerz', ['store_id' => 'store1', 'store_passwd' => 'pw', 'currency' => 'BDT']);
        $p = $this->product();
        $stock = $p->stock;
        Http::fake(['sandbox.sslcommerz.com/gwprocess/*' => Http::response(['status' => 'FAILED', 'failedreason' => 'Invalid Store ID'])]);
        $this->postJson('/api/checkout/guest', $this->body($p, 'sslcommerz'))->assertStatus(422)->assertJsonPath('errors.payment_method.0', fn ($m) => str_contains($m, 'Invalid Store ID'));
        $this->assertSame($stock, $p->fresh()->stock);
        $this->assertSame(0, Order::where('status', 'pending')->where('guest_email', 'rafi@x.test')->count());
    }

    public function test_bkash_create_redirect_execute(): void
    {
        Setting::put(['group.business' => ['guest_checkout' => true, 'online_payment' => true]]);
        $this->gateway('BKash', ['app_key' => 'k', 'app_secret' => 's', 'username' => 'u', 'password' => 'p']);
        $p = $this->product();
        Http::fake([
            '*/token/grant' => Http::response(['id_token' => 'TOK', 'statusCode' => '0000']),
            '*/checkout/create' => Http::response(['bkashURL' => 'https://sandbox.pay.bka.sh/go', 'paymentID' => 'PID1', 'statusCode' => '0000']),
        ]);
        $res = $this->postJson('/api/checkout/guest', $this->body($p, 'bkash'))->assertCreated();
        $this->assertSame('https://sandbox.pay.bka.sh/go', $res->json('redirect_url'));
        $pay = Payment::firstOrFail();
        $this->assertSame('PID1', $pay->gateway_ref);
        Http::assertSent(fn ($r) => str_contains($r->url(), 'checkout/create') && $r->header('Authorization')[0] === 'TOK' && $r->header('X-APP-Key')[0] === 'k' && $r['currency'] === 'BDT');

        Http::fake([
            '*/token/grant' => Http::response(['id_token' => 'TOK']),
            '*/checkout/execute' => Http::response(['statusCode' => '0000', 'transactionStatus' => 'Completed', 'trxID' => 'TX9', 'amount' => number_format($pay->amount, 2, '.', ''), 'merchantInvoiceNumber' => $pay->tran_id]),
        ]);
        $this->get('/payments/bkash/callback?paymentID=PID1&status=success')->assertRedirect('/order-success?tran='.$pay->tran_id);
        $this->assertSame('paid', Order::latest('id')->first()->payment_status);
        $this->get('/payments/bkash/callback?paymentID=PID1&status=failure')->assertRedirect();      // a late "failure" cannot undo a paid order
        $this->assertSame('paid', Order::latest('id')->first()->payment_status);
    }

    public function test_nagad_encrypts_signs_and_verifies(): void
    {
        $pg = openssl_pkey_new(['private_key_bits' => 2048]);       // stands in for Nagad's own key pair
        $merchant = openssl_pkey_new(['private_key_bits' => 2048]);
        $strip = fn ($pem) => trim(preg_replace('/-----[A-Z ]+-----|\s+/', '', $pem));
        openssl_pkey_export($merchant, $merchantPriv);
        $pgPub = openssl_pkey_get_details($pg)['key'];
        $merchantPub = openssl_pkey_get_details($merchant)['key'];

        Setting::put(['group.business' => ['guest_checkout' => true, 'online_payment' => true]]);
        $this->gateway('Nagad', ['merchant_id' => 'M1', 'merchant_number' => '017', 'public_key' => $strip($pgPub), 'private_key' => $strip($merchantPriv)]);
        $p = $this->product();

        openssl_public_encrypt(json_encode(['paymentReferenceId' => 'REF1', 'challenge' => 'CH']), $enc, $merchantPub, OPENSSL_PKCS1_PADDING);
        Http::fake([
            '*check-out/initialize/*' => Http::response(['sensitiveData' => base64_encode($enc), 'signature' => 'x']),
            '*check-out/complete/*' => Http::response(['callBackUrl' => 'https://sandbox.mynagad.com/pay/1']),
        ]);
        $res = $this->postJson('/api/checkout/guest', $this->body($p, 'nagad'))->assertCreated();
        $this->assertSame('https://sandbox.mynagad.com/pay/1', $res->json('redirect_url'));
        $pay = Payment::firstOrFail();
        // what we sent to Nagad can be opened with Nagad's private key, and the signature checks out with our public key
        Http::assertSent(function ($r) use ($pg, $merchantPub, $pay) {
            if (! str_contains($r->url(), 'check-out/initialize')) {
                return false;
            }
            openssl_private_decrypt(base64_decode($r['sensitiveData']), $plain, $pg, OPENSSL_PKCS1_PADDING);
            $d = json_decode($plain, true);

            return $d['orderId'] === $pay->tran_id && $d['merchantId'] === 'M1' && openssl_verify($plain, base64_decode($r['signature']), $merchantPub, OPENSSL_ALGO_SHA256) === 1;
        });

        Http::fake(['*verify/payment/*' => Http::response(['status' => 'Success', 'orderId' => $pay->tran_id, 'amount' => number_format($pay->amount, 2, '.', '')])]);
        $this->get('/payments/nagad/callback?order_id='.$pay->tran_id.'&payment_ref_id=REF1&status=Success')->assertRedirect();
        $this->assertSame('paid', Order::latest('id')->first()->payment_status);
        $this->assertInstanceOf(Nagad::class, \App\Services\Payments\Gateways::make('nagad'));
    }
}
