<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\PosDraft;
use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PosController extends Controller
{
    public function products(Request $request)
    {
        $q = Product::query()->where('active', true)->withCount(['orderItems as sold' => fn ($i) => $i->select(DB::raw('coalesce(sum(qty),0)'))]);
        $this->scopeToShop($q);
        if ($s = $request->query('search')) {
            $q->where('name', 'like', "%$s%");
        }
        if ($b = $request->query('brand_id')) {
            $q->where('brand_id', $b);
        }
        if ($c = $request->query('category_id')) {
            $q->where('category_id', $c);
        }

        return $q->orderBy('id')->paginate(10, ['id', 'name', 'price', 'old_price', 'stock', 'image', 'shop_id', 'color_ids', 'size_ids', 'variants']);
    }

    public function customers(Request $request)
    {
        $q = User::where('role', 'customer');
        if ($s = $request->query('search')) {
            $q->where(fn ($w) => $w->where('name', 'like', "%$s%")->orWhere('phone', 'like', "%$s%"));
        }

        return $q->orderBy('name')->limit(20)->get(['id', 'name', 'phone', 'email']);
    }

    public function storeCustomer(Request $request)
    {
        $d = $request->validate([
            'first_name' => 'required|string|max:80', 'last_name' => 'nullable|string|max:80', 'phone' => 'required|string|max:30',
            'gender' => 'nullable|in:male,female', 'email' => 'required|email|unique:users,email',
        ]);

        return response()->json(User::create([
            'name' => trim($d['first_name'].' '.($d['last_name'] ?? '')), 'email' => $d['email'], 'phone' => $d['phone'],
            'gender' => $d['gender'] ?? null, 'role' => 'customer', 'password' => bin2hex(random_bytes(8)),
        ]), 201);
    }

    /** Preview totals for a cart: prices always come from the database, never from the client. */
    public function quote(Request $request)
    {
        return $this->price($request->validate($this->cartRules()));
    }

    public function checkout(Request $request)
    {
        $data = $request->validate($this->cartRules() + ['payment_method' => 'required|in:Cash Payment,Card,Bkash']);
        $quote = $this->price($data);

        $order = DB::transaction(function () use ($data, $quote, $request) {
            $customer = $data['customer_id'] ?? null ? User::findOrFail($data['customer_id']) : $this->walkIn();
            $order = Order::create([
                'number' => 'POS'.str_pad((string) (Order::where('source', 'pos')->count() + 1), 6, '0', STR_PAD_LEFT),
                'source' => 'pos', 'user_id' => $customer->id, 'shop_id' => $quote['lines'][0]['shop_id'],
                'status' => 'delivered', 'payment_status' => 'paid', 'payment_method' => $data['payment_method'],
                'subtotal' => $quote['subtotal'], 'coupon_discount' => $quote['discount'], 'shipping' => 0, 'total' => $quote['total'], 'shipping_address' => 'In store', 'address_name' => $customer->name, 'address_type' => 'store', 'delivered_at' => now(),
            ]);
            foreach ($quote['lines'] as $l) {
                // Lock the row so two cashiers cannot sell the same last unit.
                $p = Product::lockForUpdate()->find($l['product_id']);
                $sel = $p->selection($l['color_id'] ?? null, $l['size_id'] ?? null);
                if (! $sel || $sel['stock'] < $l['qty']) {
                    throw ValidationException::withMessages(['items' => ["Not enough stock for {$p->name} (only ".($sel['stock'] ?? 0)." left)."]]);
                }
                $before = (int) $p->stock;
                $p->take($l['qty'], $l['color_id'] ?? null, $l['size_id'] ?? null);
                \App\Models\Setting::alertLowStock($p->fresh(), $before);
                $order->items()->create(['product_id' => $p->id, 'name' => $p->name, 'price' => $l['price'], 'qty' => $l['qty'], 'color' => $l['color'] ?? null, 'size' => $l['size'] ?? null]);
            }
            if ($request->filled('draft_id')) {
                PosDraft::where('id', $request->input('draft_id'))->delete();
            }

            return $order;
        });

        return response()->json($order->load('items'), 201);
    }

    public function sales()
    {
        $q = Order::with('user:id,name')->where('source', 'pos');
        $this->scopeToShop($q, 'shop_id');

        return $q->latest('id')->paginate(10);
    }

    public function drafts()
    {
        $page = PosDraft::with('customer:id,name')->where('created_by', request()->user()->id)->latest('id')->paginate(10);
        $products = Product::whereIn('id', $page->getCollection()->pluck('items')->flatten(1)->pluck('product_id')->unique())
            ->get(['id', 'name', 'price', 'old_price', 'stock', 'image', 'shop_id', 'color_ids', 'size_ids', 'variants'])->keyBy('id');
        // Attach product rows so the POS can rebuild the cart without extra requests.
        $page->getCollection()->transform(function ($d) use ($products) {
            $d->setAttribute('lines', collect($d->items)->filter(fn ($i) => $products->has($i['product_id']))->map(fn ($i) => [
                'product' => $products[$i['product_id']], 'qty' => $i['qty'], 'color_id' => $i['color_id'] ?? null, 'size_id' => $i['size_id'] ?? null,
            ])->values());

            return $d;
        });

        return $page;
    }

    public function storeDraft(Request $request)
    {
        $data = $request->validate($this->cartRules());
        $quote = $this->price($data);

        return response()->json(PosDraft::create([
            'customer_id' => $data['customer_id'] ?? null, 'created_by' => $request->user()->id,
            'items' => collect($data['items'])->map(fn ($i) => [
                'product_id' => (int) $i['product_id'], 'qty' => (int) $i['qty'],
                'color_id' => Product::optionId($i['color_id'] ?? null), 'size_id' => Product::optionId($i['size_id'] ?? null),
            ])->all(),
            'subtotal' => $quote['subtotal'], 'discount' => $quote['discount'], 'total' => $quote['total'], 'coupon' => $data['coupon'] ?? null,
            'discount_type' => $data['discount_type'] ?? null, 'discount_value' => $data['discount_value'] ?? 0,
        ]), 201);
    }

    public function destroyDraft(Request $request, int $id)
    {
        PosDraft::where('created_by', $request->user()->id)->findOrFail($id)->delete();

        return response()->noContent();
    }

    private function cartRules(): array
    {
        return [
            'items' => 'required|array|min:1', 'items.*.product_id' => 'required|exists:products,id', 'items.*.qty' => 'required|integer|min:1|max:1000',
            'items.*.color_id' => 'nullable|integer', 'items.*.size_id' => 'nullable|integer',
            'customer_id' => 'nullable|exists:users,id', 'coupon' => 'nullable|string|max:40',
            'discount_type' => 'nullable|in:percent,fixed', 'discount_value' => 'nullable|numeric|min:0|max:1000000',
        ];
    }

    private function price(array $data): array
    {
        $lines = [];
        $sub = 0;
        foreach ($data['items'] as $i) {
            $p = Product::findOrFail($i['product_id']);
            $user = request()->user();
            if ($user->role === 'shop' && ! Shop::where('user_id', $user->id)->where('id', $p->shop_id)->exists()) {
                abort(403, 'You can only sell your own shop\'s products.');
            }
            $sel = $p->selection(Product::optionId($i['color_id'] ?? null), Product::optionId($i['size_id'] ?? null));
            if (! $sel) {
                throw ValidationException::withMessages(['items' => ["Choose a color and size for {$p->name}."]]);
            }
            if ($sel['stock'] < $i['qty']) {
                throw ValidationException::withMessages(['items' => ["Not enough stock for {$p->name} (only {$sel['stock']} left)."]]);
            }
            $sub += $sel['price'] * $i['qty'];
            $lines[] = [
                'key' => $p->id.'-'.($sel['color_id'] ?? 0).'-'.($sel['size_id'] ?? 0),
                'product_id' => $p->id, 'shop_id' => $p->shop_id, 'name' => $p->name, 'price' => $sel['price'], 'qty' => (int) $i['qty'],
                'color' => $sel['color'], 'size' => $sel['size'], 'color_id' => $sel['color_id'], 'size_id' => $sel['size_id'],
            ];
        }

        $discount = 0;
        if (! empty($data['coupon'])) {
            $c = Coupon::where('code', $data['coupon'])->where('active', true)->first();
            if (! $c || ($c->starts_at && $c->starts_at->isFuture()) || ($c->expires_at && $c->expires_at->isPast()) || $sub < $c->min_amount) {
                throw ValidationException::withMessages(['coupon' => ['This coupon is invalid, expired or the minimum amount is not met.']]);
            }
            $discount = $c->discount_type === 'percent' ? $sub * $c->discount / 100 : min($c->discount, $sub);
        }

        // The cashier's own discount comes off what is left after the coupon, and can never push the total below zero.
        $left = $sub - $discount;
        $manual = 0;
        if (! empty($data['discount_type']) && (float) ($data['discount_value'] ?? 0) > 0) {
            $v = (float) $data['discount_value'];
            if ($data['discount_type'] === 'percent' && $v > 100) {
                throw ValidationException::withMessages(['discount_value' => ['A percentage cannot be more than 100.']]);
            }
            $manual = $data['discount_type'] === 'percent' ? $left * $v / 100 : min($v, $left);
        }

        return ['lines' => $lines, 'subtotal' => round($sub, 2), 'coupon_discount' => round($discount, 2), 'manual_discount' => round($manual, 2), 'discount' => round($discount + $manual, 2), 'total' => round($sub - $discount - $manual, 2)];
    }

    private function walkIn(): User
    {
        return User::firstOrCreate(['email' => 'walkin@pos.local'], ['name' => 'Walk-in Customer', 'role' => 'walkin', 'password' => bin2hex(random_bytes(8))]);
    }

    private function scopeToShop($query, string $col = 'shop_id'): void
    {
        $u = request()->user();
        if ($u->role === 'shop') {
            $query->whereIn($col, Shop::where('user_id', $u->id)->pluck('id'));
        }
    }
}
