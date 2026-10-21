<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Rider;
use App\Models\Currency;
use App\Models\VatTax;
use App\Models\SubCategory;
use App\Models\FlashSale;
use App\Models\Coupon;
use App\Models\Unit;
use App\Models\Size;
use App\Models\Color;
use App\Models\Order;
use App\Models\ContactMessage;
use App\Models\Product;
use App\Models\Record;
use App\Models\Setting;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminController extends Controller
{
    /** Resource config: model, searchable column, validation rules. */
    private function cfg(string $res): array
    {
        // Shop owners may only manage products; everything else is admin-only.
        abort_if(request()->user()->role === 'shop' && $res !== 'products', 403, 'Forbidden.');

        return match ($res) {
            'products' => [Product::class, 'name', [
                'shop_id' => 'required|exists:shops,id', 'category_id' => 'required|exists:categories,id',
                'brand_id' => 'nullable|exists:brands,id', 'name' => 'required|string|max:255',
                'description' => 'required|string', 'price' => 'required|numeric|min:0',
                'name_ar' => 'nullable|string|max:255', 'image' => 'nullable|string|regex:/^uploads\/[\w.\-]+$/', 'slug' => 'nullable|string|max:255',
                'short_description' => 'required|string|max:1000', 'short_description_ar' => 'nullable|string|max:1000',
                'gallery' => 'nullable|array|max:5', 'gallery.*' => 'string|max:500', 'sku' => 'required|string|max:60', 'weight' => 'nullable|numeric|min:0', 'buy_price' => 'required|numeric|min:0',
                'discount_type' => 'nullable|in:fixed,percent', 'unit' => 'nullable|string|max:20',
                'color_ids' => 'nullable|array', 'size_ids' => 'nullable|array',
                'variants' => 'nullable|array|max:200', 'variants.*.color_id' => 'nullable|integer', 'variants.*.size_id' => 'nullable|integer',
                'variants.*.price' => 'required|numeric|min:0', 'variants.*.stock' => 'required|integer|min:0',
                'video_type' => 'nullable|string|max:30', 'video_url' => 'nullable|string|max:255',
                'meta_title' => 'nullable|string|max:255', 'meta_description' => 'nullable|string', 'meta_keywords' => 'nullable|array',
                'old_price' => 'nullable|numeric|min:0', 'discount_price' => 'nullable|numeric|min:0', 'stock' => 'nullable|integer|min:0',
                'is_digital' => 'boolean', 'is_preorder' => 'boolean', 'is_flash_sale' => 'boolean', 'active' => 'boolean',
            ], ['shop:id,name', 'category:id,name']],
            'categories' => [Category::class, 'name', ['name' => 'required|string|max:120', 'name_ar' => 'nullable|string|max:120', 'order_by' => 'nullable|integer|min:0', 'description' => 'nullable|string', 'description_ar' => 'nullable|string', 'icon' => 'nullable|string|regex:/^uploads\/[\w.\-]+$/', 'slug' => 'nullable|string|max:140', 'active' => 'boolean'], []],
            'brands' => [Brand::class, 'name', ['name' => 'required|string|max:120', 'slug' => 'nullable|string|max:140', 'active' => 'boolean'], []],
            'shops' => [Shop::class, 'name', ['name' => 'required|string|max:120', 'name_ar' => 'nullable|string|max:120', 'logo' => 'nullable|string|regex:/^uploads\/[\w.\-]+$/', 'address' => 'nullable|string|max:255', 'description' => 'nullable|string', 'online' => 'boolean', 'active' => 'boolean'], []],
            'blogs' => [BlogPost::class, 'title', ['title' => 'required|string|max:255', 'category' => 'nullable|string|max:120', 'excerpt' => 'nullable|string', 'body' => 'nullable|string', 'published' => 'boolean'], []],
            'colors' => [Color::class, 'name', ['name' => 'required|string|max:60', 'code' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'], 'active' => 'boolean'], []],
            'sizes' => [Size::class, 'name', ['name' => 'required|string|max:30', 'active' => 'boolean'], []],
            'units' => [Unit::class, 'name', ['name' => 'required|string|max:30', 'active' => 'boolean'], []],
            'subcategories' => [SubCategory::class, 'name', ['category_id' => 'required|exists:categories,id', 'name' => 'required|string|max:120', 'image' => 'nullable|string|regex:/^uploads\/[\w.\-]+$/', 'active' => 'boolean'], ['category:id,name']],
            'coupons' => [Coupon::class, 'code', ['code' => 'required|string|max:40|unique:coupons,code', 'discount' => 'required|numeric|min:0', 'discount_type' => 'required|in:percent,fixed', 'min_amount' => 'nullable|numeric|min:0', 'starts_at' => 'nullable|date', 'expires_at' => 'nullable|date|after_or_equal:starts_at', 'active' => 'boolean'], []],
            'flash-sales' => [FlashSale::class, 'name', ['name' => 'required|string|max:120', 'discount' => 'required|integer|min:0|max:100', 'description' => 'nullable|string', 'image' => 'nullable|string|regex:/^uploads\/[\w.\-]+$/', 'starts_at' => 'required|date', 'ends_at' => 'required|date|after_or_equal:starts_at', 'active' => 'boolean'], []],
            'riders' => [Rider::class, 'name', ['name' => 'required|string|max:120', 'first_name' => 'nullable|string|max:80', 'last_name' => 'nullable|string|max:80', 'phone' => 'nullable|string|max:30', 'email' => 'nullable|email|max:160', 'gender' => 'nullable|in:male,female', 'driving_licence' => 'nullable|string|max:60', 'vehicle_type' => 'nullable|string|max:40', 'active' => 'boolean'], []],
            'customers' => [User::class, 'name', ['name' => 'required|string|max:120', 'last_name' => 'nullable|string|max:80', 'phone' => 'required|string|max:30', 'email' => 'required|email|max:160|unique:users,email', 'password' => 'required|string|min:6|confirmed', 'gender' => 'nullable|in:male,female', 'date_of_birth' => 'nullable|date'], []],
            'currencies' => [Currency::class, 'name', ['name' => 'required|string|max:10', 'symbol' => 'required|string|max:6', 'rate' => 'required|numeric|min:0.0001'], []],
            'vat-taxes' => [VatTax::class, 'name', ['name' => 'required|string|max:80', 'percentage' => 'required|numeric|min:0|max:100', 'active' => 'boolean'], []],
            default => abort(404),
        };
    }

    public function dashboard()
    {
        if (request()->user()->role === 'shop') {
            return $this->shopDashboard();
        }

        $sumRecords = function (string $resource, string $field, ?string $status = null) {
            return round((float) Record::where('resource', $resource)->get()
                ->filter(fn ($r) => $status === null || strtolower($r->data['status'] ?? '') === $status)
                ->sum(fn ($r) => (float) ($r->data[$field] ?? 0)), 2);
        };
        $live = Order::where('status', '!=', 'cancelled');
        $sold = \App\Models\OrderItem::selectRaw('product_id, sum(qty) as sold')
            ->whereIn('order_id', (clone $live)->pluck('id'))->whereNotNull('product_id')->groupBy('product_id')->orderByDesc('sold')->limit(5)->get();
        $soldProducts = Product::whereIn('id', $sold->pluck('product_id'))->get(['id', 'name', 'image', 'price'])->keyBy('id');

        return [
            'totals' => ['shops' => Shop::count(), 'products' => Product::count(), 'orders' => Order::count(), 'customers' => User::where('role', 'customer')->count()],
            'order_analytics' => Order::selectRaw('status, count(*) as count')->groupBy('status')->pluck('count', 'status'),
            'wallet' => [
                'total_earning' => round((float) (clone $live)->where('payment_status', 'paid')->sum('total'), 2),
                'already_withdraw' => $sumRecords('withdraws', 'amount', 'approved'), 'pending_withdraw' => $sumRecords('withdraws', 'amount', 'pending'),
                'rejected_withdraw' => $sumRecords('withdraws', 'amount', 'rejected'), 'total_commission' => $sumRecords('commissions', 'admin_commission'),
            ],
            'user_overview' => ['customer' => User::where('role', 'customer')->count(), 'shop' => Shop::count(), 'rider' => Rider::count()],
            'latest_orders' => Order::with('shop:id,name')->withSum('items as qty', 'qty')->latest('id')->limit(5)->get()
                ->map(fn ($o) => ['id' => $o->id, 'number' => $o->number, 'qty' => (int) $o->qty, 'shop_name' => $o->shop?->name, 'created_at' => $o->created_at, 'status' => $o->status]),
            'top_shops' => Shop::withCount('orders')->orderByDesc('orders_count')->limit(5)->get()->map(fn ($s) => ['id' => $s->id, 'name' => $s->name, 'image_url' => $s->image_url, 'rating' => $s->rating, 'orders' => $s->orders_count]),
            'favorite_products' => Product::orderByDesc('favorites')->orderBy('id')->limit(5)->get(['id', 'name', 'image', 'favorites'])->map(fn ($p) => ['id' => $p->id, 'name' => $p->name, 'image_url' => $p->image_url, 'favorites' => $p->favorites]),
            'top_selling' => $sold->map(fn ($r) => ['id' => $r->product_id, 'name' => $soldProducts[$r->product_id]->name ?? 'Deleted product', 'image_url' => $soldProducts[$r->product_id]->image_url ?? null, 'price' => $soldProducts[$r->product_id]->price ?? 0, 'sold' => (int) $r->sold])->values(),
        ];
    }

    /** Order counts for the dashboard chart: daily = 24 hours, monthly = days of the month, yearly = 12 months. */
    public function statistics(Request $request)
    {
        $d = $request->validate(['type' => 'required|in:daily,monthly,yearly', 'date' => 'nullable|date']);
        $date = isset($d['date']) && $d['date'] ? \Illuminate\Support\Carbon::parse($d['date']) : now();
        $q = Order::query();
        [$from, $to] = match ($d['type']) {
            'daily' => [$date->copy()->startOfDay(), $date->copy()->endOfDay()],
            'monthly' => [$date->copy()->startOfMonth(), $date->copy()->endOfMonth()],
            'yearly' => [$date->copy()->startOfYear(), $date->copy()->endOfYear()],
        };
        $rows = $q->whereBetween('created_at', [$from, $to])->get(['created_at']);
        [$labels, $key] = match ($d['type']) {
            'daily' => [array_map(fn ($h) => sprintf('%02d:00', $h), range(0, 23)), fn ($c) => (int) $c->format('G')],
            'monthly' => [array_map(fn ($n) => $date->format('Y-m-').sprintf('%02d', $n), range(1, $date->daysInMonth)), fn ($c) => (int) $c->format('j') - 1],
            'yearly' => [['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], fn ($c) => (int) $c->format('n') - 1],
        };
        $values = array_fill(0, count($labels), 0);
        foreach ($rows as $r) {
            $values[$key($r->created_at)]++;
        }

        return ['labels' => $labels, 'values' => $values, 'total' => array_sum($values)];
    }

    /** Notification bell: unread count + the latest entries. */
    public function bell()
    {
        $all = Record::where('resource', 'notifications')->orderByDesc('rid')->get()->map->flat();

        return ['count' => $all->filter(fn ($n) => ! ($n['is_read'] ?? false))->count(), 'notifications' => $all->take(6)->values()];
    }

    public function readAllNotifications()
    {
        Record::where('resource', 'notifications')->get()->each(fn ($r) => $r->update(['data' => array_merge($r->data, ['is_read' => true])]));

        return response()->noContent();
    }

    /** Seller dashboard (ShopDesk layout): shop stats, status counts, wallet, 7-day orders and top products for the seller's own shop(s). */
    private function shopDashboard(): array
    {
        $shops = Shop::where('user_id', request()->user()->id)->get(['id', 'name']);
        $ids = $shops->pluck('id');
        $orders = Order::whereIn('shop_id', $ids);
        $delivered = (clone $orders)->where('status', 'delivered');
        $sales = (float) (clone $delivered)->sum('total');

        // Withdrawals are generic records tagged with the seller's shop id; rejected ones never count against the balance.
        $withdraws = Record::where('resource', 'withdraws')->get()->filter(fn ($r) => $ids->contains($r->data['shop_id'] ?? null));
        $sum = fn ($rows) => round((float) $rows->sum(fn ($r) => (float) ($r->data['amount'] ?? 0)), 2);
        $byStatus = fn (string $st) => $withdraws->filter(fn ($r) => strtolower($r->data['status'] ?? '') === $st);
        $spent = $withdraws->filter(fn ($r) => strtolower($r->data['status'] ?? '') !== 'rejected');

        $days = collect(range(6, 0))->map(fn ($d) => now()->subDays($d)->toDateString());
        $perDay = (clone $orders)->where('created_at', '>=', now()->subDays(6)->startOfDay())->get(['created_at'])->groupBy(fn ($o) => $o->created_at->toDateString())->map->count();

        $liveIds = (clone $orders)->where('status', '!=', 'cancelled')->pluck('id');
        $top = \App\Models\OrderItem::selectRaw('name, sum(qty) as sold')
            ->whereIn('order_id', $liveIds)
            ->groupBy('name')->orderByDesc('sold')->limit(8)->get();
        $named = Product::whereIn('shop_id', $ids)->whereIn('name', $top->pluck('name'))->get()->keyBy('name');
        $soldByName = $top->pluck('sold', 'name');
        $card = function (Product $p) use ($soldByName) {
            return [
                'id' => $p->id, 'name' => $p->name, 'image_url' => $p->image_url,
                'rating' => (float) $p->rating, 'favorites' => (int) $p->favorites,
                'sold' => (int) ($soldByName[$p->name] ?? 0),
            ];
        };

        return [
            'scope' => 'shop', 'shop_name' => $shops->first()->name ?? request()->user()->name,
            'stats' => ['products' => Product::whereIn('shop_id', $ids)->count(), 'orders' => (clone $orders)->count(), 'categories' => Category::count(), 'brands' => Brand::count()],
            'orders_by_status' => (clone $orders)->selectRaw('status, count(*) as count')->groupBy('status')->pluck('count', 'status'),
            'wallet' => [
                'balance' => round($sales - $sum($spent), 2), 'pending_withdraw' => $sum($byStatus('pending')), 'already_withdraw' => $sum($byStatus('approved')),
                'rejected_withdraw' => $sum($byStatus('rejected')), 'total_withdraw' => $sum($spent),
                'total_sales' => round($sales, 2), 'delivery_charge' => round((float) (clone $delivered)->sum('shipping'), 2),
                'pos_sales' => round((float) (clone $orders)->where('source', 'pos')->sum('total'), 2),
            ],
            'last7' => $days->map(fn ($d) => ['date' => $d, 'count' => (int) ($perDay[$d] ?? 0)])->values(),
            'latest_orders' => (clone $orders)->withSum('items as qty', 'qty')->latest('id')->limit(8)->get()
                ->map(fn ($o) => ['id' => $o->id, 'number' => $o->number, 'qty' => (int) $o->qty, 'created_at' => $o->created_at, 'status' => $o->status]),
            'top_products' => $top->take(5)->map(fn ($t) => ['name' => $t->name, 'sold' => (int) $t->sold])->values(),
            'top_selling' => $top->map(function ($t) use ($named) {
                $p = $named[$t->name] ?? null;

                return ['id' => $p?->id ?? $t->name, 'name' => $t->name, 'image_url' => $p?->image_url, 'rating' => (float) ($p?->rating ?? 0), 'favorites' => (int) ($p?->favorites ?? 0), 'sold' => (int) $t->sold];
            })->values(),
            'top_rating' => Product::whereIn('shop_id', $ids)->orderByDesc('rating')->orderBy('id')->limit(8)->get()->map($card)->values(),
            'favorite_products' => Product::whereIn('shop_id', $ids)->orderByDesc('favorites')->orderBy('id')->limit(8)->get()->map($card)->values(),
        ];
    }

    /** Sellers only touch products that belong to their shop. */
    private function guardOwnProduct(string $res, $row): void
    {
        if ($res === 'products' && request()->user()->role === 'shop') {
            abort_unless(Shop::where('user_id', request()->user()->id)->where('id', $row->shop_id)->exists(), 403);
        }
    }

    /** Read-only catalog for the shop portal. The admin list routes stay admin-only. */
    public function shopCatalog(string $res)
    {
        abort_unless(request()->user()->role === 'shop', 403);
        $models = [
            'categories' => Category::class, 'subcategories' => SubCategory::class, 'brands' => Brand::class,
            'colors' => Color::class, 'sizes' => Size::class, 'units' => Unit::class,
            'flash-sales' => FlashSale::class, 'coupons' => Coupon::class,
        ];
        if ($res === 'banners') {
            return Record::where('resource', 'banners')->orderByDesc('rid')->paginate(15)
                ->through(fn (Record $r) => $r->flat());
        }
        abort_unless(isset($models[$res]), 404);

        return $models[$res]::orderBy('id')->paginate(15);
    }

    public function index(Request $request, string $res)
    {
        [$model, $search, , $with] = $this->cfg($res);
        $q = $model::with($with);
        if ($s = $request->query('search')) {
            $q->where($search, 'like', "%$s%");
        }

        if ($request->filled('approval') && $res === 'products') {
            $q->where('approval', $request->query('approval'));
        }
        if ($request->filled('shop_id') && $res === 'products') {
            $q->where('shop_id', $request->query('shop_id'));
        }
        if ($res === 'products' && $request->user()->role === 'shop') {
            $q->whereIn('shop_id', Shop::where('user_id', $request->user()->id)->pluck('id'));
        }
        if ($res === 'shops') {
            $q->withCount(['products', 'orders']);
        }

        return $q->orderBy($res === 'categories' || $res === 'brands' ? 'id' : 'id', $res === 'products' || $res === 'blogs' ? 'desc' : 'asc')->paginate(min((int) $request->query('per_page', 10), 100));
    }

    public function show(string $res, int $id)
    {
        [$model, , , $with] = $this->cfg($res);
        $row = $model::with($with)->findOrFail($id);
        $this->guardOwnProduct($res, $row);

        return $row;
    }

    public function store(Request $request, string $res)
    {
        [$model, , $rules] = $this->cfg($res);
        if ($res === 'shops') {
            abort_unless(Setting::shopType() === 'multi', 403, 'Add Shop is not available while the store is in Single Shop mode.');

            return response()->json($this->createShop($request, $rules), 201);
        }
        if ($res === 'products') {
            $this->pinSingleShop($request);
        }
        $valid = $request->validate($rules);
        $this->checkGallery($res, $valid, []);
        $data = $this->prepare($res, $valid);
        if ($res === 'products' && $request->user()->role === 'shop') {
            $data['shop_id'] = Shop::where('user_id', $request->user()->id)->value('id') ?? $data['shop_id'];
            $data['approval'] = 'pending'; // seller products wait for an admin to accept them
        }

        return response()->json($model::create($data), 201);
    }

    public function update(Request $request, string $res, int $id)
    {
        [$model, , $rules] = $this->cfg($res);
        $row = $model::findOrFail($id);
        $this->guardOwnProduct($res, $row);
        if ($res === 'products') {
            $this->pinSingleShop($request);
        }
        $before = $this->imageOf($row);
        $rules = array_map(fn ($r) => is_string($r) ? str_replace('required|', 'sometimes|required|', $r) : $r, $rules);
        foreach (['icon', 'logo', 'image'] as $imgField) {
            if (isset($rules[$imgField]) && $request->input($imgField) === ($row->{$imgField} ?? null)) {
                $rules[$imgField] = 'nullable|string'; // unchanged value (e.g. a seeded image URL) is always fine
            }
        }
        if ($res === 'coupons') {
            $rules['code'] = 'sometimes|required|string|max:40|unique:coupons,code,'.$id;
        }
        $valid = $request->validate($rules);
        $this->checkGallery($res, $valid, (array) ($row->gallery ?? []));
        $data = $this->prepare($res, $valid);
        if ($res === 'products' && $request->user()->role === 'shop') {
            unset($data['shop_id']); // a seller can edit their product but never move it into another shop
        }
        $row->update($data);

        $this->dropFile($before, $this->imageOf($row->refresh()));

        return $row;
    }

    public function destroy(string $res, int $id)
    {
        [$model] = $this->cfg($res);
        $row = $model::findOrFail($id);
        $this->guardOwnProduct($res, $row);
        abort_if($res === 'currencies' && $row->is_default, 422, 'The default currency cannot be deleted.');
        $this->dropFile($this->imageOf($row));
        $row->delete();

        return response()->noContent();
    }

    public function orders(Request $request)
    {
        $q = Order::with(['user:id,name,email', 'shop:id,name'])->withCount('items');
        $this->scopeToShop($q);
        if ($s = $request->query('search')) {
            $q->where(fn ($w) => $w->where('number', 'like', "%$s%")->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%$s%")));
        }
        if ($st = $request->query('status')) {
            $q->where('status', $st);
        }

        return $q->latest('id')->paginate(10);
    }

    public function order(int $id)
    {
        $q = Order::with(['user:id,name,email,phone', 'items.product:id,image', 'shop:id,name', 'rider:id,name,phone']);
        $this->scopeToShop($q);

        return $q->findOrFail($id);
    }

    public function updateOrder(Request $request, int $id)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(Order::STATUSES)],
            'payment_status' => ['sometimes', Rule::in(['paid', 'unpaid'])],
            'rider_id' => ['sometimes', 'nullable', 'exists:riders,id'],
        ]);
        $o = Order::findOrFail($id);
        // Delivery date follows the status: set when delivered, cleared otherwise.
        $data['delivered_at'] = $data['status'] === 'delivered' ? ($o->delivered_at ?? now()) : null;
        $o->update($data);

        return $o->load('rider:id,name,phone');
    }

    /** Riders with their open (not delivered/cancelled) order counts, for the Assign Rider dialog. */
    public function riders()
    {
        return Rider::where('active', true)->withCount(['orders as incomplete_orders' => fn ($q) => $q->whereNotIn('status', ['delivered', 'cancelled'])])->get();
    }

    public function customers(Request $request)
    {
        $q = User::where('role', 'customer')->withCount('orders')->withSum('orders as spent', 'total');
        if ($s = $request->query('search')) {
            $q->where(fn ($w) => $w->where('name', 'like', "%$s%")->orWhere('email', 'like', "%$s%"));
        }

        return $q->latest('id')->paginate(10);
    }

    /** Dropdown data for the admin forms. */
    public function options()
    {
        return [
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'brands' => Brand::orderBy('name')->get(['id', 'name']),
            'shops' => Shop::orderBy('name')->get(['id', 'name']),
            'colors' => Color::where('active', true)->get(['id', 'name', 'code']),
            'sizes' => Size::where('active', true)->get(['id', 'name']),
            'units' => Unit::where('active', true)->pluck('name'),
        ];
    }

    /** In Single Shop mode every admin product belongs to the first shop. Sellers stay on their own shop. */
    private function pinSingleShop(Request $request): void
    {
        if ($request->user()->role !== 'admin' || Setting::shopType() !== 'single') {
            return;
        }
        $only = Shop::orderBy('id')->value('id');
        if (! $only) {
            throw ValidationException::withMessages(['shop_id' => ['Single Shop mode has no shop to assign products to.']]);
        }
        $request->merge(['shop_id' => $only]);
    }

    private function createShop(Request $request, array $shopRules)
    {
        $data = $request->validate([
            'first_name' => 'required|string|max:80', 'last_name' => 'nullable|string|max:80',
            'phone' => 'required|string|max:30', 'gender' => 'nullable|in:male,female',
            'email' => 'required|email|unique:users,email', 'password' => 'required|string|min:6|confirmed',
        ] + $shopRules);

        return \Illuminate\Support\Facades\DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => trim($data['first_name'].' '.($data['last_name'] ?? '')), 'email' => $data['email'], 'role' => 'shop',
                'phone' => $data['phone'], 'gender' => $data['gender'] ?? null, 'password' => $data['password'],
            ]);

            return Shop::create(collect($data)->only(['name', 'name_ar', 'logo', 'address', 'description', 'online', 'active'])->all() + ['user_id' => $user->id]);
        });
    }

    public function approveProduct(int $id)
    {
        $p = Product::findOrFail($id);
        $p->update(['approval' => 'accepted']);

        return $p;
    }

    public function messages()
    {
        return ContactMessage::latest()->paginate(10);
    }

    public function markMessage(int $id)
    {
        $m = ContactMessage::findOrFail($id);
        $m->update(['read' => true]);

        return $m;
    }

    private function imageOf($row): ?string
    {
        return $row->icon ?? $row->logo ?? $row->image ?? null;
    }

    /** Remove an uploaded file once it is replaced (or its record is deleted). */
    private function dropFile(?string $old, ?string $current = null): void
    {
        if ($old && $old !== $current && str_starts_with($old, 'uploads/')) {
            Storage::disk('public')->delete($old);
        }
    }

    /** Shop owners only see orders that belong to their own shop(s). */
    private function scopeToShop($query): void
    {
        $user = request()->user();
        if ($user->role === 'shop') {
            $query->whereIn('shop_id', Shop::where('user_id', $user->id)->pluck('id'));
        }
    }

    /** Gallery entries must be uploaded files, or images the product already had (seeded URLs). */
    private function checkGallery(string $res, array &$valid, array $existing): void
    {
        if ($res !== 'products' || ! isset($valid['gallery'])) {
            return;
        }
        $valid['gallery'] = array_values(array_unique($valid['gallery']));
        foreach ($valid['gallery'] as $g) {
            if (! preg_match('/^uploads\/[\w.\-]+$/', $g) && ! in_array($g, $existing, true)) {
                throw \Illuminate\Validation\ValidationException::withMessages(['gallery' => 'Invalid image.']);
            }
        }
    }

    private function prepare(string $res, array $data): array
    {
        if ($res === 'customers') {
            $data['name'] = trim(($data['name'] ?? '').' '.($data['last_name'] ?? ''));
            $data['role'] = 'customer';
            if (isset($data['date_of_birth'])) {
                $data['birth_date'] = $data['date_of_birth'];
            }
            unset($data['last_name'], $data['password_confirmation'], $data['date_of_birth']);
        }
        foreach (\App\Support\Html::RICH[$res] ?? [] as $k) {
            if (array_key_exists($k, $data)) {
                $data[$k] = \App\Support\Html::clean($data[$k]);
            }
        }
        // Nullable-but-NOT-NULL columns fall back to their defaults.
        foreach (['stock', 'order_by'] as $k) {
            if (array_key_exists($k, $data) && $data[$k] === null) {
                unset($data[$k]);
            }
        }

        if (in_array($res, ['categories', 'brands']) && empty($data['slug']) && isset($data['name'])) {
            $data['slug'] = \Illuminate\Support\Str::slug($data['name']).'-'.substr(md5(uniqid()), 0, 4);
        }

        if ($res === 'products' && array_key_exists('variants', $data)) {
            $rows = [];
            foreach ($data['variants'] ?? [] as $v) {
                if (! is_array($v)) {
                    continue;
                }
                $rows[] = [
                    'color_id' => Product::optionId($v['color_id'] ?? null), 'size_id' => Product::optionId($v['size_id'] ?? null),
                    'price' => round((float) ($v['price'] ?? 0), 2), 'stock' => (int) ($v['stock'] ?? 0),
                ];
            }
            if ($rows === []) {
                $data['variants'] = null;
            } else {
                $data['variants'] = $rows;
                $data['color_ids'] = array_values(array_unique(array_filter(array_column($rows, 'color_id'))));
                $data['size_ids'] = array_values(array_unique(array_filter(array_column($rows, 'size_id'))));
                $data['stock'] = (int) array_sum(array_column($rows, 'stock'));
                $data['price'] = min(array_column($rows, 'price'));
            }
        }

        if ($res === 'flash-sales') {
            $zone = Setting::storedGroup('business')['timezone'] ?? config('app.timezone');
            if (! in_array($zone, timezone_identifiers_list(), true)) {
                $zone = config('app.timezone');
            }
            foreach (['starts_at', 'ends_at'] as $key) {
                if (! empty($data[$key])) {
                    $data[$key] = \Carbon\Carbon::parse($data[$key], $zone)->utc();
                }
            }
        }

        return $data;
    }
}
