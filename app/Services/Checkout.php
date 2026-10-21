<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\Product;
use Illuminate\Validation\ValidationException;

/** Prices a cart on the server. The browser only ever supplies product ids and quantities. */
class Checkout
{
    public const FREE_SHIPPING_FROM = 999.0;
    public const SHIPPING = 5.0;

    /**
     * @param  array<int, array{product_id:int, qty:int}>  $items
     * @param  bool  $strict  true = throw on unavailable/over-stock lines (placing an order); false = report them (cart preview)
     * @return array{orders: array, issues: array, subtotal: float, discount: float, shipping: float, total: float}
     */
    public static function price(array $items, ?string $coupon, bool $strict): array
    {
        $qty = collect($items)->groupBy('product_id')->map(fn ($g) => (int) $g->sum('qty'));
        $products = Product::whereIn('id', $qty->keys())->get()->keyBy('id');

        $issues = [];
        $byShop = [];
        foreach ($qty as $id => $q) {
            $p = $products[$id] ?? null;
            if (! $p || ! $p->active || $p->approval === 'pending') {
                $issues[] = ['product_id' => (int) $id, 'message' => ($p->name ?? 'A product').' is no longer available.'];
                continue;
            }
            if ($p->stock < 1 || $q > $p->stock) {
                $issues[] = ['product_id' => (int) $id, 'message' => $p->stock < 1 ? "{$p->name} is out of stock." : "Only {$p->stock} left of {$p->name}.", 'available' => $p->stock];
                continue;
            }
            $byShop[$p->shop_id][] = ['product_id' => $p->id, 'name' => $p->name, 'price' => $p->price, 'qty' => $q, 'image_url' => $p->image_url];
        }
        if ($strict && $issues) {
            throw ValidationException::withMessages(['items' => array_column($issues, 'message')]);
        }
        if ($strict && ! $byShop) {
            throw ValidationException::withMessages(['items' => ['Your cart is empty.']]);
        }

        $subtotal = round(collect($byShop)->flatten(1)->sum(fn ($l) => $l['price'] * $l['qty']), 2);
        $discount = self::discount($coupon, $subtotal);

        $orders = [];
        $allocated = 0.0;
        $shopIds = array_keys($byShop);
        foreach ($shopIds as $n => $shopId) {
            $lines = $byShop[$shopId];
            $sub = round(collect($lines)->sum(fn ($l) => $l['price'] * $l['qty']), 2);
            // Coupon is shared across shops in proportion to each shop's subtotal; the last one absorbs rounding.
            $share = $n === count($shopIds) - 1 ? round($discount - $allocated, 2) : round($subtotal > 0 ? $discount * $sub / $subtotal : 0, 2);
            $allocated += $share;
            $ship = $sub >= self::FREE_SHIPPING_FROM ? 0.0 : self::SHIPPING;
            $orders[] = ['shop_id' => $shopId, 'lines' => $lines, 'subtotal' => $sub, 'discount' => $share, 'shipping' => $ship, 'total' => round($sub - $share + $ship, 2)];
        }

        return [
            'orders' => $orders, 'issues' => $issues, 'subtotal' => $subtotal, 'discount' => round($discount, 2),
            'shipping' => round(collect($orders)->sum('shipping'), 2), 'total' => round(collect($orders)->sum('total'), 2),
        ];
    }

    private static function discount(?string $code, float $subtotal): float
    {
        if (! $code) {
            return 0.0;
        }
        $c = Coupon::where('code', $code)->where('active', true)->first();
        if (! $c || ($c->starts_at && $c->starts_at->isFuture()) || ($c->expires_at && $c->expires_at->isPast()) || $subtotal < $c->min_amount) {
            throw ValidationException::withMessages(['coupon' => ['This coupon is invalid, expired or the minimum amount is not met.']]);
        }

        return round($c->discount_type === 'percent' ? $subtotal * $c->discount / 100 : min($c->discount, $subtotal), 2);
    }
}
