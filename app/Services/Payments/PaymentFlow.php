<?php

namespace App\Services\Payments;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Services\Mailer;
use Illuminate\Support\Facades\DB;

/** Everything that happens to orders when an online payment starts, succeeds, fails or is cancelled. Safe to run twice. */
class PaymentFlow
{
    public static function begin(string $gatewayKey, array $orders, array $customer, string $currency): array
    {
        $payment = Payment::create([
            'tran_id' => 'T'.strtoupper(bin2hex(random_bytes(9))), 'gateway' => $gatewayKey, 'user_id' => $customer['user_id'] ?? null,
            'order_ids' => array_map(fn ($o) => $o->id, $orders), 'amount' => round(collect($orders)->sum('total'), 2), 'currency' => $currency,
        ]);
        try {
            $url = Gateways::make($gatewayKey)->start($payment, $customer + ['numbers' => array_map(fn ($o) => $o->number, $orders)]);
        } catch (\Throwable $e) {
            self::release($payment, 'failed');
            throw $e instanceof \RuntimeException ? $e : new \RuntimeException('The payment provider could not be reached. Please try again or choose another method.');
        }

        return [$payment, $url];
    }

    /** Returns true when the payment ended up paid. */
    public static function settle(Payment $payment, bool $paid, string $failStatus = 'failed'): bool
    {
        return DB::transaction(function () use ($payment, $paid, $failStatus) {
            $p = Payment::lockForUpdate()->find($payment->id);
            if ($p->status !== 'initiated') {
                return $p->status === 'paid';   // already handled (IPN and browser callback both arrive)
            }
            if ($paid) {
                $p->update(['status' => 'paid', 'gateway_ref' => $payment->gateway_ref, 'raw' => $payment->raw]);
                Order::whereIn('id', $p->order_ids)->update(['payment_status' => 'paid']);

                return true;
            }
            self::release($p, $failStatus);

            return false;
        });
    }

    /** Failed or cancelled payment: the unpaid orders are cancelled and their stock goes back on the shelf. */
    public static function release(Payment $payment, string $status): void
    {
        DB::transaction(function () use ($payment, $status) {
            foreach (Order::whereIn('id', $payment->order_ids)->where('status', 'pending')->where('payment_status', '!=', 'paid')->with('items')->lockForUpdate()->get() as $order) {
                foreach ($order->items as $i) {
                    if ($i->product_id) {
                        Product::whereKey($i->product_id)->increment('stock', $i->qty);
                    }
                }
                $order->update(['status' => 'cancelled']);
            }
            $payment->update(['status' => $status]);
        });
    }
}
