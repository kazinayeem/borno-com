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
use App\Models\Shop;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

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
                'sku' => 'required|string|max:60', 'weight' => 'nullable|numeric|min:0', 'buy_price' => 'required|numeric|min:0',
                'discount_type' => 'nullable|in:fixed,percent', 'unit' => 'nullable|string|max:20',
                'color_ids' => 'nullable|array', 'size_ids' => 'nullable|array',
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
            'flash-sales' => [FlashSale::class, 'name', ['name' => 'required|string|max:120', 'description' => 'nullable|string', 'image' => 'nullable|string|regex:/^uploads\/[\w.\-]+$/', 'starts_at' => 'nullable|date', 'ends_at' => 'nullable|date|after_or_equal:starts_at', 'active' => 'boolean'], []],
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

        return [
            'stats' => [
                'products' => Product::count(), 'categories' => Category::count(), 'brands' => Brand::count(),
                'shops' => Shop::count(), 'customers' => User::where('role', 'customer')->count(), 'orders' => Order::count(),
                'messages' => ContactMessage::where('read', false)->count(),
            ],
            'revenue' => (float) Order::where('status', '!=', 'cancelled')->sum('total'),
            'orders_by_status' => Order::selectRaw('status, count(*) as count')->groupBy('status')->pluck('count', 'status'),
            'latest_orders' => Order::with(['user:id,name', 'shop:id,name'])->withSum('items as qty', 'qty')->latest('id')->limit(5)->get(),
            'trending_shops' => Shop::withCount('orders')->orderByDesc('orders_count')->limit(5)->get(),
            'wallet' => ['balance' => round((float) Order::where('payment_status', 'paid')->sum('total') * 0.1, 2), 'earning' => (float) Order::where('payment_status', 'paid')->sum('total')],
            'latest_products' => Product::with('shop:id,name')->latest()->limit(5)->get(),
            'latest_messages' => ContactMessage::latest()->limit(5)->get(),
        ];
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

        $top = \App\Models\OrderItem::selectRaw('name, sum(qty) as sold')
            ->whereIn('order_id', (clone $orders)->where('status', '!=', 'cancelled')->pluck('id'))
            ->groupBy('name')->orderByDesc('sold')->limit(5)->get();

        return [
            'scope' => 'shop', 'shop_name' => $shops->first()->name ?? request()->user()->name,
            'stats' => ['products' => Product::whereIn('shop_id', $ids)->count(), 'orders' => (clone $orders)->count(), 'categories' => Category::count(), 'brands' => Brand::count()],
            'orders_by_status' => (clone $orders)->selectRaw('status, count(*) as count')->groupBy('status')->pluck('count', 'status'),
            'wallet' => [
                'balance' => round($sales - $sum($spent), 2), 'pending_withdraw' => $sum($byStatus('pending')), 'already_withdraw' => $sum($byStatus('approved')),
                'total_sales' => round($sales, 2), 'delivery_charge' => round((float) (clone $delivered)->sum('shipping'), 2),
                'pos_sales' => round((float) (clone $orders)->where('source', 'pos')->sum('total'), 2),
            ],
            'last7' => $days->map(fn ($d) => ['date' => $d, 'count' => (int) ($perDay[$d] ?? 0)])->values(),
            'top_products' => $top->map(fn ($t) => ['name' => $t->name, 'sold' => (int) $t->sold])->values(),
        ];
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
        if ($res === 'shops') {
            $q->withCount(['products', 'orders']);
        }

        return $q->orderBy($res === 'categories' || $res === 'brands' ? 'id' : 'id', $res === 'products' || $res === 'blogs' ? 'desc' : 'asc')->paginate(min((int) $request->query('per_page', 10), 100));
    }

    public function show(string $res, int $id)
    {
        [$model, , , $with] = $this->cfg($res);

        return $model::with($with)->findOrFail($id);
    }

    public function store(Request $request, string $res)
    {
        [$model, , $rules] = $this->cfg($res);
        if ($res === 'shops') {
            return response()->json($this->createShop($request, $rules), 201);
        }
        $data = $this->prepare($res, $request->validate($rules));
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
        $before = $this->imageOf($row);
        $rules = array_map(fn ($r) => is_string($r) ? str_replace('required|', 'sometimes|required|', $r) : $r, $rules);
        if ($res === 'coupons') {
            $rules['code'] = 'sometimes|required|string|max:40|unique:coupons,code,'.$id;
        }
        $row->update($this->prepare($res, $request->validate($rules)));

        $this->dropFile($before, $this->imageOf($row->refresh()));

        return $row;
    }

    public function destroy(string $res, int $id)
    {
        [$model] = $this->cfg($res);
        $row = $model::findOrFail($id);
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
            'colors' => Color::where('active', true)->get(['id', 'name']),
            'sizes' => Size::where('active', true)->get(['id', 'name']),
            'units' => Unit::where('active', true)->pluck('name'),
        ];
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
        // Nullable-but-NOT-NULL columns fall back to their defaults.
        foreach (['stock', 'order_by'] as $k) {
            if (array_key_exists($k, $data) && $data[$k] === null) {
                unset($data[$k]);
            }
        }

        if (in_array($res, ['categories', 'brands']) && empty($data['slug']) && isset($data['name'])) {
            $data['slug'] = \Illuminate\Support\Str::slug($data['name']).'-'.substr(md5(uniqid()), 0, 4);
        }

        return $data;
    }
}
