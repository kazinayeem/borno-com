<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\Brand;
use App\Models\Category;
use App\Models\ContactMessage;
use App\Models\Product;
use App\Models\Record;
use App\Models\Setting;
use App\Models\Shop;
use Illuminate\Http\Request;

class StoreController extends Controller
{
    public function home()
    {
        $with = ['shop:id,name', 'category:id,name,slug'];

        return [
            'categories' => Category::where('active', true)->get(),
            'flash_sale' => Product::with($with)->where('is_flash_sale', true)->where('active', true)->where('approval', '!=', 'pending')->limit(5)->get(),
            'popular' => Product::with($with)->where('active', true)->where('approval', '!=', 'pending')->orderByDesc('reviews_count')->limit(12)->get(),
            'shops' => Shop::withCount('products')->orderBy('id')->limit(Setting::shopType() === 'single' ? 1 : 6)->get(),
            'banners' => $this->promo('banners', 'thumbnail'),
            'ads' => $this->promo('ads', 'thumbnail'),
            'support' => $this->promo('support_items', 'icon'),
            'social' => $this->promo('social_links', null),
            'quick' => Product::with($with)->where('active', true)->where('approval', '!=', 'pending')->latest('id')->limit(6)->get(),
        ];
    }

    /** Site-wide settings, shaped like the reference's /api/master response (`data` + `message`). */
    public function master()
    {
        $c = array_replace(\App\Http\Controllers\Api\SettingsController::DEFAULTS, \App\Models\Setting::all_());
        $img = fn ($p) => $p ? url('storage/'.$p) : url('assets/logo.png');
        $cur = \App\Models\Currency::where('name', $c['currency'])->first();
        $business = Setting::storedGroup('business');
        $theme = Setting::storedGroup('theme');
        $variants = json_decode($theme['generated_color_variants'] ?? '[]', true);

        return ['message' => 'Success', 'data' => [
            'app_name' => $c['name'], 'app_title' => $c['title'], 'app_logo' => $img($c['app_logo']), 'web_logo' => $img($c['logo']), 'web_dark_logo' => $img($c['dark_logo']),
            'web_footer_logo' => $img($c['footer_logo']), 'web_footer_text' => $c['footer_text'], 'web_show_footer' => (bool) $c['show_footer'],
            'app_locale' => 'en', 'baseUrl' => url('/'), 'mobile' => $c['footer_phone'] ?: $c['mobile'], 'email' => $c['email'], 'address' => $c['address'],
            'currency' => ['name' => $cur?->name ?? 'USD', 'symbol' => $cur?->symbol ?? '$', 'position' => $business['currency_position'] ?? $c['currency_position'], 'rate' => $cur?->rate ?? 1],
            'currencies' => \App\Models\Currency::all(['name', 'symbol', 'rate']),
            'languages' => [['name' => 'English', 'code' => 'en']],
            'show_download_app' => (bool) $c['show_download_app'], 'google_client_id' => config('services.google.client_id') ?: null, 'google_playstore_link' => $c['google_playstore_url'], 'app_store_link' => $c['app_store_url'],
            'cash_on_delivery' => Setting::flag('cash_on_delivery', true), 'online_payment' => Setting::flag('online_payment', true),
            'multi_vendor' => Setting::shopType() === 'multi', 'preOrder' => true,
            'return_order_within_days' => (int) ($business['return_order_within_days'] ?? 7),
            'show_product_stock' => Setting::flag('show_product_stock', false),
            'theme_colors' => [
                'primary' => $theme['primary_color'] ?? '#ee456b',
                'secondary' => $theme['secondary_color'] ?? '#111827',
                'variants' => is_array($variants) ? $variants : [],
            ],
        ]];
    }

    public function categories()
    {
        return Category::where('active', true)->withCount('products')->get();
    }

