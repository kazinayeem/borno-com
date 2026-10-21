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
                'low_stock_mail_notification' => false, 'guest_checkout' => false, 'show_product_stock' => false, 'default_phone_code' => '',
                'show_address_map' => false, 'cash_on_delivery' => true, 'online_payment' => true,
            ],
            'mail' => ['is_active' => true],
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

    /** One admin notice when stock crosses the low-stock line. A second dip does not send another. */
    public static function alertLowStock(Product $product, int $previous): void
    {
        $biz = static::group('business');
        if (empty($biz['low_stock_alert'])) {
            return;
        }
        $limit = (int) ($biz['low_stock_alert_quantity'] ?? 0);
        if ($previous <= $limit || $product->stock > $limit) {
            return;
        }
        $title = $product->name.' is low on stock';
        $content = $product->name.' has '.$product->stock.' left. The alert level is '.$limit.'.';
        Record::create([
            'resource' => 'notifications',
            'rid' => (int) Record::where('resource', 'notifications')->max('rid') + 1,
            'data' => ['title' => $title, 'content' => $content, 'is_read' => false, 'url' => '/admin/products/'.$product->id.'/edit'],
        ]);
        if (empty($biz['low_stock_mail_notification'])) {
            return;
        }
        $to = trim((string) ($biz['email'] ?: (static::all_()['email'] ?? '')));
        if ($to === '') {
            return;
        }
        // Mailer swallows its own errors: a mail problem must not undo the sale that lowered the stock.
        \App\Services\Mailer::send('low_stock', $to, ['product_name' => $product->name, 'stock_left' => $product->stock]);
    }
}
