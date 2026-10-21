<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/**
 * Nagad checkout: initialize (RSA-encrypted) → complete → redirect → verify on callback.
 * `public_key` is Nagad's PG public key, `private_key` is the merchant's own private key (base64, with or without PEM lines).
 */
class Nagad extends PaymentGateway
{
    private function base(): string
    {
        return $this->live ? 'https://api.mynagad.com/api/dfs' : 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs';
    }

    private function pem(string $key, string $type): string
    {
        // Accept the key pasted with or without its PEM header lines, and even with the line breaks flattened by a single-line field.
        $body = preg_replace('/-----[A-Z ]+-----|\s+/', '', $key);

        return "-----BEGIN {$type}-----\n".chunk_split($body, 64, "\n")."-----END {$type}-----\n";
    }

    public function encrypt(array $data): string
    {
        $pub = openssl_pkey_get_public($this->pem($this->config['public_key'], 'PUBLIC KEY'));
        if (! $pub || ! openssl_public_encrypt(json_encode($data), $out, $pub, OPENSSL_PKCS1_PADDING)) {
            throw new \RuntimeException('Nagad public key is not valid.');
        }

        return base64_encode($out);
    }

    private function privateKey()
    {
        $raw = $this->config['private_key'];
        foreach ($this->privateTypes($raw) as $type) {
            if ($k = openssl_pkey_get_private($this->pem($raw, $type))) {
                return $k;
            }
        }
        throw new \RuntimeException('Nagad merchant private key is not valid.');
    }

    private function privateTypes(string $raw): array
    {
        return str_contains($raw, 'RSA PRIVATE') ? ['RSA PRIVATE KEY', 'PRIVATE KEY'] : ['PRIVATE KEY', 'RSA PRIVATE KEY'];
    }

    public function sign(string $plain): string
    {
        openssl_sign($plain, $sig, $this->privateKey(), OPENSSL_ALGO_SHA256);

        return base64_encode($sig);
    }

    public function decrypt(string $cipher): array
    {
        openssl_private_decrypt(base64_decode($cipher), $out, $this->privateKey(), OPENSSL_PKCS1_PADDING);

        return json_decode((string) $out, true) ?: [];
    }

    private function headers(): array
    {
        return ['X-KM-Api-Version' => 'v-0.2.0', 'X-KM-IP-V4' => request()->ip() ?: '127.0.0.1', 'X-KM-Client-Type' => 'PC_WEB'];
    }

    public function start(Payment $payment, array $c): string
    {
        $merchant = $this->config['merchant_id'];
        $now = now('Asia/Dhaka')->format('YmdHis');
        $sensitive = ['merchantId' => $merchant, 'datetime' => $now, 'orderId' => $payment->tran_id, 'challenge' => bin2hex(random_bytes(20))];
        $init = Http::timeout(25)->acceptJson()->withHeaders($this->headers())->post($this->base()."/check-out/initialize/{$merchant}/{$payment->tran_id}", [
            'dateTime' => $now, 'sensitiveData' => $this->encrypt($sensitive), 'signature' => $this->sign(json_encode($sensitive)),
        ]);
        if (! $init->json('sensitiveData')) {
            throw new \RuntimeException('Nagad could not start the payment: '.($init->json('message') ?: 'check the merchant keys.'));
        }
        $plain = $this->decrypt($init->json('sensitiveData'));
        if (empty($plain['paymentReferenceId']) || empty($plain['challenge'])) {
            throw new \RuntimeException('Nagad returned an unexpected answer. Check the merchant keys.');
        }
        $order = ['merchantId' => $merchant, 'orderId' => $payment->tran_id, 'currencyCode' => '050', 'amount' => number_format($payment->amount, 2, '.', ''), 'challenge' => $plain['challenge']];
        $done = Http::timeout(25)->acceptJson()->withHeaders($this->headers())->post($this->base().'/check-out/complete/'.$plain['paymentReferenceId'], [
            'sensitiveData' => $this->encrypt($order), 'signature' => $this->sign(json_encode($order)), 'merchantCallbackURL' => $this->callback('nagad', 'callback'),
            'additionalMerchantInfo' => ['customer' => $c['name'], 'orders' => $c['numbers']],
        ]);
        if (! $done->json('callBackUrl')) {
            throw new \RuntimeException('Nagad could not complete the setup: '.($done->json('message') ?: 'unknown error.'));
        }
        $payment->gateway_ref = $plain['paymentReferenceId'];
        $payment->save();

        return $done->json('callBackUrl');
    }

    public function findPayment(Request $request): ?Payment
    {
        return Payment::where('gateway', 'nagad')->where('tran_id', (string) $request->input('order_id'))->first();
    }

    public function confirm(Payment $payment, Request $request): bool
    {
        $ref = (string) ($request->input('payment_ref_id') ?: $payment->gateway_ref);
        $r = Http::timeout(25)->acceptJson()->withHeaders($this->headers())->get($this->base().'/verify/payment/'.$ref);
        $payment->raw = ['verify' => $r->json()];

        return $r->json('status') === 'Success' && $r->json('orderId') === $payment->tran_id && abs((float) $r->json('amount') - $payment->amount) < 0.01;
    }
}
