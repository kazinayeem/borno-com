<?php

namespace App\Services\Payments;

use App\Models\Record;
use App\Models\Setting;

/** Which online payment gateways this store can actually use right now. */
class Gateways
{
    /** key => [Record name, class, required config keys] */
    public const SUPPORTED = [
        'sslcommerz' => ['SSLCommerz', SslCommerz::class, ['store_id', 'store_passwd']],
        'bkash' => ['BKash', Bkash::class, ['app_key', 'app_secret', 'username', 'password']],
        'nagad' => ['Nagad', Nagad::class, ['merchant_id', 'merchant_number', 'public_key', 'private_key']],
    ];

    public static function record(string $key): ?array
    {
        $name = self::SUPPORTED[$key][0] ?? null;
        $r = $name ? Record::where('resource', 'payment_gateways')->get()->first(fn ($x) => ($x->data['name'] ?? '') === $name) : null;

        return $r ? $r->data + ['rid' => $r->rid] : null;
    }

    /** Active, fully configured, and online payments are switched on in Business Setup. */
    public static function ready(string $key): bool
    {
        $r = self::record($key);
        if (! $r || empty($r['is_active']) || ! Setting::flag('online_payment', true)) {
            return false;
        }
        foreach (self::SUPPORTED[$key][2] as $k) {
            if (trim((string) ($r['config'][$k] ?? '')) === '') {
                return false;
            }
        }

        return true;
    }

    /** What the storefront may offer at checkout (never any credentials). */
    public static function available(): array
    {
        $out = [];
        foreach (self::SUPPORTED as $key => [$name]) {
            if (self::ready($key)) {
                $r = self::record($key);
                $out[] = ['key' => $key, 'title' => $r['title'] ?? $name, 'logo' => $r['logo'] ?? null];
            }
        }

        return $out;
    }

    public static function make(string $key): PaymentGateway
    {
        abort_unless(self::ready($key), 422, 'This payment method is not available.');
        $class = self::SUPPORTED[$key][1];
        $r = self::record($key);

        return new $class($r['config'], ($r['mode'] ?? 'test') === 'live');
    }
}
