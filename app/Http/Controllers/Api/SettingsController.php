<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public const DEFAULTS = [
        'name' => 'ReadyEcommerce', 'title' => 'ReadyEcommerce', 'currency' => 'USD', 'currency_position' => 'prefix',
        'logo' => null, 'dark_logo' => null, 'app_logo' => null, 'favicon' => null,
        'mobile' => '', 'email' => '', 'address' => '',
        'meta_pixel_enabled' => false, 'meta_pixel_id' => '', 'meta_test_event_code' => '', 'meta_capi_access_token' => '',
        'show_download_app' => true, 'google_playstore_url' => '', 'app_store_url' => '',
        'show_footer' => true, 'footer_phone' => '', 'footer_text' => '', 'footer_logo' => null, 'footer_qrcode' => null, 'footer_payment_img' => null, 'footer_bg_image' => null,
    ];

    private const IMG = '/^uploads\/[\w.\-]+$/';

    public function show()
    {
        return array_replace(self::DEFAULTS, Setting::all_());
    }

    public function update(Request $request)
    {
        $img = ['nullable', 'string', 'regex:'.self::IMG];
        $data = $request->validate([
            'name' => 'required|string|max:120', 'title' => 'required|string|max:160',
            'currency' => 'required|exists:currencies,name', 'currency_position' => 'required|in:prefix,suffix',
            'logo' => $img, 'dark_logo' => $img, 'app_logo' => $img, 'favicon' => $img,
            'mobile' => 'nullable|string|max:40', 'email' => 'nullable|email|max:160', 'address' => 'nullable|string|max:255',
            'meta_pixel_enabled' => 'boolean', 'meta_pixel_id' => 'nullable|string|max:60', 'meta_test_event_code' => 'nullable|string|max:60', 'meta_capi_access_token' => 'nullable|string|max:500',
            'show_download_app' => 'boolean', 'google_playstore_url' => 'nullable|url|max:300', 'app_store_url' => 'nullable|url|max:300',
            'show_footer' => 'boolean', 'footer_phone' => 'nullable|string|max:40', 'footer_text' => 'nullable|string|max:255',
            'footer_logo' => $img, 'footer_qrcode' => $img, 'footer_payment_img' => $img, 'footer_bg_image' => $img,
        ]);
        Setting::put($data);

        return $this->show();
    }
}
