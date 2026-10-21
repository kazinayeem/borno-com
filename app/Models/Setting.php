<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Guarded;
use Illuminate\Database\Eloquent\Model;

/** Key/value site settings (the reference's "Business Settings"). */
#[Guarded([])]
class Setting extends Model
{
    public $incrementing = false;
    protected $primaryKey = 'key';
    protected $keyType = 'string';

    public static function all_(): array
    {
        return static::query()->pluck('value', 'key')->map(fn ($v) => json_decode($v, true))->all();
    }

    public static function put(array $values): void
    {
        foreach ($values as $k => $v) {
            static::updateOrCreate(['key' => $k], ['value' => json_encode($v)]);
        }
    }

    /** Values actually written for a settings group. Missing group means the site is still on defaults. */
    public static function storedGroup(string $key): array
    {
        $v = static::all_()["group.$key"] ?? [];

        return is_array($v) ? $v : [];
    }

    /** Display defaults for a group. These are not written until an admin saves the page. */
    public static function defaults(string $key): array
    {
        return match ($key) {
            'business' => [
                'name' => 'ReadyEcommerce', 'email' => '', 'mobile' => '',
                'shop_type' => 'multi', 'currency_position' => 'prefix', 'timezone' => 'Asia/Dhaka',
                'return_order_within_days' => 3, 'low_stock_alert' => true, 'low_stock_alert_quantity' => 3,
                'low_stock_mail_notification' => false, 'show_product_stock' => false, 'default_phone_code' => '',
                'show_address_map' => false, 'cash_on_delivery' => true, 'online_payment' => true,
            ],
            'theme' => ['primary_color' => '#ee456b', 'secondary_color' => '#111827', 'generated_color_variants' => ''],
            default => [],
        };
    }

    public static function group(string $key): array
    {
        return array_replace(static::defaults($key), static::storedGroup($key));
    }

    /** `single` or `multi`. Unsaved business setup stays multi, which is the reference demo's current mode. */
    public static function shopType(): string
    {
        return (static::storedGroup('business')['shop_type'] ?? 'multi') === 'single' ? 'single' : 'multi';
    }

    public static function flag(string $name, bool $default): bool
    {
        $saved = static::storedGroup('business');

        return array_key_exists($name, $saved) ? (bool) $saved[$name] : $default;
    }
}
