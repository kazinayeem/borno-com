<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\Brand;
use App\Models\Category;
use App\Models\ContactMessage;
use App\Models\FlashSale;
use App\Models\Product;
use App\Models\Record;
use App\Models\Setting;
use App\Models\Shop;
use Illuminate\Http\Request;

class StoreController extends Controller
{
    private const PRIVATE_PRODUCT = ['buy_price', 'approval'];

    public function home()
    {
        $with = ['shop:id,name', 'category:id,name,slug'];

        return [
            'categories' => Category::where('active', true)->get(),
            'flash_deal' => $this->flashDeal(),
            'flash_sale' => Product::with($with)->where('is_flash_sale', true)->where('active', true)->where('approval', '!=', 'pending')->limit(5)->get()->makeHidden(self::PRIVATE_PRODUCT),
            'popular' => Product::with($with)->where('active', true)->where('approval', '!=', 'pending')->orderByDesc('reviews_count')->limit(12)->get()->makeHidden(self::PRIVATE_PRODUCT),
            'shops' => Shop::withCount('products')->orderBy('id')->limit(Setting::shopType() === 'single' ? 1 : 6)->get()->makeHidden('user_id'),
            'banners' => $this->promo('banners', 'thumbnail'),
            'ads' => $this->promo('ads', 'thumbnail'),
            'grid_ads' => $this->gridAds(),
            'support' => $this->promo('support_items', 'icon'),
            'social' => $this->promo('social_links', null),
            'quick' => Product::with($with)->where('active', true)->where('approval', '!=', 'pending')->latest('id')->limit(6)->get()->makeHidden(self::PRIVATE_PRODUCT),
        ];
    }

    /** Active deal whose end is still ahead. A finished deal is returned only when nothing is still running. */
    private function flashDeal(): ?FlashSale
    {
        return FlashSale::query()->where('active', true)->where('ends_at', '>', now())->orderBy('ends_at')->first()
            ?? FlashSale::query()->where('active', true)->latest('id')->first();
    }

    /** Site-wide settings, shaped like the reference's /api/master response (`data` + `message`). */
    public function master()
    {
        $c = array_replace(\App\Http\Controllers\Api\SettingsController::DEFAULTS, \App\Models\Setting::all_());
        $logo = $this->mediaUrl($c['logo']) ?? '/assets/logo.png';
        $cur = \App\Models\Currency::where('name', $c['currency'])->first();
        $business = Setting::storedGroup('business');
        $theme = Setting::storedGroup('theme');
        $variants = json_decode($theme['generated_color_variants'] ?? '[]', true);
        $company = trim((string) ($business['name'] ?? ''));
        $companyEmail = trim((string) ($business['email'] ?? ''));
        $companyPhone = trim((string) ($business['mobile'] ?? ''));

        return ['message' => 'Success', 'data' => [
            'app_name' => $c['name'], 'app_title' => $c['title'], 'company_name' => $company !== '' ? $company : $c['name'],
            'app_logo' => $this->mediaUrl($c['app_logo']) ?? $logo, 'web_logo' => $logo, 'web_dark_logo' => $this->mediaUrl($c['dark_logo']) ?? $logo,
            'favicon' => $this->mediaUrl($c['favicon']) ?? '/assets/favicon.png',
            'web_footer_logo' => $this->mediaUrl($c['footer_logo']) ?? $logo, 'web_footer_text' => $c['footer_text'], 'web_show_footer' => (bool) $c['show_footer'],
            'footer_qrcode' => $this->mediaUrl($c['footer_qrcode']), 'footer_payment_img' => $this->mediaUrl($c['footer_payment_img']),
            'app_locale' => 'en', 'baseUrl' => url('/'), 'mobile' => $companyPhone !== '' ? $companyPhone : ($c['footer_phone'] ?: $c['mobile']), 'email' => $companyEmail !== '' ? $companyEmail : $c['email'], 'address' => $c['address'],
            'currency' => ['name' => $cur?->name ?? 'USD', 'symbol' => $cur?->symbol ?? '$', 'position' => $business['currency_position'] ?? $c['currency_position'], 'rate' => $cur?->rate ?? 1],
            'currencies' => \App\Models\Currency::all(['name', 'symbol', 'rate']),
            'languages' => [['name' => 'English', 'code' => 'en']],
            'show_download_app' => (bool) $c['show_download_app'], 'google_client_id' => config('services.google.client_id') ?: null, 'recaptcha_site_key' => \App\Support\Recaptcha::enabled() ? \App\Support\Recaptcha::config()['site_key'] : null, 'google_playstore_link' => $c['google_playstore_url'], 'app_store_link' => $c['app_store_url'],
            'cash_on_delivery' => Setting::flag('cash_on_delivery', true), 'online_payment' => Setting::flag('online_payment', true),
            'multi_vendor' => Setting::shopType() === 'multi', 'preOrder' => true,
            'return_order_within_days' => (int) ($business['return_order_within_days'] ?? 7),
            'show_product_stock' => Setting::flag('show_product_stock', false),
            'show_address_map' => Setting::flag('show_address_map', false),
            'default_phone_code' => (string) ($business['default_phone_code'] ?? ''),
            'low_stock_alert' => Setting::flag('low_stock_alert', true),
            'low_stock_alert_quantity' => (int) ($business['low_stock_alert_quantity'] ?? 3),
            'timezone' => $business['timezone'] ?? 'Asia/Dhaka',
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

        return $q->paginate(min((int) $request->query('per_page', 12), 48))->through(fn ($p) => $p->makeHidden(self::PRIVATE_PRODUCT));
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

        return $q->paginate(12)->through(fn ($s) => $s->makeHidden('user_id'));
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
    /** Grid advertisements grouped by home-page section, in the admin's chosen order. */
    private function gridAds(): array
    {
        $out = ['home_top' => [], 'home_middle' => [], 'home_bottom' => []];
        $rows = Record::where('resource', 'grid_ads')->get()->map->flat()->filter(fn ($r) => ($r['is_active'] ?? true) !== false)
            ->sortBy(fn ($r) => [(int) ($r['order'] ?? 0), (int) $r['id']]);
        foreach ($rows as $r) {
            $image = $this->mediaUrl($r['thumbnail'] ?? null);
            if ($image && isset($out[$r['section'] ?? ''])) {
                $out[$r['section']][] = ['id' => $r['id'], 'title' => $r['title'] ?? '', 'url' => $r['url'] ?? '/', 'image' => $image];
            }
        }

        return array_map(fn ($v) => array_slice($v, 0, 8), $out);
    }

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
        \App\Support\Recaptcha::verify($request);
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
