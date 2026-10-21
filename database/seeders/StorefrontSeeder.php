<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Currency;
use App\Models\Record;
use Illuminate\Database\Seeder;

/** Storefront images and copy that the admin panel can edit: categories, banners, ads, support, social, pages. */
class StorefrontSeeder extends Seeder
{
    public function run(): void
    {
        $icons = [
            'Electronics' => ['/assets/storefront/electronics.png', 'الإلكترونيات'],
            'Fashion & Clothing' => ['/assets/storefront/fashion.png', 'الأزياء والملابس'],
            'Beauty & Personal Care' => ['/assets/storefront/beauty.png', 'الجمال والعناية الشخصية'],
            'Home & Living' => ['/assets/storefront/home.png', 'المنزل والمعيشة'],
            'Grocery & Essentials' => ['/assets/storefront/grocery.png', 'البقالة والاحتياجات الأساسية'],
            'Toys & Games' => ['/assets/storefront/toys.png', 'الألعاب والترفيه'],
            'Sports & Outdoors' => ['/assets/storefront/sports.png', 'الرياضة والأنشطة الخارجية'],
            'Jewelry & Accessories' => ['/assets/storefront/jewelry.png', 'المجوهرات والإكسسوارات'],
        ];
        foreach ($icons as $name => [$icon, $ar]) {
            Category::where('name', $name)->update(['icon' => $icon, 'name_ar' => $ar, 'active' => true]);
        }

        $banners = [1 => '/assets/storefront/banner-watch.png', 2 => '/assets/storefront/banner-2.png'];
        Record::where('resource', 'banners')->orderBy('rid')->each(function (Record $row) use ($banners) {
            $data = $row->data;
            if (isset($banners[$row->rid])) {
                $data['thumbnail'] = $banners[$row->rid];
                $data['url'] = '/products';
                $data['is_active'] = true;
            } else {
                $data['is_active'] = false;
            }
            $row->update(['data' => $data]);
        });

        $ad = Record::where('resource', 'ads')->where('rid', 1)->first();
        if ($ad) {
            $data = $ad->data;
            $data['thumbnail'] = '/assets/storefront/ad-1.png';
            $data['url'] = '/products';
            $data['is_active'] = true;
            $ad->update(['data' => $data]);
        }
        Record::where('resource', 'ads')->where('rid', '!=', 1)->each(function (Record $row) {
            $data = $row->data;
            $data['is_active'] = false;
            $row->update(['data' => $data]);
        });

        $perks = [
            1 => ['Secure Payments', '100% safe & trusted', '/assets/icons/secure-payment.svg'],
            2 => ['Free Delivery', 'On orders over 999', '/assets/icons/truck-time.svg'],
            3 => ['100% Authentic', 'Genuine products only', '/assets/icons/card-support.svg'],
            4 => ['24/7 Support', 'We are always here', '/assets/icons/support.svg'],
            5 => ['Easy Returns', 'Hassle free returns', '/assets/icons/easy-return.svg'],
        ];
        foreach ($perks as $rid => [$title, $description, $icon]) {
            $row = Record::where('resource', 'support_items')->where('rid', $rid)->first();
            if (! $row) {
                continue;
            }
            $row->update(['data' => ['title' => $title, 'description' => $description, 'icon' => $icon, 'is_active' => true, 'ar_title' => '', 'ar_description' => ''] + $row->data]);
        }

        foreach (['LinkedIn' => 'https://www.linkedin.com', 'YouTube' => 'https://www.youtube.com'] as $name => $link) {
            $row = Record::where('resource', 'social_links')->get()->first(fn ($r) => ($r->data['name'] ?? '') === $name);
            if ($row) {
                $row->update(['data' => ['name' => $name, 'link' => $link, 'is_active' => true] + $row->data]);
            }
        }

        $pages = [
            'about-us' => 'ReadyEcommerce is a multi-vendor marketplace for electronics, fashion, beauty, home, and everyday essentials, with cash on delivery and nationwide shipping.',
            'privacy-policy' => 'We store your account, orders, and addresses only to fulfill purchases. We do not sell personal information. You can update or remove your account from the profile page.',
            'terms-conditions' => 'Orders are offers to buy the listed products. Prices and stock are confirmed at checkout. Sellers are responsible for the goods they list.',
            'refund-policy' => 'You can request a refund within the return window set in Business Setup. Items must be unused and in the original packaging. Refunds follow the original payment method.',
            'faq' => 'Delivery is free on orders over $999. Track an order from your account. Cash on delivery is available when it is enabled in Business Setup.',
        ];
        foreach ($pages as $slug => $content) {
            $row = Record::where('resource', 'pages')->get()->first(fn ($r) => ($r->data['slug'] ?? '') === $slug);
            if ($row && ($row->data['content'] ?? '') === '') {
                $row->update(['data' => ['content' => $content] + $row->data]);
            }
        }

        if (! Currency::where('name', 'USD')->exists()) {
            Currency::create(['name' => 'USD', 'symbol' => '$', 'rate' => 1, 'is_default' => true]);
        }
        Currency::where('name', 'EUR')->where('rate', 1)->update(['rate' => 0.92]);
    }
}