    public function products(Request $request)
    {
        $q = Product::with(['shop:id,name', 'category:id,name,slug', 'brand:id,name'])->where('active', true)->where('approval', '!=', 'pending');
        if ($ids = $request->query('ids')) {
            $q->whereIn('id', array_slice(array_filter(array_map('intval', explode(',', $ids))), 0, 100));
        }

        if ($s = $request->query('search')) {
            $q->where(fn ($w) => $w->where('name', 'like', "%$s%")->orWhere('description', 'like', "%$s%"));
        }
        if ($slugs = $request->query('category_slug')) {
            $q->whereHas('category', fn ($c) => $c->whereIn('slug', (array) $slugs));
        }
        if ($b = $request->query('brand_id')) {
            $q->where('brand_id', $b);
        }
        if ($s = $request->query('shop_id')) {
            $q->where('shop_id', $s);
        }
        if ($request->filled('min_price')) {
            $q->where('price', '>=', (float) $request->query('min_price'));
        }
        if ($request->filled('max_price')) {
            $q->where('price', '<=', (float) $request->query('max_price'));
        }
        if ($request->boolean('digital')) {
            $q->where('is_digital', true);
        }
        if ($request->boolean('preorder')) {
            $q->where('is_preorder', true);
        }
        if ($request->boolean('flash')) {
            $q->where('is_flash_sale', true);
        }

        match ($request->query('sort')) {
            'price_asc' => $q->orderBy('price'),
            'price_desc' => $q->orderByDesc('price'),
            'rating' => $q->orderByDesc('rating'),
            'newest' => $q->latest(),
            default => $q->orderBy('id'),
        };

        return $q->paginate(min((int) $request->query('per_page', 12), 48));
    }

    public function product(Product $product)
    {
        // Inactive and not-yet-approved products are not public.
        abort_if(! $product->active || $product->approval === 'pending', 404);

        return $product->load(['shop:id,name,online,rating', 'category:id,name,slug', 'brand:id,name']);
    }

    public function shops()
    {
        $q = Shop::withCount('products')->orderBy('id');
        if (Setting::shopType() === 'single') {
            $q->whereKey(Shop::orderBy('id')->value('id') ?? 0);
        }

        return $q->paginate(12);
    }

    public function shop(Shop $shop)
    {
        return $shop->loadCount('products');
    }

    public function page(string $slug)
    {
        $row = Record::where('resource', 'pages')->get()->first(fn ($r) => ($r->data['slug'] ?? '') === $slug);
        abort_unless($row, 404);

        return $row->flat();
    }

    /** Active admin records (banners, ads, support items, social links) shaped for the storefront. */
    private function promo(string $resource, ?string $imageKey): array
    {
        return Record::where('resource', $resource)->orderBy('rid')->get()->map->flat()
            ->filter(fn ($r) => ($r['is_active'] ?? true) !== false && ($imageKey === null || ($r['link'] ?? $r[$imageKey] ?? '') !== ''))
            ->map(fn ($r) => [
                'id' => $r['id'],
                'title' => $r['title'] ?? $r['name'] ?? '',
                'description' => $r['description'] ?? '',
                'url' => $r['url'] ?? $r['link'] ?? '/',
                'image' => $this->mediaUrl($imageKey ? ($r[$imageKey] ?? null) : null),
            ])->filter(fn ($r) => $imageKey === null ? $r['url'] !== '' && $r['url'] !== '/' : (bool) $r['image'])
            ->take(12)->values()->all();
    }

    private function mediaUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://') || str_starts_with($path, '/')) {
            return $path;
        }

        return '/storage/'.$path;
    }

    public function brands(Request $request)
    {
        $q = Brand::where('active', true);
        if ($s = $request->query('search')) {
            $q->where('name', 'like', "%$s%");
        }
        if ($l = $request->query('letter')) {
            $q->where('name', 'like', "$l%");
        }

        return $q->orderBy('name')->get();
    }

    public function blogs(Request $request)
    {
        $q = BlogPost::where('published', true);
        if ($s = $request->query('search')) {
            $q->where('title', 'like', "%$s%");
        }
        if ($c = $request->query('category')) {
            $q->where('category', $c);
        }
        $q->orderBy('created_at', $request->query('sort') === 'oldest' ? 'asc' : 'desc');

        return [
            'posts' => $q->paginate(6),
            'categories' => BlogPost::selectRaw('category as name, count(*) as count')->groupBy('category')->get(),
            'popular' => BlogPost::orderByDesc('views')->limit(3)->get(['id', 'title', 'created_at']),
        ];
    }

    public function blog(BlogPost $post)
    {
        $post->increment('views');

        return $post;
    }

    public function contact(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:160'],
            'subject' => ['required', 'string', 'max:160'],
            'message' => ['required', 'string', 'max:3000'],
        ]);
        ContactMessage::create($data);

        return response()->json(['message' => 'Thanks! Your message has been sent.'], 201);
    }
}
