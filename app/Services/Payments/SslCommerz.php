<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/** SSLCOMMERZ hosted checkout: create session, redirect, then validate with val_id. */
class SslCommerz extends PaymentGateway
{
    private function base(): string
    {
        return $this->live ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com';
    }

    public function start(Payment $payment, array $c): string
    {
        $r = Http::asForm()->timeout(20)->post($this->base().'/gwprocess/v4/api.php', [
            'store_id' => $this->config['store_id'], 'store_passwd' => $this->config['store_passwd'],
            'total_amount' => number_format($payment->amount, 2, '.', ''), 'currency' => $this->config['currency'] ?: 'BDT', 'tran_id' => $payment->tran_id,
            'success_url' => $this->callback('sslcommerz', 'success'), 'fail_url' => $this->callback('sslcommerz', 'fail'), 'cancel_url' => $this->callback('sslcommerz', 'cancel'),
            'ipn_url' => $this->callback('sslcommerz', 'ipn'),
            'cus_name' => $c['name'], 'cus_email' => $c['email'], 'cus_add1' => $c['address'], 'cus_city' => $c['city'] ?? 'Dhaka', 'cus_country' => 'Bangladesh', 'cus_phone' => $c['phone'],
            'shipping_method' => 'NO', 'product_name' => 'Order '.implode(',', $c['numbers']), 'product_category' => 'ecommerce', 'product_profile' => 'general',
        ]);
        if ($r->json('status') !== 'SUCCESS' || ! $r->json('GatewayPageURL')) {
            throw new \RuntimeException('SSLCommerz could not start the payment: '.($r->json('failedreason') ?: 'check the store credentials.'));
        }

        return $r->json('GatewayPageURL');
    }

    public function findPayment(Request $request): ?Payment
    {
        return Payment::where('gateway', 'sslcommerz')->where('tran_id', (string) $request->input('tran_id'))->first();
    }

    public function confirm(Payment $payment, Request $request): bool
    {
        $valId = (string) $request->input('val_id');
        if ($valId === '') {
            return false;
        }
        $r = Http::timeout(20)->get($this->base().'/validator/api/validationserverAPI.php', [
            'val_id' => $valId, 'store_id' => $this->config['store_id'], 'store_passwd' => $this->config['store_passwd'], 'format' => 'json',
        ]);
        $payment->raw = ['validation' => $r->json()];
        $ok = in_array($r->json('status'), ['VALID', 'VALIDATED'], true) && $r->json('tran_id') === $payment->tran_id
            && abs((float) $r->json('amount') - $payment->amount) < 0.01 && (($r->json('currency_type') ?? $r->json('currency')) === ($this->config['currency'] ?: 'BDT'));
        $payment->gateway_ref = $valId;

        return $ok;
    }
}
