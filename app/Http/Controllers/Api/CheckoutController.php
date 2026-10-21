<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Order;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use App\Services\Mailer;
use App\Services\Payments\Gateways;
use App\Services\Payments\PaymentFlow;
use App\Services\Checkout;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CheckoutController extends Controller
{
    private function cartRules(): array
    {
        return [
            'items' => 'required|array|min:1|max:100', 'items.*.product_id' => 'required|integer', 'items.*.qty' => 'required|integer|min:1|max:100',
            'items.*.color_id' => 'nullable|integer', 'items.*.size_id' => 'nullable|integer', 'coupon' => 'nullable|string|max:40',
        ];
    }

    /** Cart preview: prices, shipping and any availability problems. Public, so the cart works before sign-in. */
    public function quote(Request $request)
    {
        $data = $request->validate($this->cartRules());

        return Checkout::price($data['items'], $data['coupon'] ?? null, false);
    }

    /** Signed-in shopper. */
    public function place(Request $request)
    {
        return $this->process($request, $request->user(), false);
    }

    /** Shopper without an account: only when the admin switched guest checkout on in Business Setup. */
    public function guest(Request $request)
    {
        abort_unless(Setting::flag('guest_checkout', false), 403, 'Guest checkout is turned off. Please sign in.');

        return $this->process($request, $this->guestAccount(), true);
    }

    /** One shared account carries every guest order; the buyer's own contact details are stored on the order itself. */
    private function guestAccount(): User
    {
        return User::firstOrCreate(['email' => 'guest@checkout.local'], ['name' => 'Guest customer', 'role' => 'guest', 'password' => bin2hex(random_bytes(16))]);
    }

    private function process(Request $request, User $user, bool $guest)
    {
        $methods = array_merge(['Cash Payment'], array_keys(Gateways::SUPPORTED));
        $rules = $this->cartRules() + [
            'payment_method' => ['required', Rule::in($methods)],
            'address_id' => $guest ? 'prohibited' : 'nullable|integer', 'notes' => 'nullable|string|max:500', 'save_address' => 'boolean',
            'address' => $guest ? 'required|array' : 'required_without:address_id|array', 'address.name' => 'required_with:address|string|max:120', 'address.phone' => 'required_with:address|string|max:30',
            'address.address_line' => 'required_with:address|string|max:255', 'address.area' => 'nullable|string|max:120', 'address.type' => 'nullable|in:home,office,other',
        ];
        if ($guest) {
            $rules += ['guest_name' => 'required|string|max:120', 'guest_email' => 'required|email:rfc|max:160', 'guest_phone' => 'required|string|max:30'];
        }
        $data = $request->validate($rules, [
            'address.required_without' => 'Please enter a delivery address.', 'address.required' => 'Please enter a delivery address.',
            'address.name.required_with' => 'Please enter the receiver\'s name.', 'address.phone.required_with' => 'Please enter a phone number we can reach.',
            'address.address_line.required_with' => 'Please enter your street address.', 'payment_method.in' => 'Choose a payment method.',
        ]);
        if ($guest && Product::whereIn('id', collect($data['items'])->pluck('product_id'))->where('is_digital', true)->exists()) {
            throw ValidationException::withMessages(['items' => ['Please sign in to buy digital products, so your downloads are saved to your account.']]);
        }
        $method = $data['payment_method'];
        if ($method === 'Cash Payment' && ! Setting::flag('cash_on_delivery', true)) {
            throw ValidationException::withMessages(['payment_method' => ['Cash on delivery is turned off in Business Setup.']]);
        }
        if ($method !== 'Cash Payment' && ! Gateways::ready($method)) {
            throw ValidationException::withMessages(['payment_method' => ['This payment method is not available right now.']]);
        }

        if (! empty($data['address_id'])) {
            $a = Address::where('user_id', $user->id)->find($data['address_id']);
            if (! $a) {
                throw ValidationException::withMessages(['address_id' => ['Choose one of your saved addresses.']]);
            }
            $addr = $a->only(['name', 'phone', 'address_line', 'area', 'type']);
        } else {
            $addr = $data['address'] + ['area' => null, 'type' => 'home'];
        }
        $contact = $guest
            ? ['guest_name' => $data['guest_name'], 'guest_email' => mb_strtolower($data['guest_email']), 'guest_phone' => $data['guest_phone']]
            : [];

        $orders = DB::transaction(function () use ($data, $user, $addr, $contact, $method) {
            // Lock the rows first, then price against the locked stock so two buyers cannot take the last unit.
            Product::whereIn('id', collect($data['items'])->pluck('product_id'))->orderBy('id')->lockForUpdate()->get();
            $quote = Checkout::price($data['items'], $data['coupon'] ?? null, true);

            $created = [];
            foreach ($quote['orders'] as $o) {
                $order = Order::create([
                    'number' => 'TMP'.bin2hex(random_bytes(6)), 'source' => 'web', 'user_id' => $user->id, 'shop_id' => $o['shop_id'], 'status' => 'pending',
                    'payment_status' => 'unpaid', 'payment_method' => $method, 'subtotal' => $o['subtotal'], 'coupon_discount' => $o['discount'],
                    'shipping' => $o['shipping'], 'total' => $o['total'], 'shipping_address' => $addr['address_line'], 'address_name' => $addr['name'],
                    'address_phone' => $addr['phone'], 'address_type' => $addr['type'], 'area' => $addr['area'], 'notes' => $data['notes'] ?? null,
                ] + $contact);
                $order->update(['number' => 'RC'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT)]);
                foreach ($o['lines'] as $l) {
                    $order->items()->create(['product_id' => $l['product_id'], 'name' => $l['name'], 'price' => $l['price'], 'qty' => $l['qty'], 'color' => $l['color'], 'size' => $l['size']]);
                    $product = Product::whereKey($l['product_id'])->lockForUpdate()->first();
                    if ($product) {
                        $before = (int) $product->stock;
                        $product->take($l['qty'], $l['color_id'], $l['size_id']);
                        Setting::alertLowStock($product->fresh(), $before);
                    }
                }
                $created[] = $order->load('items');
            }
            if (empty($contact) && ! empty($data['save_address']) && ! empty($data['address']) && ! Address::where('user_id', $user->id)->where('address_line', $addr['address_line'])->exists()) {
                Address::create($addr + ['user_id' => $user->id, 'is_default' => ! Address::where('user_id', $user->id)->exists()]);
            }

            return $created;
        });

        $email = $guest ? $contact['guest_email'] : $user->email;
        $name = $guest ? $contact['guest_name'] : $user->name;
        $redirect = null;
        $tran = null;
        if ($method !== 'Cash Payment') {
            $cfg = Gateways::record($method)['config'] ?? [];
            try {
                [$payment, $redirect] = PaymentFlow::begin($method, $orders, [
                    'user_id' => $user->id, 'name' => $name, 'email' => $email, 'phone' => $guest ? $contact['guest_phone'] : ($addr['phone'] ?? ''),
                    'address' => $addr['address_line'], 'city' => $addr['area'] ?: 'Dhaka',
                ], $cfg['currency'] ?? '' ?: 'BDT');
                $tran = $payment->tran_id;
            } catch (\Throwable $e) {
                throw ValidationException::withMessages(['payment_method' => [$e->getMessage()]]);
            }
        }
        foreach ($orders as $o) {
            Mailer::send('order_placed', $email, ['customer_name' => $name, 'order_number' => $o->number, 'order_total' => '$'.number_format($o->total, 2), 'order_link' => $guest ? url('/') : url('/account/orders/'.$o->id)]);
        }

        return response()->json(['orders' => $orders, 'total' => round(collect($orders)->sum('total'), 2), 'redirect_url' => $redirect, 'tran_id' => $tran], 201);
    }
}
