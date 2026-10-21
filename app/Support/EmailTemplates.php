<?php

namespace App\Support;

use App\Models\Setting;

/** Editable email templates. Defaults live here; an admin's edits are stored in the `email_templates` setting. */
class EmailTemplates
{
    public const VARS = ['{app_name}', '{customer_name}', '{order_number}', '{order_total}', '{order_status}', '{order_link}', '{product_name}', '{stock_left}'];

    public static function defaults(): array
    {
        return [
            'welcome' => ['label' => 'Welcome (new customer)', 'subject' => 'Welcome to {app_name}', 'body' => '<h2>Welcome, {customer_name}!</h2><p>Your account is ready. Browse the store and place your first order any time.</p>'],
            'order_placed' => ['label' => 'Order placed', 'subject' => 'We received your order {order_number}', 'body' => '<h2>Thank you, {customer_name}!</h2><p>Your order <strong>{order_number}</strong> for <strong>{order_total}</strong> has been placed.</p><p>You can follow it here: <a href="{order_link}">{order_link}</a></p>'],
            'order_status' => ['label' => 'Order status changed', 'subject' => 'Order {order_number} is now {order_status}', 'body' => '<h2>Order update</h2><p>Hi {customer_name}, your order <strong>{order_number}</strong> is now <strong>{order_status}</strong>.</p><p><a href="{order_link}">View your order</a></p>'],
            'low_stock' => ['label' => 'Low stock alert (to admin)', 'subject' => '{product_name} is low on stock', 'body' => '<p><strong>{product_name}</strong> has <strong>{stock_left}</strong> left in stock.</p>'],
            'test' => ['label' => 'Test email', 'subject' => 'Test email from {app_name}', 'body' => '<p>If you can read this, your mail settings work.</p>'],
        ];
    }

    /** Defaults overlaid with saved edits, each with an `enabled` flag (on unless switched off). */
    public static function all(): array
    {
        $saved = Setting::all_()['email_templates'] ?? [];
        $out = [];
        foreach (self::defaults() as $key => $d) {
            $s = is_array($saved[$key] ?? null) ? $saved[$key] : [];
            $out[$key] = [
                'key' => $key, 'label' => $d['label'],
                'subject' => $s['subject'] ?? $d['subject'], 'body' => $s['body'] ?? $d['body'],
                'enabled' => (bool) ($s['enabled'] ?? true), 'customized' => isset($s['subject']) || isset($s['body']),
            ];
        }

        return $out;
    }

    public static function get(string $key): ?array
    {
        return self::all()[$key] ?? null;
    }

    public static function render(string $text, array $vars, bool $escape): string
    {
        $map = [];
        foreach ($vars as $k => $v) {
            $map['{'.$k.'}'] = $escape ? e((string) $v) : (string) $v;
        }

        return strtr($text, $map);
    }
}
