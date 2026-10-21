<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Http\Request;

abstract class PaymentGateway
{
    public function __construct(protected array $config, protected bool $live)
    {
    }

    /** Creates the payment at the gateway and returns the URL to send the shopper to. Throws \RuntimeException with a safe message on failure. */
    abstract public function start(Payment $payment, array $customer): string;

    /** Asks the gateway itself (server to server) whether the shopper really paid. Never trusts the browser's query string. */
    abstract public function confirm(Payment $payment, Request $request): bool;

    /** How this gateway identifies the payment on its callback. */
    abstract public function findPayment(Request $request): ?Payment;

    protected function callback(string $gateway, string $event): string
    {
        return url("/payments/{$gateway}/{$event}");
    }
}
