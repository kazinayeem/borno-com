<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/** bKash tokenized checkout: grant token → create payment → redirect → execute on callback. */
class Bkash extends PaymentGateway
{
    private function base(): string
    {
        return $this->live ? 'https://tokenized.pay.bka.sh/v1.2.0-beta' : 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';
    }

    private function token(): string
    {
        $r = Http::timeout(20)->acceptJson()->withHeaders(['username' => $this->config['username'], 'password' => $this->config['password']])
            ->post($this->base().'/tokenized/checkout/token/grant', ['app_key' => $this->config['app_key'], 'app_secret' => $this->config['app_secret']]);
        if (! $r->json('id_token')) {
            throw new \RuntimeException('bKash rejected the credentials: '.($r->json('statusMessage') ?: 'check app key, secret, username and password.'));
        }

        return $r->json('id_token');
    }

    private function headers(string $token): array
    {
        return ['Authorization' => $token, 'X-APP-Key' => $this->config['app_key']];
    }

    public function start(Payment $payment, array $c): string
    {
        $token = $this->token();
        $r = Http::timeout(20)->acceptJson()->withHeaders($this->headers($token))->post($this->base().'/tokenized/checkout/create', [
            'mode' => '0011', 'payerReference' => $c['phone'], 'callbackURL' => $this->callback('bkash', 'callback'), 'amount' => number_format($payment->amount, 2, '.', ''),
            'currency' => 'BDT', 'intent' => 'sale', 'merchantInvoiceNumber' => $payment->tran_id,
        ]);
        if (! $r->json('bkashURL') || ! $r->json('paymentID')) {
            throw new \RuntimeException('bKash could not start the payment: '.($r->json('statusMessage') ?: 'unknown error.'));
        }
        $payment->gateway_ref = $r->json('paymentID');
        $payment->save();

        return $r->json('bkashURL');
    }

    public function findPayment(Request $request): ?Payment
    {
        return Payment::where('gateway', 'bkash')->where('gateway_ref', (string) $request->input('paymentID'))->first();
    }

    public function confirm(Payment $payment, Request $request): bool
    {
        if ($request->input('status') !== 'success') {
            return false;
        }
        $token = $this->token();
        $r = Http::timeout(30)->acceptJson()->withHeaders($this->headers($token))->post($this->base().'/tokenized/checkout/execute', ['paymentID' => $payment->gateway_ref]);
        $payment->raw = ['execute' => $r->json()];
        if ($r->json('trxID')) {
            $payment->gateway_ref = $payment->gateway_ref; // keep the paymentID; trxID lives in raw
        }

        return $r->json('statusCode') === '0000' && $r->json('transactionStatus') === 'Completed'
            && abs((float) $r->json('amount') - $payment->amount) < 0.01 && $r->json('merchantInvoiceNumber') === $payment->tran_id;
    }
}
