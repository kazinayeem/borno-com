<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\Product;
use Illuminate\Validation\ValidationException;

/** Prices a cart on the server. The browser supplies product ids, quantities, and the chosen color and size. */
class Checkout
{
    public const FREE_SHIPPING_FROM = 999.0;
    public const SHIPPING = 5.0;

    /**
     * @param  array<int, array{product_id:int, qty:int, color_id?:int, size_id?:int}>  $items
     * @param  bool  $strict  true = throw on unavailable/over-stock lines (placing an order); false = report them (cart preview)
     * @return array{orders: array, issues: array, subtotal: float, discount: float, shipping: float, total: float}
     */
    public static function price(array $items, ?string $coupon, bool $strict): array
    {
        $lines = collect($items)->map(fn ($i) => [
            'product_id' => (int) $i['product_id'], 'qty' => (int) $i['qty'],
            'color_id' => Product::optionId($i['color_id'] ?? null), 'size_id' => Product::optionId($i['size_id'] ?? null),
        ]);
        $grouped = $lines->groupBy(fn ($i) => $i['product_id'].'-'.($i['color_id'] ?? 0).'-'.($i['size_id'] ?? 0));
        $products = Product::whereIn('id', $lines->pluck('product_id')->unique())->get()->keyBy('id');

        $issues = [];
        $byShop = [];
        foreach ($grouped as $key => $g) {
            $id = (int) $g->first()['product_id'];
            $q = (int) $g->sum('qty');
            $p = $products[$id] ?? null;
            if (! $p || ! $p->active || $p->approval === 'pending') {
                $issues[] = ['key' => $key, 'product_id' => $id, 'message' => ($p->name ?? 'A product').' is no longer available.'];
                continue;
            }
            $sel = $p->selection($g->first()['color_id'], $g->first()['size_id']);
            if (! $sel) {
                $issues[] = ['key' => $key, 'product_id' => $id, 'message' => "Choose a color and size for {$p->name}."];
                continue;
            }
            $label = trim(($sel['color'] ? $sel['color'].' ' : '').($sel['size'] ? $sel['size'].' ' : '').$p->name);
            if ($sel['stock'] < 1 || $q > $sel['stock']) {
                $issues[] = ['key' => $key, 'product_id' => $id, 'message' => $sel['stock'] < 1 ? "{$label} is out of stock." : "Only {$sel['stock']} left of {$label}.", 'available' => $sel['stock']];
                continue;
            }
            $byShop[$p->shop_id][] = [
                'key' => $key, 'product_id' => $p->id, 'name' => $p->name, 'price' => $sel['price'], 'qty' => $q, 'image_url' => $p->image_url,
                'color' => $sel['color'], 'size' => $sel['size'], 'color_id' => $sel['color_id'], 'size_id' => $sel['size_id'],
            ];
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
