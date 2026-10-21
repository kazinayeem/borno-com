<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\Brand;
use App\Models\Category;
use App\Models\ContactMessage;
use App\Models\Product;
use App\Models\Shop;
use Illuminate\Http\Request;

class StoreController extends Controller
{
    public function home()
    {
        $with = ['shop:id,name', 'category:id,name,slug'];

        return [
            'categories' => Category::where('active', true)->get(),
            'flash_sale' => Product::with($with)->where('is_flash_sale', true)->where('active', true)->limit(5)->get(),
            'popular' => Product::with($with)->where('active', true)->orderByDesc('reviews_count')->limit(12)->get(),
            'shops' => Shop::withCount('products')->limit(6)->get(),
        ];
    }

    /** Site-wide settings, shaped like the reference's /api/master response (`data` + `message`). */
    public function master()
    {
        $c = array_replace(\App\Http\Controllers\Api\SettingsController::DEFAULTS, \App\Models\Setting::all_());
        $img = fn ($p) => $p ? url('storage/'.$p) : url('assets/logo.png');
        $cur = \App\Models\Currency::where('name', $c['currency'])->first();

        return ['message' => 'Success', 'data' => [
            'app_name' => $c['name'], 'app_title' => $c['title'], 'app_logo' => $img($c['app_logo']), 'web_logo' => $img($c['logo']), 'web_dark_logo' => $img($c['dark_logo']),
            'web_footer_logo' => $img($c['footer_logo']), 'web_footer_text' => $c['footer_text'], 'web_show_footer' => (bool) $c['show_footer'],
            'app_locale' => 'en', 'baseUrl' => url('/'), 'mobile' => $c['footer_phone'] ?: $c['mobile'], 'email' => $c['email'], 'address' => $c['address'],
            'currency' => ['name' => $cur?->name ?? 'USD', 'symbol' => $cur?->symbol ?? '$', 'position' => $c['currency_position'], 'rate' => $cur?->rate ?? 1],
            'currencies' => \App\Models\Currency::all(['name', 'symbol', 'rate']),
            'languages' => [['name' => 'English', 'code' => 'en']],
            'show_download_app' => (bool) $c['show_download_app'], 'google_playstore_link' => $c['google_playstore_url'], 'app_store_link' => $c['app_store_url'],
            'cash_on_delivery' => true, 'online_payment' => true, 'multi_vendor' => true, 'preOrder' => true,
            'return_order_within_days' => 7, 'show_product_stock' => true, 'theme_colors' => ['primary' => '#ee456b'],
        ]];
    }

    public function categories()
    {
        return Category::where('active', true)->withCount('products')->get();
    }

    public function products(Request $request)
    {
        $q = Product::with(['shop:id,name', 'category:id,name,slug', 'brand:id,name'])->where('active', true);

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
        return $product->load(['shop', 'category', 'brand']);
    }

    public function shops()
    {
        return Shop::withCount('products')->paginate(12);
    }

    public function shop(Shop $shop)
    {
        return $shop->loadCount('products');
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
