<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Payment;
use App\Services\Payments\Gateways;
use App\Services\Payments\PaymentFlow;
use Illuminate\Http\Request;

/** Where SSLCommerz, bKash and Nagad send the shopper (and server notifications) back to. Everything is re-verified with the gateway. */
class PaymentCallbackController extends Controller
{
    public function handle(Request $request, string $gateway, string $event)
    {
        abort_unless(isset(Gateways::SUPPORTED[$gateway]), 404);
        $gw = Gateways::make($gateway);
        $payment = $gw->findPayment($request);
        abort_unless($payment, 404);

        if (in_array($event, ['fail', 'cancel'], true)) {
            PaymentFlow::settle($payment, false, $event === 'cancel' ? 'cancelled' : 'failed');
        } else {
            try {
                $paid = $gw->confirm($payment, $request);
            } catch (\Throwable) {
                $paid = false;
            }
            PaymentFlow::settle($payment, $paid);
        }
        if ($event === 'ipn') {
            return response('OK');
        }

        return redirect('/order-success?tran='.$payment->tran_id);
    }

    /** Public status lookup for the success / failure page. The transaction id is long and random, so it acts as the key. */
    public function status(string $tran)
    {
        $p = Payment::where('tran_id', $tran)->firstOrFail();
        $orders = Order::whereIn('id', $p->order_ids)->get(['id', 'number', 'total', 'status', 'payment_status']);

        return ['status' => $p->status, 'gateway' => $p->gateway, 'amount' => $p->amount, 'currency' => $p->currency, 'orders' => $orders];
    }
}
