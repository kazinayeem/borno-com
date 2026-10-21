<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Order;
use App\Models\Product;
use App\Models\Setting;
use App\Services\Checkout;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CheckoutController extends Controller
{
    private function cartRules(): array
    {
        return ['items' => 'required|array|min:1|max:100', 'items.*.product_id' => 'required|integer', 'items.*.qty' => 'required|integer|min:1|max:100', 'coupon' => 'nullable|string|max:40'];
    }

    /** Cart preview: prices, shipping and any availability problems. Public, so the cart works before sign-in. */
    public function quote(Request $request)
    {
        $data = $request->validate($this->cartRules());

        return Checkout::price($data['items'], $data['coupon'] ?? null, false);
    }

    public function place(Request $request)
    {
        if (! Setting::flag('cash_on_delivery', true)) {
            throw ValidationException::withMessages(['payment_method' => ['Cash on delivery is turned off in Business Setup.']]);
        }
        $data = $request->validate($this->cartRules() + [
            'payment_method' => 'required|in:Cash Payment',          // no online gateway is wired up yet
            'address_id' => 'nullable|integer', 'notes' => 'nullable|string|max:500', 'save_address' => 'boolean',
            'address' => 'required_without:address_id|array', 'address.name' => 'required_with:address|string|max:120', 'address.phone' => 'required_with:address|string|max:30',
            'address.address_line' => 'required_with:address|string|max:255', 'address.area' => 'nullable|string|max:120', 'address.type' => 'nullable|in:home,office,other',
        ], [
            'address.required_without' => 'Please enter a delivery address.',
            'address.name.required_with' => 'Please enter the receiver\'s name.',
            'address.phone.required_with' => 'Please enter a phone number we can reach.',
            'address.address_line.required_with' => 'Please enter your street address.',
            'payment_method.in' => 'Cash on delivery is the only payment method available right now.',
        ]);
        $user = $request->user();

        if (! empty($data['address_id'])) {
            $a = Address::where('user_id', $user->id)->find($data['address_id']);
            if (! $a) {
                throw ValidationException::withMessages(['address_id' => ['Choose one of your saved addresses.']]);
            }
            $addr = $a->only(['name', 'phone', 'address_line', 'area', 'type']);
        } else {
            $addr = $data['address'] + ['area' => null, 'type' => 'home'];
        }

        $orders = DB::transaction(function () use ($data, $user, $addr) {
            // Lock the rows first, then price against the locked stock so two buyers cannot take the last unit.
            Product::whereIn('id', collect($data['items'])->pluck('product_id'))->orderBy('id')->lockForUpdate()->get();
            $quote = Checkout::price($data['items'], $data['coupon'] ?? null, true);

            $created = [];
            foreach ($quote['orders'] as $o) {
                $order = Order::create([
                    'number' => 'TMP'.bin2hex(random_bytes(6)), 'source' => 'web', 'user_id' => $user->id, 'shop_id' => $o['shop_id'], 'status' => 'pending',
                    'payment_status' => 'unpaid', 'payment_method' => $data['payment_method'], 'subtotal' => $o['subtotal'], 'coupon_discount' => $o['discount'],
                    'shipping' => $o['shipping'], 'total' => $o['total'], 'shipping_address' => $addr['address_line'], 'address_name' => $addr['name'],
                    'address_phone' => $addr['phone'], 'address_type' => $addr['type'], 'area' => $addr['area'], 'notes' => $data['notes'] ?? null,
                ]);
                $order->update(['number' => 'RC'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT)]);
                foreach ($o['lines'] as $l) {
                    $order->items()->create(['product_id' => $l['product_id'], 'name' => $l['name'], 'price' => $l['price'], 'qty' => $l['qty']]);
                    $before = (int) Product::whereKey($l['product_id'])->value('stock');
                    Product::whereKey($l['product_id'])->decrement('stock', $l['qty']);
                    $fresh = Product::find($l['product_id']);
                    if ($fresh) {
                        \App\Models\Setting::alertLowStock($fresh, $before);
                    }
                }
                $created[] = $order->load('items');
            }
            if (! empty($data['save_address']) && ! empty($data['address']) && ! Address::where('user_id', $user->id)->where('address_line', $addr['address_line'])->exists()) {
                Address::create($addr + ['user_id' => $user->id, 'is_default' => ! Address::where('user_id', $user->id)->exists()]);
            }

            return $created;
        });

        return response()->json(['orders' => $orders, 'total' => round(collect($orders)->sum('total'), 2)], 201);
    }
}
